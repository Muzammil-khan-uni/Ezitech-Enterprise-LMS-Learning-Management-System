import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Mic, MicOff, PhoneOff, ScreenShare, Video, VideoOff } from 'lucide-react';
import { useLiveSession } from '../liveClassesApi';
import { useAuth } from '@/hooks/useAuth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

interface RemotePeer {
  socketId: string;
  stream: MediaStream;
}

export default function LiveClassRoomPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { data: session } = useLiveSession(sessionId);

  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const createPeerConnection = useCallback((remoteSocketId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('live:signal', {
          targetSocketId: remoteSocketId,
          signal: { type: 'ice-candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      setRemotePeers((prev) => {
        const existing = prev.find((p) => p.socketId === remoteSocketId);
        if (existing) return prev;
        return [...prev, { socketId: remoteSocketId, stream: event.streams[0] }];
      });
    };

    peerConnectionsRef.current.set(remoteSocketId, pc);
    return pc;
  }, []);

  useEffect(() => {
    if (!session || session.status !== 'live') return;

    let cancelled = false;

    async function connect() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const socket = io(SOCKET_URL, { auth: { token: accessToken } });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('live:join', { roomId: session!.roomId }, async (ack: { peers?: string[]; error?: string }) => {
            if (ack.error) {
              setError(ack.error);
              return;
            }
            for (const remoteSocketId of ack.peers || []) {
              const pc = createPeerConnection(remoteSocketId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('live:signal', { targetSocketId: remoteSocketId, signal: { type: 'offer', sdp: offer } });
            }
          });
        });

        socket.on('live:signal', async ({ fromSocketId, signal }) => {
          let pc = peerConnectionsRef.current.get(fromSocketId);
          if (!pc) pc = createPeerConnection(fromSocketId);

          if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('live:signal', { targetSocketId: fromSocketId, signal: { type: 'answer', sdp: answer } });
          } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.type === 'ice-candidate') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch {
              return;
            }
          }
        });

        socket.on('live:peer-left', ({ socketId }: { socketId: string }) => {
          peerConnectionsRef.current.get(socketId)?.close();
          peerConnectionsRef.current.delete(socketId);
          setRemotePeers((prev) => prev.filter((p) => p.socketId !== socketId));
        });
      } catch (_err) {
        setError(t('liveClassRoom.micError'));
      }
    }

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.emit('live:leave');
      socketRef.current?.disconnect();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [session, accessToken, createPeerConnection]);

  function toggleMic() {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
    setIsMicOn((v) => !v);
  }

  function toggleCamera() {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !isCameraOn));
    setIsCameraOn((v) => !v);
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      const cameraTrack = cameraTrackRef.current;
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
      });
      setIsScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => toggleScreenShare();
      setIsScreenSharing(true);
    } catch {
      return;
    }
  }

  function leaveRoom() {
    navigate(-1);
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} className="text-brand-400">
          <Loader2 className="size-8" />
        </motion.div>
      </div>
    );
  }
  if (session.status !== 'live') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-white/70">
        {t('liveClassRoom.notLive')}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-2.5 animate-pulse rounded-full bg-rose-500" />
          <h1 className="font-display text-lg font-bold">{session.title}</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl bg-black shadow-lift">
            <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
            <span className="absolute bottom-2 start-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold backdrop-blur">
              {t('liveClassRoom.you')}
            </span>
          </div>
          {remotePeers.map((peer) => (
            <RemoteVideoTile key={peer.socketId} stream={peer.stream} />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={toggleMic}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${isMicOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600 hover:bg-rose-700'}`}
            aria-label={t('liveClassRoom.toggleMic')}
          >
            {isMicOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button
            onClick={toggleCamera}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${isCameraOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600 hover:bg-rose-700'}`}
            aria-label={t('liveClassRoom.toggleCamera')}
          >
            {isCameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button
            onClick={toggleScreenShare}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${isScreenSharing ? 'bg-brand-500 hover:bg-brand-600' : 'bg-white/10 hover:bg-white/20'}`}
            aria-label={t('liveClassRoom.toggleScreenShare')}
          >
            <ScreenShare className="size-5" />
          </button>
          <button
            onClick={leaveRoom}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold transition-colors hover:bg-rose-700"
          >
            <PhoneOff className="size-4" />
            {t('liveClassRoom.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideoTile({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-2xl bg-black shadow-lift">
      <video ref={ref} autoPlay playsInline className="aspect-video w-full object-cover" />
    </div>
  );
}
