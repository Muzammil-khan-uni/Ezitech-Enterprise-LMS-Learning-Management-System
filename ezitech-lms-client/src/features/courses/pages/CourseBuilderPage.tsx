import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, ClipboardList, FileText, Layers, PlusCircle, Rocket, Settings2 } from 'lucide-react';
import {
  useCourse,
  useSections,
  useAddSection,
  useLessons,
  useAddLesson,
  useSetCourseStatus,
  useUpdateCourse,
  useCategories,
} from '../coursesApi';
import type { LessonType, Course } from '../types';
import FileUploadField from '@/features/uploads/components/FileUploadField';
import type { UploadResult } from '@/features/uploads/uploadsApi';
import ScormUploadField from '@/features/scorm/components/ScormUploadField';
import type { ScormUploadResult } from '@/features/scorm/scormApi';
import { Badge, Button, Card, Input } from '@/components/ui';
import CourseMentorsCard from '../components/CourseMentorsCard';
import { useAppConfig } from '@/features/config/configApi';
import { Skeleton } from '@/components/ui/Skeleton';

const selectClass =
  'focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';
const labelClass = 'mb-1.5 block text-sm font-semibold text-ink-700';

function AddSectionForm({ courseId, nextOrder }: { courseId: string; nextOrder: number }) {
  const { t } = useTranslation();
  const addSection = useAddSection(courseId);
  const [title, setTitle] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await addSection.mutateAsync({ title, order: nextOrder });
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
      <input
        placeholder={t('courseAuthoring.newSectionTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="focus-ring flex-1 rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
      />
      <Button type="submit" isLoading={addSection.isPending} iconLeft={<PlusCircle className="size-4" />}>
        {t('courseAuthoring.addSection')}
      </Button>
    </form>
  );
}

function AddLessonForm({ courseId, sectionId, nextOrder }: { courseId: string; sectionId: string; nextOrder: number }) {
  const { t } = useTranslation();
  const addLesson = useAddLesson(courseId);
  const [title, setTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('video');
  const [instructions, setInstructions] = useState('');
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [scormUpload, setScormUpload] = useState<ScormUploadResult | null>(null);
  const [scormEntryPoint, setScormEntryPoint] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const base = { title, section: sectionId, order: nextOrder, lessonType };
    const typeFields =
      lessonType === 'video'
        ? { videoUrl: upload!.url, durationSeconds: upload!.durationSeconds ?? 0 }
        : lessonType === 'assignment'
          ? { instructions }
          : lessonType === 'scorm'
            ? { packageUrl: scormUpload!.packageUrl, entryPoint: scormEntryPoint, scormVersion: scormUpload!.scormVersion }
            : { fileUrl: upload!.url };

    await addLesson.mutateAsync({ ...base, ...typeFields });
    setTitle('');
    setInstructions('');
    setUpload(null);
    setScormUpload(null);
    setScormEntryPoint('');
  }

  function handleTypeChange(type: LessonType) {
    setLessonType(type);
    setUpload(null);
    setScormUpload(null);
    setScormEntryPoint('');
  }

  function handleScormUploaded(result: ScormUploadResult) {
    setScormUpload(result);
    setScormEntryPoint(result.entryPoint);
  }

  const canSubmit =
    lessonType === 'assignment' ? !!instructions : lessonType === 'scorm' ? !!scormUpload && !!scormEntryPoint : !!upload;

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/40 p-4">
      <div className="flex flex-wrap gap-2">
        <select value={lessonType} onChange={(e) => handleTypeChange(e.target.value as LessonType)} className={`${selectClass} w-36`}>
          <option value="video">{t('courseAuthoring.typeVideo')}</option>
          <option value="pdf">{t('courseAuthoring.typePdf')}</option>
          <option value="assignment">{t('courseAuthoring.typeAssignment')}</option>
          <option value="download">{t('courseAuthoring.typeDownload')}</option>
          <option value="scorm">{t('courseAuthoring.typeScorm')}</option>
        </select>
        <input
          placeholder={t('courseAuthoring.lessonTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="focus-ring min-w-[180px] flex-1 rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:border-ink-300"
        />
      </div>

      {lessonType === 'assignment' && (
        <input
          placeholder={t('courseAuthoring.instructions')}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          required
          className="focus-ring w-full rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300"
        />
      )}

      {lessonType === 'video' && (
        <FileUploadField kind="video" label={t('courseAuthoring.videoFile')} accept="video/*" currentUrl={upload?.url} onUploaded={setUpload} />
      )}
      {lessonType === 'pdf' && (
        <FileUploadField kind="pdf" label={t('courseAuthoring.pdfFile')} accept="application/pdf" currentUrl={upload?.url} onUploaded={setUpload} />
      )}
      {lessonType === 'download' && (
        <FileUploadField kind="download" label={t('courseAuthoring.downloadableFile')} currentUrl={upload?.url} onUploaded={setUpload} />
      )}
      {lessonType === 'scorm' && (
        <>
          <ScormUploadField onUploaded={handleScormUploaded} isUploaded={!!scormUpload} />
          {scormUpload && (
            <Input
              label={t('courseAuthoring.launchFile')}
              value={scormEntryPoint}
              onChange={(e) => setScormEntryPoint(e.target.value)}
              placeholder="index.html"
              required
            />
          )}
        </>
      )}

      <Button type="submit" size="sm" isLoading={addLesson.isPending} disabled={!canSubmit} iconLeft={<PlusCircle className="size-4" />}>
        {t('courseAuthoring.addLesson')}
      </Button>
    </form>
  );
}

function EditCourseDetailsForm({ course }: { course: Course }) {
  const { t } = useTranslation();
  const updateCourse = useUpdateCourse(course._id);
  const { data: categories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);

  const [tagsInput, setTagsInput] = useState(course.tags.join(', '));
  const { paymentsEnabled } = useAppConfig();
  const [price, setPrice] = useState(String(course.price));
  const [language, setLanguage] = useState(course.language);
  const [category, setCategory] = useState(
    typeof course.category === 'string' ? course.category : course.category._id
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    await updateCourse.mutateAsync({ tags, ...(paymentsEnabled ? { price: Number(price) || 0 } : {}), language, category });
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <button onClick={() => setIsOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3.5 text-start">
        <span className="flex items-center gap-2 font-display font-bold text-ink-800">
          <Settings2 className="size-[18px] text-brand-500" />
          {t('courseAuthoring.editCourseDetails')}
        </span>
        <ChevronDown className={`size-4 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <motion.form
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          onSubmit={handleSave}
          className="space-y-4 border-t border-ink-100 p-5"
        >
          <div>
            <label className={labelClass}>{t('courseAuthoring.category')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('courseAuthoring.contentLanguage')}</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
              <option value="ur">Urdu</option>
            </select>
          </div>
          {paymentsEnabled ? (
            <Input label={t('courseAuthoring.priceSimple')} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          ) : (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">{t('courseAuthoring.pricingOff')}</p>
          )}
          <Input label={t('courseAuthoring.tags')} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          <Button type="submit" size="sm" isLoading={updateCourse.isPending}>
            {updateCourse.isPending ? t('profile.saving') : t('courseAuthoring.saveDetails')}
          </Button>
        </motion.form>
      )}
    </Card>
  );
}

export default function CourseBuilderPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course } = useCourse(courseId);
  const { data: sections } = useSections(courseId);
  const { data: lessons } = useLessons(courseId);
  const setStatus = useSetCourseStatus(courseId!);

  if (!courseId || !course) {
    return (
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const isPublished = course.status === 'published';

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{course.title}</h1>
          <Badge tone={isPublished ? 'success' : 'neutral'} className="mt-1.5">
            {course.status}
          </Badge>
        </div>
        <Button
          variant={isPublished ? 'outline' : 'primary'}
          isLoading={setStatus.isPending}
          iconLeft={<Rocket className="size-4" />}
          onClick={() => setStatus.mutate(isPublished ? 'draft' : 'published')}
        >
          {isPublished ? t('courseAuthoring.unpublish') : t('courseAuthoring.publish')}
        </Button>
      </div>
      {setStatus.isError && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <AlertCircle className="size-3.5" /> {t('courseAuthoring.couldNotChangeStatus')}
        </p>
      )}

      <div className="mt-6">
        <EditCourseDetailsForm course={course} />
      </div>

      <Link
        to={`/instructor/courses/${courseId}/assessments`}
        className="focus-ring mb-6 flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ClipboardList className="size-5" />
          </span>
          <span>
            <span className="font-display block font-bold text-ink-900">{t('courseAuthoring.assessmentsCardTitle')}</span>
            <span className="block text-sm text-ink-500">{t('courseAuthoring.assessmentsCardDesc')}</span>
          </span>
        </span>
      </Link>

      <CourseMentorsCard courseId={courseId} />

      <div className="mb-3 flex items-center gap-2">
        <Layers className="size-[18px] text-brand-500" />
        <h2 className="font-display text-lg font-bold text-ink-800">{t('courseAuthoring.sections')}</h2>
      </div>
      <AddSectionForm courseId={courseId} nextOrder={sections?.length ?? 0} />

      <div className="space-y-5">
        {sections?.map((section, i) => {
          const sectionLessons = lessons?.filter((l) => l.section === section._id) ?? [];
          return (
            <motion.div key={section._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
              <Card className="border-s-4 border-s-brand-400 p-4 sm:p-5">
                <h3 className="font-display font-bold text-ink-900">{section.title}</h3>
                {sectionLessons.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {sectionLessons.map((lesson) => (
                      <li key={lesson._id} className="flex items-center gap-2 text-sm text-ink-600">
                        <FileText className="size-3.5 text-ink-300" />
                        {lesson.title}
                        <span className="text-xs text-ink-400">({lesson.lessonType})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4">
                  <AddLessonForm courseId={courseId} sectionId={section._id} nextOrder={sectionLessons.length} />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
