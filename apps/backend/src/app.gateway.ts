import { Logger, UseFilters } from '@nestjs/common';
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
import { Roles } from './roles.decorator';
import type { AuthenticatedSocket } from './socket-types';
import { WebsocketExceptionFilter } from './ws-exception.filter';

@WebSocketGateway({ cors: { origin: '*' } })
@UseFilters(new WebsocketExceptionFilter())
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  logger = new Logger('AppGateway');

  constructor(private readonly appService: AppService) {}

  // --- Connection Lifecycle ---

  handleConnection(client: Socket) {
    try {
      const { username, role } = this.parseConnectionQuery(client);

      const authClient = client as AuthenticatedSocket;
      const user = this.appService.joinUser(client.id, username, role);
      authClient.data.user = user;

      this.logger.log(`User connected: ${user.username} (clientId=${client.id})`);
      client.emit('welcome', { user });
      this.broadcastState();
    } catch (error) {
      this.handleConnectionError(client, error);
    }
  }

  private parseConnectionQuery(client: Socket): { username: string; role: UserRole } {
    const { query } = client.handshake;

    const rawUsername = Array.isArray(query.username) ? query.username[0] : query.username;
    const rawRole = Array.isArray(query.role) ? query.role[0] : query.role;

    if (!rawUsername) {
      throw new Error('Connection rejected: Username is required.');
    }

    const role: UserRole = (rawRole as UserRole) ?? 'USER';

    return { username: rawUsername, role };
  }

  private handleConnectionError(client: Socket, error: unknown) {
    // Error safe casting
    const message = error instanceof Error ? error.message : 'Unknown connection error';

    this.logger.warn(`Connection failed (clientId=${client.id}): ${message}`);

    client.emit('error', {
      type: 'ConnectionError',
      message,
    });

    // Graceful disconnect: hagyunk időt a kliensnek megkapni az error eventet
    setTimeout(() => client.disconnect(true), 1000);
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
  @Roles(['USER'], 'Csak normál felhasználók reagálhatnak!')
  handleReaction(@ConnectedSocket() client: AuthenticatedSocket) {
    this.appService.toggleReaction(client.id);
    this.broadcastState();
  }

  @SubscribeMessage('raise_hand')
  handleRaiseHand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: RaiseHandDto,
  ) {
    this.logger.log(`Toggling hand (${data.type}) for clientId=${client.id}`);
    this.appService.toggleHand(client.id, data.type);
    this.broadcastState();
  }

  @SubscribeMessage('cast_vote')
  @Roles(['USER'], 'Nincs jogosultságod szavazni!')
  handleCastVote(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: CastVoteDto) {
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

  @SubscribeMessage('admin_clear_reactions')
  @Roles(['ADMIN'], 'Csak adminok törölhetik a reakciókat!')
  handleClearReactions(@MessageBody() data: { targetUsername?: string }) {
    this.logger.log(`Admin clearing reactions for ${data.targetUsername ?? 'all users'}`);
    this.appService.clearReactions(data.targetUsername);
    this.broadcastState();
  }

  @SubscribeMessage('admin_lower_hand')
  @Roles(['ADMIN'], 'Csak adminok engedélyezhetik a kezek leengedését!')
  handleAdminLowerHand(@MessageBody() data: AdminLowerHandDto) {
    this.logger.log(`Admin lowering hand (${data.type}) for targetId=${data.targetId}`);
    this.appService.toggleHand(data.targetId, data.type, true);
    this.broadcastState();
  }

  @SubscribeMessage('start_vote')
  @Roles(['ADMIN'], 'Csak admin indíthat szavazást!')
  handleStartVote(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: StartVoteDto,
  ) {
    this.logger.log(`Starting vote (isAnonymous=${data.isAnonymous}) by clientId=${client.id}`);
    this.appService.startVote(data.isAnonymous);
    this.server.emit('vote_started', { isAnonymous: data.isAnonymous });
    this.broadcastState();
  }

  @SubscribeMessage('stop_vote')
  @Roles(['ADMIN'], 'Csak admin állíthatja le a szavazást!')
  handleStopVote() {
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
