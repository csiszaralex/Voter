import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HandType, User } from '@repo/shared-types';
import { Hand, LogOut, ThumbsUp } from 'lucide-react';

interface UserControlsProps {
  currentUser: User;
  onLogout: () => void;
  onRaiseHand: (type: HandType) => void;
  onToggleReaction: () => void;
}

export function UserControls({
  currentUser,
  onLogout,
  onRaiseHand,
  onToggleReaction,
}: UserControlsProps) {
  const isGuest = currentUser.role === 'GUEST';
  const isAdvisor = currentUser.role === 'ADVISOR';
  const isUser = currentUser.role === 'USER';

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-lg'>
          {currentUser.username}
          {isGuest && <span className='ml-2 text-zinc-500 text-xs uppercase'>Vendég</span>}
          {isAdvisor && <span className='ml-2 text-blue-500 text-xs uppercase'>Felügyelő</span>}
        </CardTitle>

        <Button variant='ghost' size='icon' onClick={onLogout} title='Kilépés' shortcutKey='escape'>
          <LogOut className='h-5 w-5 text-zinc-500 hover:text-red-600' />
        </Button>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-1 gap-3'>
          <Button
            variant={currentUser.hands.topicAt ? 'destructive' : 'outline'}
            className={`h-12 text-lg ${
              currentUser.hands.topicAt
                ? ''
                : 'border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20'
            }`}
            onClick={() => onRaiseHand('TOPIC')}
            shortcutKey=' '
          >
            <Hand className='mr-2 h-5 w-5' />
            {currentUser.hands.topicAt ? 'Visszavonás' : 'Szólnék (Téma)'}
          </Button>

          <Button
            variant={currentUser.hands.replyAt ? 'destructive' : 'outline'}
            className={`h-12 ${
              currentUser.hands.replyAt
                ? ''
                : 'border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20'
            }`}
            onClick={() => onRaiseHand('REPLY')}
            shortcutKey='r'
          >
            <Hand className='mr-2 h-5 w-5' />
            {currentUser.hands.replyAt ? 'Visszavonás' : 'Reagálnék (Válasz)'}
          </Button>

          {/* Reaction - Only for USER */}
          {isUser && (
            <Button
              variant={currentUser.reaction === 'LIKE' ? 'default' : 'outline'}
              className={currentUser.reaction === 'LIKE' ? 'bg-green-500 hover:bg-green-600' : ''}
              onClick={onToggleReaction}
              shortcutKey='l'
            >
              <ThumbsUp
                className={`mr-2 h-4 w-4 ${currentUser.reaction === 'LIKE' ? 'fill-current' : ''}`}
              />
              Tudok dönteni
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
