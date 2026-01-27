import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { User } from '@repo/shared-types';

interface ConnectedUsersCardProps {
  users: User[];
}

export function ConnectedUsersCard({ users }: ConnectedUsersCardProps) {
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
      <CardContent className='space-y-2'>
        {/* Voters List */}
        <div>
          <h4 className='text-sm font-semibold text-primary'>Szavazók ({voters.length})</h4>
          {voters.length === 0 ? (
            <div className='text-xs text-muted-foreground italic'>Nincs aktív szavazó</div>
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
                  } ${!u.isConnected ? 'opacity-50 grayscale' : ''}`}
                  title={!u.isConnected ? 'Kapcsolat megszakadt' : ''}
                >
                  {u.username}
                  {u.reaction === 'LIKE' && ' 👍'}
                  {!u.isConnected && ' (offline)'}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Others (Admin/Guest) */}
        {others.length > 0 && (
          <div className='hidden md:block'>
            <Separator />
            <div className='mt-2'>
              <h4 className='text-xs font-semibold mb-2 text-muted-foreground'>Egyéb résztvevők</h4>
              <div className='flex flex-wrap gap-2 opacity-80'>
                {others.map((u) => (
                  <Badge
                    key={u.id}
                    variant='outline'
                    className={`text-xs py-0.5 px-2 ${!u.isConnected ? 'opacity-50 grayscale' : ''}`}
                  >
                    {u.username}
                    {u.role === 'ADMIN' && ' (Admin)'}
                    {u.role === 'GUEST' && ' (Vendég)'}
                    {u.role === 'ADVISOR' && ' (Felügyelő)'}
                    {!u.isConnected && ' (offline)'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
