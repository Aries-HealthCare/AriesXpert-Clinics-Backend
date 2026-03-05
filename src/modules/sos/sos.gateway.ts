import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'sos',
})
export class SosGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(SosGateway.name);
    private adminRooms = 'sos_admins';

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to SOS namespace: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from SOS namespace: ${client.id}`);
    }

    @SubscribeMessage('join_sos_admin')
    handleJoinAdmin(@ConnectedSocket() client: Socket) {
        client.join(this.adminRooms);
        this.logger.log(`Client ${client.id} joined SOS Admin room.`);
    }

    @SubscribeMessage('join_sos_session')
    handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sosId: string },
    ) {
        client.join(`sos_${payload.sosId}`);
        this.logger.log(`Client ${client.id} joined SOS session: ${payload.sosId}`);
    }

    // --- Real-Time Messaging ---

    notifyNewSos(sosSession: any) {
        this.server.to(this.adminRooms).emit('new_sos_alert', sosSession);
    }

    broadcastLocation(sosId: string, location: any) {
        this.server.to(`sos_${sosId}`).to(this.adminRooms).emit('sos_location_update', {
            sosId,
            ...location,
        });
    }

    broadcastStatusChange(sosId: string, status: string, details?: any) {
        this.server.to(`sos_${sosId}`).to(this.adminRooms).emit('sos_status_change', {
            sosId,
            status,
            ...details,
        });
    }

    // --- WebRTC Signaling ---

    @SubscribeMessage('signal')
    handleSignal(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { targetId: string; senderId: string; data: any; sosId: string },
    ) {
        // Relay signaling data between therapist and admin
        this.server.to(`sos_${payload.sosId}`).to(this.adminRooms).emit('signal_relay', payload);
    }
}
