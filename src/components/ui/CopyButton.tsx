import { Copy, Check } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';

export function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useClipboard();
  return (
    <button onClick={() => copy(text)} className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20" title="Copier">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function CopyButtonLight({ text }: { text: string }) {
  const { copied, copy } = useClipboard();
  return (
    <button onClick={() => copy(text)} className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-600 transition-colors hover:bg-amber-100" title="Copier">
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
