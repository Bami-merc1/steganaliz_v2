import { type ReactNode } from 'react';

interface Props {
  children:  ReactNode;
  onClick?:  () => void;
  disabled?: boolean;
  variant?:  'primary' | 'secondary' | 'danger';
  size?:     'sm' | 'md';
  type?:     'button' | 'submit';
  fullWidth?: boolean;
}

export default function Button({
  children,
  onClick,
  disabled = false,
  variant  = 'primary',
  size     = 'md',
  type     = 'button',
  fullWidth = false,
}: Props) {
  const base: React.CSSProperties = {
    display:       'inline-flex',
    alignItems:    'center',
    justifyContent:'center',
    gap:           6,
    fontFamily:    'var(--font-sans)',
    fontWeight:    600,
    borderRadius:  'var(--radius-md)',
    border:        'none',
    cursor:        disabled ? 'not-allowed' : 'pointer',
    opacity:       disabled ? 0.4 : 1,
    transition:    'background .15s, opacity .15s, transform .1s',
    whiteSpace:    'nowrap',
    width:         fullWidth ? '100%' : 'auto',
    letterSpacing: 0.1,
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '6px 12px', height: 30 },
    md: { fontSize: 13, padding: '9px 18px', height: 38 },
  };

  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--clr-orange)',   color: '#fff' },
    secondary: { background: 'var(--clr-bg)',        color: 'var(--clr-text-primary)', border: '1px solid var(--clr-border)' },
    danger:    { background: 'var(--clr-danger)',    color: '#fff' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (variant === 'primary')    el.style.background = 'var(--clr-orange-dim)';
        if (variant === 'secondary')  el.style.background = '#eee';
        if (variant === 'danger')     el.style.background = '#a02820';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (variant === 'primary')    el.style.background = 'var(--clr-orange)';
        if (variant === 'secondary')  el.style.background = 'var(--clr-bg)';
        if (variant === 'danger')     el.style.background = 'var(--clr-danger)';
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}