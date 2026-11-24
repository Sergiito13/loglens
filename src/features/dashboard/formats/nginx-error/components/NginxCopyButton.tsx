import { useState } from 'react';

interface Props {
  value: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function NginxCopyButton({
  value,
  label = 'Copiar',
  compact = false,
  className = '',
}: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copy(): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('error');
    }
  }

  const text = state === 'copied' ? 'Copiado' : state === 'error' ? 'No disponible' : label;

  return (
    <button
      type="button"
      className={`ll-problem-copy ${compact ? 'll-problem-copy--compact' : ''} ${className}`.trim()}
      onClick={() => void copy()}
      aria-label={`${label}${state === 'copied' ? ': copiado' : ''}`}
      title={text}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {state === 'copied' ? (
          <path d="m5 12 4 4L19 6" />
        ) : (
          <>
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </>
        )}
      </svg>
      {!compact && <span aria-live="polite">{text}</span>}
      {compact && (
        <span className="ll-problem-sr-only" aria-live="polite">
          {text}
        </span>
      )}
    </button>
  );
}
