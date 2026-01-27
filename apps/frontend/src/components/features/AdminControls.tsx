import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { VoteSession } from '@repo/shared-types';
import { LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface AdminControlsProps {
  username: string;
  voteSession: VoteSession | null;
  onClearReactions: () => void;
  onStartVote: (isAnonymous: boolean) => void;
  onStopVote: () => void;
  onLogout: () => void;
}

export function AdminControls({
  username,
  voteSession,
  onClearReactions,
  onStartVote,
  onStopVote,
  onLogout,
}: AdminControlsProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-lg'>
          {username}
          <span className='ml-2 text-red-500 text-xs uppercase'>Admin</span>
        </CardTitle>

        <Button variant='ghost' size='icon' onClick={onLogout} title='Kilépés' shortcutKey='escape'>
          <LogOut className='h-5 w-5 text-zinc-500 hover:text-red-600' />
        </Button>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div>
          <div className='space-y-2'>
            <Button
              variant='outline'
              className='w-full'
              onClick={onClearReactions}
              shortcutKey='c'
              ctrlNeeded
            >
              Reakciók törlése
            </Button>
            <Separator className='my-2' />

            <div className='grid grid-cols-1 gap-2'>
              <span className='text-xs text-zinc-400'>Új szavazás indítása:</span>
              <div className='grid grid-cols-2 gap-2'>
                <Button size='sm' onClick={() => onStartVote(false)} shortcutKey=' ' ctrlNeeded>
                  Nyílt
                </Button>
                <Button size='sm' onClick={() => onStartVote(true)} shortcutKey='a' ctrlNeeded>
                  Anonim
                </Button>
              </div>
            </div>

            {/* Szavazás lezárása gomb - Csak ha aktív */}
            {voteSession?.isActive && (
              <Button
                variant='destructive'
                className='w-full mt-2 animate-pulse'
                onClick={onStopVote}
                shortcutKey='s'
                ctrlNeeded
              >
                SZAVAZÁS LEZÁRÁSA
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
