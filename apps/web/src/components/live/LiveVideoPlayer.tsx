'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LiveVideoPlayerProps {
  auctionId: string;
  token: string;
  playbackUrl?: string;
}

/**
 * Live Video Player component.
 * Supports two streaming modes:
 * 1. WebRTC (preferred) — low latency peer-to-peer via /webrtc namespace
 * 2. HLS fallback — for when WebRTC is not available
 */
export default function LiveVideoPlayer({
  auctionId,
  token,
  playbackUrl,
}: LiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamMode, setStreamMode] = useState<'webrtc' | 'hls' | 'waiting'>(
    'waiting',
  );

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010';

    const socket = io(`${socketUrl}/webrtc`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register-viewer', { auctionId, userId: 'viewer' });
    });

    socket.on('viewer-registered', (data) => {
      setViewerCount(data.viewerCount);
      if (data.broadcasterActive) {
        setStreamMode('webrtc');
      }
    });

    socket.on('broadcaster-available', () => {
      setStreamMode('webrtc');
    });

    socket.on('broadcaster-disconnected', () => {
      setIsLive(false);
      setStreamMode('waiting');
      cleanupPeerConnection();
    });

    socket.on('offer', async (data) => {
      try {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('viewer-answer', {
          broadcasterId: data.broadcasterId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
        fallbackToHls();
      }
    });

    socket.on('ice-candidate', (data) => {
      if (peerRef.current) {
        peerRef.current
          .addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(console.error);
      }
    });

    return () => {
      cleanupPeerConnection();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId, token]);

  function createPeerConnection(): RTCPeerConnection {
    cleanupPeerConnection();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setIsLive(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('viewer-ice-candidate', {
          broadcasterId: 'broadcaster',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        fallbackToHls();
      }
    };

    peerRef.current = pc;
    return pc;
  }

  function cleanupPeerConnection() {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  }

  function fallbackToHls() {
    if (playbackUrl && videoRef.current) {
      setStreamMode('hls');
      videoRef.current.src = playbackUrl;
      videoRef.current.play().catch(console.error);
      setIsLive(true);
    }
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-contain"
      />

      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            CANLI
          </span>
          <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
            {viewerCount} izleyici
          </span>
          <span className="bg-black/60 text-white text-xs px-2 py-1 rounded uppercase">
            {streamMode}
          </span>
        </div>
      )}

      {/* Waiting state */}
      {streamMode === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Yayın bekleniyor...</p>
            <p className="text-sm text-gray-400 mt-1">
              Müzayedeci yayını başlattığında otomatik bağlanacaksınız
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
