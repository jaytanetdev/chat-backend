import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ChatEmitterService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitNewMessage(roomId: string, chat: Record<string, unknown>) {
    this.server?.to(`room:${roomId}`).emit('new_message', chat);
  }

  emitRoomUpdated(roomId: string, data: Record<string, unknown>) {
    this.server?.emit('room_updated', { room_id: roomId, ...data });
  }
}
