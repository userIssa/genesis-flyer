export function BalloonDecoration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 220" className={className} aria-hidden="true">
      <ellipse cx="55" cy="70" rx="55" ry="65" fill="#1a1a1a" opacity="0.85" />
      <path d="M55 135 L60 150 L50 150 Z" fill="#1a1a1a" opacity="0.85" />
      <line x1="55" y1="150" x2="45" y2="220" stroke="#999" strokeWidth="1.5" />
    </svg>
  );
}

export function CakeDecoration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden="true">
      <g fill="#C9A24B">
        <path d="M40 60 C40 40, 55 40, 55 60 L55 90 L40 90 Z" />
        <path d="M100 60 C100 40, 115 40, 115 60 L115 90 L100 90 Z" />
        <path d="M160 60 C160 40, 175 40, 175 60 L175 90 L160 90 Z" />
        <path d="M20 100 Q30 90 40 100 T60 100 T80 100 T100 100 T120 100 T140 100 T160 100 T180 100 L180 150 L20 150 Z" />
      </g>
    </svg>
  );
}
