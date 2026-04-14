import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ChatEmitterService {
  private server: Server;
  private readonly logger = new Logger(ChatEmitterService.name);

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Emit new_message to ALL connected clients (not just room members).
   * The frontend filters by room_id for the active chat window,
   * and uses it to update the sidebar room list for every admin.
   */
  emitNewMessage(roomId: string, chat: Record<string, unknown>) {
    if (!this.server) {
      this.logger.warn('Socket server not initialized, cannot emit new_message');
      return;
    }
    this.server.emit('new_message', { ...chat, room_id: roomId });
    this.logger.debug(`Emitted new_message to all clients for room ${roomId}`);
  }

  emitRoomUpdated(roomId: string, data: Record<string, unknown>) {
    if (!this.server) {
      this.logger.warn('Socket server not initialized, cannot emit room_updated');
      return;
    }
    this.server.emit('room_updated', { room_id: roomId, ...data });
    this.logger.debug(`Emitted room_updated to all clients for room ${roomId}`);
  }
}
