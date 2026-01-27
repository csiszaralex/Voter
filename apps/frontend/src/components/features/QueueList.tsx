import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { HandType, User } from '@repo/shared-types';
import { X } from 'lucide-react';

interface QueueListProps {
  users: User[];
  isAdmin: boolean;
  onLowerHand: (id: string, type: HandType) => void;
}

// Belső típus a megjelenítéshez
interface QueueItem {
  id: string; // user id
  username: string;
  type: HandType; // Melyik "keze" ez a sornak
  timestamp: number;
}

export function QueueList({ users, isAdmin, onLowerHand }: QueueListProps) {
  // 1. Lépés: User lista átalakítása QueueItem listává (Flat Map)
  const rawItems: QueueItem[] = [];

  users.forEach((u) => {
    if (u.hands.replyAt) {
      rawItems.push({
        id: u.id,
        username: u.username,
        type: 'REPLY',
        timestamp: u.hands.replyAt,
      });
    }
    if (u.hands.topicAt) {
      rawItems.push({
        id: u.id,
        username: u.username,
        type: 'TOPIC',
        timestamp: u.hands.topicAt,
      });
    }
  });

  // 2. Lépés: Rendezés
  const sortedQueue = rawItems.sort((a, b) => {
    // REPLY mindig előre
    if (a.type === 'REPLY' && b.type !== 'REPLY') return -1;
    if (a.type !== 'REPLY' && b.type === 'REPLY') return 1;

    // Ha egyforma típus (vagy mindkettő REPLY, vagy mindkettő TOPIC), akkor időrend
    return a.timestamp - b.timestamp;
  });

  const containerClass = 'w-full';
  if (sortedQueue.length === 0) {
    return (
      <div className={`${containerClass} flex items-center justify-center text-zinc-500`}>
        Nincs jelentkező
      </div>
    );
  }

  return (
    <ScrollArea className={`${containerClass} pr-4`}>
      <div className='space-y-3'>
        {sortedQueue.map((item, index) => (
          <div
            key={`${item.id}-${item.type}`} // Egyedi kulcs kell!
            className={`flex items-center justify-between p-3 rounded shadow-sm border ${
              item.type === 'REPLY'
                ? 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900'
                : 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900'
            } ${isAdmin ? 'animate-flash' : ''}`}
          >
            <div className='flex items-center gap-3'>
              <span className='font-mono text-zinc-400 text-sm'>#{index + 1}</span>
              <span className='font-bold'>{item.username}</span>
              {item.type === 'REPLY' ? (
                <Badge variant='destructive'>VÁLASZOL</Badge>
              ) : (
                <Badge variant='secondary'>TÉMA</Badge>
              )}
            </div>

            {isAdmin && (
              <Button
                size='icon'
                variant='ghost'
                className='h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                onClick={() => onLowerHand(item.id, item.type)}
                title='Felszólítás / Kéz le'
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
