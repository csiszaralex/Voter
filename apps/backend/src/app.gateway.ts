import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  AdminLowerHandDto,
  CastVoteDto,
  RaiseHandDto,
  StartVoteDto,
} from '@repo/shared-types';
import { Server, Socket } from 'socket.io';
import { AppService } from './app.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly appService: AppService) {}

  // --- Connection Lifecycle ---

  handleConnection(client: Socket) {
    try {
      const username = client.handshake.query.username as string;
      if (!username) {
        client.disconnect();
        return;
      }

      const user = this.appService.joinUser(client.id, username);
      console.log(`User connected: ${user.username}`);

      // Csak az új usernek visszajelzés, hogy sikerült (opcionális)
      client.emit('welcome', { user });

      this.broadcastState();
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      console.error(error.message);
      client.emit('error', { message: error.message });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.appService.removeUser(client.id);
    this.broadcastState();
  }

  // --- Helper: Broadcast state to everyone ---
  private broadcastState() {
    // 1. User lista frissítése
    this.server.emit('state_update', this.appService.getAllUsers());

    // 2. Szavazás státusz frissítése
    const voteSession = this.appService.getVoteSession();
    this.server.emit('vote_status_update', voteSession);

    // 3. Ha mindenki szavazott, küldjük az eredményt
    if (
      voteSession.isActive &&
      voteSession.totalVoters > 0 &&
      voteSession.currentVotes === voteSession.totalVoters
    ) {
      this.server.emit('vote_result', this.appService.getVoteResults());
      // Opcionális: itt le is zárhatjuk automatikusan a szavazást
      // this.appService.startVote(false); // vagy külön flag, hogy vége
    }
  }

  // --- User Handlers ---

  @SubscribeMessage('toggle_reaction')
  handleReaction(@ConnectedSocket() client: Socket) {
    this.appService.toggleReaction(client.id);
    this.broadcastState();
  }

  @SubscribeMessage('raise_hand')
  handleRaiseHand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RaiseHandDto,
  ) {
    this.appService.toggleHand(client.id, data.type);
    this.broadcastState();
  }

  @SubscribeMessage('cast_vote')
  handleCastVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CastVoteDto,
  ) {
    this.appService.castVote(client.id, data.vote);
    this.broadcastState();
  }

  // --- Admin Handlers ---
  // (Ideális esetben Guard-dal védeni, de MVP-ben a kliens oldali elrejtés elég)

  @SubscribeMessage('admin_clear_reactions')
  handleClearReactions(@MessageBody() data: { targetUsername?: string }) {
    this.appService.clearReactions(data.targetUsername);
    this.broadcastState();
  }

  @SubscribeMessage('admin_lower_hand')
  handleAdminLowerHand(@MessageBody() data: AdminLowerHandDto) {
    this.appService.toggleHand(data.targetId, data.type, true);
    this.broadcastState();
  }

  @SubscribeMessage('start_vote')
  handleStartVote(@MessageBody() data: StartVoteDto) {
    this.appService.startVote(data.isAnonymous);
    // Külön eventet is küldhetünk, hogy "felugorjon" a modal
    this.server.emit('vote_started', { isAnonymous: data.isAnonymous });
    this.broadcastState();
  }
}
