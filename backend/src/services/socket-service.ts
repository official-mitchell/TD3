import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Drone, { IDrone } from '../models/drone.model';

export class SocketService {
  private io: SocketServer;

  //   TODO: Uncomment this
  private simulationInterval: NodeJS.Timeout | null = null;

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
    // TODO: Uncomment this when we have a simulation
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
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  private async updateDrone(droneId: string) {
    try {
      const drone = await Drone.findOne({ droneId });
      if (drone) {
        // Update position
        drone.position.lat += (Math.random() - 0.5) * 0.001;
        drone.position.lng += (Math.random() - 0.5) * 0.001;
        drone.position.altitude += (Math.random() - 0.5) * 10;

        // Randomly update status
        const statuses: Array<IDrone['status']> = [
          'Detected',
          'Identified',
          'Confirmed',
          'Engagement Ready',
        ];
        if (Math.random() < 0.2) {
          // 20% chance to change status
          drone.status = statuses[Math.floor(Math.random() * statuses.length)];
        }

        // Randomly update threat level
        if (Math.random() < 0.1) {
          // 10% chance to change threat
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

  //   TODO: Uncomment this
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
    }, 2000);
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
}

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

export default SocketService;
