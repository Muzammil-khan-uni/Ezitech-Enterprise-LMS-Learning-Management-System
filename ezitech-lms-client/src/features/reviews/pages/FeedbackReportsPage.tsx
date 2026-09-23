import { motion } from 'framer-motion';
import { Star, MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInstructorFeedback } from '../reviewsApi';
import { Card, EmptyState } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-3.5 ${i < rounded ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}`} />
      ))}
    </span>
  );
}

export default function FeedbackReportsPage() {
  const { t } = useTranslation();
  const { data: reports, isLoading } = useInstructorFeedback();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('feedbackReports.title')}</h1>

      <div className="mt-6 space-y-4">
        {isLoading && Array.from({ length: 2 }).map((_, i) => <CourseCardSkeleton key={i} />)}

        {!isLoading && reports?.length === 0 && (
          <EmptyState icon={<MessagesSquare className="size-7" />} title={t('feedbackReports.noCoursesYet')} />
        )}

        {reports?.map((report, i) => (
          <motion.div key={report.course._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.06 }}>
            <Card className="p-5">
              <h2 className="font-display font-bold text-ink-900">{report.course.title}</h2>
              {report.totalReviews > 0 ? (
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-600">
                  <Stars rating={report.averageRating || 0} />
                  <span className="font-semibold text-ink-800">{report.averageRating}</span>
                  <span className="text-ink-400">{t('feedbackReports.reviewCount', { count: report.totalReviews })}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-400">{t('feedbackReports.noReviewsYet')}</p>
              )}

              {report.recentReviews.length > 0 && (
                <div className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
                  {report.recentReviews.map((r, idx) => (
                    <div key={idx} className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink-800">{r.studentName}</span>
                        <Stars rating={r.rating} />
                      </div>
                      {r.comment && <p className="mt-0.5 text-sm text-ink-500">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
