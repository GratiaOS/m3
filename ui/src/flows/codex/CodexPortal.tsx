import * as React from 'react';

type CodexPortalProps = {
  value: string;
  onChange: (value: string) => void;
  onSeal?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export function CodexPortal({
  value,
  onChange,
  onSeal,
  autoFocus,
  placeholder = 'Whenever you’re ready… write one gentle line. Press Enter to seal.',
  ariaLabel = 'Codex portal',
  className = '',
}: CodexPortalProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      onSeal?.();
    }
  };

  return (
    <textarea
      className={`codex-portal ${className}`.trim()}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      rows={3}
      autoFocus={autoFocus}
    />
  );
}
