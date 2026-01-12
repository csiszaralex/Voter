import { socket } from '@/lib/socket';
import type { User, VoteResult, VoteSession } from '@repo/shared-types';
import { useEffect, useState } from 'react';

export function useGameState() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null);
  const [lastVoteResult, setLastVoteResult] = useState<VoteResult | null>(null);

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
    }

    function onVoteResult(result: VoteResult) {
      setLastVoteResult(result);
      // Opcionális: 5mp után eltüntetni az eredményt, vagy modalban hagyni
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state_update', onStateUpdate);
    socket.on('vote_status_update', onVoteStatus);
    socket.on('vote_result', onVoteResult);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state_update', onStateUpdate);
      socket.off('vote_status_update', onVoteStatus);
      socket.off('vote_result', onVoteResult);
    };
  }, []);

  const join = (username: string) => {
    socket.io.opts.query = { username };
    socket.connect();
  };

  return {
    isConnected,
    users,
    currentUser,
    voteSession,
    lastVoteResult,
    join,
    socket, // Direct access for emits
  };
}
