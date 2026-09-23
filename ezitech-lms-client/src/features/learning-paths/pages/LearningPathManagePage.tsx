import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, Eye, EyeOff, GripVertical, PlusCircle, Route as RouteIcon, Trash2, X } from 'lucide-react';
import {
  usePaths,
  useCreatePath,
  useUpdatePath,
  useSetPathCourses,
  useDeletePath,
  type LearningPath,
} from '../learningPathsApi';
import { useCourses } from '@/features/courses/coursesApi';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

const selectClass =
  'focus-ring rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';

function CreatePathForm() {
  const { t } = useTranslation();
  const createPath = useCreatePath();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createPath.mutateAsync({ title, description, level });
    setTitle('');
    setDescription('');
  }

  return (
    <Card className="p-5">
      <h2 className="font-display mb-4 flex items-center gap-2 font-bold text-ink-800">
        <RouteIcon className="size-[18px] text-brand-500" />
        {t('admin.newLearningPath')}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input label={t('courseAuthoring.title')} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="min-w-[200px] flex-1">
          <Input label={t('admin.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-700">{t('admin.level')}</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectClass}>
            <option value="beginner">{t('courseAuthoring.levelBeginner')}</option>
            <option value="intermediate">{t('courseAuthoring.levelIntermediate')}</option>
            <option value="advanced">{t('courseAuthoring.levelAdvanced')}</option>
          </select>
        </div>
        <Button type="submit" isLoading={createPath.isPending} iconLeft={<PlusCircle className="size-4" />}>
          {t('admin.create')}
        </Button>
      </form>
    </Card>
  );
}

function CourseEditor({ path }: { path: LearningPath }) {
  const { t } = useTranslation();
  const setPathCourses = useSetPathCourses(path._id);
  const { data: coursesData } = useCourses({ status: 'published', limit: 100 });
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const sortedEntries = [...path.courses].sort((a, b) => a.order - b.order);
  const usedCourseIds = new Set(sortedEntries.map((e) => e.course._id));
  const availableCourses = (coursesData?.items ?? []).filter((c) => !usedCourseIds.has(c._id));

  function saveOrder(entries: typeof sortedEntries) {
    setPathCourses.mutate(entries.map((e, i) => ({ course: e.course._id, order: i })));
  }

  function moveEntry(index: number, direction: -1 | 1) {
    const next = [...sortedEntries];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  }

  function removeEntry(index: number) {
    saveOrder(sortedEntries.filter((_, i) => i !== index));
  }

  function addCourse() {
    if (!selectedCourseId) return;
    const course = coursesData?.items.find((c) => c._id === selectedCourseId);
    if (!course) return;
    saveOrder([...sortedEntries, { course: { _id: course._id, title: course.title, level: course.level }, order: 0 }]);
    setSelectedCourseId('');
  }

  return (
    <div className="space-y-2 border-t border-ink-100 p-4">
      {sortedEntries.length === 0 && <p className="text-sm text-ink-400">{t('admin.noCoursesAddedYet')}</p>}
      {sortedEntries.map((entry, i) => (
        <div key={entry.course._id} className="flex items-center gap-2 rounded-lg bg-ink-50/60 px-3 py-2">
          <GripVertical className="size-4 shrink-0 text-ink-300" />
          <span className="flex-1 truncate text-sm font-medium text-ink-700" title={`${i + 1}. ${entry.course.title}`}>
            {i + 1}. {entry.course.title}
          </span>
          <button
            type="button"
            disabled={i === 0}
            onClick={() => moveEntry(i, -1)}
            className="focus-ring flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 disabled:opacity-30"
            aria-label={t('admin.moveUp')}
          >
            <ChevronDown className="size-4 rotate-180" />
          </button>
          <button
            type="button"
            disabled={i === sortedEntries.length - 1}
            onClick={() => moveEntry(i, 1)}
            className="focus-ring flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 disabled:opacity-30"
            aria-label={t('admin.moveDown')}
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => removeEntry(i)}
            className="focus-ring flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
            aria-label={t('admin.removeCourse')}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className={`${selectClass} flex-1`}>
          <option value="">{t('admin.addACourse')}</option>
          {availableCourses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" disabled={!selectedCourseId} isLoading={setPathCourses.isPending} onClick={addCourse}>
          {t('admin.add')}
        </Button>
      </div>
    </div>
  );
}

function PathRow({ path }: { path: LearningPath }) {
  const { t } = useTranslation();
  const updatePath = useUpdatePath(path._id);
  const deletePath = useDeletePath();
  const [isOpen, setIsOpen] = useState(false);

  function handleDelete() {
    if (window.confirm(t('admin.confirmDeletePath', { title: path.title }))) {
      deletePath.mutate(path._id);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-ink-900">{path.title}</span>
            <Badge tone="neutral">{path.level}</Badge>
            <Badge tone={path.isPublished ? 'success' : 'warning'}>{path.isPublished ? t('assessments.published') : t('assessments.draft')}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-400">{t('admin.coursesCount', { count: path.courses.length })}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          isLoading={updatePath.isPending}
          iconLeft={path.isPublished ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          onClick={() => updatePath.mutate({ isPublished: !path.isPublished })}
        >
          {path.isPublished ? t('courseAuthoring.unpublish') : t('courseAuthoring.publish')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setIsOpen((v) => !v)}>
          {isOpen ? t('admin.hideCourses') : t('admin.editCourses')}
        </Button>
        <button
          onClick={handleDelete}
          disabled={deletePath.isPending}
          aria-label={t('admin.deletePath')}
          className="focus-ring flex size-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <CourseEditor path={path} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function LearningPathManagePage() {
  const { t } = useTranslation();
  const { data: paths, isLoading, isError } = usePaths();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('admin.pathManageTitle')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('admin.pathManageSubtitle')}</p>

      <div className="mt-6">
        <CreatePathForm />
      </div>

      <div className="mt-6 space-y-3">
        {isError && (
          <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertCircle className="size-3.5" /> {t('admin.couldNotLoadPaths')}
          </p>
        )}
        {isLoading && Array.from({ length: 2 }).map((_, i) => <ListRowSkeleton key={i} />)}
        {!isLoading && paths?.length === 0 && <EmptyState icon={<RouteIcon className="size-7" />} title={t('admin.noPathsYet')} />}
        {paths?.map((path) => (
          <PathRow key={path._id} path={path} />
        ))}
      </div>
    </div>
  );
}
