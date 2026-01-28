import { AdminControls } from '@/components/features/AdminControls';
import { ConnectedUsersCard } from '@/components/features/ConnectedUsersCard';
import { ErrorDialog } from '@/components/features/ErrorDialog';
import { LoginForm } from '@/components/features/LoginForm';
import { QueueList } from '@/components/features/QueueList';
import { UserControls } from '@/components/features/UserControls';
import { VoteResultCard } from '@/components/features/VoteResultCard';
import { VotingModal } from '@/components/features/VotingModal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameState } from '@/hooks/useGameState';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { VoteOption } from '@repo/shared-types';
import { useEffect, useState } from 'react';

function App() {
  const {
    isConnected,
    users,
    currentUser,
    voteSession,
    join,
    socket,
    lastVoteResult,
    hasVoted,
    error,
    clearError,
    logout,
  } = useGameState();

  const [isVoteResultVisible, setIsVoteResultVisible] = useState(false);

  useEffect(() => {
    if (lastVoteResult) {
      const showTimer = setTimeout(() => setIsVoteResultVisible(true), 0);
      const hideTimer = setTimeout(() => setIsVoteResultVisible(false), 10000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [lastVoteResult]);

  useWakeLock(!!currentUser);

  useEffect(() => {
    if (currentUser) {
      document.title = `${currentUser.username} | Voter`;
    } else {
      document.title = 'Voter';
    }
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isGuest = currentUser?.role === 'GUEST';
  const isUser = currentUser?.role === 'USER';

  const handleVote = (vote: VoteOption) => {
    socket.emit('cast_vote', { vote });
  };

  return (
    <div className='min-h-dvh bg-linear-to-br from-zinc-50 to-blue-50 dark:from-zinc-950 dark:to-zinc-900 font-sans'>
      <ErrorDialog message={error} onClose={clearError} />

      {!isConnected || !currentUser ? (
        <LoginForm onJoin={join} />
      ) : (
        <>
          <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 p-2 md:p-6'>
            <div className='md:col-span-1 space-y-6'>
              {isAdmin ? (
                <AdminControls
                  username={currentUser.username}
                  onLogout={logout}
                  voteSession={voteSession}
                  onClearReactions={() => socket.emit('admin_clear_reactions', {})}
                  onStartVote={(isAnonymous) => socket.emit('start_vote', { isAnonymous })}
                  onStopVote={() => socket.emit('stop_vote')}
                />
              ) : (
                <UserControls
                  currentUser={currentUser}
                  onLogout={logout}
                  onRaiseHand={(type) => socket.emit('raise_hand', { type })}
                  onToggleReaction={() => socket.emit('toggle_reaction')}
                />
              )}

              <ConnectedUsersCard users={users} />
            </div>

            <div className='md:col-span-2 space-y-6'>
              <Card className='border-2 border-zinc-200 dark:border-zinc-800'>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <CardTitle>Jelentkezők sora</CardTitle>
                  {voteSession?.isActive && !isGuest && (
                    <Badge variant='destructive' className='animate-pulse'>
                      SZAVAZÁS...
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <QueueList
                    users={users}
                    isAdmin={isAdmin}
                    onLowerHand={(id, type) =>
                      socket.emit('admin_lower_hand', { targetId: id, type })
                    }
                  />
                </CardContent>
              </Card>

              {lastVoteResult && !voteSession?.isActive && !isGuest && (
                <VoteResultCard
                  lastVoteResult={lastVoteResult}
                  isVisible={isVoteResultVisible}
                  onToggleVisibility={setIsVoteResultVisible}
                />
              )}
            </div>
          </div>

          {isUser && <VotingModal session={voteSession} hasVoted={hasVoted} onVote={handleVote} />}
        </>
      )}
    </div>
  );
}

export default App;
