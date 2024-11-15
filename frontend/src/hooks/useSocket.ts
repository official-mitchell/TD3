import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDroneStore } from '../store/droneStore';
import { Drone } from '../types';

const SOCKET_URL = 'http://localhost:3333';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { actions } = useDroneStore();

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('initialDroneData', (data: { drones: Drone[] }) => {
      data.drones.forEach((drone) => actions.addDrone(drone));
    });

    socket.on('droneUpdate', (drone: Drone) => {
      actions.updateDrone(drone);
    });

    return () => {
      socket.disconnect();
    };
  }, [actions]);

  return socketRef.current;
};
