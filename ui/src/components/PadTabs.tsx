import * as React from 'react';

type TabEntry = {
  key: string;
  label: React.ReactNode;
  ariaLabel?: string;
};

type PadTabsProps = {
  tabs: TabEntry[];
  activeKey: string;
  onChange: (key: string) => void;
  id?: string;
  className?: string;
  ariaLabel?: string;
};

export function PadTabs({
  tabs,
  activeKey,
  onChange,
  id,
  className,
  ariaLabel = 'Pad sections',
}: PadTabsProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!tabs.length) return;
    const currentIndex = tabs.findIndex((tab) => tab.key === activeKey);
    let nextIndex = currentIndex < 0 ? 0 : currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextKey = tabs[nextIndex]?.key;
    if (nextKey) {
      onChange(nextKey);
      refs.current[nextIndex]?.focus();
    }
  };

  return (
    <ul
      role="tablist"
      data-pad-tabs
      aria-label={ariaLabel}
      id={id}
      className={className}>
      {tabs.map((tab, index) => {
        const selected = tab.key === activeKey;
        return (
          <li key={tab.key} role="presentation">
            <button
              role="tab"
              type="button"
              ref={(node) => {
                refs.current[index] = node;
              }}
              aria-selected={selected}
              aria-label={tab.ariaLabel}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.key)}
              onKeyDown={onKeyDown}>
              {tab.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
