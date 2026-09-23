import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BookPlus, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppConfig } from '@/features/config/configApi';
import { useCreateCourse, useCategories, useCourses } from '../coursesApi';
import FileUploadField from '@/features/uploads/components/FileUploadField';
import { Button, Card, Input } from '@/components/ui';

export default function CourseCreatePage() {
  const { paymentsEnabled } = useAppConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createCourse = useCreateCourse();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: coursesData } = useCourses({ status: 'published', limit: 100 });
  const publishedCourses = coursesData?.items;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [price, setPrice] = useState('0');
  const [language, setLanguage] = useState('en');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const course = await createCourse.mutateAsync({
      title,
      description,
      category,
      level,
      thumbnailUrl,
      tags,
      prerequisites,
      price: paymentsEnabled ? Number(price) || 0 : 0,
      language,
    });
    navigate(`/instructor/courses/${course._id}/edit`);
  }

  function togglePrerequisite(courseId: string) {
    setPrerequisites((prev) => (prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]));
  }

  const selectClass =
    'focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';
  const labelClass = 'mb-1.5 block text-sm font-semibold text-ink-700';

  return (
    <div className="max-w-lg">
      <h1 className="font-display flex items-center gap-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        <BookPlus className="size-6 text-brand-500" />
        {t('courseAuthoring.newCourse')}
      </h1>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="title" label={t('courseAuthoring.title')} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div>
            <label htmlFor="description" className={labelClass}>
              {t('courseAuthoring.description')}
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
            />
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              {t('courseAuthoring.category')}
            </label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} required className={selectClass}>
              <option value="" disabled>
                {categoriesLoading ? t('courseAuthoring.loadingCategories') : t('courseAuthoring.selectCategory')}
              </option>
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {categories?.length === 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertCircle className="size-3.5" /> {t('courseAuthoring.noCategoriesYet')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="level" className={labelClass}>
                {t('courseAuthoring.level')}
              </label>
              <select id="level" value={level} onChange={(e) => setLevel(e.target.value as typeof level)} className={selectClass}>
                <option value="beginner">{t('courseAuthoring.levelBeginner')}</option>
                <option value="intermediate">{t('courseAuthoring.levelIntermediate')}</option>
                <option value="advanced">{t('courseAuthoring.levelAdvanced')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="language" className={labelClass}>
                {t('courseAuthoring.contentLanguage')}
              </label>
              <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="ur">Urdu</option>
              </select>
            </div>
          </div>

          {paymentsEnabled ? (
            <Input id="price" label={t('courseAuthoring.price')} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          ) : (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">{t('courseAuthoring.pricingOff')}</p>
          )}

          <Input
            id="tags"
            label={t('courseAuthoring.tags')}
            placeholder="react, javascript, frontend"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          {publishedCourses && publishedCourses.length > 0 && (
            <div>
              <label className={labelClass}>{t('courseAuthoring.prerequisites')}</label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-ink-200 p-2.5">
                {publishedCourses.map((c) => {
                  const isChecked = prerequisites.includes(c._id);
                  return (
                    <label key={c._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-ink-700 hover:bg-ink-50">
                      <span
                        onClick={() => togglePrerequisite(c._id)}
                        className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300'}`}
                      >
                        {isChecked && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {c.title}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <FileUploadField kind="image" label={t('courseAuthoring.thumbnail')} accept="image/*" currentUrl={thumbnailUrl} onUploaded={(r) => setThumbnailUrl(r.url)} onClear={() => setThumbnailUrl('')} />

          {createCourse.isError && (
            <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
              <AlertCircle className="size-3.5" /> {t('courseAuthoring.couldNotCreate')}
            </p>
          )}
          <Button type="submit" isLoading={createCourse.isPending} className="w-full">
            {createCourse.isPending ? t('courseAuthoring.creating') : t('courseAuthoring.createCourse')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
