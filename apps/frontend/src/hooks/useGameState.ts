import { socket } from '@/lib/socket';
import type { User, VoteResult, VoteSession } from '@repo/shared-types';
import { useEffect, useState } from 'react';

export function useGameState() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null);
  const [lastVoteResult, setLastVoteResult] = useState<VoteResult | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
      setCurrentUser(null);
    }

    function onStateUpdate(updatedUsers: User[]) {
      setUsers(updatedUsers);
      // Frissítjük a saját user objektumunkat is, ha változott (pl. felemeltem a kezem)
      if (socket.id) {
        const me = updatedUsers.find((u) => u.id === socket.id);
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
      // Opcionális: 5mp után eltüntetni az eredményt, vagy modalban hagyni
    }

    function onError(err: { message: string } | string) {
      // Kezeljük le, ha objektumként vagy stringként jön
      const msg = typeof err === 'string' ? err : err.message;
      setError(msg);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state_update', onStateUpdate);
    socket.on('vote_status_update', onVoteStatus);
    socket.on('vote_accepted', onVoteAccepted);
    socket.on('vote_result', onVoteResult);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state_update', onStateUpdate);
      socket.off('vote_status_update', onVoteStatus);
      socket.off('vote_accepted', onVoteAccepted);
      socket.off('vote_result', onVoteResult);
      socket.off('error', onError);
    };
  }, []);

  const join = (username: string) => {
    socket.io.opts.query = { username };
    socket.connect();
  };

  const logout = () => {
    socket.disconnect(); // Socket kapcsolat bontása
    setUsers([]);
    setCurrentUser(null);
    setVoteSession(null);
    setHasVoted(false);
    // Az error-t nem töröljük, hátha disconnect miatt hívódott
  };

  return {
    isConnected,
    users,
    currentUser,
    voteSession,
    lastVoteResult,
    hasVoted,
    join,
    socket, // Direct access for emits
    error,
    clearError: () => setError(null),
    logout,
  };
}
