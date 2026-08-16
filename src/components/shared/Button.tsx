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
  const base = 'px-5 py-2.5 rounded text-sm font-semibold transition-colors';
  const styles =
    variant === 'primary'
      ? disabled
        ? 'bg-stgBorderStrong text-stgTextMuted cursor-not-allowed'
        : 'bg-stgOrange text-white hover:bg-stgOrange/90'
      : disabled
        ? 'bg-white border border-stgBorder text-stgTextMuted cursor-not-allowed'
        : 'bg-white border border-stgBorderStrong text-black hover:bg-stgBg';

  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}