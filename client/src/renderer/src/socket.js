import { Socket } from "phoenix";

let socket = null;

export function connect(serverUrl, username) {
  if (socket) socket.disconnect();

  socket = new Socket(`${serverUrl}/socket`, {
    params: { username },
  });

  socket.connect();
  return socket;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
