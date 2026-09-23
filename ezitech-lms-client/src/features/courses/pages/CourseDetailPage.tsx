import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  FileText,
  ClipboardList,
  Download,
  CheckCircle2,
  Circle,
  ChevronDown,
  Lock,
  Ticket,
  MessagesSquare,
  Radio,
  DownloadCloud,
  LogOut,
  PartyPopper,
  Layers,
} from 'lucide-react';
import { useCourse, useSections, useLessons } from '../coursesApi';
import { useAuth } from '@/hooks/useAuth';
import { useMyEnrollmentForCourse, useEnroll, useDropEnrollment } from '@/features/enrollments/enrollmentsApi';
import { useCourseProgress, useMarkLessonComplete } from '@/features/progress/progressApi';
import VideoPlayer from '@/features/progress/components/VideoPlayer';
import CourseReviews from '@/features/reviews/components/CourseReviews';
import PublicHeader from '@/components/layout/PublicHeader';
import { Badge, Button, Card, Input, ProgressBar } from '@/components/ui';
import { downloadAuthenticatedFile, readBlobError } from '@/lib/download';
import { getApiError } from '@/lib/apiError';
import { useAppConfig } from '@/features/config/configApi';

const LEVEL_TONE = { beginner: 'success', intermediate: 'warning', advanced: 'danger' } as const;

const LESSON_ICON: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  pdf: FileText,
  assignment: ClipboardList,
  download: Download,
  scorm: Layers,
};

export default function CourseDetailPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { isAuthenticated } = useAuth();
  const { data: course, isLoading } = useCourse(courseId);
  const { data: sections } = useSections(courseId);
  const { data: lessons } = useLessons(courseId);

  const { enrollment } = useMyEnrollmentForCourse(courseId);
  const enroll = useEnroll();
  const dropEnrollment = useDropEnrollment();
  const [couponCode, setCouponCode] = useState('');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packagingError, setPackagingError] = useState<string | null>(null);

  async function handleOfflineDownload() {
    setIsPackaging(true);
    setPackagingError(null);
    try {
      await downloadAuthenticatedFile(`/courses/${courseId}/offline-package`, `course-${courseId}-offline.zip`);
    } catch (err) {
      setPackagingError((await readBlobError(err)) ?? t('courses.offlineDownloadFailed'));
    } finally {
      setIsPackaging(false);
    }
  }

  const isEnrolled = enrollment && enrollment.status !== 'dropped';
  const { data: progress } = useCourseProgress(isEnrolled ? courseId : undefined);
  const markComplete = useMarkLessonComplete(courseId!);
  const { paymentsEnabled } = useAppConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-5xl animate-pulse px-4 py-16 sm:px-6">
          <div className="skeleton h-8 w-2/3 rounded-lg" />
          <div className="skeleton mt-4 h-4 w-full rounded-lg" />
          <div className="skeleton mt-2 h-4 w-5/6 rounded-lg" />
        </div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <p className="px-6 py-16 text-center text-ink-500">{t('courses.courseNotFound')}</p>
      </div>
    );
  }

  const completedLessonIds = new Set(progress?.lessons.filter((l) => l.isCompleted).map((l) => l.lesson) ?? []);
  const sectionList = sections ?? [];
  const activeSection = openSection ?? sectionList[0]?._id ?? null;

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <div className="bg-gradient-brand relative overflow-hidden px-4 py-12 text-white sm:px-6">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:26px_26px]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={LEVEL_TONE[course.level]}>{course.level}</Badge>
              <Badge tone="neutral" className="!bg-white/15 !text-white !ring-white/25">
                {course.language?.toUpperCase()}
              </Badge>
            </div>
            <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-white/80">{course.description}</p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <div>
            <h2 className="font-display mb-3 text-lg font-bold text-ink-800">{t('courses.curriculum')}</h2>
            {sectionList.length === 0 && <p className="text-sm text-ink-500">{t('courses.noContentYet')}</p>}

            <div className="space-y-3">
              {sectionList.map((section) => {
                const sectionLessons = lessons?.filter((l) => l.section === section._id) ?? [];
                const isOpen = activeSection === section._id;
                return (
                  <Card key={section._id} className="overflow-hidden">
                    <button
                      onClick={() => setOpenSection(isOpen ? '' : section._id)}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-start"
                    >
                      <span className="font-display font-bold text-ink-800">{section.title}</span>
                      <span className="flex items-center gap-2 text-xs text-ink-400">
                        {t('courses.lessonsCount', { count: sectionLessons.length })}
                        <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden border-t border-ink-100"
                        >
                          {markComplete.isError && (
                            <p role="alert" className="border-b border-ink-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                              {getApiError(markComplete.error, t('courses.markCompleteFailed'))}
                            </p>
                          )}
                          <ul className="divide-y divide-ink-100">
                            {sectionLessons.map((lesson) => {
                              const isDone = completedLessonIds.has(lesson._id);
                              const isVideo = lesson.lessonType === 'video';
                              const isScorm = lesson.lessonType === 'scorm';
                              const Icon = LESSON_ICON[lesson.lessonType] ?? FileText;

                              return (
                                <li key={lesson._id} className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {!isVideo && !isScorm && isEnrolled ? (
                                      <button
                                        onClick={() => !isDone && markComplete.mutate(lesson._id)}
                                        disabled={isDone || markComplete.isPending}
                                        aria-label={t('courses.markLessonComplete', { title: lesson.title })}
                                        className="shrink-0 text-brand-500 disabled:cursor-default"
                                      >
                                        {isDone ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-ink-300" />}
                                      </button>
                                    ) : (
                                      <Icon className={`size-5 shrink-0 ${isDone ? 'text-emerald-500' : 'text-ink-400'}`} />
                                    )}

                                    {isScorm && isEnrolled ? (
                                      <Link to={`/scorm/${courseId}/${lesson._id}`} className="text-sm font-semibold text-ink-800 hover:text-brand-600">
                                        {lesson.title}
                                      </Link>
                                    ) : (
                                      <span className="text-sm font-semibold text-ink-800">{lesson.title}</span>
                                    )}
                                    {lesson.isPreview && !isEnrolled && (
                                      <Badge tone="success" className="shrink-0">
                                        {t('courses.preview')}
                                      </Badge>
                                    )}
                                    {lesson.locked && (
                                      <Lock
                                        className="size-3.5 shrink-0 text-ink-300"
                                        aria-label={t('courses.lockedLesson')}
                                      />
                                    )}
                                    <span className="ml-auto shrink-0 text-xs capitalize text-ink-400">{lesson.lessonType}</span>
                                  </div>
                                  {isVideo && isEnrolled && (
                                    <div className="mt-3 overflow-hidden rounded-xl">
                                      <VideoPlayer
                                        courseId={courseId!}
                                        lessonId={lesson._id}
                                        videoUrl={(lesson.videoUrl as string) || ''}
                                      />
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display mb-3 text-lg font-bold text-ink-800">{t('courses.reviews')}</h2>
            <Card className="p-4">
              <CourseReviews courseId={courseId!} isEnrolled={Boolean(isEnrolled)} />
            </Card>
          </div>
        </div>

        {isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              {isEnrolled ? (
                <>
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold text-ink-700">
                    <span>{t('courses.yourProgress')}</span>
                    <span className="text-brand-600">{enrollment?.progressPercent}%</span>
                  </div>
                  <ProgressBar value={enrollment?.progressPercent ?? 0} />
                  {enrollment?.status === 'completed' && (
                    <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <PartyPopper className="size-4" /> {t('courses.courseCompleted')}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <Link to={`/courses/${courseId}/assessments`}>
                      <Button variant="outline" size="sm" className="w-full justify-start" iconLeft={<ClipboardList className="size-4" />}>
                        {t('courses.viewAssessments')}
                      </Button>
                    </Link>
                    <Link to={`/courses/${courseId}/discussion`}>
                      <Button variant="outline" size="sm" className="w-full justify-start" iconLeft={<MessagesSquare className="size-4" />}>
                        {t('courses.discussion')}
                      </Button>
                    </Link>
                    <Link to={`/courses/${courseId}/live-classes`}>
                      <Button variant="outline" size="sm" className="w-full justify-start" iconLeft={<Radio className="size-4" />}>
                        {t('courses.liveClasses')}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      iconLeft={<DownloadCloud className="size-4" />}
                      onClick={handleOfflineDownload}
                      disabled={isPackaging}
                    >
                      {isPackaging ? t('common.loading') : t('courses.downloadOffline')}
                    </Button>
                    {packagingError && (
                      <p className="text-xs font-medium text-rose-600" role="alert">
                        {packagingError}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start !text-rose-600 hover:!bg-rose-50 dark:!text-rose-300 dark:hover:!bg-rose-500/15"
                      iconLeft={<LogOut className="size-4" />}
                      onClick={() => dropEnrollment.mutate(courseId!)}
                      disabled={dropEnrollment.isPending}
                    >
                      {t('common.dropCourse')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display text-3xl font-extrabold text-ink-900">
                    {course.price > 0 ? (paymentsEnabled ? `$${course.price}` : t('courses.paidUnavailable')) : t('common.free')}
                  </div>
                  {course.price > 0 && !paymentsEnabled && (
                    <p className="mt-2 text-xs text-ink-500">{t('courses.paidUnavailableDesc')}</p>
                  )}
                  {course.price > 0 && paymentsEnabled && (
                    <div className="mt-4">
                      <Input
                        label={t('courses.couponCode')}
                        icon={<Ticket className="size-4" />}
                        placeholder="e.g. WELCOME10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                    </div>
                  )}
                  <Button
                    className="mt-4 w-full"
                    isLoading={enroll.isPending}
                    disabled={course.price > 0 && !paymentsEnabled}
                    onClick={() => enroll.mutate({ courseId: courseId!, couponCode: couponCode || undefined })}
                  >
                    {enroll.isPending ? t('courses.enrolling') : t('courses.enrollNow')}
                  </Button>
                  {enroll.isError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                      {getApiError(enroll.error, t('courses.enrollError'))}
                    </p>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
