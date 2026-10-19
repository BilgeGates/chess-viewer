export const segmentButton = (active: boolean) =>
  `flex-1 min-h-10 px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
    active
      ? 'bg-accent/10 text-text-primary'
      : 'text-text-secondary hover:bg-surface-elevated'
  }`;
