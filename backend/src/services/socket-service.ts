import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Drone, {
  IDrone,
  IDroneDocument,
  DroneType,
} from '../models/drone.model';

interface SimulationConfig {
  movementSpeed: number; // How fast drones move
  updateInterval: number; // How often positions update
  statusChangeProb: number; // Probability of status change
  threatChangeProb: number; // Probability of threat level change
}

type MovementPattern = {
  lat: number;
  lng: number;
  altitude: number;
  hover: boolean;
};

export class SocketService {
  private io: SocketServer;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationConfig: SimulationConfig = {
    movementSpeed: 0.001,
    updateInterval: 2000,
    statusChangeProb: 0.2,
    threatChangeProb: 0.1,
  };

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:8000'],
        // origin:
        //   process.env.NODE_ENV === 'production'
        //     ? 'your-production-domain'
        //     : 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.setupSocketHandlers();
    this.startSimulation();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected');

      // Send initial drone data
      this.emitInitialDroneData(socket);

      // Handle client events
      socket.on('requestDroneUpdate', async (droneId: string) => {
        await this.updateDrone(droneId);
        socket.on('disconnect', () => {
          console.log('Client disconnected');
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  private calculateMovement(droneType: DroneType): MovementPattern {
    const patterns: Record<DroneType, MovementPattern> = {
      Quadcopter: {
        // More erratic, can hover, smaller movements
        lat: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        lng: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 5000),
        // Can hover (sometimes no movement)
        hover: Math.random() < 0.2,
      },
      FixedWing: {
        // More linear, constant forward movement, gradual turns
        lat: Math.random() * this.simulationConfig.movementSpeed * 2,
        lng: Math.random() * this.simulationConfig.movementSpeed * 2,
        // Less altitude variation
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 2000),
        // Cannot hover
        hover: false,
      },
      VTOL: {
        // Combination of both patterns
        lat: (Math.random() - 0.5) * this.simulationConfig.movementSpeed * 1.5,
        lng: (Math.random() - 0.5) * this.simulationConfig.movementSpeed * 1.5,
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 3000),
        // Can hover occasionally
        hover: Math.random() < 0.1,
      },
      Unknown: {
        // Default random movement
        lat: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        lng: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 1000),
        hover: false,
      },
    };

    return patterns[droneType] || patterns.Unknown;
  }

  private async updateDrone(droneId: string) {
    try {
      const drone = (await Drone.findOne({ droneId })) as IDroneDocument;
      if (drone) {
        // Get movement pattern based on drone type
        const movement = this.calculateMovement(drone.droneType);

        // Apply movement if not hovering
        if (!movement.hover) {
          drone.position.lat += movement.lat;
          drone.position.lng += movement.lng;
          drone.position.altitude += movement.altitude;

          // Update heading based on movement
          if (drone.droneType === 'FixedWing') {
            // Fixed wing aircraft make wider turns
            const currentHeading = drone.heading || 0;
            const headingChange = (Math.random() - 0.5) * 20; // Max 20 degree turn
            drone.heading = (currentHeading + headingChange) % 360;
          } else {
            // Other types can make sharper turns
            drone.heading = Math.random() * 360;
          }
        }

        // Update speed based on type
        switch (drone.droneType) {
          case 'FixedWing':
            // Must maintain minimum speed
            drone.speed = Math.max(
              100,
              drone.speed + (Math.random() - 0.5) * 10
            );
            break;
          case 'Quadcopter':
            // Can hover or move slowly
            drone.speed = movement.hover
              ? 0
              : Math.max(0, drone.speed + (Math.random() - 0.5) * 15);
            break;
          case 'VTOL':
            // Can hover or move at variable speeds
            drone.speed = movement.hover
              ? 0
              : Math.max(0, drone.speed + (Math.random() - 0.5) * 20);
            break;
          default:
            drone.speed = Math.max(0, drone.speed + (Math.random() - 0.5) * 5);
        }

        // Use config probabilities
        if (Math.random() < this.simulationConfig.statusChangeProb) {
          const statuses: Array<IDrone['status']> = [
            'Detected',
            'Identified',
            'Confirmed',
            'Engagement Ready',
          ];
          drone.status = statuses[Math.floor(Math.random() * statuses.length)];
        }

        // Randomly update threat level
        if (Math.random() < this.simulationConfig.threatChangeProb) {
          drone.threatLevel = Math.floor(Math.random() * 5) + 1;
        }

        drone.lastUpdated = new Date();
        await drone.save();

        // Add to engagement history if status changed
        if (drone.status === 'Engagement Ready') {
          drone.engagementHistory.push({
            timestamp: new Date(),
            action: 'Status Change',
            details: 'Drone ready for engagement',
          });
          await drone.save();
        }

        this.io.emit('droneUpdate', drone);
      }
    } catch (error) {
      console.error('Error updating drone:', error);
    }
  }

  private startSimulation() {
    // Update all drones every 2 seconds
    this.simulationInterval = setInterval(async () => {
      try {
        const drones = await Drone.find();
        for (const drone of drones) {
          await this.updateDrone(drone.droneId);
        }
      } catch (error) {
        console.error('Simulation error:', error);
      }
    }, this.simulationConfig.updateInterval);
  }

  private async emitInitialDroneData(socket: any) {
    try {
      // Import your Drone model at the top of the file
      const drones = await Drone.find().sort({ lastUpdated: -1 });
      socket.emit('initialDroneData', { drones });
    } catch (error) {
      console.error('Error sending initial drone data:', error);
      socket.emit('error', { message: 'Error fetching drone data' });
    }
  }

  public broadcastDroneUpdate(droneData: IDrone) {
    this.io.emit('droneUpdate', droneData);
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public async createTestDrones() {
    try {
      console.log('Starting drone creation...');
      // First, clear existing test drones
      await Drone.deleteMany({});
      console.log('Cleared existing drones');

      // Create one of each type
      const testDrones = [
        {
          droneId: 'QUAD-001',
          droneType: 'Quadcopter',
          status: 'Detected',
          position: {
            lat: 37.7749 + (Math.random() - 0.5) * 0.01,
            lng: -122.4194 + (Math.random() - 0.5) * 0.01,
            altitude: 100,
          },
          speed: 15,
          heading: Math.random() * 360,
          threatLevel: 2,
          isEngaged: false,
        },
        {
          droneId: 'FIXED-001',
          droneType: 'FixedWing',
          status: 'Detected',
          position: {
            lat: 37.7749 + (Math.random() - 0.5) * 0.01,
            lng: -122.4194 + (Math.random() - 0.5) * 0.01,
            altitude: 500,
          },
          speed: 100,
          heading: Math.random() * 360,
          threatLevel: 3,
          isEngaged: false,
        },
        {
          droneId: 'VTOL-001',
          droneType: 'VTOL',
          status: 'Detected',
          position: {
            lat: 37.7749 + (Math.random() - 0.5) * 0.01,
            lng: -122.4194 + (Math.random() - 0.5) * 0.01,
            altitude: 300,
          },
          speed: 50,
          heading: Math.random() * 360,
          threatLevel: 4,
          isEngaged: false,
        },
      ];

      console.log(
        'About to create drones:',
        JSON.stringify(testDrones, null, 2)
      );

      for (const droneData of testDrones) {
        console.log(
          `Creating drone: ${droneData.droneId} of type ${droneData.droneType}`
        );
        const drone = new Drone(droneData);
        const savedDrone = await drone.save();
        console.log('Saved drone:', JSON.stringify(savedDrone, null, 2));
      }

      // Verify what's in the database
      const allDrones = await Drone.find();
      console.log(
        'All drones in database:',
        JSON.stringify(allDrones, null, 2)
      );

      return {
        message: 'Test drones created successfully',
        count: testDrones.length,
      };
    } catch (error) {
      console.error('Error creating test drones:', error);
      throw error;
    }
  }
}

export default SocketService;

//   TODO: Potentially uncomment this?
//   public async createTestDrones(count: number = 3) {
//     try {
//       for (let i = 0; i < count; i++) {
//         const drone = new Drone({
//           droneId: `TEST${i + 1}`,
//           status: 'Detected',
//           position: {
//             lat: 37.7749 + (Math.random() - 0.5) * 0.1,
//             lng: -122.4194 + (Math.random() - 0.5) * 0.1,
//             altitude: 100 + Math.random() * 200,
//           },
//           speed: 15.5,
//           heading: Math.random() * 360,
//           threatLevel: Math.floor(Math.random() * 5) + 1,
//           isEngaged: false,
//         });
//         await drone.save();
//       }
//     } catch (error) {
//       console.error('Error creating test drones:', error);
//     }
//   }
// }

// Test Implementaiton methods
// Method to broadcast drone updates to all connected clients
//   public broadcastDroneUpdate(droneData: IDrone) {
//     this.io.emit('droneUpdate', droneData);
//   }

//   // Method to broadcast threat alerts
//   public broadcastThreatAlert(threatData: any) {
//     this.io.emit('threatAlert', threatData);
//   }

// // Test implementation
// console.log(`Update requested for drone: ${droneId}`);
// try {
//   // Find the drone
//   const drone = await Drone.findOne({ droneId });
//   if (drone) {
//     // Simulate movement
//     drone.position.lat += (Math.random() - 0.5) * 0.001; // Small random change
//     drone.position.lng += (Math.random() - 0.5) * 0.001;
//     drone.position.altitude += (Math.random() - 0.5) * 10;
//     drone.lastUpdated = new Date();

//     // Save changes
//     await drone.save();

//     // Broadcast update
//     this.io.emit('droneUpdate', drone);
//   }
// } catch (error) {
//   console.error('Error updating drone:', error);
//   socket.emit('error', { message: 'Error updating drone' });
// }
