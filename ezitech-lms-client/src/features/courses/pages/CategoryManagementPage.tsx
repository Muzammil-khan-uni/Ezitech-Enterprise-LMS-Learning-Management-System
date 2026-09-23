import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, PlusCircle, Tag, Trash2 } from 'lucide-react';
import { useCategories, useCreateCategory, useDeleteCategory } from '../coursesApi';
import { Button, Card, EmptyState, Input } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function CategoryManagementPage() {
  const { t } = useTranslation();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createCategory.mutateAsync({ name, description: description || undefined });
    setName('');
    setDescription('');
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('admin.categoriesTitle')}</h1>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Input label={t('admin.categoryName')} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1">
            <Input label={t('admin.descriptionOptional')} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" isLoading={createCategory.isPending} iconLeft={<PlusCircle className="size-4" />}>
            {t('admin.add')}
          </Button>
        </form>
        {createCategory.isError && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <AlertCircle className="size-3.5" /> {t('admin.categoryCreateError')}
          </p>
        )}
      </Card>

      <div className="mt-6">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && categories?.length === 0 && <EmptyState icon={<Tag className="size-7" />} title={t('admin.noCategoriesYet')} />}

        {categories && categories.length > 0 && (
          <Card className="divide-y divide-ink-100 overflow-hidden">
            {categories.map((cat, i) => (
              <motion.div
                key={cat._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <Tag className="size-4 text-ink-400" />
                  {cat.name}
                </span>
                <button
                  onClick={() => deleteCategory.mutate(cat._id)}
                  disabled={deleteCategory.isPending}
                  aria-label={t('admin.deleteCategory')}
                  className="focus-ring flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
