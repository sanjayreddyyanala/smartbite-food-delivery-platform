import { getIO } from '../config/socket.js';

/**
 * Emit an event to all members in a group order room.
 * Room name format: "group-{code}" where code is the 6-char join code.
 */
export const emitToGroup = (code, event, data) => {
  try {
    const io = getIO();
    io.to(`group-${code}`).emit(event, data);
  } catch (err) {
    console.error(`Socket emit error (${event}):`, err.message);
  }
};
