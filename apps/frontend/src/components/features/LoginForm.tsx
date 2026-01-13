import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function LoginForm({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onJoin(name);
  };

  return (
    <div className='flex min-h-dvh w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-center'>Belépés az ülésre</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <Input
              placeholder='Neved...'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className='text-base' // Mobilon ez megakadályozza az auto-zoomot (iOS feature 16px alatt)
            />
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
