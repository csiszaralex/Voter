import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { AppConfigService } from './configs/app-config.service';

describe('AppService', () => {
  let service: AppService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let appConfigService: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: AppConfigService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    appConfigService = module.get<AppConfigService>(AppConfigService);

    module.useLogger(false);
  });

  describe('User Management', () => {
    it('should join a new user', () => {
      const result = service.joinUser('socket1', 'TestUser', 'USER');

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('TestUser');
      expect(result.sessionId).toBeDefined();
      expect(service.getUserBySocketId('socket1')).toBeDefined();
    });

    it('should reject duplicate username', () => {
      service.joinUser('socket1', 'TestUser', 'USER');
      expect(() => {
        service.joinUser('socket2', 'TestUser', 'USER');
      }).toThrow('Ez a név már foglalt!');
    });

    it('should restore session by sessionId', () => {
      const { sessionId } = service.joinUser('socket1', 'TestUser', 'USER');

      // Simulate disconnect
      service.handleDisconnect('socket1');

      // Reconnect with new socket but same sessionId
      const result = service.joinUser('socket2', 'TestUser', 'USER', sessionId);

      expect(result.sessionId).toBe(sessionId);
      expect(service.getUserBySocketId('socket2')).toBeDefined();
      expect(service.getUserBySocketId('socket1')).toBeUndefined();
    });

    it('should throw error for invalid sessionId', () => {
      expect(() => {
        service.joinUser('socket1', 'TestUser', 'USER', 'invalid-session');
      }).toThrow('Session invalid or expired');
    });

    it('should update user role on rejoin', () => {
      const { sessionId } = service.joinUser('socket1', 'TestUser', 'USER');

      const result = service.joinUser('socket2', 'TestUser', 'ADMIN', sessionId);
      expect(result.user.role).toBe('ADMIN');
    });
  });

  describe('Disconnect and Cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should mark user disconnected on disconnect', () => {
      const { sessionId } = service.joinUser('socket1', 'TestUser', 'USER');
      service.handleDisconnect('socket1');

      const session = service['sessions'].get(sessionId);
      expect(session?.user.isConnected).toBe(false);
      expect(session?.socketId).toBeNull();
    });

    it('should remove session after timeout', () => {
      const { sessionId } = service.joinUser('socket1', 'TestUser', 'USER');

      service.handleDisconnect('socket1');

      jest.advanceTimersByTime(60001); // Advance past CLEANUP_TIMEOUT_MS

      expect(service['sessions'].has(sessionId)).toBe(false);
    });
  });

  describe('Hand Raising', () => {
    it('should toggle hand raise', () => {
      const { user } = service.joinUser('socket1', 'TestUser', 'USER');

      service.toggleHand(user.id, 'TOPIC');
      expect(service.getAllUsers()[0].hands.topicAt).toBeDefined();

      service.toggleHand(user.id, 'TOPIC');
      expect(service.getAllUsers()[0].hands.topicAt).toBeNull();
    });

    it('should allow forcing hand lower', () => {
      const { user } = service.joinUser('socket1', 'TestUser', 'USER');

      service.toggleHand(user.id, 'TOPIC');
      service.toggleHand(user.id, 'TOPIC', true); // Force lower

      expect(service.getAllUsers()[0].hands.topicAt).toBeNull();
    });
  });

  describe('Voting', () => {
    it('should not allow start vote if no voters present', () => {
      expect(() => service.startVote(false)).toThrow(
        'Nincs jelen szavazóképes felhasználó, így nem indítható szavazás.',
      );
    });

    it('should start vote with present voters', () => {
      service.joinUser('socket1', 'Voter1', 'USER');
      service.startVote(false);

      const session = service.getVoteSession();
      expect(session.isActive).toBe(true);
      expect(session.totalVoters).toBe(1);
    });

    it('should cast vote', () => {
      service.joinUser('socket1', 'Voter1', 'USER');
      service.startVote(false);

      service.castVote('socket1', 'IGEN');

      const results = service.getVoteResults();
      expect(results.summary.IGEN).toBe(1);
    });

    it('should not cast vote if vote not active', () => {
      service.joinUser('socket1', 'Voter1', 'USER');

      service.castVote('socket1', 'IGEN');

      const results = service.getVoteResults();
      expect(results.summary.IGEN).toBe(0);
    });

    it('should not cast vote if user is not USER role', () => {
      service.joinUser('socket1', 'Admin', 'ADMIN');
      // We need at least one USER to start vote usually, or mock it?
      // startVote checks for 'USER' role presence.
      // So let's add a dummy USER too.
      service.joinUser('socket2', 'Voter1', 'USER');

      service.startVote(false);
      service.castVote('socket1', 'IGEN'); // Admin tries to vote

      const results = service.getVoteResults();
      expect(results.summary.IGEN).toBe(0);
    });

    it('should return details if vote is not anonymous', () => {
      service.joinUser('socket1', 'Voter1', 'USER');
      service.startVote(false); // Not anonymous
      service.castVote('socket1', 'IGEN');

      const results = service.getVoteResults();
      expect(results.isAnonymous).toBe(false);
      expect(results.details).toBeDefined();
      expect(results.details).toHaveLength(1);
      expect(results.details![0].username).toBe('Voter1');
    });

    it('should stop vote', () => {
      service.joinUser('socket1', 'Voter1', 'USER');
      service.startVote(false);
      service.stopVote();

      const session = service.getVoteSession();
      expect(session.isActive).toBe(false);
    });
  });

  describe('Reactions and Other Actions', () => {
    it('should toggle reaction', () => {
      service.joinUser('s1', 'U1', 'USER');
      service.toggleReaction('s1');
      expect(service.getUserBySocketId('s1')?.reaction).toBe('LIKE');
      service.toggleReaction('s1');
      expect(service.getUserBySocketId('s1')?.reaction).toBeNull();
    });

    it('should clear all reactions', () => {
      service.joinUser('s1', 'U1', 'USER');
      service.joinUser('s2', 'U2', 'USER');
      service.toggleReaction('s1');
      service.toggleReaction('s2');

      service.clearReactions();
      expect(service.getUserBySocketId('s1')?.reaction).toBeNull();
      expect(service.getUserBySocketId('s2')?.reaction).toBeNull();
    });

    it('should clear specific user reaction', () => {
      service.joinUser('s1', 'U1', 'USER');
      service.toggleReaction('s1');

      service.clearReactions('U1');
      expect(service.getUserBySocketId('s1')?.reaction).toBeNull();
    });
  });

  describe('State Change Notification', () => {
    it('should notify listener on state change', () => {
      const spy = jest.fn();
      service.onStateChange(spy);

      // Trigger state change via removeSession (implied by logout)
      service.joinUser('s1', 'U1', 'USER');
      service.logout('s1');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('toggleHand should work with REPLY', () => {
      const { user } = service.joinUser('s1', 'U1', 'USER');
      service.toggleHand(user.id, 'REPLY');
      expect(service.getAllUsers()[0].hands.replyAt).toBeDefined();
      service.toggleHand(user.id, 'REPLY');
      expect(service.getAllUsers()[0].hands.replyAt).toBeNull();
    });

    it('toggleHand should force lower REPLY', () => {
      const { user } = service.joinUser('s1', 'U1', 'USER');
      service.toggleHand(user.id, 'REPLY');
      service.toggleHand(user.id, 'REPLY', true);
      expect(service.getAllUsers()[0].hands.replyAt).toBeNull();
    });

    it('toggleHand should fallback to socketId lookup', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user } = service.joinUser('s1', 'U1', 'USER');
      // Use socketId instead of user.id
      service.toggleHand('s1', 'TOPIC');
      expect(service.getAllUsers()[0].hands.topicAt).toBeDefined();
    });

    it('toggleHand should do nothing if user not found', () => {
      service.toggleHand('non-existent', 'TOPIC');
      // valid, no crash
      expect(true).toBe(true);
    });
  });
});
