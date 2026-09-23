import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, LockKeyhole, LockKeyholeOpen, Mail, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useUsers, useInviteUser, useSetUserActive, useUnlockUser, type Role, type AdminUser } from '../usersApi';
import { Badge, Button, Card, EmptyState, Input, Modal } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

const ROLES: Role[] = ['student', 'instructor', 'mentor', 'course_manager', 'admin'];

const ROLE_TONE: Record<Role, 'neutral' | 'brand' | 'accent' | 'warning' | 'danger'> = {
  student: 'neutral',
  instructor: 'brand',
  mentor: 'accent',
  course_manager: 'warning',
  admin: 'danger',
};

function InviteUserForm({ onSent }: { onSent: () => void }) {
  const { t } = useTranslation();
  const invite = useInviteUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('instructor');
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await invite.mutateAsync({ name, email, role });
    setSentTo(email);
    setName('');
    setEmail('');
    onSent();
  }

  if (sentTo) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Mail className="size-7" />
        </span>
        <p className="text-sm font-medium text-ink-700">{t('admin.inviteSentTo', { email: sentTo })}</p>
        <Button size="sm" variant="outline" onClick={() => setSentTo(null)}>
          {t('admin.inviteAnother')}
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="invite-name" label={t('auth.fullName')} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        id="invite-email"
        label={t('auth.email')}
        type="email"
        icon={<Mail className="size-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink-700">{t('admin.role')}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {invite.isError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
          <AlertCircle className="size-3.5" /> {t('admin.inviteError')}
        </p>
      )}

      <Button type="submit" isLoading={invite.isPending} className="w-full" iconLeft={<UserPlus className="size-4" />}>
        {invite.isPending ? t('admin.sendingInvite') : t('admin.sendInvite')}
      </Button>
    </form>
  );
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, isError } = useUsers({
    role: role || undefined,
    status: status || undefined,
    search: search || undefined,
    page,
    limit: 20,
  });
  const setActive = useSetUserActive();
  const unlock = useUnlockUser();

  const pagination = data?.pagination;

  const selectClass =
    'focus-ring rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('admin.usersTitle')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('admin.usersSubtitle')}</p>
        </div>
        <Button iconLeft={<UserPlus className="size-4" />} onClick={() => setInviteOpen(true)}>
          {t('admin.inviteUser')}
        </Button>
      </div>

      <Card className="mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <Input
            label={t('admin.search')}
            icon={<Search className="size-4" />}
            placeholder={t('admin.nameOrEmail')}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-700">{t('admin.role')}</label>
          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as Role | '');
            }}
            className={selectClass}
          >
            <option value="">{t('admin.allRoles')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-700">{t('admin.status')}</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as 'active' | 'inactive' | '');
            }}
            className={selectClass}
          >
            <option value="">{t('admin.allStatuses')}</option>
            <option value="active">{t('admin.active')}</option>
            <option value="inactive">{t('admin.inactive')}</option>
          </select>
        </div>
      </Card>

      <div className="mt-6">
        {isError && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            {t('admin.couldNotLoadUsers')}
          </p>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && data?.items.length === 0 && (
          <EmptyState icon={<Users className="size-7" />} title={t('admin.noUsersMatch')} />
        )}

        {!isLoading && data && data.items.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-start text-xs font-bold uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 text-start">{t('admin.colName')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colEmail')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colRole')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colStatus')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.colJoined')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((u: AdminUser) => (
                  <tr key={u._id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-semibold text-ink-800">
                      <span className="flex items-center gap-1.5">
                        {u.name}
                        {u.mfaEnabled && <ShieldCheck className="size-3.5 text-brand-500" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_TONE[u.role]}>{u.role.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? t('admin.active') : t('admin.inactive')}</Badge>
                        {u.lockedUntil && (
                          <Badge tone="warning" icon={<LockKeyhole className="size-3" />}>
                            {t('admin.locked')}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="flex items-center gap-2 px-4 py-3">
                      {u.lockedUntil && (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={unlock.isPending}
                          onClick={() => unlock.mutate(u._id)}
                          iconLeft={<LockKeyholeOpen className="size-4" />}
                        >
                          {t('admin.unlock')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={u.isActive ? 'outline' : 'secondary'}
                        isLoading={setActive.isPending}
                        onClick={() => setActive.mutate({ userId: u._id, isActive: !u.isActive })}
                      >
                        {u.isActive ? t('admin.deactivate') : t('admin.activate')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
            <span>
              {t('admin.pageOf', { page: pagination.page, pages: pagination.pages, total: pagination.total })}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('admin.previous')}
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                {t('admin.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title={t('admin.inviteModalTitle')}>
        <InviteUserForm onSent={() => {}} />
      </Modal>
    </div>
  );
}
