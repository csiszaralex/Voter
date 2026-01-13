import { LoginForm } from '@/components/features/LoginForm';
import { QueueList } from '@/components/features/QueueList';
import { VotingModal } from '@/components/features/VotingModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGameState } from '@/hooks/useGameState';
import type { VoteOption } from '@repo/shared-types';
import { Hand, LogOut, ThumbsUp } from 'lucide-react';
import { ErrorDialog } from './components/features/ErrorDialog';

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

  if (!isConnected || !currentUser) {
    return <LoginForm onJoin={join} />;
  }

  const handleVote = (vote: VoteOption) => {
    socket.emit('cast_vote', { vote });
    // Itt egy lokális state-tel elrejthetjük a modalt, amíg a backend nem zárja le
  };

  return (
    <div className='min-h-dvh bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 font-sans'>
      <ErrorDialog message={error} onClose={clearError} />

      {!isConnected || !currentUser ? (
        <LoginForm onJoin={join} />
      ) : (
        <>
          <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* LEFT COLUMN: Controls */}
            <div className='md:col-span-1 space-y-6'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between pb-2'>
                  <CardTitle className='text-lg'>
                    {currentUser.username}
                    {currentUser.isAdmin && (
                      <span className='ml-2 text-red-500 text-xs uppercase'>Admin</span>
                    )}
                  </CardTitle>

                  {/* KILÉPÉS GOMB */}
                  <Button variant='ghost' size='icon' onClick={logout} title='Kilépés'>
                    <LogOut className='h-5 w-5 text-zinc-500 hover:text-red-600' />
                  </Button>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {/* User Actions */}
                  {!currentUser.isAdmin && (
                    <div className='grid grid-cols-1 gap-3'>
                      <Button
                        variant={currentUser.hands.topicAt ? 'destructive' : 'default'}
                        className='h-12 text-lg'
                        onClick={() => socket.emit('raise_hand', { type: 'TOPIC' })}
                      >
                        <Hand className='mr-2 h-5 w-5' />
                        {currentUser.hands.topicAt ? 'Visszavonás' : 'Szólnék (Téma)'}
                      </Button>

                      <Button
                        variant={currentUser.hands.replyAt ? 'destructive' : 'secondary'}
                        className='h-12'
                        onClick={() => socket.emit('raise_hand', { type: 'REPLY' })}
                      >
                        <Hand className='mr-2 h-5 w-5' />
                        {currentUser.hands.replyAt ? 'Visszavonás' : 'Reagálnék (Válasz)'}
                      </Button>

                      <Button
                        variant={currentUser.reaction === 'LIKE' ? 'default' : 'outline'}
                        onClick={() => socket.emit('toggle_reaction')}
                      >
                        <ThumbsUp
                          className={`mr-2 h-4 w-4 ${currentUser.reaction === 'LIKE' ? 'fill-current' : ''}`}
                        />
                        Tudok dönteni
                      </Button>
                    </div>
                  )}
                  {/* Admin Actions */}
                  {currentUser.isAdmin && (
                    <div>
                      <div className='space-y-2'>
                        <h3 className='font-semibold text-sm text-zinc-500'>ADMIN TOOLS</h3>
                        <Button
                          variant='outline'
                          className='w-full'
                          onClick={() => socket.emit('admin_clear_reactions', {})}
                        >
                          Reakciók törlése
                        </Button>
                        <Separator className='my-2' />

                        <div className='grid grid-cols-1 gap-2'>
                          <span className='text-xs text-zinc-400'>Új szavazás indítása:</span>
                          <div className='grid grid-cols-2 gap-2'>
                            <Button
                              size='sm'
                              onClick={() => socket.emit('start_vote', { isAnonymous: false })}
                            >
                              Nyílt
                            </Button>
                            <Button
                              size='sm'
                              onClick={() => socket.emit('start_vote', { isAnonymous: true })}
                            >
                              Anonim
                            </Button>
                          </div>
                        </div>

                        {/* Szavazás lezárása gomb - Csak ha aktív */}
                        {voteSession?.isActive && (
                          <Button
                            variant='destructive'
                            className='w-full mt-2 animate-pulse'
                            onClick={() => socket.emit('stop_vote')}
                          >
                            SZAVAZÁS LEZÁRÁSA
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* Connected Users (Simple List) */}
              <Card>
                <CardHeader>
                  <CardTitle>Jelenlévők ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-wrap gap-2'>
                    {users.map((u) => (
                      <Badge
                        key={u.id}
                        variant={u.isAdmin ? 'default' : 'secondary'}
                        className='text-sm py-1 px-3'
                      >
                        {u.username}
                        {u.reaction === 'LIKE' && ' 👍'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Queue & Results */}
            <div className='md:col-span-2 space-y-6'>
              <Card className='h-full border-2 border-zinc-200 dark:border-zinc-800'>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <CardTitle>Jelentkezők sora</CardTitle>
                  {voteSession?.isActive && (
                    <Badge variant='destructive' className='animate-pulse'>
                      SZAVAZÁS...
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <QueueList
                    users={users}
                    isAdmin={currentUser.isAdmin}
                    onLowerHand={(id, type) =>
                      socket.emit('admin_lower_hand', { targetId: id, type })
                    }
                  />
                </CardContent>
              </Card>

              {/* Vote Results (Ha van) */}
              {lastVoteResult && !voteSession?.isActive && (
                <Card className='border-green-200 dark:border-green-900'>
                  <CardHeader>
                    <CardTitle>Utolsó szavazás eredménye</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-3 gap-4 text-center'>
                      {/* IGEN: Zöldes háttér, dark módban áttetsző, világosabb szöveg */}
                      <div className='p-4 rounded shadow-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-2xl'>
                        {lastVoteResult.summary.IGEN}{' '}
                        <span className='text-sm font-normal block opacity-80'>IGEN</span>
                      </div>

                      {/* NEM: Pirosas háttér, dark módban áttetsző */}
                      <div className='p-4 rounded shadow-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold text-2xl'>
                        {lastVoteResult.summary.NEM}{' '}
                        <span className='text-sm font-normal block opacity-80'>NEM</span>
                      </div>

                      {/* TARTÓZKODOM: Semleges háttér (Secondary-hoz igazítva) */}
                      <div className='p-4 rounded shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-2xl'>
                        {lastVoteResult.summary.TARTOZKODOM}{' '}
                        <span className='text-sm font-normal block opacity-80'>TART.</span>
                      </div>
                    </div>

                    {!lastVoteResult.isAnonymous && lastVoteResult.details && (
                      <div className='mt-4 text-sm text-muted-foreground'>
                        {lastVoteResult.details.map((d, i) => (
                          <span key={i} className='mr-3 inline-block'>
                            {d.username}: <b className='text-foreground'>{d.vote}</b>,
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {!currentUser.isAdmin && (
            <VotingModal session={voteSession} hasVoted={hasVoted} onVote={handleVote} />
          )}
        </>
      )}
    </div>
  );
}

export default App;

