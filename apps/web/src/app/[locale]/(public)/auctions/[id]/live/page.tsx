'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import LiveVideoPlayer from '@/components/live/LiveVideoPlayer';
import LiveChat from '@/components/live/LiveChat';
import LiveBidPanel from '@/components/live/LiveBidPanel';

interface AuctionInfo {
  id: string;
  title: string;
  status: string;
  isLiveStreaming: boolean;
}

export default function LiveAuctionPage() {
  const params = useParams();
  const auctionId = params.id as string;
  const socketRef = useRef<Socket | null>(null);
  const [auction, setAuction] = useState<AuctionInfo | null>(null);
  const [token, setToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string>('');

  // Load auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken') || '';
    const storedUser = localStorage.getItem('user');
    setToken(storedToken);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.id || '');
        setUsername(user.firstName || user.email || 'Anonim');
      } catch {
        // ignore
      }
    }
  }, []);

  // Fetch auction info and streaming session
  useEffect(() => {
    if (!auctionId) return;
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    fetch(`${apiUrl}/auctions/${auctionId}`)
      .then((r) => r.json())
      .then((data) => setAuction(data))
      .catch(console.error);

    if (token) {
      fetch(`${apiUrl}/live/stream/${auctionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.playbackUrl) setPlaybackUrl(data.playbackUrl);
        })
        .catch(() => {
          // Session may not exist yet
        });
    }
  }, [auctionId, token]);

  // Connect to live WebSocket (chat + events)
  useEffect(() => {
    if (!auctionId || !userId) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010';

    const socket = io(`${socketUrl}/live`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('joinAuction', { auctionId, userId, username });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('viewer-count', (data) => {
      setViewerCount(data.count);
    });

    socket.on('auctionJoined', (data) => {
      setViewerCount(data.viewerCount);
    });

    return () => {
      socket.emit('leaveAuction', { auctionId });
      socket.disconnect();
    };
  }, [auctionId, userId, username, token]);

  if (!auctionId) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {auction?.title || 'Canlı Müzayede'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Bağlı
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500 text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Bağlantı kesildi
                </span>
              )}
              <span className="text-sm text-gray-500">
                {viewerCount} izleyici
              </span>
            </div>
          </div>
          <a
            href={`/auctions/${auctionId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Müzayede Detayı
          </a>
        </div>
      </div>

      {/* Main content: 3-column layout */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Video Player — spans 7 columns */}
          <div className="lg:col-span-7">
            <LiveVideoPlayer
              auctionId={auctionId}
              token={token}
              playbackUrl={playbackUrl}
            />
          </div>

          {/* Bid Panel — spans 3 columns */}
          <div className="lg:col-span-3">
            <LiveBidPanel
              socket={socketRef.current}
              auctionId={auctionId}
              userId={userId}
              token={token}
            />
          </div>

          {/* Chat — spans 2 columns */}
          <div className="lg:col-span-2 h-[500px]">
            <LiveChat
              socket={socketRef.current}
              auctionId={auctionId}
              userId={userId}
              username={username}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
