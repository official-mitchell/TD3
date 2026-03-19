/**
 * Shared socket ref for emitting events from components (e.g. engagement:fire).
 * useSocket sets this on connect; components call getSocket()?.emit(...).
 */
import type { Socket } from 'socket.io-client';

let socketRef: Socket | null = null;

export const setSocketRef = (socket: Socket | null) => {
  socketRef = socket;
};

export const getSocket = () => socketRef;
