import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppConfig } from '@/features/config/configApi';
import { motion } from 'framer-motion';
import { Search, GraduationCap, Clock, Signal, BookOpen, SearchX, Loader2 } from 'lucide-react';
import { useInfiniteCourses, useCategories } from '../coursesApi';
import PublicHeader from '@/components/layout/PublicHeader';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

const LEVEL_TONE = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

const LANGUAGES = [
  { value: '', label: 'All languages' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ur', label: 'Urdu' },
];

const PAGE_SIZE = 12;

const selectClass =
  'focus-ring rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300';

export default function CourseListPage() {
  const { paymentsEnabled } = useAppConfig();
  const { t } = useTranslation();
  const { data: categories } = useCategories();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetchingNextPage, isError, hasNextPage, fetchNextPage } = useInfiniteCourses({
    status: 'published',
    search: debouncedQuery || undefined,
    category: category || undefined,
    language: language || undefined,
    limit: PAGE_SIZE,
  });

  const allCourses = data?.pages.flatMap((p) => p.items) ?? [];
  const pagination = data?.pages[0]?.pagination;
  const hasMore = !!hasNextPage;

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <div className="bg-gradient-brand relative overflow-hidden px-4 py-14 text-white sm:px-6">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:26px_26px]" />
        <motion.div
          className="absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <GraduationCap className="size-3.5" />
              {pagination ? t('courses.publishedCourses', { count: pagination.total }) : t('courses.catalogBadge')}
            </span>
            <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t('courses.catalogTitle')}
            </h1>
            <p className="mt-2 max-w-xl text-white/80">{t('courses.catalogSubtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-2xl rounded-2xl bg-white p-1.5 shadow-lift"
          >
            <Input
              label=""
              icon={<Search className="size-4" />}
              placeholder={t('courses.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="!border-0 !bg-transparent !text-ink-800 focus-visible:!ring-0"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-3 flex flex-wrap gap-2"
          >
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              <option value="">{t('courses.allCategories')}</option>
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.value === '' ? t('courses.allLanguages') : l.label}
                </option>
              ))}
            </select>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {isError && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            {t('courses.couldNotLoad')}
          </p>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !isError && allCourses.length === 0 && (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title={query || category || language ? t('courses.noMatchingCourses') : t('courses.noPublishedCourses')}
            description={query || category || language ? t('courses.tryDifferentFilters') : t('courses.checkBackSoon')}
          />
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {allCourses.map((course, i) => (
            <motion.div
              key={course._id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i % PAGE_SIZE, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to={`/courses/${course._id}`}>
                <Card hoverLift className="group h-full overflow-hidden">
                  <div className="bg-gradient-brand relative flex h-36 items-center justify-center overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BookOpen className="size-10 text-white/70 transition-transform duration-500 group-hover:scale-110" />
                    )}
                    <div className="absolute end-3 top-3">
                      <Badge tone={LEVEL_TONE[course.level]}>{course.level}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="font-display line-clamp-1 text-base font-bold text-ink-900 transition-colors group-hover:text-brand-700">
                      {course.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-ink-500">{course.description || t('courses.noDescriptionYet')}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="flex items-center gap-1 text-xs font-medium text-ink-400">
                        <Signal className="size-3.5" />
                        {course.language.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-ink-400">
                        <Clock className="size-3.5" />
                        v{course.contentVersion}
                      </span>
                      <span className="font-display text-sm font-bold text-brand-600">
                        {course.price > 0 ? (paymentsEnabled ? `$${course.price}` : t('courses.paidUnavailable')) : t('common.free')}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" isLoading={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : t('courses.loadMoreCourses')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
