import type { Variants } from 'framer-motion';
import type { ProfilePatch, ProfileUser } from '../usersApi';

export const BIO_MAX = 1000;
export const SKILLS_MAX = 30;
export const SKILL_MAX_LENGTH = 40;
export const EDUCATION_MAX = 10;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export type Notify = (type: 'success' | 'error', message: string) => void;

export type SaveProfile = (patch: ProfilePatch, successMessage: string) => Promise<boolean>;

export interface CompletionItem {
  key: string;
  done: boolean;
  target: string;
}

export function getCompletion(user: ProfileUser): { items: CompletionItem[]; percent: number } {
  const items: CompletionItem[] = [
    { key: 'photo', done: Boolean(user.avatar?.url), target: 'profile-hero' },
    { key: 'bio', done: Boolean(user.bio?.trim()), target: 'profile-about' },
    { key: 'phone', done: Boolean(user.phone), target: 'profile-contact' },
    { key: 'emailVerified', done: user.isEmailVerified, target: 'profile-contact' },
    { key: 'education', done: (user.education?.length ?? 0) > 0, target: 'profile-education' },
    { key: 'skills', done: (user.skills?.length ?? 0) > 0, target: 'profile-skills' },
    { key: 'github', done: Boolean(user.socialLinks?.github), target: 'profile-social' },
    { key: 'linkedin', done: Boolean(user.socialLinks?.linkedin), target: 'profile-social' },
  ];
  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items, percent };
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isHostedOn(value: string, domain: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export function displayUrl(value: string): string {
  return value.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

export function isValidPhone(value: string): boolean {
  return /^\+?[0-9()\-.\s]{7,20}$/.test(value.trim());
}

export const SKILL_TONES = [
  'bg-brand-50 text-brand-700 ring-brand-200 dark:text-brand-300 dark:ring-brand-500/30',
  'bg-accent-400/15 text-accent-600 ring-accent-400/30 dark:text-accent-400',
  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
  'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
];

export function skillTone(skill: string) {
  let hash = 0;
  for (let i = 0; i < skill.length; i += 1) hash = (hash * 31 + skill.charCodeAt(i)) >>> 0;
  return SKILL_TONES[hash % SKILL_TONES.length];
}

export const SKILL_SUGGESTIONS = [
  'JavaScript',
  'Python',
  'React',
  'Node.js',
  'SQL',
  'UI/UX Design',
  'Communication',
  'Leadership',
  'Teaching',
  'Data Analysis',
];
