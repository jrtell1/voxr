import { Socket } from 'phoenix';

let socket: Socket | null = null;

export function connect(serverUrl: string, username: string): Socket {
  if (socket) socket.disconnect();

  socket = new Socket(`${serverUrl}/socket`, {
    params: { username },
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
