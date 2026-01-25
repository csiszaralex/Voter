import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'; // Shadcn komponens
import type { VoteOption, VoteSession } from '@repo/shared-types';

import { useEffect } from 'react';

interface VotingModalProps {
  session: VoteSession | null;
  hasVoted: boolean; // Ezt a parentben kell kiszámolni: votes.has(mySocketId)
  onVote: (val: VoteOption) => void;
}

export function VotingModal({ session, hasVoted, onVote }: VotingModalProps) {
  const isOpen = session?.isActive && !hasVoted;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'i') onVote('IGEN');
      if (key === 'n') onVote('NEM');
      if (key === 't') onVote('TARTOZKODOM');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onVote]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Szavazás folyamatban</DialogTitle>
          <DialogDescription>
            Kérlek add le a szavazatod. A szavazás {session?.isAnonymous ? 'ANONIM' : 'NYILVÁNOS'}.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3 py-4'>
          <Button
            className='bg-green-600 hover:bg-green-700 text-white'
            onClick={() => onVote('IGEN')}
          >
            IGEN
          </Button>
          <Button className='bg-red-600 hover:bg-red-700 text-white' onClick={() => onVote('NEM')}>
            NEM
          </Button>
          <Button variant='secondary' onClick={() => onVote('TARTOZKODOM')}>
            TARTÓZKODOM
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
