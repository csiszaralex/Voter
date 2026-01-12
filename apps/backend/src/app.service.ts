import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HandType,
  User,
  VoteOption,
  VoteResult,
  VoteSession,
} from '@repo/shared-types';

@Injectable()
export class AppService {
  // State
  private users: Map<string, User> = new Map();
  private votes: Map<string, VoteOption> = new Map();
  private voteConfig: { isActive: boolean; isAnonymous: boolean } = {
    isActive: false,
    isAnonymous: false,
  };

  constructor(private configService: ConfigService) {}

  // --- User Management ---

  joinUser(socketId: string, username: string): User {
    // Case-insensitive név ellenőrzés
    const isTaken = Array.from(this.users.values()).some(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    );

    if (isTaken) {
      throw new ConflictException('Ez a név már foglalt!');
    }

    const admins = this.configService.get<string>('ADMINS')?.split(',') || [];
    const isAdmin = admins.includes(username);

    const newUser: User = {
      id: socketId,
      username,
      isAdmin,
      reaction: null,
      hands: { topicAt: null, replyAt: null },
    };

    this.users.set(socketId, newUser);
    return newUser;
  }

  removeUser(socketId: string) {
    this.users.delete(socketId);
    // Ha szavazás közben lép ki, töröljük a szavazatát is,
    // hogy a "currentVotes" szám pontos maradjon.
    this.votes.delete(socketId);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUser(socketId: string): User | undefined {
    return this.users.get(socketId);
  }

  // --- Actions ---

  toggleReaction(socketId: string) {
    const user = this.users.get(socketId);
    if (user) {
      user.reaction = user.reaction === 'LIKE' ? null : 'LIKE';
    }
  }

  clearReactions(targetUsername?: string) {
    if (targetUsername) {
      const user = Array.from(this.users.values()).find(
        (u) => u.username === targetUsername,
      );
      if (user) user.reaction = null;
    } else {
      this.users.forEach((u) => (u.reaction = null));
    }
  }

  toggleHand(socketId: string, type: HandType, forceLower = false) {
    const user = this.users.get(socketId);
    if (!user) return;

    if (forceLower) {
      if (type === 'TOPIC') user.hands.topicAt = null;
      if (type === 'REPLY') user.hands.replyAt = null;
    } else {
      // Toggle logika
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
    this.voteConfig = { isActive: true, isAnonymous };
    this.votes.clear();
  }

  castVote(socketId: string, vote: VoteOption) {
    if (!this.voteConfig.isActive) return;

    const user = this.users.get(socketId);
    // Admin nem szavazhat (business logic döntés, kivehető ha kell)
    if (user && !user.isAdmin) {
      this.votes.set(socketId, vote);
    }
  }

  getVoteSession(): VoteSession {
    const adminCount = Array.from(this.users.values()).filter(
      (u) => u.isAdmin,
    ).length;
    return {
      isActive: this.voteConfig.isActive,
      isAnonymous: this.voteConfig.isAnonymous,
      totalVoters: Math.max(0, this.users.size - adminCount),
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

    this.votes.forEach((vote, socketId) => {
      summary[vote]++;
      const user = this.users.get(socketId);
      if (user && !this.voteConfig.isAnonymous) {
        details.push({ username: user.username, vote });
      }
    });

    return {
      isAnonymous: this.voteConfig.isAnonymous,
      summary,
      details: this.voteConfig.isAnonymous ? undefined : details,
    };
  }
}
