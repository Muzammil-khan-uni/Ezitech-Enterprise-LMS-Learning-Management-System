import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Target, Flame, Radio } from 'lucide-react';
import { useLearningStatistics } from '../dashboardsApi';
import { useMyAttendance } from '@/features/attendance/attendanceApi';
import { Card, EmptyState, StatCard } from '@/components/ui';
import { Skeleton, ListRowSkeleton } from '@/components/ui/Skeleton';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function LearningStatisticsPage() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useLearningStatistics();
  const { data: attendance } = useMyAttendance();

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('statistics.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('statistics.subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('statistics.timeSpent')} value={formatDuration(stats.totalTimeSpentSeconds)} icon={<Clock className="size-5" />} delay={0} />
        <StatCard label={t('statistics.lessonsCompleted')} value={stats.lessonsCompleted} icon={<CheckCircle2 className="size-5" />} tone="success" delay={0.06} />
        <StatCard
          label={t('statistics.quizAverage', { count: stats.quizAttempts })}
          value={stats.quizAveragePercent !== null ? `${stats.quizAveragePercent}%` : t('statistics.quizAverageNoData')}
          icon={<Target className="size-5" />}
          tone="accent"
          delay={0.12}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="bg-gradient-brand flex items-center gap-4 rounded-2xl p-5 text-white shadow-lift"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Flame className="size-5" />
          </span>
          <div>
            <div className="font-display text-2xl font-bold">
              {t('statistics.streakDays', { count: stats.currentStreakDays })}
            </div>
            <div className="text-sm font-medium text-white/80">{t('statistics.currentStreak')}</div>
          </div>
        </motion.div>
      </div>

      <div className="mb-3 mt-9 flex items-center gap-2">
        <Radio className="size-[18px] text-brand-500" />
        <h2 className="font-display text-lg font-bold text-ink-800">{t('statistics.liveAttendance')}</h2>
      </div>

      {!attendance && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      )}

      {attendance?.length === 0 && (
        <EmptyState icon={<Radio className="size-6" />} title={t('statistics.noAttendance')} />
      )}

      {attendance && attendance.length > 0 && (
        <Card className="divide-y divide-ink-100 overflow-hidden">
          {attendance.map((a) => (
            <div key={a._id} className="px-4 py-3.5">
              <div className="text-sm font-semibold text-ink-800">
                {a.liveSession.title} <span className="font-normal text-ink-400">— {a.course.title}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink-500">
                {new Date(a.joinedAt).toLocaleDateString()} · {t('statistics.attendedFor', { duration: formatDuration(a.durationSeconds) })}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
