import { socket } from '@/lib/socket';
import { act, renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';
import { useGameState } from './useGameState';

vi.mock('@/lib/socket', () => {
  return {
    socket: {
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      io: {
        opts: { query: {} },
      },
    },
  };
});

describe('useGameState Hook', () => {
  let eventHandlers: Record<string, (data?: unknown) => void> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    eventHandlers = {};

    // Amikor a hook meghívja a socket.on-t, elmentjük a callbacket
    (socket.on as Mock).mockImplementation((event, handler) => {
      eventHandlers[event] = handler;
    });
  });

  // Helper: Szimulálja, hogy a szerver küldött egy üzenetet
  const serverEmit = (event: string, data?: unknown) => {
    act(() => {
      if (eventHandlers[event]) {
        eventHandlers[event](data);
      }
    });
  };

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.users).toEqual([]);
    expect(result.current.currentUser).toBeNull();
  });

  it('should join and connect socket with correct params', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.join('TestUser', 'USER');
    });

    // Ellenőrizzük, hogy beállította-e a query paramétereket
    expect(socket.io.opts.query).toEqual({
      username: 'TestUser',
      role: 'USER',
    });
    expect(socket.connect).toHaveBeenCalled();
  });

  it('should handle "welcome" event correctly', async () => {
    const { result } = renderHook(() => useGameState());

    const mockUser = { id: '123', username: 'TestUser', role: 'voter' };
    const sessionId = 'session-xyz';

    // Szimuláljuk a szerver választ
    serverEmit('welcome', { user: mockUser, sessionId });

    // State update ellenőrzés
    expect(result.current.currentUser).toEqual(mockUser);

    // SessionStorage ellenőrzés
    expect(sessionStorage.getItem('voter_sessionId')).toBe(sessionId);
    expect(sessionStorage.getItem('voter_username')).toBe('TestUser');
  });

  it('should auto-reconnect if session exists in storage', () => {
    // Előkészítjük a storage-ot a render előtt
    sessionStorage.setItem('voter_sessionId', 'old-session');
    sessionStorage.setItem('voter_username', 'OldUser');
    sessionStorage.setItem('voter_role', 'admin');

    renderHook(() => useGameState());

    // Automatikusan meg kellett hívnia a connect-et a régi adatokkal
    expect(socket.connect).toHaveBeenCalled();
    expect(socket.io.opts.query).toMatchObject({
      username: 'OldUser',
      role: 'admin',
      sessionId: 'old-session',
    });
  });

  it('should update users list on "state_update"', () => {
    const { result } = renderHook(() => useGameState());

    const usersList = [
      { id: '1', username: 'A' },
      { id: '2', username: 'B' },
    ];
    serverEmit('state_update', usersList);

    expect(result.current.users).toEqual(usersList);
  });

  it('should handle voting process', () => {
    const { result } = renderHook(() => useGameState());

    // 1. Session start
    serverEmit('vote_status_update', { isActive: true, currentVotes: 0 });
    expect(result.current.voteSession?.isActive).toBe(true);
    expect(result.current.hasVoted).toBe(false);

    // 2. Vote accepted
    serverEmit('vote_accepted');
    expect(result.current.hasVoted).toBe(true);

    // 3. Result received
    const voteResult = { average: 5, distribution: {} };
    serverEmit('vote_result', voteResult);
    expect(result.current.lastVoteResult).toEqual(voteResult);
  });

  it('should handle logout properly', () => {
    // Először beállítunk egy állapotot
    sessionStorage.setItem('voter_sessionId', '123');
    const { result } = renderHook(() => useGameState());

    // Act: Logout
    act(() => {
      result.current.logout();
    });

    // Assert
    expect(sessionStorage.getItem('voter_sessionId')).toBeNull(); // Storage clear
    expect(socket.emit).toHaveBeenCalledWith('logout'); // Server notify
    expect(socket.disconnect).toHaveBeenCalled(); // Socket close
    expect(result.current.currentUser).toBeNull(); // State reset
  });

  it('should handle errors and clear session on invalid session error', () => {
    sessionStorage.setItem('voter_sessionId', 'bad-session');
    const { result } = renderHook(() => useGameState());

    // Szimulálunk egy "Session invalid" hibát
    serverEmit('error', 'Session invalid or expired');

    expect(result.current.error).toBe('Session invalid or expired');
    expect(sessionStorage.getItem('voter_sessionId')).toBeNull(); // Törölnie kellett
  });
});
