import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, PlayCircle } from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';

interface VideoPlayerProps {
  courseId: string;
  lessonId: string;
  videoUrl: string;
  onProgressUpdate?: (percent: number) => void;
}

const REPORT_INTERVAL_SECONDS = 10;

export default function VideoPlayer({ courseId, lessonId, videoUrl, onProgressUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportedRef = useRef(0);
  const resumePositionRef = useRef<number | null>(null);

  const [isCompleted, setIsCompleted] = useState(false);
  const [isResolvingResume, setIsResolvingResume] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get(`/progress/lessons/${lessonId}/video-position`).then(({ data }) => {
      if (cancelled) return;
      resumePositionRef.current = data.data.lastPositionSeconds || 0;
      setIsCompleted(data.data.isCompleted || false);
      setIsResolvingResume(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  function handleLoadedMetadata() {
    const resumeAt = resumePositionRef.current;
    if (resumeAt && videoRef.current && resumeAt < videoRef.current.duration - 1) {
      videoRef.current.currentTime = resumeAt;
    }
  }

  function reportPosition(positionSeconds: number) {
    lastReportedRef.current = positionSeconds;
    axiosInstance
      .post(`/progress/courses/${courseId}/lessons/${lessonId}/video-position`, {
        positionSeconds: Math.floor(positionSeconds),
      })
      .then(({ data }) => {
        onProgressUpdate?.(data.data.percent);
        if (data.data.completed) setIsCompleted(true);
      })
      .catch(() => undefined);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    const elapsedSinceReport = video.currentTime - lastReportedRef.current;
    if (elapsedSinceReport >= REPORT_INTERVAL_SECONDS) {
      reportPosition(video.currentTime);
    }
  }

  function handlePauseOrEnd() {
    const video = videoRef.current;
    if (!video) return;
    reportPosition(video.currentTime);
  }

  return (
    <div className="max-w-xl overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft">
      {!videoUrl ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-zinc-950 text-white/60">
          <PlayCircle className="size-8" />
          <span className="text-xs font-medium">No video file uploaded for this lesson yet.</span>
        </div>
      ) : (
        <div className="relative bg-zinc-950">
          {isResolvingResume && (
            <div className="flex aspect-video items-center justify-center text-white/60">
              <Loader2 className="size-8 animate-spin" />
            </div>
          )}
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePauseOrEnd}
            onEnded={handlePauseOrEnd}
            className={`aspect-video w-full ${isResolvingResume ? 'hidden' : 'block'}`}
          >
            Your browser doesn't support video playback.
          </video>
        </div>
      )}
      {isCompleted && (
        <div className="flex items-center gap-1.5 border-t border-ink-100 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          Lesson completed
        </div>
      )}
    </div>
  );
}
