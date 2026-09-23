import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, Smartphone, KeyRound, MonitorSmartphone, AlertCircle, Trash2, Copy, RefreshCw, TriangleAlert, Lock, CheckCircle2 } from 'lucide-react';
import {
  useMfaSetup,
  useMfaVerify,
  useMfaDisable,
  useDevices,
  useRevokeDevice,
  useRecoveryCodeStatus,
  useRegenerateRecoveryCodes,
  useChangePassword,
} from '../authApi';
import { useMyProfile } from '@/features/users/usersApi';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';
import { getApiError } from '@/lib/apiError';

interface ReauthValues {
  password: string;
  token?: string;
  recoveryCode?: string;
}

function ReauthForm({
  allowRecoveryCode,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  allowRecoveryCode: boolean;
  submitLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (values: ReauthValues) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(useRecovery ? { password, recoveryCode: code.trim() } : { password, token: code.trim() });
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 space-y-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4"
    >
      <p className="text-xs text-ink-500">{t('security.confirmIdentity')}</p>
      <Input
        label={t('security.currentPassword')}
        type="password"
        autoComplete="current-password"
        icon={<Lock className="size-4" />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label={useRecovery ? t('auth.recoveryCode') : t('security.sixDigitCode')}
        inputMode={useRecovery ? 'text' : 'numeric'}
        maxLength={useRecovery ? 64 : 6}
        placeholder={useRecovery ? t('auth.recoveryCodePlaceholder') : '000000'}
        icon={<KeyRound className="size-4" />}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      {allowRecoveryCode && (
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode('');
          }}
          className="focus-ring text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          {useRecovery ? t('auth.useAuthenticatorInstead') : t('auth.useRecoveryCodeInstead')}
        </button>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" variant="danger" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </motion.form>
  );
}

function RecoveryCodesReveal({ codes }: { codes: string[] }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
        <TriangleAlert className="size-3.5" />
        {t('security.saveRecoveryCodesNow')}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm text-ink-800">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-3" onClick={handleCopy} iconLeft={<Copy className="size-3.5" />}>
        {copied ? t('security.copied') : t('security.copyRecoveryCodes')}
      </Button>
    </motion.div>
  );
}

function RecoveryCodesSection() {
  const { t } = useTranslation();
  const { data: status } = useRecoveryCodeStatus();
  const regenerate = useRegenerateRecoveryCodes();
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate(values: ReauthValues) {
    setError(null);
    try {
      const result = await regenerate.mutateAsync({ password: values.password, token: values.token ?? '' });
      setFreshCodes(result.recoveryCodes);
      setConfirming(false);
    } catch (err) {
      setError(getApiError(err, t('security.reauthFailed')));
    }
  }

  const remaining = status?.remaining ?? null;
  const isLow = remaining !== null && remaining <= 2;

  return (
    <div className="mt-4 border-t border-ink-100 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink-800">{t('security.recoveryCodes')}</p>
          {remaining !== null && (
            <p className={`text-xs ${isLow ? 'font-semibold text-amber-600' : 'text-ink-500'}`}>
              {t('security.recoveryCodesRemaining', { count: remaining })}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)} disabled={confirming} iconLeft={<RefreshCw className="size-3.5" />}>
          {t('security.regenerateCodes')}
        </Button>
      </div>
      {confirming && (
        <ReauthForm
          allowRecoveryCode={false}
          submitLabel={t('security.regenerateCodes')}
          isPending={regenerate.isPending}
          error={error}
          onSubmit={handleRegenerate}
          onCancel={() => {
            setConfirming(false);
            setError(null);
          }}
        />
      )}
      {freshCodes && <RecoveryCodesReveal codes={freshCodes} />}
    </div>
  );
}

function MfaSection() {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const mfaSetup = useMfaSetup();
  const mfaVerify = useMfaVerify();
  const mfaDisable = useMfaDisable();

  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [token, setToken] = useState('');
  const [freshRecoveryCodes, setFreshRecoveryCodes] = useState<string[] | null>(null);
  const [locallyEnabled, setLocallyEnabled] = useState<boolean | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  const isMfaEnabled = locallyEnabled ?? Boolean(profile?.user?.mfaEnabled);

  async function handleStartSetup() {
    const result = await mfaSetup.mutateAsync();
    setSetupData(result);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    const result = await mfaVerify.mutateAsync(token);
    setLocallyEnabled(true);
    setSetupData(null);
    setToken('');
    setFreshRecoveryCodes(result.recoveryCodes);
  }

  async function handleDisable(values: ReauthValues) {
    setDisableError(null);
    try {
      await mfaDisable.mutateAsync(values);
      setLocallyEnabled(false);
      setConfirmingDisable(false);
    } catch (err) {
      setDisableError(getApiError(err, t('security.reauthFailed')));
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className={`flex size-9 items-center justify-center rounded-xl ${isMfaEnabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'}`}>
          {isMfaEnabled ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
        </span>
        <h2 className="font-display text-lg font-bold text-ink-800">{t('security.twoFactor')}</h2>
      </div>

      <div className="mt-4">
        {isMfaEnabled ? (
          <div>
            <Badge tone="success" icon={<ShieldCheck className="size-3" />}>
              {t('security.mfaEnabled')}
            </Badge>
            <div className="mt-3">
              <Button variant="danger" size="sm" onClick={() => setConfirmingDisable(true)} disabled={confirmingDisable}>
                {t('security.disableMfa')}
              </Button>
            </div>
            {confirmingDisable && (
              <ReauthForm
                allowRecoveryCode
                submitLabel={mfaDisable.isPending ? t('security.disabling') : t('security.disableMfa')}
                isPending={mfaDisable.isPending}
                error={disableError}
                onSubmit={handleDisable}
                onCancel={() => {
                  setConfirmingDisable(false);
                  setDisableError(null);
                }}
              />
            )}
            {freshRecoveryCodes && <RecoveryCodesReveal codes={freshRecoveryCodes} />}
            <RecoveryCodesSection />
          </div>
        ) : setupData ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm text-ink-500">
              {t('security.scanQrCode')}
            </p>
            <img src={setupData.qrCodeDataUrl} alt="MFA QR code" className="mt-3 size-44 rounded-xl border border-ink-100 p-2" />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
              <KeyRound className="size-3.5" />
              {t('security.enterKeyManually')} <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono">{setupData.secret}</code>
            </p>
            <form onSubmit={handleVerify} className="mt-4 flex items-end gap-2">
              <div className="w-40">
                <Input
                  label={t('security.sixDigitCode')}
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" isLoading={mfaVerify.isPending}>
                {mfaVerify.isPending ? t('security.verifying') : t('security.verifyAndEnable')}
              </Button>
            </form>
            {mfaVerify.isError && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertCircle className="size-3.5" /> {getApiError(mfaVerify.error, t('security.invalidCode'))}
              </p>
            )}
          </motion.div>
        ) : (
          <div>
            <p className="flex items-center gap-1.5 text-sm text-ink-500">
              <Smartphone className="size-4" />
              {t('security.mfaExplainer')}
            </p>
            <div className="mt-3">
              <Button size="sm" isLoading={mfaSetup.isPending} onClick={handleStartSetup}>
                {mfaSetup.isPending ? t('security.starting') : t('security.enableMfa')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function ChangePasswordSection() {
  const { t } = useTranslation();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8) {
      setError(t('security.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('security.passwordsDontMatch'));
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (err) {
      setError(getApiError(err, t('security.passwordChangeFailed')));
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300">
          <Lock className="size-5" />
        </span>
        <h2 className="font-display text-lg font-bold text-ink-800">{t('security.changePassword')}</h2>
      </div>
      <p className="mt-2 text-sm text-ink-500">{t('security.changePasswordHint')}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <Input
          label={t('security.currentPassword')}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label={t('security.newPassword')}
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          label={t('security.confirmNewPassword')}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertCircle className="size-3.5 shrink-0" /> {error}
          </p>
        )}
        {done && (
          <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5 shrink-0" /> {t('security.passwordChanged')}
          </p>
        )}
        <Button type="submit" isLoading={changePassword.isPending}>
          {t('security.updatePassword')}
        </Button>
      </form>
    </Card>
  );
}

function DevicesSection() {
  const { t } = useTranslation();
  const { data: devices, isLoading } = useDevices();
  const revoke = useRevokeDevice();

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <MonitorSmartphone className="size-[18px] text-brand-500" />
        <h2 className="font-display text-lg font-bold text-ink-800">{t('security.activeSessions')}</h2>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && devices?.length === 0 && (
        <EmptyState icon={<MonitorSmartphone className="size-6" />} title={t('security.noOtherSessions')} />
      )}

      {!isLoading && devices && devices.length > 0 && (
        <Card className="divide-y divide-ink-100 overflow-hidden">
          {devices.map((d) => (
            <div key={d._id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink-800" title={d.deviceInfo.label || t('security.unknownDevice')}>{d.deviceInfo.label || t('security.unknownDevice')}</div>
                <div className="truncate text-xs text-ink-500">
                  {d.deviceInfo.ip} · {t('security.lastActive', { date: new Date(d.lastActiveAt).toLocaleString() })}
                </div>
              </div>
              <button
                onClick={() => revoke.mutate(d._id)}
                disabled={revoke.isPending}
                aria-label={t('security.revokeDevice')}
                className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('security.title')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('security.subtitle')}</p>
      </div>
      <ChangePasswordSection />
      <MfaSection />
      <DevicesSection />
    </div>
  );
}
