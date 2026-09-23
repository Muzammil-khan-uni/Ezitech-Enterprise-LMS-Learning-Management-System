import { FormEvent, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, ChevronDown, Radio, Users, Video } from 'lucide-react';
import {
  useCourseLiveSessions,
  useScheduleLiveSession,
  useStartLiveSession,
  useEndLiveSession,
} from '../liveClassesApi';
import { useSessionAttendance } from '@/features/attendance/attendanceApi';
import { useAuth } from '@/hooks/useAuth';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

const STATUS_TONE = { scheduled: 'brand', live: 'danger', ended: 'neutral', cancelled: 'neutral' } as const;

function AttendanceList({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const { data: records, isLoading } = useSessionAttendance(sessionId);

  if (isLoading) return <p className="mt-2 text-xs text-ink-400">{t('liveClasses.loadingAttendance')}</p>;
  if (records?.length === 0) return <p className="mt-2 text-xs text-ink-400">{t('liveClasses.noAttendanceYet')}</p>;

  return (
    <ul className="mt-2 space-y-1 text-sm text-ink-600">
      {records?.map((r) => (
        <li key={r._id} className="flex items-center gap-1.5">
          <Users className="size-3.5 text-ink-300" />
          {r.student?.name} — {formatDuration(r.durationSeconds)}
          {r.isPresent && <span className="font-semibold text-emerald-600"> {t('liveClasses.currentlyInSession')}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function LiveClassListPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sessions, isLoading } = useCourseLiveSessions(courseId);
  const schedule = useScheduleLiveSession(courseId!);
  const startSession = useStartLiveSession();
  const endSession = useEndLiveSession();
  const [expandedAttendance, setExpandedAttendance] = useState<string | null>(null);

  const canManage = user && ['instructor', 'course_manager', 'admin'].includes(user.role);

  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  async function handleSchedule(e: FormEvent) {
    e.preventDefault();
    await schedule.mutateAsync({ title, scheduledAt: new Date(scheduledAt).toISOString() });
    setTitle('');
    setScheduledAt('');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('liveClasses.title')}</h1>

      {canManage && (
        <Card className="mt-6 p-5">
          <form onSubmit={handleSchedule} className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <Input label={t('liveClasses.sessionTitle')} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Input
                label={t('liveClasses.when')}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <Button type="submit" isLoading={schedule.isPending} iconLeft={<CalendarPlus className="size-4" />}>
              {t('liveClasses.schedule')}
            </Button>
          </form>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {isLoading && Array.from({ length: 2 }).map((_, i) => <ListRowSkeleton key={i} />)}

        {!isLoading && sessions?.length === 0 && (
          <EmptyState icon={<Radio className="size-7" />} title={t('liveClasses.none')} />
        )}

        {sessions?.map((session, i) => (
          <motion.div key={session._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-ink-900">{session.title}</h3>
                <Badge tone={STATUS_TONE[session.status]}>{session.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-500">{new Date(session.scheduledAt).toLocaleString()}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {session.status === 'live' && (
                  <Button size="sm" iconLeft={<Video className="size-4" />} onClick={() => navigate(`/live-classes/${session._id}/room`)}>
                    {t('liveClasses.join')}
                  </Button>
                )}
                {canManage && session.status === 'scheduled' && (
                  <Button size="sm" variant="outline" isLoading={startSession.isPending} onClick={() => startSession.mutate(session._id)}>
                    {t('liveClasses.start')}
                  </Button>
                )}
                {canManage && session.status === 'live' && (
                  <Button size="sm" variant="danger" isLoading={endSession.isPending} onClick={() => endSession.mutate(session._id)}>
                    {t('liveClasses.end')}
                  </Button>
                )}
              </div>

              {canManage && (session.status === 'live' || session.status === 'ended') && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedAttendance(expandedAttendance === session._id ? null : session._id)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {expandedAttendance === session._id ? t('liveClasses.hideAttendance') : t('liveClasses.viewAttendance')}
                    <ChevronDown className={`size-3.5 transition-transform ${expandedAttendance === session._id ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {expandedAttendance === session._id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <AttendanceList sessionId={session._id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
