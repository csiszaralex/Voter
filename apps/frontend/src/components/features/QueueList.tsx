import type { User } from '@repo/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react'; // pnpm add lucide-react

interface QueueListProps {
  users: User[];
  isAdmin: boolean;
  onLowerHand: (id: string, type: 'TOPIC' | 'REPLY') => void;
}

export function QueueList({ users, isAdmin, onLowerHand }: QueueListProps) {
  // --- CLIENT SIDE SORTING LOGIC (ugyanaz mint backend mental model) ---
  const queue = users
    .filter((u) => u.hands.topicAt || u.hands.replyAt)
    .sort((a, b) => {
      // 1. REPLY prioritás
      const aIsReply = !!a.hands.replyAt;
      const bIsReply = !!b.hands.replyAt;
      if (aIsReply && !bIsReply) return -1;
      if (!aIsReply && bIsReply) return 1;

      // 2. Időbélyeg
      const aTime = a.hands.replyAt || a.hands.topicAt || 0;
      const bTime = b.hands.replyAt || b.hands.topicAt || 0;
      return aTime - bTime;
    });

  if (queue.length === 0) {
    return <div className="text-center text-zinc-500 py-8">Nincs jelentkező</div>;
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {queue.map((u, i) => (
          <div key={u.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded shadow-sm border">
            <div className="flex items-center gap-3">
              <span className="font-mono text-zinc-400">#{i + 1}</span>
              <span className="font-bold">{u.username}</span>
              {u.hands.replyAt && <Badge variant="destructive">VÁLASZOL</Badge>}
              {u.hands.topicAt && <Badge variant="secondary">TÉMA</Badge>}
            </div>

            {isAdmin && (
              <div className="flex gap-1">
                {u.hands.replyAt && (
                   <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onLowerHand(u.id, 'REPLY')} title="Válasz elvétele">
                     <X className="h-3 w-3" />
                   </Button>
                )}
                {u.hands.topicAt && (
                   <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onLowerHand(u.id, 'TOPIC')} title="Téma elvétele">
                     <X className="h-3 w-3" />
                   </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
