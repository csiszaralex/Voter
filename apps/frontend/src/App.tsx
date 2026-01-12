import { LoginForm } from '@/components/features/LoginForm';
import { QueueList } from '@/components/features/QueueList';
import { VotingModal } from '@/components/features/VotingModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGameState } from '@/hooks/useGameState';
import type { VoteOption } from '@repo/shared-types';
import { Hand, ThumbsUp } from 'lucide-react';

function App() {
  const { isConnected, users, currentUser, voteSession, join, socket, lastVoteResult } =
    useGameState();

  if (!isConnected || !currentUser) {
    return <LoginForm onJoin={join} />;
  }

  // Derived state
  const hasVoted = false; // TODO: Ezt a backendnek vissza kéne küldenie a user objektumban, vagy a kliensnek kell megjegyeznie sessionben.
  // MVP FIX: A kliens oldalon tároljuk ideiglenesen state-ben, hogy szavaztunk-e ebben a körben.
  // De mivel a backend nem küldi le, hogy KI szavazott anonim módban, bízzunk a UI eltűnésében a vote cast után.

  const handleVote = (vote: VoteOption) => {
    socket.emit('cast_vote', { vote });
    // Itt egy lokális state-tel elrejthetjük a modalt, amíg a backend nem zárja le
  };

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 font-sans'>
      <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* LEFT COLUMN: Controls */}
        <div className='md:col-span-1 space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Vezérlőpult ({currentUser.username})</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* User Actions */}
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
                  Tetszik
                </Button>
              </div>

              {/* Admin Actions */}
              {currentUser.isAdmin && (
                <>
                  <Separator />
                  <div className='space-y-2'>
                    <h3 className='font-semibold text-sm text-zinc-500'>ADMIN TOOLS</h3>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={() => socket.emit('admin_clear_reactions', {})}
                    >
                      Reakciók törlése
                    </Button>
                    <div className='grid grid-cols-2 gap-2'>
                      <Button onClick={() => socket.emit('start_vote', { isAnonymous: false })}>
                        Nyílt Szavazás
                      </Button>
                      <Button onClick={() => socket.emit('start_vote', { isAnonymous: true })}>
                        Anonim Szavazás
                      </Button>
                    </div>
                  </div>
                </>
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
                onLowerHand={(id, type) => socket.emit('admin_lower_hand', { targetId: id, type })}
              />
            </CardContent>
          </Card>

          {/* Vote Results (Ha van) */}
          {lastVoteResult && !voteSession?.isActive && (
            <Card className='bg-zinc-50 border-green-200'>
              <CardHeader>
                <CardTitle>Utolsó szavazás eredménye</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-3 gap-4 text-center'>
                  <div className='p-4 bg-white rounded shadow text-green-700 font-bold text-2xl'>
                    {lastVoteResult.summary.IGEN}{' '}
                    <span className='text-sm font-normal block'>IGEN</span>
                  </div>
                  <div className='p-4 bg-white rounded shadow text-red-700 font-bold text-2xl'>
                    {lastVoteResult.summary.NEM}{' '}
                    <span className='text-sm font-normal block'>NEM</span>
                  </div>
                  <div className='p-4 bg-white rounded shadow text-zinc-700 font-bold text-2xl'>
                    {lastVoteResult.summary.TARTOZKODOM}{' '}
                    <span className='text-sm font-normal block'>TART.</span>
                  </div>
                </div>
                {!lastVoteResult.isAnonymous && lastVoteResult.details && (
                  <div className='mt-4 text-sm text-zinc-500'>
                    {lastVoteResult.details.map((d, i) => (
                      <span key={i} className='mr-3'>
                        {d.username}: <b>{d.vote}</b>,
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <VotingModal
        session={voteSession}
        hasVoted={false /* TODO: implement local tracking */}
        onVote={handleVote}
      />
    </div>
  );
}

export default App;

