import { MinusIcon, SquareIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TitleBar() {
  return (
    <div className="drag-region flex h-9 shrink-0 items-center bg-sidebar border-b border-border select-none">
      <span className="flex-1 px-4 text-xs font-semibold text-muted-foreground">Voxr</span>

      <div className="no-drag-region flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-none h-9 w-11 hover:bg-muted"
          onClick={() => window.electron.minimize()}
        >
          <MinusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-none h-9 w-11 hover:bg-muted"
          onClick={() => window.electron.maximize()}
        >
          <SquareIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-none h-9 w-11 hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => window.electron.close()}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
