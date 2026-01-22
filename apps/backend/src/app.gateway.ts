import { Logger } from '@nestjs/common';
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
import { UserRole } from '@repo/shared-types';
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
  logger = new Logger('AppGateway');

  constructor(private readonly appService: AppService) {}

  // --- Connection Lifecycle ---

  handleConnection(client: Socket) {
    try {
      const username = client.handshake.query.username as string;
      const role = (client.handshake.query.role as UserRole) ?? 'USER';

      if (!username) {
        this.logger.warn(`Connection attempt without username (clientId=${client.id})`);
        client.disconnect();
        return;
      }

      const user = this.appService.joinUser(client.id, username, role);
      this.logger.log(`User connected: ${user.username} (clientId=${client.id})`);

      // Csak az új usernek visszajelzés, hogy sikerült (opcionális)
      client.emit('welcome', { user });

      this.broadcastState();
    } catch (error) {
      this.logger.error(
        `Error during handleConnection for clientId=${client.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      client.emit('error', { message: error.message });
      setTimeout(() => client.disconnect(), 1000);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected (clientId=${client.id})`);
    this.appService.removeUser(client.id);
    this.broadcastState();
  }

  // --- Helper: Broadcast state to everyone ---
  private broadcastState() {
    this.server.emit('state_update', this.appService.getAllUsers());
    this.server.emit('vote_status_update', this.appService.getVoteSession());
  }

  // --- User Handlers ---

  @SubscribeMessage('toggle_reaction')
  handleReaction(@ConnectedSocket() client: Socket) {
    // Csak USER szavazhat/reagálhat
    const user = this.appService.getUser(client.id);
    if (!user || user.role !== 'USER') {
      this.logger.warn(`User ${user?.username} (${user?.role}) tried to toggle reaction`);
      client.emit('error', { message: 'Only regular users can toggle reactions.' });
      return;
    }

    this.logger.log(`Toggling reaction for clientId=${client.id}`);
    this.appService.toggleReaction(client.id);
    this.broadcastState();
  }

  @SubscribeMessage('raise_hand')
  handleRaiseHand(@ConnectedSocket() client: Socket, @MessageBody() data: RaiseHandDto) {
    this.logger.log(`Toggling hand (${data.type}) for clientId=${client.id}`);
    this.appService.toggleHand(client.id, data.type);
    this.broadcastState();
  }

  @SubscribeMessage('cast_vote')
  handleCastVote(@ConnectedSocket() client: Socket, @MessageBody() data: CastVoteDto) {
    const user = this.appService.getUser(client.id);
    if (!user || user.role !== 'USER') {
      this.logger.warn(`User ${user?.username} (${user?.role}) tried to cast vote`);
      client.emit('error', { message: 'Nincs jogosultságod szavazni!' });
      return;
    }

    this.logger.log(`Casting vote for clientId=${client.id}`);
    this.appService.castVote(client.id, data.vote);
    client.emit('vote_accepted');
    const voteSession = this.appService.getVoteSession();

    if (
      voteSession.isActive &&
      voteSession.totalVoters > 0 &&
      voteSession.currentVotes === voteSession.totalVoters
    ) {
      this.logger.log('All votes received, auto-closing session');
      const results = this.appService.getVoteResults();
      this.appService.stopVote();
      this.server.emit('vote_result', results);
    }
    this.broadcastState();
  }

  // --- Admin Handlers ---
  // (Ideális esetben Guard-dal védeni, de MVP-ben a kliens oldali elrejtés elég)

  @SubscribeMessage('admin_clear_reactions')
  handleClearReactions(@MessageBody() data: { targetUsername?: string }) {
    this.logger.log(`Admin clearing reactions for ${data.targetUsername ?? 'all users'}`);
    this.appService.clearReactions(data.targetUsername);
    this.broadcastState();
  }

  @SubscribeMessage('admin_lower_hand')
  handleAdminLowerHand(@MessageBody() data: AdminLowerHandDto) {
    this.logger.log(`Admin lowering hand (${data.type}) for targetId=${data.targetId}`);
    this.appService.toggleHand(data.targetId, data.type, true);
    this.broadcastState();
  }

  @SubscribeMessage('start_vote')
  handleStartVote(@ConnectedSocket() client: Socket, @MessageBody() data: StartVoteDto) {
    try {
      const user = this.appService.getUser(client.id);
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Csak admin indíthat szavazást!');
      }

      this.logger.log(`Starting vote (isAnonymous=${data.isAnonymous}) by clientId=${client.id}`);
      this.appService.startVote(data.isAnonymous);
      this.server.emit('vote_started', { isAnonymous: data.isAnonymous });
      this.broadcastState();
    } catch (e) {
      this.logger.error(
        `Error while starting vote by clientId=${client.id}`,
        e instanceof Error ? e.stack : undefined,
      );
      // Itt küldjük vissza a hibát specifikusan annak, aki indította
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('stop_vote')
  handleStopVote(@ConnectedSocket() client: Socket) {
    const user = this.appService.getUser(client.id);
    if (!user || user.role !== 'ADMIN') {
      this.logger.warn(`User ${user?.username} (${user?.role}) tried to stop vote`);
      return;
    }

    this.logger.log('Stopping vote manually and broadcasting results');
    // Kényszerített lezárás és eredmény hirdetés
    const results = this.appService.getVoteResults();
    this.appService.stopVote(); // Ez átállítja az isActive-et false-ra

    // Először kiküldjük az eredményt
    this.server.emit('vote_result', results);
    // Majd frissítjük a státuszt (hogy eltűnjön a modal)
    this.broadcastState();
  }
}
