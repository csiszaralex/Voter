import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorDialogProps {
  message: string | null;
  onClose: () => void;
}

export function ErrorDialog({ message, onClose }: ErrorDialogProps) {
  // Akkor nyitjuk meg, ha van message
  const isOpen = !!message;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-106.25 border-l-4 border-l-red-500">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Hiba történt</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-900 dark:text-zinc-100 font-medium">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            Rendben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
