export type TextSize = 'small' | 'default' | 'large';

export const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'default', label: 'Default' },
  { id: 'large', label: 'Large' },
];

export function textMultiplier(size: TextSize): number {
  if (size === 'small') return 0.92;
  if (size === 'large') return 1.18;
  return 1;
}

export function parseTextSize(value: string | null): TextSize {
  if (value === 'small' || value === 'large' || value === 'default') return value;
  return 'default';
}
