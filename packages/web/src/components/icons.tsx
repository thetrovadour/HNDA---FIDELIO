// FIDELIO icon set — stroke-1.5, round caps/joins, currentColor, 24px viewBox.
// All icons accept an optional size prop: 'sm' = w-4 h-4, 'md' = w-5 h-5 (default).

type Size = 'sm' | 'md';

function cls(size: Size) {
  return size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
} as const;

export function IconUser({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}

export function IconActivity({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconNetwork({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <line x1="12" y1="7" x2="5" y2="17" strokeLinecap="round" />
      <line x1="12" y1="7" x2="19" y2="17" strokeLinecap="round" />
    </svg>
  );
}

export function IconCopy({ size = 'sm' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

export function IconSettings({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconStore({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <path d="M3 9l1-5h16l1 5" strokeLinecap="round" />
      <path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
      <path d="M9 21V12h6v9" strokeLinecap="round" />
    </svg>
  );
}

export function IconSwap({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <path d="M7 16V4m0 0L3 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGem({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <polygon points="12 2 22 9 18 20 6 20 2 9" strokeLinejoin="round" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="12" y1="2" x2="6" y2="20" />
      <line x1="12" y1="2" x2="18" y2="20" />
    </svg>
  );
}

export function IconList({ size = 'md' }: { size?: Size }) {
  return (
    <svg {...base} className={cls(size)}>
      <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
      <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
      <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
      <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
