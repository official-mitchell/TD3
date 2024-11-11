import { Router } from 'express';
import Drone from '../models/drone.model';
import { Request, Response } from 'express';

const router = Router();

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
