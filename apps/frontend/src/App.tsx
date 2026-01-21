import { LoginForm } from '@/components/features/LoginForm';
import { QueueList } from '@/components/features/QueueList';
import { VotingModal } from '@/components/features/VotingModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGameState } from '@/hooks/useGameState';
import type { VoteOption } from '@repo/shared-types';
import { Eye, Hand, LogOut, ThumbsUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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

  const [isVoteResultVisible, setIsVoteResultVisible] = useState(false);

  useEffect(() => {
    if (lastVoteResult) {
      setIsVoteResultVisible(true);
      const timer = setTimeout(() => setIsVoteResultVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [lastVoteResult]);

  if (!isConnected || !currentUser) {
    return <LoginForm onJoin={join} />;
  }

  const handleVote = (vote: VoteOption) => {
    socket.emit('cast_vote', { vote });
    // Itt egy lokális state-tel elrejthetjük a modalt, amíg a backend nem zárja le
  };

  const isAdmin = currentUser.role === 'ADMIN';
  const isGuest = currentUser.role === 'GUEST';
  const isUser = currentUser.role === 'USER';

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
                    {isAdmin && <span className='ml-2 text-red-500 text-xs uppercase'>Admin</span>}
                    {isGuest && (
                      <span className='ml-2 text-zinc-500 text-xs uppercase'>Vendég</span>
                    )}
                  </CardTitle>

                  {/* KILÉPÉS GOMB */}
                  <Button variant='ghost' size='icon' onClick={logout} title='Kilépés'>
                    <LogOut className='h-5 w-5 text-zinc-500 hover:text-red-600' />
                  </Button>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {/* User & Guest Actions - Raise Hand allowed for both */}
                  {(isUser || isGuest) && (
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

                      {/* Reaction - Only for USER */}
                      {isUser && (
                        <Button
                          variant={currentUser.reaction === 'LIKE' ? 'default' : 'outline'}
                          onClick={() => socket.emit('toggle_reaction')}
                        >
                          <ThumbsUp
                            className={`mr-2 h-4 w-4 ${currentUser.reaction === 'LIKE' ? 'fill-current' : ''}`}
                          />
                          Tudok dönteni
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Admin Actions */}
                  {isAdmin && (
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

              {/* Connected Users (Grouped & Readiness Gradient) */}
              {(() => {
                const voters = users.filter((u) => u.role === 'USER');
                const others = users.filter((u) => u.role !== 'USER');
                const totalVoters = voters.length;
                const readyCount = voters.filter((u) => u.reaction === 'LIKE').length;
                const readinessPercent = totalVoters > 0 ? (readyCount / totalVoters) * 100 : 0;
                const isComplete = readinessPercent === 100 && totalVoters > 0;

                return (
                  <Card
                    className={`transition-all duration-500 overflow-hidden ${
                      isComplete ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''
                    }`}
                    style={{
                      background: isComplete
                        ? 'rgba(34, 197, 94, 0.2)'
                        : `linear-gradient(to top, rgba(34, 197, 94, 0.1) ${readinessPercent}%, transparent ${readinessPercent}%)`,
                    }}
                  >
                    <CardHeader>
                      <CardTitle className='flex justify-between items-center'>
                        <span>Jelenlévők ({users.length})</span>
                        {totalVoters > 0 && (
                          <span className='text-xs font-normal text-muted-foreground'>
                            {Math.round(readinessPercent)}% kész
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      {/* Voters List */}
                      <div>
                        <h4 className='text-sm font-semibold mb-2 text-primary'>
                          Szavazók ({voters.length})
                        </h4>
                        {voters.length === 0 ? (
                          <div className='text-xs text-muted-foreground italic'>
                            Nincs aktív szavazó
                          </div>
                        ) : (
                          <div className='flex flex-wrap gap-2'>
                            {voters.map((u) => (
                              <Badge
                                key={u.id}
                                variant={u.reaction === 'LIKE' ? 'default' : 'secondary'}
                                className={`text-sm py-1 px-3 ${
                                  u.reaction === 'LIKE'
                                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                                    : ''
                                }`}
                              >
                                {u.username}
                                {u.reaction === 'LIKE' && ' 👍'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Others (Admin/Guest) */}
                      {others.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className='text-xs font-semibold mb-2 text-muted-foreground'>
                              Egyéb résztvevők
                            </h4>
                            <div className='flex flex-wrap gap-2 opacity-80'>
                              {others.map((u) => (
                                <Badge key={u.id} variant='outline' className='text-xs py-0.5 px-2'>
                                  {u.username}
                                  {u.role === 'ADMIN' && ' (Admin)'}
                                  {u.role === 'GUEST' && ' (Vendég)'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
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
                    isAdmin={isAdmin}
                    onLowerHand={(id, type) =>
                      socket.emit('admin_lower_hand', { targetId: id, type })
                    }
                  />
                </CardContent>
              </Card>

              {/* Vote Results (Ha van) */}
              {lastVoteResult && !voteSession?.isActive && (
                <>
                  {isVoteResultVisible ? (
                    <Card className='border-green-200 dark:border-green-900 relative'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='absolute top-2 right-2 h-6 w-6'
                        onClick={() => setIsVoteResultVisible(false)}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                      <CardHeader>
                        <CardTitle>Utolsó szavazás eredménye</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='grid grid-cols-3 gap-4 text-center'>
                          {/* IGEN */}
                          <div className='p-4 rounded shadow-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-2xl'>
                            {lastVoteResult.summary.IGEN}{' '}
                            <span className='text-sm font-normal block opacity-80'>IGEN</span>
                          </div>

                          {/* NEM */}
                          <div className='p-4 rounded shadow-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold text-2xl'>
                            {lastVoteResult.summary.NEM}{' '}
                            <span className='text-sm font-normal block opacity-80'>NEM</span>
                          </div>

                          {/* TARTÓZKODOM */}
                          <div className='p-4 rounded shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-2xl'>
                            {lastVoteResult.summary.TARTOZKODOM}{' '}
                            <span className='text-sm font-normal block opacity-80'>TART.</span>
                          </div>
                        </div>

                        {!lastVoteResult.isAnonymous && lastVoteResult.details && (
                          <div className='mt-6 space-y-3 text-sm'>
                            {/* Grouped Results */}
                            {(() => {
                              const grouped = lastVoteResult.details.reduce(
                                (acc, curr) => {
                                  acc[curr.vote] = [...(acc[curr.vote] || []), curr.username];
                                  return acc;
                                },
                                {} as Record<string, string[]>,
                              );

                              return (
                                <>
                                  {grouped['IGEN']?.length > 0 && (
                                    <div className='flex items-start gap-2'>
                                      <b className='text-green-600 dark:text-green-400 min-w-[60px]'>
                                        IGEN:
                                      </b>
                                      <span className='text-muted-foreground'>
                                        {grouped['IGEN'].join(', ')}
                                      </span>
                                    </div>
                                  )}
                                  {grouped['NEM']?.length > 0 && (
                                    <div className='flex items-start gap-2'>
                                      <b className='text-red-600 dark:text-red-400 min-w-[60px]'>
                                        NEM:
                                      </b>
                                      <span className='text-muted-foreground'>
                                        {grouped['NEM'].join(', ')}
                                      </span>
                                    </div>
                                  )}
                                  {grouped['TARTOZKODOM']?.length > 0 && (
                                    <div className='flex items-start gap-2'>
                                      <b className='text-zinc-600 dark:text-zinc-400 min-w-[60px]'>
                                        TART.:
                                      </b>
                                      <span className='text-muted-foreground'>
                                        {grouped['TARTOZKODOM'].join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={() => setIsVoteResultVisible(true)}
                    >
                      <Eye className='mr-2 h-4 w-4' />
                      Utolsó eredmény megtekintése
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {!isAdmin && !isGuest && (
            <VotingModal session={voteSession} hasVoted={hasVoted} onVote={handleVote} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
