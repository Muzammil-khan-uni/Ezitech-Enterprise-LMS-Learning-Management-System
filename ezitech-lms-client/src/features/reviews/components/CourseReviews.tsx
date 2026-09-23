import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';
import { useCourseReviews, useCourseRatingSummary, useCreateReview } from '../reviewsApi';
import { Button } from '@/components/ui';

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

export default function CourseReviews({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) {
  const { data: summary } = useCourseRatingSummary(courseId);
  const { data: reviews } = useCourseReviews(courseId);
  const createReview = useCreateReview(courseId);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createReview.mutateAsync({ rating, comment: comment || undefined });
    setSubmitted(true);
    setComment('');
  }

  return (
    <div>
      {summary && summary.totalReviews > 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-600">
          <Stars rating={summary.averageRating || 0} />
          <span className="font-semibold text-ink-800">{summary.averageRating}</span>
          <span className="text-ink-400">
            ({summary.totalReviews} review{summary.totalReviews === 1 ? '' : 's'})
          </span>
        </p>
      ) : (
        <p className="text-sm text-ink-400">No reviews yet.</p>
      )}

      {isEnrolled && !submitted && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-700">Your rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="focus-ring rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Share your experience with this course (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
          />
          <Button type="submit" size="sm" isLoading={createReview.isPending}>
            {createReview.isPending ? 'Submitting' : 'Submit review'}
          </Button>
          {createReview.isError && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              Could not submit — you may need to complete the course first, or you've already reviewed it.
            </p>
          )}
        </form>
      )}
      {submitted && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <Sparkles className="size-4" /> Thanks for your feedback!
        </motion.p>
      )}

      {reviews && reviews.length > 0 && (
        <div className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
          {reviews.map((r) => (
            <div key={r._id} className="py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink-800">{r.student.name}</span>
                <Stars rating={r.rating} />
              </div>
              {r.comment && <p className="mt-0.5 text-sm text-ink-600">{r.comment}</p>}
              <p className="mt-0.5 text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
