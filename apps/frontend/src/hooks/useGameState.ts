import { socket } from '@/lib/socket';
import type { User, UserRole, VoteResult, VoteSession } from '@repo/shared-types';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEYS = {
  SESSION_ID: 'voter_sessionId',
  USERNAME: 'voter_username',
  ROLE: 'voter_role',
};

export function useGameState() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null);
  const [lastVoteResult, setLastVoteResult] = useState<VoteResult | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Helpers for SessionStorage ---
  const saveSession = (sessionId: string, username: string, role: UserRole) => {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    sessionStorage.setItem(STORAGE_KEYS.USERNAME, username);
    sessionStorage.setItem(STORAGE_KEYS.ROLE, role);
  };

  const clearSession = () => {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    sessionStorage.removeItem(STORAGE_KEYS.USERNAME);
    sessionStorage.removeItem(STORAGE_KEYS.ROLE);
  };

  const join = (username: string, role: UserRole) => {
    const sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);

    socket.io.opts.query = {
      username,
      role,
      ...(sessionId ? { sessionId } : {})
    };
    socket.connect();
  };

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
      // We do NOT clear currentUser here, to show "reconnecting" state if desired.
      // But typically React state resets on refresh.
      // If just socket disconnects (network), we keep the user data.
    }

    function onWelcome(data: { user: User; sessionId: string }) {
      console.log('Welcome received', data);
      setCurrentUser(data.user);
      currentUserIdRef.current = data.user.id;
      saveSession(data.sessionId, data.user.username, data.user.role);
    }

    function onStateUpdate(updatedUsers: User[]) {
      setUsers(updatedUsers);

      const myId = currentUserIdRef.current;
      if (myId) {
        const me = updatedUsers.find((u) => u.id === myId);
        if (me) setCurrentUser(me);
      }
    }

    function onVoteStatus(session: VoteSession) {
      setVoteSession(session);
      if (session.isActive) {
        if (session.currentVotes === 0) setHasVoted(false);
      }
    }

    function onVoteAccepted() {
      setHasVoted(true); // Sikeres szavazás -> modal bezárása
    }

    function onVoteResult(result: VoteResult) {
      setLastVoteResult(result);
    }

    function onError(err: { message: string } | string) {
      const msg = typeof err === 'string' ? err : err.message;
      setError(msg);

      // If invalid session, maybe clear storage?
      if (msg.includes('Connection rejected') || msg.includes('Session invalid')) {
         clearSession();
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('welcome', onWelcome); // NEW
    socket.on('state_update', onStateUpdate);
    socket.on('vote_status_update', onVoteStatus);
    socket.on('vote_accepted', onVoteAccepted);
    socket.on('vote_result', onVoteResult);
    socket.on('error', onError);

    // Auto-Connect Logic on Mount
    const storedSessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const storedUsername = sessionStorage.getItem(STORAGE_KEYS.USERNAME);
    const storedRole = sessionStorage.getItem(STORAGE_KEYS.ROLE) as UserRole;

    if (storedSessionId && storedUsername && storedRole && !socket.connected) {
       console.log('Attempting auto-reconnect with session...');
       join(storedUsername, storedRole);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('welcome', onWelcome);
      socket.off('state_update', onStateUpdate);
      socket.off('vote_status_update', onVoteStatus);
      socket.off('vote_accepted', onVoteAccepted);
      socket.off('vote_result', onVoteResult);
      socket.off('error', onError);
    };
  }, []);

  return {
    isConnected,
    users,
    currentUser,
    voteSession,
    lastVoteResult,
    hasVoted,
    join,
    socket,
    error,
    clearError: () => setError(null),
    logout: () => {
      clearSession();
      socket.emit('logout');
      socket.disconnect(); // Explicit disconnect
      setUsers([]);
      setCurrentUser(null);
      currentUserIdRef.current = null;
      setVoteSession(null);
      setHasVoted(false);
    }
  };
}
