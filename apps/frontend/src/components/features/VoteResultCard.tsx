import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VoteResult } from '@repo/shared-types';
import { Eye, X } from 'lucide-react';

interface VoteResultCardProps {
  lastVoteResult: VoteResult | null;
  isVisible: boolean;
  onToggleVisibility: (visible: boolean) => void;
}

export function VoteResultCard({
  lastVoteResult,
  isVisible,
  onToggleVisibility,
}: VoteResultCardProps) {
  if (!lastVoteResult) return null;

  if (!isVisible) {
    return (
      <Button variant='outline' className='w-full' onClick={() => onToggleVisibility(true)}>
        <Eye className='mr-2 h-4 w-4' />
        Utolsó eredmény megtekintése
      </Button>
    );
  }

  return (
    <Card className='border-green-200 dark:border-green-900 relative'>
      <Button
        variant='ghost'
        size='icon'
        className='absolute top-2 right-2 h-6 w-6'
        onClick={() => onToggleVisibility(false)}
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
            {lastVoteResult.summary.IGEN} <span className='text-sm font-normal block opacity-80'>IGEN</span>
          </div>

          {/* NEM */}
          <div className='p-4 rounded shadow-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold text-2xl'>
            {lastVoteResult.summary.NEM} <span className='text-sm font-normal block opacity-80'>NEM</span>
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
                      <b className='text-green-600 dark:text-green-400 min-w-15'>IGEN:</b>
                      <span className='text-muted-foreground'>{grouped['IGEN'].join(', ')}</span>
                    </div>
                  )}
                  {grouped['NEM']?.length > 0 && (
                    <div className='flex items-start gap-2'>
                      <b className='text-red-600 dark:text-red-400 min-w-15'>NEM:</b>
                      <span className='text-muted-foreground'>{grouped['NEM'].join(', ')}</span>
                    </div>
                  )}
                  {grouped['TARTOZKODOM']?.length > 0 && (
                    <div className='flex items-start gap-2'>
                      <b className='text-zinc-600 dark:text-zinc-400 min-w-15'>TART.:</b>
                      <span className='text-muted-foreground'>{grouped['TARTOZKODOM'].join(', ')}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
