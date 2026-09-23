import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Megaphone, MessageSquare, Pin, Send } from 'lucide-react';
import { useThreads, useCreateThread } from '../discussionsApi';
import { useAuth } from '@/hooks/useAuth';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function CourseDiscussionPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { data: threads, isLoading } = useThreads(courseId);
  const createThread = useCreateThread(courseId!);

  const canAnnounce = user && ['instructor', 'course_manager', 'admin'].includes(user.role);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createThread.mutateAsync({ title, body, isAnnouncement });
    setTitle('');
    setBody('');
    setIsAnnouncement(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('discussions.title')}</h1>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder={t('discussions.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
          />
          <textarea
            placeholder={t('discussions.bodyPlaceholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
          />
          {canAnnounce && (
            <label className="flex items-center gap-2 text-sm font-medium text-ink-600">
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="size-4 rounded accent-brand-600"
              />
              {t('discussions.postAsAnnouncement')}
            </label>
          )}
          <Button type="submit" isLoading={createThread.isPending} iconLeft={<Send className="size-4" />}>
            {createThread.isPending ? t('discussions.posting') : t('discussions.post')}
          </Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} />)}

        {!isLoading && threads?.length === 0 && (
          <EmptyState icon={<MessageSquare className="size-7" />} title={t('discussions.noneYet')} description={t('discussions.beFirst')} />
        )}

        {threads?.map((thread, i) => (
          <motion.div key={thread._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
            <Link to={`/threads/${thread._id}`}>
              <Card hoverLift className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {thread.isAnnouncement && (
                    <Badge tone="danger" icon={<Megaphone className="size-3" />}>
                      {t('discussions.announcement')}
                    </Badge>
                  )}
                  {thread.isPinned && <Pin className="size-3.5 text-ink-400" />}
                </div>
                <h3 className="font-display mt-1 font-bold text-ink-900 hover:text-brand-700">{thread.title}</h3>
                <p className="mt-0.5 text-sm text-ink-500">
                  {thread.author.name} · {t('discussions.repliesCount', { count: thread.commentCount })}
                </p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
