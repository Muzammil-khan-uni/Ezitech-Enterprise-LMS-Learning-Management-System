import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarClock, ClipboardCheck, HeartHandshake, MessagesSquare, Users, Video } from 'lucide-react';
import { useMentorDashboard } from '../dashboardsApi';
import { Badge, Button, Card, EmptyState, StatCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

export default function MentorDashboardPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMentorDashboard();

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('mentorDashboard.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('mentorDashboard.subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('mentorDashboard.courses')} value={data.totals.courses} icon={<BookOpen className="size-5" />} delay={0} />
        <StatCard label={t('mentorDashboard.students')} value={data.totals.students} icon={<Users className="size-5" />} tone="accent" delay={0.06} />
        <StatCard label={t('mentorDashboard.pendingGrading')} value={data.totals.pendingSubmissions} icon={<ClipboardCheck className="size-5" />} tone="success" delay={0.12} />
      </div>

      <h2 className="font-display mb-3 mt-9 text-lg font-bold text-ink-800">{t('mentorDashboard.assignedCourses')}</h2>
      {data.courses.length === 0 ? (
        <EmptyState icon={<HeartHandshake className="size-7" />} title={t('mentorDashboard.noCourses')} description={t('mentorDashboard.noCoursesDesc')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.courses.map((course, i) => (
            <motion.div key={course._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
              <Card className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/courses/${course.slug}`} className="focus-ring min-w-0 rounded font-display font-bold text-ink-900 hover:text-brand-700">
                    <span className="line-clamp-2">{course.title}</span>
                  </Link>
                  <Badge tone={course.status === 'published' ? 'success' : 'neutral'}>{course.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    {t('mentorDashboard.studentCount', { count: course.students })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClipboardCheck className="size-4" />
                    {t('mentorDashboard.toGrade', { count: course.pendingSubmissions })}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/mentor/courses/${course._id}/assessments`}>
                    <Button size="sm" iconLeft={<ClipboardCheck className="size-4" />}>
                      {t('mentorDashboard.grade')}
                    </Button>
                  </Link>
                  <Link to={`/courses/${course._id}/discussion`}>
                    <Button size="sm" variant="outline" iconLeft={<MessagesSquare className="size-4" />}>
                      {t('mentorDashboard.discussion')}
                    </Button>
                  </Link>
                  <Link to={`/courses/${course._id}/live-classes`}>
                    <Button size="sm" variant="outline" iconLeft={<Video className="size-4" />}>
                      {t('mentorDashboard.liveClasses')}
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {data.upcomingSessions.length > 0 && (
        <>
          <h2 className="font-display mb-3 mt-9 text-lg font-bold text-ink-800">{t('mentorDashboard.upcoming')}</h2>
          <div className="space-y-2">
            {data.upcomingSessions.map((session) => (
              <Card key={session._id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300">
                  <CalendarClock className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-900" title={session.title}>{session.title}</div>
                  <div className="truncate text-xs text-ink-500" title={session.course.title}>{session.course.title}</div>
                </div>
                <span className="text-sm font-medium text-ink-600">
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.scheduledAt))}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
