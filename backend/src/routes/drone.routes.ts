import { Router } from 'express';
import Drone from '../models/drone.model';
import { Request, Response } from 'express';

// Add console.log at the top to verify the file is loaded
console.log('Loading drone routes...');

const router = Router();

// Test route that doesn't need any dependencies
router.get('/routes-check', (req: Request, res: Response) => {
  console.log('Routes check endpoint hit');
  return res.json({ message: 'Drone routes are loaded' });
});

router.post('/drones/test-types', async (req: Request, res: Response) => {
  console.log('Test types endpoint hit');
  try {
    const socketService = req.app.get('socketService');
    console.log('Got socket service:', socketService ? 'yes' : 'no');
    if (!socketService) {
      return res.status(500).json({ message: 'Socket service not found' });
    }
    await socketService.createTestDrones();
    return res.json({ message: 'Test drones created' });
    // const result = await socketService.createTestDrones();
    // console.log('Created test drones:', result);
    // return res.json(result);
  } catch (error) {
    console.error('Error in test-types endpoint:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// GET all drones
router.get('/drones', async (req: Request, res: Response) => {
  try {
    const drones = await Drone.find().sort({ lastUpdated: -1 });
    return res.json(drones);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching drones', error });
  }
});

// GET single drone by ID
router.get('/drones/:droneId', async (req: Request, res: Response) => {
  try {
    const drone = await Drone.findOne({ droneId: req.params.droneId });
    if (!drone) {
      return res.status(404).json({ message: 'Drone not found' });
    }
    return res.json(drone);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching drone', error });
  }
});

// GET drone history
router.get('/drones/:droneId/history', async (req: Request, res: Response) => {
  try {
    const drone = await Drone.findOne({ droneId: req.params.droneId });
    if (!drone) {
      return res.status(404).json({ message: 'Drone not found' });
    }
    return res.json(drone.engagementHistory);
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching drone history', error });
  }
});

router.get('/drones/check', async (req: Request, res: Response) => {
  console.log('Check drones endpoint hit');
  try {
    const drones = await Drone.find();
    console.log('Current drones:', drones);
    return res.json(drones);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check drones' });
  }
});

// Test endpoint to create sample drone
router.post('/drones/test', async (req: Request, res: Response) => {
  try {
    const testDrone = new Drone({
      droneId: 'TEST001',
      status: 'Detected',
      position: {
        lat: 37.7749,
        lng: -122.4194,
        altitude: 100,
      },
      speed: 15.5,
      heading: 180,
      threatLevel: 3,
      engagementHistory: [
        {
          timestamp: new Date(),
          action: 'Initial Detection',
          details: 'Drone first spotted',
        },
      ],
    });

    await testDrone.save();
    return res.json({ message: 'Test drone created', drone: testDrone });
  } catch (error: any) {
    // Type the error parameter
    console.error('Detailed error:', error);
    return res.status(500).json({
      message: 'Error creating test drone',
      error: error.message,
      details: error,
    });
  }
});

// Update drone status
router.put('/drones/:droneId/status', async (req, res) => {
  try {
    const drone = await Drone.findOne({ droneId: req.params.droneId });
    if (!drone) {
      return res.status(404).json({ message: 'Drone not found' });
    }
    drone.status = req.body.status;
    await drone.save();
    return res.json(drone);
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error updating drone status', error });
  }
});

// Delete drone
router.delete('/drones/:droneId', async (req, res) => {
  try {
    const result = await Drone.deleteOne({ droneId: req.params.droneId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Drone not found' });
    }
    return res.json({ message: 'Drone deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting drone', error });
  }
});

// Create custom drone
router.post('/drones', async (req, res) => {
  try {
    const drone = new Drone(req.body);
    await drone.save();
    return res.status(201).json(drone);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating drone', error });
  }
});

router.get('/drones/status', async (req: Request, res: Response) => {
  try {
    const drones = await Drone.find();
    return res.json({
      count: drones.length,
      drones: drones.map((drone) => ({
        id: drone.droneId,
        status: drone.status,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

// Clear drones
router.post('/drones/clear', async (req: Request, res: Response) => {
  try {
    await Drone.deleteMany({});
    return res.json({ message: 'All drones cleared' });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

export default router;

// import { Router } from 'express';
// import Drone from '../models/drone.model';
// import { Request, Response } from 'express';

// const router = Router();

// // GET all drones
// router.get('/drones', async (req: Request, res: Response) => {
//   try {
//     const drones = await Drone.find().sort({ lastUpdated: -1 });
//     return res.json(drones); // Added return
//   } catch (error) {
//     return res.status(500).json({ message: 'Error fetching drones', error }); // Added return
//   }
// });

// // GET single drone by ID
// router.get('/drones/:droneId', async (req: Request, res: Response) => {
//   try {
//     const drone = await Drone.findOne({ droneId: req.params.droneId });
//     if (!drone) {
//       return res.status(404).json({ message: 'Drone not found' });
//     }
//     return res.json(drone); // Added return
//   } catch (error) {
//     return res.status(500).json({ message: 'Error fetching drone', error }); // Added return
//   }
// });

// // GET drone history
// router.get('/drones/:droneId/history', async (req: Request, res: Response) => {
//   try {
//     const drone = await Drone.findOne({ droneId: req.params.droneId });
//     if (!drone) {
//       return res.status(404).json({ message: 'Drone not found' });
//     }
//     return res.json(drone.engagementHistory); // Added return
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: 'Error fetching drone history', error }); // Added return
//   }
// });

// export default router;

// import { Router } from 'express';
// import Drone from '../models/drone.model';
// import { Request, Response } from 'express';

// const router = Router();

// // GET all drones
// router.get('/drones', async (req: Request, res: Response) => {
//   try {
//     const drones = await Drone.find().sort({ lastUpdated: -1 });
//     res.json(drones);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching drones', error });
//   }
// });

// // GET single drone by ID
// router.get('/drones/:droneId', async (req: Request, res: Response) => {
//   try {
//     const drone = await Drone.findOne({ droneId: req.params.droneId });
//     if (!drone) {
//       return res.status(404).json({ message: 'Drone not found' });
//     }
//     res.json(drone);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching drone', error });
//   }
// });

// // GET drone history
// router.get('/drones/:droneId/history', async (req: Request, res: Response) => {
//   try {
//     const drone = await Drone.findOne({ droneId: req.params.droneId });
//     if (!drone) {
//       return res.status(404).json({ message: 'Drone not found' });
//     }
//     res.json(drone.engagementHistory);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching drone history', error });
//   }
// });

// Original test endpoint
// router.post('/drones/test', async (req: Request, res: Response) => {
//   // ... test drone creation code ...
//   // In your terminal, you can use MongoDB CLI, or we can add a test endpoint:
//   try {
//     const testDrone = new Drone({
//       droneId: 'TEST001',
//       status: 'Detected',
//       position: {
//         lat: 37.7749,
//         lng: -122.4194,
//         altitude: 100,
//       },
//       speed: 15.5,
//       heading: 180,
//       threatLevel: 3,
//       engagementHistory: [
//         {
//           timestamp: new Date(),
//           action: 'Initial Detection',
//           details: 'Drone first spotted',
//         },
//       ],
//     });

//     await testDrone.save();
//     res.json({ message: 'Test drone created', drone: testDrone });
//   } catch (error) {
//     res.status(500).json({ message: 'Error creating test drone', error });
//   }
// });

// export default router;
