'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface AuctionSession {
  id: string;
  auctionId: string;
  status: string;
  currentLotIndex: number;
  lots: Array<{
    id: string;
    lotNumber: number;
    status: string;
    product: { title: string };
  }>;
}

/**
 * Admin Auctioneer Control Panel
 * Used by admins/auction houses to manage live auctions:
 * - Start/stop streaming (WebRTC broadcaster)
 * - Open/close lots
 * - Make going-once / going-twice calls
 * - Accept phone/absentee bids
 * - Manage chat
 */
interface LiveAuction {
  id: string;
  title: string;
  status: string;
  type: string;
  bidCount: number;
}

export default function LiveAuctionControlPage() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const [token, setToken] = useState('');
  const [auctionId, setAuctionId] = useState('');
  const [session, setSession] = useState<AuctionSession | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken') || '';
    setToken(storedToken);

    // Read auctionId from query params
    const qsAuctionId = searchParams.get('auctionId');
    if (qsAuctionId) {
      setAuctionId(qsAuctionId);
    }

    // Fetch live/published auctions
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/auctions?status=LIVE`, {
      headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setLiveAuctions(data.data);
      })
      .catch(() => {});
  }, [searchParams]);

  // Connect WebRTC signaling as broadcaster
  function startBroadcast() {
    if (!auctionId || !token) {
      addLog('Müzayede ID ve oturum gerekli');
      return;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010';

    const socket = io(`${socketUrl}/webrtc`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      addLog('WebRTC sinyal sunucusuna bağlandı');
      socket.emit('register-broadcaster', {
        auctionId,
        userId: 'auctioneer',
      });
    });

    socket.on('broadcaster-registered', (data) => {
      addLog(`Yayıncı olarak kaydedildi (${data.viewerCount} izleyici)`);
      setViewerCount(data.viewerCount);
      startCamera();
    });

    socket.on('new-viewer', async (data) => {
      addLog(`Yeni izleyici: ${data.viewerId} (toplam: ${data.viewerCount})`);
      setViewerCount(data.viewerCount);
      await createOfferForViewer(data.viewerId);
    });

    socket.on('answer', async (data) => {
      const pc = peerConnectionsRef.current.get(data.viewerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        addLog(`İzleyici yanıtı alındı: ${data.viewerId}`);
      }
    });

    socket.on('ice-candidate', (data) => {
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(
          console.error,
        );
      }
    });

    socket.on('viewer-left', (data) => {
      setViewerCount(data.viewerCount);
      const pc = peerConnectionsRef.current.get(data.viewerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.viewerId);
      }
      addLog(`İzleyici ayrıldı (kalan: ${data.viewerCount})`);
    });

    socket.on('error', (data) => {
      addLog(`Hata: ${data.message}`);
    });
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true,
      });
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
      addLog('Kamera ve mikrofon açıldı');
    } catch (err) {
      addLog(`Kamera hatası: ${err}`);
    }
  }

  async function createOfferForViewer(viewerId: string) {
    if (!localStreamRef.current || !socketRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('broadcaster-ice-candidate', {
          viewerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    peerConnectionsRef.current.set(viewerId, pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit('broadcaster-offer', {
      viewerId,
      sdp: offer,
    });
  }

  function stopBroadcast() {
    // Stop camera
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Disconnect socket
    socketRef.current?.disconnect();
    socketRef.current = null;

    setIsStreaming(false);
    addLog('Yayın durduruldu');
  }

  // Auctioneer API calls
  async function apiCall(path: string, method = 'POST', body?: object) {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(`API Hata: ${data.message || res.statusText}`);
      }
      return data;
    } catch (err) {
      addLog(`API Bağlantı Hatası: ${err}`);
      return null;
    }
  }

  async function createSession() {
    const data = await apiCall('/auctioneer/sessions', 'POST', {
      auctionId,
    });
    if (data) {
      setSession(data);
      addLog(`Oturum oluşturuldu: ${data.id}`);
    }
  }

  async function startSession() {
    if (!session) return;
    const data = await apiCall(
      `/auctioneer/sessions/${session.id}/start`,
      'POST',
    );
    if (data) addLog('Oturum başlatıldı');
  }

  async function endSession() {
    if (!session) return;
    const data = await apiCall(
      `/auctioneer/sessions/${session.id}/end`,
      'POST',
    );
    if (data) {
      addLog('Oturum sonlandırıldı');
      stopBroadcast();
    }
  }

  async function openLot(lotNumber: number) {
    const data = await apiCall(
      `/auctioneer/${auctionId}/lots/${lotNumber}/open`,
      'POST',
    );
    if (data) addLog(`Lot #${lotNumber} açıldı`);
  }

  async function goingOnce() {
    await apiCall(`/auctioneer/${auctionId}/going-once`, 'POST');
    addLog('BİR KEZ çağrısı yapıldı');
  }

  async function goingTwice() {
    await apiCall(`/auctioneer/${auctionId}/going-twice`, 'POST');
    addLog('İKİ KEZ çağrısı yapıldı');
  }

  async function soldLot(lotNumber: number) {
    const data = await apiCall(
      `/auctioneer/${auctionId}/lots/${lotNumber}/sold`,
      'POST',
    );
    if (data) addLog(`Lot #${lotNumber} SATILDI`);
  }

  async function passLot(lotNumber: number) {
    const data = await apiCall(
      `/auctioneer/${auctionId}/lots/${lotNumber}/pass`,
      'POST',
    );
    if (data) addLog(`Lot #${lotNumber} GEÇİLDİ`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Müzayedeci Kontrol Paneli
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video Preview + Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Setup */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h2 className="text-lg font-semibold mb-3">Müzayede Ayarları</h2>
            {/* Live Auction Selector */}
            {liveAuctions.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Aktif Muzayedeler
                </label>
                <div className="flex flex-wrap gap-2">
                  {liveAuctions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAuctionId(a.id)}
                      className={`px-3 py-2 rounded text-sm border transition-colors ${
                        auctionId === a.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-800 dark:text-white'
                      }`}
                    >
                      {a.title} ({a.bidCount} teklif)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Muzayede ID
                </label>
                <input
                  type="text"
                  value={auctionId}
                  onChange={(e) => setAuctionId(e.target.value)}
                  placeholder="Muzayede ID girin veya yukaridan secin"
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <button
                onClick={createSession}
                disabled={!auctionId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Oturum Olustur
              </button>
            </div>
          </div>

          {/* Camera Preview */}
          <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                Kamera kapalı
              </div>
            )}
            {isStreaming && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  YAYIN
                </span>
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {viewerCount} izleyici
                </span>
              </div>
            )}
          </div>

          {/* Broadcast Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex gap-3 flex-wrap">
            {!isStreaming ? (
              <button
                onClick={startBroadcast}
                disabled={!auctionId}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-bold"
              >
                Yayını Başlat
              </button>
            ) : (
              <button
                onClick={stopBroadcast}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-bold"
              >
                Yayını Durdur
              </button>
            )}
            <button
              onClick={startSession}
              disabled={!session}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Oturumu Başlat
            </button>
            <button
              onClick={endSession}
              disabled={!session}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Oturumu Bitir
            </button>
          </div>

          {/* Auctioneer Calls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h2 className="text-lg font-semibold mb-3">Müzayedeci Çağrıları</h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={goingOnce}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold text-lg"
              >
                BİR KEZ!
              </button>
              <button
                onClick={goingTwice}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-lg"
              >
                İKİ KEZ!
              </button>
            </div>
          </div>

          {/* Lot Controls */}
          {session?.lots && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Lot Yönetimi</h2>
              <div className="space-y-2">
                {session.lots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-3"
                  >
                    <div>
                      <span className="font-medium">Lot #{lot.lotNumber}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {lot.product?.title}
                      </span>
                      <span
                        className={`text-xs ml-2 px-2 py-0.5 rounded ${
                          lot.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : lot.status === 'SOLD'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {lot.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openLot(lot.lotNumber)}
                        className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        Aç
                      </button>
                      <button
                        onClick={() => soldLot(lot.lotNumber)}
                        className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        Satıldı
                      </button>
                      <button
                        onClick={() => passLot(lot.lotNumber)}
                        className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                      >
                        Geç
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity Log */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-[600px] flex flex-col">
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">Olay Günlüğü</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-1"
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-gray-400 text-center mt-10">
                  Henüz olay yok
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
