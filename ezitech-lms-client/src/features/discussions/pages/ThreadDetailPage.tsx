import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Lock, Megaphone, MessageSquare, Send, UserRound } from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';
import { useComments, useAddComment, Thread } from '../discussionsApi';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ThreadDetailPage() {
  const { t } = useTranslation();
  const { threadId } = useParams<{ threadId: string }>();
  const { data: thread } = useQuery({
    queryKey: ['discussions', 'thread', threadId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/discussions/threads/${threadId}`);
      return data.data as Thread;
    },
    enabled: !!threadId,
  });
  const { data: comments } = useComments(threadId);
  const addComment = useAddComment(threadId!);

  const [body, setBody] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await addComment.mutateAsync(body);
    setBody('');
  }

  if (!thread) {
    return (
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {thread.isAnnouncement && (
        <Badge tone="danger" icon={<Megaphone className="size-3" />} className="mb-2">
          {t('discussions.announcement')}
        </Badge>
      )}
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{thread.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
        <UserRound className="size-3.5" />
        {thread.author.name}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{thread.body}</p>

      <div className="mb-3 mt-8 flex items-center gap-2">
        <MessageSquare className="size-[18px] text-brand-500" />
        <h2 className="font-display text-lg font-bold text-ink-800">{t('discussions.replies')}</h2>
      </div>

      {comments?.length === 0 && <EmptyState icon={<MessageSquare className="size-6" />} title={t('discussions.noRepliesYet')} />}

      <div className="space-y-3">
        {comments?.map((c, i) => (
          <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                {c.author.name}
                {c.isInstructorReply && (
                  <Badge tone="brand" icon={<GraduationCap className="size-3" />}>
                    {t('discussions.instructorBadge')}
                  </Badge>
                )}
              </p>
              <p className="mt-1 text-sm text-ink-600">{c.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {!thread.isLocked ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-2">
          <textarea
            placeholder={t('discussions.replyPlaceholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
          />
          <Button type="submit" isLoading={addComment.isPending} iconLeft={<Send className="size-4" />}>
            {addComment.isPending ? t('discussions.posting') : t('discussions.reply')}
          </Button>
        </form>
      ) : (
        <p className="mt-5 flex items-center gap-1.5 text-sm text-ink-500">
          <Lock className="size-4" /> {t('discussions.locked')}
        </p>
      )}
    </div>
  );
}
