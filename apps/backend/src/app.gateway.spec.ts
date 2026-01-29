import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@repo/shared-types';
import { Server, Socket } from 'socket.io';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { AppConfigService } from './configs/app-config.service';

describe('AppGateway', () => {
  let gateway: AppGateway;
  let appService: AppService;

  // Mock Socket
  const mockSocket = {
    id: 'socket1',
    handshake: {
      query: {
        username: 'TestUser',
        role: 'USER',
      },
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
    data: {},
  } as unknown as Socket;

  // Mock Server
  const mockServer = {
    emit: jest.fn(),
  } as unknown as Server;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppGateway,
        AppService,
        {
          provide: AppConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<AppGateway>(AppGateway);
    appService = module.get<AppService>(AppService);
    gateway.server = mockServer;

    // Silence logger
    jest.spyOn(gateway['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(gateway['logger'], 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should handle connection successfully', () => {
      const joinUserSpy = jest.spyOn(appService, 'joinUser').mockReturnValue({
        user: { id: 'u1', username: 'TestUser', role: 'USER' } as User,
        sessionId: 's1',
      });
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleConnection(mockSocket);

      expect(joinUserSpy).toHaveBeenCalledWith('socket1', 'TestUser', 'USER', undefined);
      expect(mockSocket.emit).toHaveBeenCalledWith('welcome', expect.anything());
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('should handle invalid connection query', () => {
      const badSocket = {
        id: 'bad',
        handshake: { query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      jest.spyOn(appService, 'joinUser'); // Should not be called if query parsing fails

      gateway.handleConnection(badSocket);

      expect(badSocket.emit).toHaveBeenCalledWith('error', expect.anything());

      // Fast-forward time to trigger disconnect
      jest.advanceTimersByTime(1000);
      expect(badSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should call service handleDisconnect', () => {
      const spy = jest.spyOn(appService, 'handleDisconnect');
      gateway.handleDisconnect(mockSocket);
      expect(spy).toHaveBeenCalledWith('socket1');
    });
  });

  describe('Handlers', () => {
    it('handleRaiseHand', () => {
      const spy = jest.spyOn(appService, 'toggleHand');
      // Mock broadcast
      jest.spyOn(gateway as any, 'broadcastState').mockImplementation(() => {});

      gateway.handleRaiseHand(mockSocket, { type: 'TOPIC' });
      expect(spy).toHaveBeenCalledWith('socket1', 'TOPIC');
    });

    it('handleCastVote', () => {
      const castSpy = jest.spyOn(appService, 'castVote');
      // Mock broadcast
      jest.spyOn(gateway as any, 'broadcastState').mockImplementation(() => {});

      // Mock getting vote session to check for auto-close
      jest.spyOn(appService, 'getVoteSession').mockReturnValue({
        isActive: true,
        totalVoters: 5,
        currentVotes: 1, // not full yet
        isAnonymous: false,
      });

      gateway.handleCastVote(mockSocket, { vote: 'IGEN' });
      expect(castSpy).toHaveBeenCalledWith('socket1', 'IGEN');
      expect(mockSocket.emit).toHaveBeenCalledWith('vote_accepted');
    });

    it('handleCastVote - auto close', () => {
      const castSpy = jest.spyOn(appService, 'castVote');
      // Mock broadcast
      jest.spyOn(gateway as any, 'broadcastState').mockImplementation(() => {});

      // Mock session showing FULL votes
      jest.spyOn(appService, 'getVoteSession').mockReturnValue({
        isActive: true,
        totalVoters: 5,
        currentVotes: 5, // FULL
        isAnonymous: false,
      });
      const stopSpy = jest.spyOn(appService, 'stopVote');
      const resultsSpy = jest

        .spyOn(appService, 'getVoteResults')
        .mockReturnValue({ isAnonymous: false, summary: { IGEN: 3, NEM: 2, TARTOZKODOM: 0 } });

      gateway.handleCastVote(mockSocket, { vote: 'IGEN' });
      expect(castSpy).toHaveBeenCalledWith('socket1', 'IGEN');
      expect(stopSpy).toHaveBeenCalled(); // Auto-closed
      expect(resultsSpy).toHaveBeenCalled();
      expect(mockServer.emit).toHaveBeenCalledWith('vote_result', expect.anything());
    });

    it('handleLogout', () => {
      const spy = jest.spyOn(appService, 'logout');
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleLogout(mockSocket);
      expect(spy).toHaveBeenCalledWith('socket1');
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('handleReaction', () => {
      const spy = jest.spyOn(appService, 'toggleReaction');
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleReaction(mockSocket);
      expect(spy).toHaveBeenCalledWith('socket1');
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('handleClearReactions (Admin)', () => {
      const spy = jest.spyOn(appService, 'clearReactions');
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleClearReactions({ targetUsername: 'U1' });
      expect(spy).toHaveBeenCalledWith('U1');
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('handleAdminLowerHand (Admin)', () => {
      const spy = jest.spyOn(appService, 'toggleHand');
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleAdminLowerHand({ targetId: 'u1', type: 'TOPIC' });
      expect(spy).toHaveBeenCalledWith('u1', 'TOPIC', true);
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('handleStartVote (Admin)', () => {
      const spy = jest.spyOn(appService, 'startVote').mockImplementation(() => {});
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleStartVote(mockSocket, { isAnonymous: true });
      expect(spy).toHaveBeenCalledWith(true);
      expect(mockServer.emit).toHaveBeenCalledWith('vote_started', { isAnonymous: true });
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('handleStopVote (Admin)', () => {
      const spy = jest.spyOn(appService, 'stopVote');
      const spyResults = jest
        .spyOn(appService, 'getVoteResults')
        .mockReturnValue({ isAnonymous: true, summary: { IGEN: 3, NEM: 2, TARTOZKODOM: 1 } });
      const broadcastSpy = jest
        .spyOn(gateway as any, 'broadcastState')
        .mockImplementation(() => {});

      gateway.handleStopVote();
      expect(spyResults).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      expect(mockServer.emit).toHaveBeenCalledWith('vote_result', expect.anything());
      expect(broadcastSpy).toHaveBeenCalled();
    });
  });
});
