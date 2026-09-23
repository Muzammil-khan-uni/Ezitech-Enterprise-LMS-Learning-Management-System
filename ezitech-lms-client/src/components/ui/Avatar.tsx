import { useState } from 'react';
import { clsx } from 'clsx';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<Size, string> = {
  xs: 'size-7 text-[11px]',
  sm: 'size-9 text-sm',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
  xl: 'size-28 text-4xl sm:size-36 sm:text-5xl',
};

function getInitials(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string;
  src?: string;
  size?: Size;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={clsx(
        // `flex` (not `inline-flex`) makes this a block-level box, so it never sits inside a
        // surrounding inline formatting context. An inline-level box here would reserve a few
        // pixels of baseline "descender" space below it, showing as a gap at the bottom inside
        // the circle once the photo loads.
        'bg-gradient-brand relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-bold text-white',
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? ''}
          loading="lazy"
          onError={() => setFailedSrc(src ?? null)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden={!name}>{getInitials(name)}</span>
      )}
    </span>
  );
}
