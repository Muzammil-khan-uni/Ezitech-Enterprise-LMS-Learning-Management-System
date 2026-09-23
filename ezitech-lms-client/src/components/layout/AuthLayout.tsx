import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Sparkles, ShieldCheck, Trophy } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-gradient-animated relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:28px_28px]" />

        <div className="relative z-10 flex items-center gap-2.5 text-white">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="size-[18px]" />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight">EzitechLMS</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-md text-white"
        >
          <h2 className="font-display text-4xl font-extrabold leading-tight">{t('auth.brandHeadline')}</h2>
          <p className="mt-4 text-white/80">{t('auth.brandSubtitle')}</p>

          <div className="mt-10 space-y-4">
            {[
              { icon: <GraduationCap className="size-4" />, text: t('auth.brandFeature1') },
              { icon: <Trophy className="size-4" />, text: t('auth.brandFeature2') },
              { icon: <ShieldCheck className="size-4" />, text: t('auth.brandFeature3') },
            ].map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">{item.icon}</span>
                <span className="text-sm font-medium text-white/90">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-xs text-white/60">© {new Date().getFullYear()} Ezitech LMS. All rights reserved.</p>

        <motion.div
          className="absolute -bottom-16 -right-16 size-64 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="absolute end-4 top-4 sm:end-6 sm:top-6">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="bg-gradient-brand flex size-9 items-center justify-center rounded-xl text-white shadow-lift">
              <Sparkles className="size-[18px]" />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">EzitechLMS</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-sm text-ink-500">{footer}</div>
        </motion.div>
      </div>
    </div>
  );
}
