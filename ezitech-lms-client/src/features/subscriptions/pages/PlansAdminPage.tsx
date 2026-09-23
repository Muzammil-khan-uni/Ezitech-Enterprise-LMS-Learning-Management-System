import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Layers, PlusCircle, PowerOff } from 'lucide-react';
import { usePlans, useCreatePlan, useUpdatePlan } from '../subscriptionsApi';
import { Button, Card, EmptyState, Input } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

export default function PlansAdminPage() {
  const { t } = useTranslation();
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('10');
  const [durationDays, setDurationDays] = useState('30');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createPlan.mutateAsync({
      name,
      description: description || undefined,
      price: Number(price),
      durationDays: Number(durationDays),
    });
    setName('');
    setDescription('');
    setPrice('10');
    setDurationDays('30');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('admin.plansTitle')}</h1>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Input label={t('admin.planName')} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1">
            <Input label={t('admin.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="w-24">
            <Input label={t('admin.price')} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="w-32">
            <Input label={t('admin.durationDays')} type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          </div>
          <Button type="submit" isLoading={createPlan.isPending} iconLeft={<PlusCircle className="size-4" />}>
            {t('admin.createPlan')}
          </Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <CourseCardSkeleton key={i} />)}

        {!isLoading && plans?.length === 0 && <EmptyState icon={<Layers className="size-7" />} title={t('admin.noPlansYet')} />}

        {plans?.map((plan, i) => (
          <motion.div key={plan._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <h3 className="font-display font-bold text-ink-900">{plan.name}</h3>
                <p className="text-sm text-ink-500">{plan.description}</p>
                <p className="mt-1 text-sm font-semibold text-brand-600">
                  {t('admin.perDays', { price: `$${plan.price}`, days: plan.durationDays })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<PowerOff className="size-4" />}
                isLoading={updatePlan.isPending}
                onClick={() => updatePlan.mutate({ planId: plan._id, updates: { isActive: false } })}
              >
                {t('admin.deactivate')}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
