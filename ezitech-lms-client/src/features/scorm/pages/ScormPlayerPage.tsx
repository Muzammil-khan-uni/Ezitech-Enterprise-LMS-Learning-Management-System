import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosInstance';
import { getApiError } from '@/lib/apiError';
import { EmptyState } from '@/components/ui';

interface Progress {
  lessonStatus?: string;
  scoreRaw?: number | null;
  lessonLocation?: string;
  suspendData?: string;
}

interface Launch {
  playerUrl: string;
  contentOrigin: string;
  progress: Progress;
  learner: { id: string; name: string };
}

interface Snapshot {
  lessonStatus?: string;
  scoreRaw?: number;
  lessonLocation?: string;
  suspendData?: string;
  sessionTime?: string;
}

const STATUSES = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'];
const SESSION_TIME = /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/;

function cleanSnapshot(payload: unknown): Snapshot {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const snapshot: Snapshot = {};

  if (typeof raw.lessonStatus === 'string' && STATUSES.includes(raw.lessonStatus)) {
    snapshot.lessonStatus = raw.lessonStatus;
  }
  if (typeof raw.scoreRaw === 'string' && raw.scoreRaw.trim() !== '') {
    const score = Number(raw.scoreRaw);
    if (Number.isFinite(score) && score >= 0 && score <= 100) snapshot.scoreRaw = score;
  }
  if (typeof raw.lessonLocation === 'string' && raw.lessonLocation) {
    snapshot.lessonLocation = raw.lessonLocation.slice(0, 1000);
  }
  if (typeof raw.suspendData === 'string' && raw.suspendData) {
    snapshot.suspendData = raw.suspendData.slice(0, 8192);
  }
  if (typeof raw.sessionTime === 'string' && SESSION_TIME.test(raw.sessionTime)) {
    snapshot.sessionTime = raw.sessionTime;
  }
  return snapshot;
}

function formatElapsed(startedAt: number) {
  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const h = String(Math.floor(seconds / 3600)).padStart(4, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function buildInitialCmi(launch: Launch): Record<string, string> {
  const { progress, learner } = launch;
  const status = progress.lessonStatus ?? 'not attempted';
  return {
    'cmi.core.student_id': learner.id,
    'cmi.core.student_name': learner.name,
    'cmi.core.lesson_status': status,
    'cmi.core.lesson_location': progress.lessonLocation ?? '',
    'cmi.core.score.raw': progress.scoreRaw === null || progress.scoreRaw === undefined ? '' : String(progress.scoreRaw),
    'cmi.core.score.min': '0',
    'cmi.core.score.max': '100',
    'cmi.core.credit': 'credit',
    'cmi.core.lesson_mode': 'normal',
    'cmi.core.entry': status === 'not attempted' ? 'ab-initio' : 'resume',
    'cmi.core.total_time': '0000:00:00',
    'cmi.suspend_data': progress.suspendData ?? '',
    'cmi.launch_data': '',
  };
}

export default function ScormPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  return <ScormPlayer key={`${courseId}:${lessonId}`} courseId={courseId ?? ''} lessonId={lessonId ?? ''} />;
}

function ScormPlayer({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { t } = useTranslation();
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedAtRef = useRef(0);
  const latestRef = useRef<Snapshot | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    startedAtRef.current = Date.now();

    axiosInstance
      .get(`/scorm/courses/${courseId}/lessons/${lessonId}/launch`)
      .then(({ data }) => {
        if (!cancelled) setLaunch(data.data as Launch);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err, t('scorm.launchFailed')));
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, t]);

  const commit = useCallback(
    (snapshot: Snapshot) => {
      const body = { ...snapshot, sessionTime: snapshot.sessionTime ?? formatElapsed(startedAtRef.current) };
      axiosInstance.patch(`/scorm/courses/${courseId}/lessons/${lessonId}/data`, body).catch(() => undefined);
    },
    [courseId, lessonId]
  );

  useEffect(() => {
    if (!launch) return undefined;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== launch!.contentOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = event.data as { source?: string; type?: string; payload?: unknown } | null;
      if (!message || message.source !== 'ezitech-scorm') return;

      if (message.type === 'ready') {
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'ezitech-scorm-host', type: 'init', payload: { cmi: buildInitialCmi(launch!) } },
          launch!.contentOrigin
        );
      } else if (message.type === 'state') {
        latestRef.current = cleanSnapshot(message.payload);
        dirtyRef.current = true;
      } else if (message.type === 'commit') {
        const snapshot = cleanSnapshot(message.payload);
        latestRef.current = snapshot;
        dirtyRef.current = false;
        if (Object.keys(snapshot).length > 0) commit(snapshot);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (dirtyRef.current && latestRef.current && Object.keys(latestRef.current).length > 0) {
        commit(latestRef.current);
        dirtyRef.current = false;
      }
    };
  }, [launch, commit]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 p-4">
        <EmptyState icon={<AlertCircle className="size-8" />} title={error} />
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} className="text-brand-400">
          <Loader2 className="size-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-3 sm:p-4">
      <iframe
        ref={iframeRef}
        src={launch.playerUrl}
        title={t('scorm.contentTitle')}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="fullscreen"
        referrerPolicy="no-referrer"
        className="h-[85vh] w-full rounded-2xl border border-white/10 bg-surface shadow-lift"
      />
    </div>
  );
}
