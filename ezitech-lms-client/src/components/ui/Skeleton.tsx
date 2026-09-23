import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-lg', className)} />;
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-ink-100 bg-surface p-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
