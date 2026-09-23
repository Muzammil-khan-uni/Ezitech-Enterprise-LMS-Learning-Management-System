import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users, Activity, CheckCircle2, TrendingUp, DollarSign, FileDown, Filter, X } from 'lucide-react';
import { useAdminDashboard } from '../dashboardsApi';
import { useCourses } from '@/features/courses/coursesApi';
import { Card, StatCard, Input } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { downloadAuthenticatedFile, readBlobError } from '@/lib/download';

const BRAND = '#7c4dff';
const ACCENT = '#ff7a45';
const GREEN = '#10b981';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-display mb-3 mt-9 text-lg font-bold text-ink-800">{children}</h2>;
}

const REPORT_EXTENSION: Record<string, string> = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

const COURSE_LABEL_MAX_CHARS_PER_LINE = 13;
const COURSE_LABEL_MAX_LINES = 2;

function wrapCourseLabel(label: string, maxCharsPerLine = COURSE_LABEL_MAX_CHARS_PER_LINE, maxLines = COURSE_LABEL_MAX_LINES): string[] {
  const words = String(label).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let current = '';
  let wordIndex = 0;

  while (wordIndex < words.length && lines.length < maxLines) {
    const word = words[wordIndex];
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      wordIndex++;
    } else if (!current) {
      // A single word longer than the line width: hard place it and move on.
      current = word;
      wordIndex++;
    } else {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);

  // If words remain unplaced, the label didn't fully fit: mark the last line with an ellipsis
  // rather than silently cutting it off.
  if (wordIndex < words.length && lines.length) {
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex];
    lines[lastIndex] =
      lastLine.length > maxCharsPerLine - 1 ? `${lastLine.slice(0, maxCharsPerLine - 1)}…` : `${lastLine}…`;
  }

  return lines;
}

interface CourseAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string | number };
}

function CourseAxisTick({ x = 0, y = 0, payload }: CourseAxisTickProps) {
  const lines = wrapCourseLabel(String(payload?.value ?? ''));
  const lineHeight = 12;
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={0}
          dy={12 + index * lineHeight}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-ink-600)"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

const COURSE_FILTERABLE_TYPES = new Set(['courses', 'assessments', 'progress', 'certificates']);

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  courseId: string;
}

function ReportDownloadBar() {
  const { t } = useTranslation();
  const types = ['students', 'courses', 'instructors', 'assessments', 'progress', 'certificates'];
  const formats = ['csv', 'excel', 'pdf'];

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: '', dateTo: '', courseId: '' });

  const hasCourseFilterableType = types.some((t) => COURSE_FILTERABLE_TYPES.has(t));
  const { data: courseOptions } = useCourses(
    hasCourseFilterableType ? { limit: 100 } : undefined
  );

  function buildQuery(type: string, format: string) {
    const params = new URLSearchParams({ format });
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.courseId && COURSE_FILTERABLE_TYPES.has(type)) params.set('courseId', filters.courseId);
    return params.toString();
  }

  async function handleExport(type: string, format: string) {
    const key = `${type}:${format}`;
    setBusy(key);
    setError(null);
    try {
      await downloadAuthenticatedFile(
        `/reports/${type}?${buildQuery(type, format)}`,
        `${type}-report.${REPORT_EXTENSION[format]}`
      );
    } catch (err) {
      setError((await readBlobError(err)) ?? t('adminDashboard.exportFailed'));
    } finally {
      setBusy(null);
    }
  }

  const hasActiveFilters = Boolean(filters.dateFrom || filters.dateTo || filters.courseId);

  return (
    <div>
      <SectionTitle>{t('adminDashboard.exportReports')}</SectionTitle>

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
          <Filter className="size-3.5" />
          {t('adminDashboard.filterReports')}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label={t('adminDashboard.filterDateFrom')}
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <Input
            label={t('adminDashboard.filterDateTo')}
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-semibold text-ink-700">
              {t('adminDashboard.filterCourse')}
            </label>
            <select
              value={filters.courseId}
              onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))}
              className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-all duration-200 hover:border-ink-300 focus-visible:bg-surface"
            >
              <option value="">{t('adminDashboard.filterAllCourses')}</option>
              {courseOptions?.items.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setFilters({ dateFrom: '', dateTo: '', courseId: '' })}
            className="focus-ring mt-3 flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-700"
          >
            <X className="size-3.5" />
            {t('adminDashboard.clearFilters')}
          </button>
        )}
        <p className="mt-2 text-xs text-ink-400">{t('adminDashboard.filterHint')}</p>
      </Card>

      {error && (
        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {error}
        </p>
      )}
      <Card className="divide-y divide-ink-100 overflow-hidden">
        {types.map((type) => (
          <div key={type} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm font-semibold capitalize text-ink-700">{type}</span>
            <div className="flex gap-2">
              {formats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(type, format)}
                  disabled={busy === `${type}:${format}`}
                  className="focus-ring flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
                >
                  <FileDown className="size-3" />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function DataTable({ head, rows, emptyLabel }: { head: string[]; rows: (string | number)[][]; emptyLabel: string }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-start text-xs font-bold uppercase tracking-wide text-ink-400">
            {head.map((h) => (
              // `<th>` has `text-align: center` by default in every browser, which beats the
              // `text-start` inherited from the row above — so it must be set here too, or the
              // header text stays centered while the `<td>` data below it aligns left/start.
              <th key={h} className="px-4 py-3 text-start">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-4 py-6 text-center text-ink-400">
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 font-medium text-ink-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAdminDashboard();

  if (isError || (!isLoading && !data)) {
    return (
      <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
        {t('adminDashboard.loadFailed')}
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const growthData = data.studentGrowth.map((g: any) => ({
    month: `${g._id.year}-${String(g._id.month).padStart(2, '0')}`,
    count: g.count,
  }));

  const revenueOn = data ? data.revenue.paymentsEnabled !== false : false;
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('adminDashboard.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('adminDashboard.subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t('adminDashboard.totalEnrollments')} value={data.engagement.total} icon={<Users className="size-5" />} delay={0} />
        <StatCard label={t('adminDashboard.active')} value={data.engagement.active} icon={<Activity className="size-5" />} tone="accent" delay={0.05} />
        <StatCard label={t('adminDashboard.completed')} value={data.engagement.completed} icon={<CheckCircle2 className="size-5" />} tone="success" delay={0.1} />
        <StatCard label={t('adminDashboard.avgProgress')} value={`${Math.round(data.engagement.averageProgress || 0)}%`} icon={<TrendingUp className="size-5" />} delay={0.15} />
        {revenueOn && (
          <StatCard label={t('adminDashboard.totalRevenue')} value={`$${data.revenue.totalRevenue.toFixed(2)}`} icon={<DollarSign className="size-5" />} tone="success" delay={0.2} />
        )}
      </div>

      {revenueOn ? (
        <>
      <SectionTitle>{t('adminDashboard.revenueOverTime')}</SectionTitle>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <Card className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.revenue.revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-ink-200)', background: 'var(--color-surface)', color: 'var(--color-ink-800)' }} labelStyle={{ color: 'var(--color-ink-800)' }} />
              <Line type="monotone" dataKey="amount" stroke={GREEN} strokeWidth={2.5} dot={false} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display mb-3 text-base font-bold text-ink-800">{t('adminDashboard.revenueByCourse')}</h3>
          <DataTable
            head={[t('adminDashboard.colCourse'), t('adminDashboard.colPurchases'), t('adminDashboard.colRevenue')]}
            rows={data.revenue.revenueByCourse.map((r: any) => [r.courseTitle, r.purchases, `$${r.revenue.toFixed(2)}`])}
            emptyLabel={t('adminDashboard.noPaidEnrollments')}
          />
        </div>
        <div>
          <h3 className="font-display mb-3 text-base font-bold text-ink-800">{t('adminDashboard.revenueByPlan')}</h3>
          <DataTable
            head={[t('adminDashboard.colPlan'), t('adminDashboard.colSubscribers'), t('adminDashboard.colRevenue')]}
            rows={data.revenue.revenueByPlan.map((r: any) => [r.planName, r.subscribers, `$${r.revenue.toFixed(2)}`])}
            emptyLabel={t('adminDashboard.noSubscriptions')}
          />
        </div>
      </div>
        </>
      ) : (
        <Card className="mt-9 p-5">
          <h3 className="font-display font-bold text-ink-800">{t('adminDashboard.paymentsOffTitle')}</h3>
          <p className="mt-1 text-sm text-ink-500">{t('adminDashboard.paymentsOffDesc')}</p>
        </Card>
      )}

      <SectionTitle>{t('adminDashboard.studentGrowth')}</SectionTitle>
      <Card className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-ink-200)', background: 'var(--color-surface)', color: 'var(--color-ink-800)' }} labelStyle={{ color: 'var(--color-ink-800)' }} />
            <Line type="monotone" dataKey="count" stroke={BRAND} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle>{t('adminDashboard.coursePerformance')}</SectionTitle>
      <Card className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.coursePerformance.slice(0, 8)} margin={{ bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" />
            <XAxis dataKey="courseTitle" tick={<CourseAxisTick />} interval={0} height={44} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-ink-200)', background: 'var(--color-surface)', color: 'var(--color-ink-800)' }} labelStyle={{ color: 'var(--color-ink-800)' }} />
            <Bar dataKey="enrolledCount" fill={BRAND} name={t('adminDashboard.enrolledSeries')} radius={[6, 6, 0, 0]} />
            <Bar dataKey="completionRate" fill={ACCENT} name={t('adminDashboard.completionPercentSeries')} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle>{t('adminDashboard.instructorPerformance')}</SectionTitle>
      <DataTable
        head={[t('adminDashboard.colInstructor'), t('adminDashboard.colCourses'), t('adminDashboard.colTotalEnrollments'), t('adminDashboard.colCompletionRate')]}
        rows={data.instructorPerformance.map((i: any) => [i.instructorName, i.courseCount, i.totalEnrollments, `${Math.round(i.completionRate)}%`])}
        emptyLabel={t('adminDashboard.noInstructorActivity')}
      />

      <div className="mt-9 mb-2">
        <ReportDownloadBar />
      </div>
    </div>
  );
}
