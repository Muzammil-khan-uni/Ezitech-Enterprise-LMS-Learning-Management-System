import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, PlusCircle, Ticket, Trash2 } from 'lucide-react';
import { useCoupons, useCreateCoupon, useDeleteCoupon } from '../couponsApi';
import { Button, Card, EmptyState, Input } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function CouponsAdminPage() {
  const { t } = useTranslation();
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createCoupon.mutateAsync({
      code,
      discountType,
      discountValue: Number(discountValue),
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
    setCode('');
    setDiscountValue('10');
    setMaxRedemptions('');
    setExpiresAt('');
  }

  const selectClass =
    'focus-ring rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('admin.couponsTitle')}</h1>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Input label={t('admin.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-700">{t('admin.type')}</label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as typeof discountType)} className={selectClass}>
              <option value="percentage">{t('admin.percentOff')}</option>
              <option value="fixed">{t('admin.amountOff')}</option>
            </select>
          </div>
          <div className="w-24">
            <Input label={t('admin.value')} type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>
          <div className="w-32">
            <Input label={t('admin.maxUses')} type="number" min={1} placeholder={t('admin.optional')} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
          </div>
          <div>
            <Input label={t('admin.expires')} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <Button type="submit" isLoading={createCoupon.isPending} iconLeft={<PlusCircle className="size-4" />}>
            {t('admin.create')}
          </Button>
        </form>
        {createCoupon.isError && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <AlertCircle className="size-3.5" /> {t('admin.couponCreateError')}
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

        {!isLoading && coupons?.length === 0 && <EmptyState icon={<Ticket className="size-7" />} title={t('admin.noCouponsYet')} />}

        {coupons && coupons.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-start text-xs font-bold uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 text-start">{t('admin.colCode')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colDiscount')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colRedeemed')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colExpires')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon, i) => (
                  <motion.tr
                    key={coupon._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-ink-800">{coupon.code}</td>
                    <td className="px-4 py-3 font-semibold text-ink-700">
                      {coupon.discountValue}
                      {coupon.discountType === 'percentage' ? '%' : '$'}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {coupon.redeemedCount}
                      {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteCoupon.mutate(coupon._id)}
                        disabled={deleteCoupon.isPending}
                        aria-label={t('admin.deleteCoupon')}
                        className="focus-ring flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
