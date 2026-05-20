import { Socket } from 'phoenix';

let socket: Socket | null = null;

export function connect(serverUrl: string, token: string): Socket {
  if (socket) socket.disconnect();

  socket = new Socket(`${serverUrl}/socket`, {
    params: { token },
  });

  socket.connect();
  return socket;
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
