import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  disabled,
  ...rest
}: Props) {
  const base = 'px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stgOrange/40';

  const styles =
    variant === 'primary'
      ? disabled
        ? 'bg-stgBorderStrong text-stgTextMuted cursor-not-allowed'
        : 'bg-stgOrange text-white hover:bg-stgOrange/90 active:bg-stgOrange/80'
      : disabled
        ? 'bg-stgSurface border border-stgBorder text-stgTextMuted cursor-not-allowed'
        : 'bg-stgSurface border border-stgBorderStrong text-stgTextPrimary hover:bg-stgBg hover:border-stgTextMuted';

  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}