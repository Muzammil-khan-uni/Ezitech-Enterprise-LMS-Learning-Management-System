import { Skeleton } from '@/components/ui/Skeleton';

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3.5" />
        ))}
      </div>
    </div>
  );
}

export default function ProfileSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="overflow-hidden rounded-3xl border border-ink-100 bg-surface shadow-soft">
        <Skeleton className="h-32 w-full rounded-none sm:h-44" />
        <div className="pt-4 flex flex-col items-center gap-4 px-4 pb-6 sm:flex-row sm:items-start sm:px-8">
          <Skeleton className="-mt-[37px] size-28 shrink-0 rounded-full ring-4 ring-surface sm:-mt-[48px] sm:size-36" />
          <div className="w-full flex-1 space-y-3">
            <Skeleton className="mx-auto h-7 w-48 sm:mx-0" />
            <Skeleton className="mx-auto h-4 w-64 max-w-full sm:mx-0" />
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7 xl:col-span-8">
          <CardSkeleton lines={4} />
          <CardSkeleton />
          <CardSkeleton lines={2} />
        </div>
        <div className="space-y-5 lg:col-span-5 xl:col-span-4">
          <CardSkeleton lines={4} />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
