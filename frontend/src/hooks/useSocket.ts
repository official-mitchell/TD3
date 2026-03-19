import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDroneStore } from '../store/droneStore';
import type { IDrone } from '@td3/shared-types';

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

    socket.on('initialDroneData', (data: { drones: IDrone[] }) => {
      data.drones.forEach((drone) => actions.addDrone(drone));
    });

    socket.on('droneUpdate', (drone: IDrone) => {
      actions.updateDrone(drone);
    });

    return () => {
      socket.disconnect();
    };
  }, [actions]);

  return socketRef.current;
};
