import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, Trophy, Rocket } from 'lucide-react';
import { clsx } from 'clsx';
import type { ProfileUser } from '../usersApi';
import SectionCard from './SectionCard';
import { getCompletion, scrollToSection } from './profileUtils';

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CompletionCard({ user, className }: { user: ProfileUser; className?: string }) {
  const { t } = useTranslation();
  const { items, percent } = getCompletion(user);
  const complete = percent === 100;

  return (
    <SectionCard
      id="profile-completion"
      icon={complete ? <Trophy className="size-5" /> : <Rocket className="size-5" />}
      title={t('profile.completion.title')}
      subtitle={complete ? t('profile.completion.done') : t('profile.completion.subtitle')}
      tint={complete ? 'emerald' : 'accent'}
      className={className}
    >
      <div className="flex items-center gap-5">
        <div className="relative size-28 shrink-0 sm:size-32">
          <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="completion-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-brand-500)' }} />
                <stop offset="100%" style={{ stopColor: 'var(--color-accent-500)' }} />
              </linearGradient>
            </defs>
            <circle cx="55" cy="55" r={RADIUS} fill="none" style={{ stroke: 'var(--color-ink-100)' }} strokeWidth="10" />
            <motion.circle
              cx="55"
              cy="55"
              r={RADIUS}
              fill="none"
              stroke="url(#completion-gradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100) }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('profile.completion.title')}
          >
            <motion.span
              key={percent}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-gradient font-display text-3xl font-extrabold"
            >
              {percent}%
            </motion.span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => scrollToSection(item.target)}
                disabled={item.done}
                className={clsx(
                  'focus-ring flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-start text-xs font-medium transition-colors sm:text-sm',
                  item.done ? 'cursor-default text-ink-400' : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700'
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-ink-300" />
                )}
                {/* No `truncate` here: these labels need to wrap onto a second line rather than
                    being cut off with an ellipsis, since the column next to the progress ring is
                    narrow and some labels (and their translations) don't fit on one line. */}
                <span className={clsx('min-w-0 break-words', item.done && 'line-through decoration-ink-300')}>
                  {t(`profile.completion.items.${item.key}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
