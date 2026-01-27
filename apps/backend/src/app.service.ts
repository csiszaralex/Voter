import { Injectable, Logger } from '@nestjs/common';
import { HandType, User, UserRole, VoteOption, VoteResult, VoteSession } from '@repo/shared-types';
import { randomUUID } from 'crypto';
import { AppConfigService } from './configs/app-config.service';

interface UserSession {
  sessionId: string;
  user: User;
  socketId: string | null;
  disconnectTimeout?: NodeJS.Timeout;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // State
  private sessions: Map<string, UserSession> = new Map(); // sessionId -> Session
  private socketToSessionId: Map<string, string> = new Map(); // socketId -> sessionId

  // Votes: userId -> VoteOption (Persistent across reconnects)
  private votes: Map<string, VoteOption> = new Map();

  private voteConfig: { isActive: boolean; isAnonymous: boolean } = {
    isActive: false,
    isAnonymous: false,
  };

  private readonly CLEANUP_TIMEOUT_MS = 60 * 1000; // 1 perc

  private stateChangeCallback: (() => void) | null = null;

  constructor(private configService: AppConfigService) {}

  onStateChange(callback: () => void) {
      this.stateChangeCallback = callback;
  }

  private notifyStateChange() {
      if (this.stateChangeCallback) {
          this.stateChangeCallback();
      }
  }

  // --- User Management ---

  joinUser(socketId: string, username: string, role: UserRole, existingSessionId?: string): { user: User; sessionId: string } {
    let session: UserSession | undefined;

    // 1. Try to restore session
    if (existingSessionId) {
      if (this.sessions.has(existingSessionId)) {
        session = this.sessions.get(existingSessionId);
        this.logger.log(`Session restored for ${username} (${existingSessionId})`);
      } else {
        // Session validation failed - explicit reject
        throw new Error('Session invalid or expired');
      }
    }

    // 2. If no session, create new
    if (!session) {
       // Case-insensitive name check
       const isTaken = Array.from(this.sessions.values()).some(
        (s) => s.user.username.toLowerCase() === username.toLowerCase()
      );

      if (isTaken) {
        throw new Error('Ez a név már foglalt!');
      }

      const newSessionId = randomUUID();
      const newUserId = randomUUID();

      session = {
        sessionId: newSessionId,
        user: {
          id: newUserId,
          username,
          role,
          reaction: null,
          hands: { topicAt: null, replyAt: null },
          isConnected: true,
        },
        socketId: null, // Will set below
      };

      this.sessions.set(newSessionId, session);
      this.logger.log(`New session created for ${username} (${newSessionId})`);
    }

    // 3. Update Session State (Reconnect)
    if (session.disconnectTimeout) {
      clearTimeout(session.disconnectTimeout);
      session.disconnectTimeout = undefined;
    }

    // If there was an old socket, remove mapping
    if (session.socketId) {
      this.socketToSessionId.delete(session.socketId);
    }

    session.socketId = socketId;
    session.user.isConnected = true;

    // Update Role if changed? (Usually stick to session role, but maybe allow update?)
    // For now, keep original role logic from 'join'.
    // Actually, if I rejoin with different role param but same sessionId, should I update role?
    // Let's assume identity is tied to session. If they want different role, they logout or use different browser.
    // However, we might want to update the role if provided? Let's just update it.
    session.user.role = role;

    this.socketToSessionId.set(socketId, session.sessionId);

    return { user: session.user, sessionId: session.sessionId };
  }

  handleDisconnect(socketId: string) {
    const sessionId = this.socketToSessionId.get(socketId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.logger.log(`User disconnected: ${session.user.username} (waiting for reconnect)`);

    session.user.isConnected = false;
    session.socketId = null;
    this.socketToSessionId.delete(socketId);

    // Start Cleanup Timer
    session.disconnectTimeout = setTimeout(() => {
      this.removeSession(sessionId);
    }, this.CLEANUP_TIMEOUT_MS);
  }

  logout(socketId: string) {
    const sessionId = this.socketToSessionId.get(socketId);
    if (sessionId) {
      this.removeSession(sessionId);
    }
  }

  private removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.logger.log(`Removing session: ${session.user.username} (${sessionId})`);

    if (session.disconnectTimeout) clearTimeout(session.disconnectTimeout);

    // Remove Vote
    this.votes.delete(session.user.id);

    // Remove Socket Mapping (if exists)
    if (session.socketId) {
        this.socketToSessionId.delete(session.socketId);
        // Note: We can't easily disconnect the socket here without the Gateway server instance,
        // but usually logout is triggered by client or cleanup.
        // If cleanup, socket is already gone.
    }

    this.sessions.delete(sessionId);
    this.notifyStateChange();
  }

  getAllUsers(): User[] {
    return Array.from(this.sessions.values()).map(s => s.user);
  }

  getUserBySocketId(socketId: string): User | undefined {
    const sessionId = this.socketToSessionId.get(socketId);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId)?.user;
  }

  // --- Actions (Lookup by userId or sessionId via socketId) ---

  private getSessionBySocketId(socketId: string): UserSession | undefined {
    const sessionId = this.socketToSessionId.get(socketId);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId);
  }

  toggleReaction(socketId: string) {
    const session = this.getSessionBySocketId(socketId);
    if (session) {
      console.log('Toggling reaction for', session.user.username);
      session.user.reaction = session.user.reaction === 'LIKE' ? null : 'LIKE';
    }
  }

  clearReactions(targetUsername?: string) {
    if (targetUsername) {
      const session = Array.from(this.sessions.values()).find((s) => s.user.username === targetUsername);
      if (session) session.user.reaction = null;
    } else {
      this.sessions.forEach((s) => (s.user.reaction = null));
    }
  }

  toggleHand(targetId: string, type: HandType, forceLower = false) {
    // targetId comes from frontend.
    // OLD: targetId was socketId.
    // NEW: targetId is userId (stable UUID).
    // We need to find session by userId.

    const session = Array.from(this.sessions.values()).find(s => s.user.id === targetId);

    // Fallback: Check if targetId matches a socketId (for compatibility or if frontend sends socketId?)
    // But frontend receives User object with id=UUID, so it should send UUID.

    if (!session) {
        // Try strict lookup by socketId just in case (e.g. self-action uses socketId?)
        // Actually, for "Raise Hand" (self), the Gateway passes client.id.
        // So for "self" actions, targetId might be socketId.
        // But for "admin_lower_hand", targetId is the User.id.
        // I need to handle both?

        // Let's assume:
        // If it's a UUID (User.id) -> find by user.id
        // If NOT found, maybe it's a socketId? -> find by socketToSession

        // Simpler: Gateway resolves "client.id" to "User" before calling this?
        // No, Gateway calls `this.appService.toggleHand(client.id, ...)` for self.
        // And `this.appService.toggleHand(data.targetId, ...)` for admin.

        // So I need to support BOTH?
        // Or I refactor Gateway to resolve user first?
        // I will keep logic inside Service to be robust.

        const sessionBySocket = this.getSessionBySocketId(targetId);
        if (sessionBySocket) {
             this.toggleHandInternal(sessionBySocket.user, type, forceLower);
             return;
        }
        return;
    }

    this.toggleHandInternal(session.user, type, forceLower);
  }

  private toggleHandInternal(user: User, type: HandType, forceLower: boolean) {
    if (forceLower) {
      if (type === 'TOPIC') user.hands.topicAt = null;
      if (type === 'REPLY') user.hands.replyAt = null;
    } else {
      if (type === 'TOPIC') {
        user.hands.topicAt = user.hands.topicAt ? null : Date.now();
      }
      if (type === 'REPLY') {
        user.hands.replyAt = user.hands.replyAt ? null : Date.now();
      }
    }
  }

  // --- Voting ---

  startVote(isAnonymous: boolean) {
    // Count connected users? Or all users?
    // "active voters" -> usually present.
    const voterCount = Array.from(this.sessions.values()).filter((s) => s.user.role === 'USER' && s.user.isConnected).length;

    if (voterCount < 1) {
      throw new Error('Nincs jelen szavazóképes felhasználó, így nem indítható szavazás.');
    }
    this.voteConfig = { isActive: true, isAnonymous };
    this.votes.clear();
  }

  stopVote() {
    this.voteConfig.isActive = false;
  }

  castVote(socketId: string, vote: VoteOption) {
    if (!this.voteConfig.isActive) return;

    const session = this.getSessionBySocketId(socketId);
    if (session && session.user.role === 'USER') {
      this.votes.set(session.user.id, vote); // Store by userId
    }
  }

  getVoteSession(): VoteSession {
     // Active voters -> connected users only?
     // Or we allow disconnected users to "count" as potential voters?
     // Usually, only connected users can vote.
    const voterCount = Array.from(this.sessions.values()).filter((s) => s.user.role === 'USER' && s.user.isConnected).length;
    return {
      isActive: this.voteConfig.isActive,
      isAnonymous: this.voteConfig.isAnonymous,
      totalVoters: Math.max(0, voterCount),
      currentVotes: this.votes.size,
    };
  }

  getVoteResults(): VoteResult {
    const summary: Record<VoteOption, number> = {
      IGEN: 0,
      NEM: 0,
      TARTOZKODOM: 0,
    };
    const details: { username: string; vote: VoteOption }[] = [];

    // Iterate over votes (UserIds)
    this.votes.forEach((vote, userId) => {
      summary[vote]++;

      // Find user for details
      if (!this.voteConfig.isAnonymous) {
         const session = Array.from(this.sessions.values()).find(s => s.user.id === userId);
         if (session) {
             details.push({ username: session.user.username, vote });
         }
      }
    });

    return {
      isAnonymous: this.voteConfig.isAnonymous,
      summary,
      details: this.voteConfig.isAnonymous ? undefined : details,
    };
  }
}
