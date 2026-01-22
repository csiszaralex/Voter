import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import type { UserRole } from '@repo/shared-types';
import { useState } from 'react';

const roles: { value: UserRole; label: string }[] = [
  { value: 'USER', label: 'Résztvevő' },
  { value: 'ADMIN', label: 'Adminisztrátor' },
  { value: 'GUEST', label: 'Vendég' },
  { value: 'ADVISOR', label: 'Felügyelő' },
];

export function LoginForm({ onJoin }: { onJoin: (name: string, role: UserRole) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const currentRoleLabel = roles.find((r) => r.value === role)?.label;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onJoin(name, role);
  };

  return (
    <div className='flex min-h-dvh w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-center'>Belépés a szavazásra</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <Input
              placeholder='Neved...'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className='text-base'
            />

            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <span className='flex flex-1 text-left'>{currentRoleLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Szerepkör</SelectLabel>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              type='submit'
              disabled={!name}
              className='w-full transition-transform hover:bg-primary/90 active:scale-95 hover:cursor-pointer'
            >
              Csatlakozás
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
