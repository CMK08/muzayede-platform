'use client';

/**
 * ============================================================================
 * CANLI MÜZAYEDE KONTROL PANELİ
 * ============================================================================
 *
 * Adminin tek tıkla canlı yayın başlatabileceği basitleştirilmiş arayüz.
 *
 * KULLANIM:
 *   1. Dropdown'dan bir müzayede seç (LIVE/PUBLISHED/DRAFT olanlar listelenir)
 *   2. "Canlı Yayını Başlat" butonuna tıkla
 *   3. Kamera izni ver → yayın otomatik başlar
 *   4. Lot yönetimi, müzayedeci çağrıları alt panelden yapılır
 *   5. "Yayını Durdur" ile bitirilir
 *
 * TEKNİK:
 *   - WebRTC ile peer-to-peer video yayını
 *   - Socket.IO (/webrtc namespace) sinyal sunucusu olarak kullanılır
 *   - Auctioneer API'si gateway üzerinden (port 4000) → live-service (port 3010)
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  Radio,
  Video,
  Users,
  ChevronDown,
  Square,
  Gavel,
  AlertCircle,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  MonitorPlay,
} from 'lucide-react';

// --------------------------------------------------------------------------
// TİP TANIMLARI
// --------------------------------------------------------------------------

/** API'den gelen müzayede bilgisi */
interface AuctionItem {
  id: string;
  title: string;
  status: string;
  type: string;
  startPrice?: number;
  currentPrice?: number;
  bidCount?: number;
  startDate?: string;
  endDate?: string;
  lotCount?: number;
}

/** Müzayede oturumu - canlı yayın sırasında backend'de oluşturulur */
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

/** Yayın durumu */
type BroadcastState = 'idle' | 'connecting' | 'live' | 'error';

// --------------------------------------------------------------------------
// ANA KOMPONENT
// --------------------------------------------------------------------------

export default function LiveAuctionControlPage() {
  const searchParams = useSearchParams();

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // --- Müzayede Seçimi ---
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);        // Tüm müzayede listesi
  const [selectedAuctionId, setSelectedAuctionId] = useState('');      // Seçilen müzayede ID
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);    // Liste yükleniyor mu

  // --- Yayın Durumu ---
  const [broadcastState, setBroadcastState] = useState<BroadcastState>('idle');
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);                       // Mikrofon kapalı mı

  // --- Oturum ve Lot ---
  const [session, setSession] = useState<AuctionSession | null>(null);
  const [token, setToken] = useState('');

  // --- Olay Günlüğü ---
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Seçilen müzayedenin detayları
  const selectedAuction = auctions.find((a) => a.id === selectedAuctionId);

  // --------------------------------------------------------------------------
  // YARDIMCI FONKSİYONLAR
  // --------------------------------------------------------------------------

  const addLog = useCallback((message: string) => {
    const ts = new Date().toLocaleTimeString('tr-TR');
    setLogs((prev) => [`[${ts}] ${message}`, ...prev.slice(0, 99)]);
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  /** Live-service API'sine istek gönderir (gateway üzerinden) */
  async function apiCall(path: string, method = 'POST', body?: object) {
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
      if (!res.ok) addLog(`API Hata (${res.status}): ${data.message || res.statusText}`);
      return data;
    } catch (err) {
      addLog(`Bağlantı hatası: ${err}`);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // SAYFA YÜKLENDİĞİNDE: Müzayede listesini çek
  // --------------------------------------------------------------------------

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken') || '';
    setToken(storedToken);

    // URL'den gelen auctionId parametresi
    const qsId = searchParams.get('auctionId');

    // Tüm müzayedeleri çek (LIVE, PUBLISHED ve DRAFT dahil)
    setIsLoadingAuctions(true);
    fetch(`${apiUrl}/auctions`, {
      headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        const items: AuctionItem[] = data.data || data || [];
        // Sadece yayın başlatılabilir durumları göster
        const eligible = items.filter((a) =>
          ['LIVE', 'PUBLISHED', 'DRAFT'].includes(a.status)
        );
        // LIVE olanları en üste sırala
        eligible.sort((a, b) => {
          const order: Record<string, number> = { LIVE: 0, PUBLISHED: 1, DRAFT: 2 };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        setAuctions(eligible);

        // URL'den gelen ID varsa onu seç, yoksa ilk LIVE olanı seç
        if (qsId && eligible.some((a) => a.id === qsId)) {
          setSelectedAuctionId(qsId);
        } else if (eligible.length > 0) {
          setSelectedAuctionId(eligible[0].id);
        }
      })
      .catch(() => addLog('Müzayede listesi alınamadı'))
      .finally(() => setIsLoadingAuctions(false));

    // Cleanup: sayfa kapanırken yayını durdur
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionsRef.current.forEach((pc) => pc.close());
      socketRef.current?.disconnect();
    };
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------
  // TEK TIKLA CANLI YAYIN BAŞLAT
  // --------------------------------------------------------------------------

  /**
   * Tüm adımları otomatik yapar:
   *  1. Kamerayı aç
   *  2. Socket.IO ile sinyal sunucusuna bağlan
   *  3. Yayıncı olarak kaydol
   *  4. Oturum oluştur (backend)
   */
  async function startLiveBroadcast() {
    if (!selectedAuctionId) {
      addLog('Lütfen bir müzayede seçin');
      return;
    }
    if (!token) {
      addLog('Oturum bulunamadı - giriş yapın');
      return;
    }

    setBroadcastState('connecting');
    addLog('Canlı yayın başlatılıyor...');

    // ADIM 1: Kamerayı aç
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true,
      });
      localStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      addLog('Kamera açıldı');
    } catch (err) {
      setBroadcastState('error');
      addLog(`Kamera hatası: ${err}. Tarayıcı izinlerini kontrol edin.`);
      return;
    }

    // ADIM 2: Socket.IO bağlantısı (doğrudan live-service'e)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010';
    const socket = io(`${socketUrl}/webrtc`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      addLog('Sinyal sunucusuna bağlandı');
      // ADIM 3: Yayıncı olarak kaydol
      socket.emit('register-broadcaster', {
        auctionId: selectedAuctionId,
        userId: 'auctioneer',
      });
    });

    socket.on('broadcaster-registered', (data) => {
      setBroadcastState('live');
      setViewerCount(data.viewerCount || 0);
      addLog('CANLI YAYIN BAŞLADI');
    });

    // Yeni izleyici → WebRTC offer gönder
    socket.on('new-viewer', async (data) => {
      setViewerCount(data.viewerCount);
      await createOfferForViewer(data.viewerId);
    });

    // İzleyici SDP yanıtı
    socket.on('answer', async (data) => {
      const pc = peerConnectionsRef.current.get(data.viewerId);
      if (pc) await pc.setRemoteDescription(data.sdp);
    });

    // ICE adayı
    socket.on('ice-candidate', (data) => {
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) pc.addIceCandidate(data.candidate).catch(() => {});
    });

    // İzleyici ayrıldı
    socket.on('viewer-left', (data) => {
      setViewerCount(data.viewerCount);
      const pc = peerConnectionsRef.current.get(data.viewerId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(data.viewerId); }
    });

    socket.on('connect_error', (err) => {
      setBroadcastState('error');
      addLog(`Bağlantı hatası: ${err.message}`);
    });

    socket.on('disconnect', () => {
      if (broadcastState === 'live') {
        addLog('Bağlantı koptu - yeniden bağlanılıyor...');
      }
    });

    // ADIM 4: Oturum oluştur
    const sessionData = await apiCall('/auctioneer/sessions', 'POST', {
      auctionId: selectedAuctionId,
    });
    if (sessionData?.id) {
      setSession(sessionData);
      addLog(`Oturum oluşturuldu (${sessionData.lots?.length || 0} lot)`);
      // Oturumu hemen başlat
      await apiCall(`/auctioneer/sessions/${sessionData.id}/start`, 'POST');
      addLog('Oturum başlatıldı');
    }
  }

  /** Yeni izleyici için WebRTC bağlantısı kur */
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
    socketRef.current.emit('broadcaster-offer', { viewerId, sdp: offer });
  }

  // --------------------------------------------------------------------------
  // YAYIN DURDUR
  // --------------------------------------------------------------------------

  async function stopBroadcast() {
    // Oturumu sonlandır
    if (session) {
      await apiCall(`/auctioneer/sessions/${session.id}/end`, 'POST');
      setSession(null);
    }

    // Kamerayı kapat
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // WebRTC bağlantılarını kapat
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Socket bağlantısını kes
    socketRef.current?.disconnect();
    socketRef.current = null;

    setBroadcastState('idle');
    setViewerCount(0);
    addLog('Yayın durduruldu');
  }

  // --------------------------------------------------------------------------
  // MİKROFON KONTROL
  // --------------------------------------------------------------------------

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      addLog(audioTrack.enabled ? 'Mikrofon açıldı' : 'Mikrofon kapatıldı');
    }
  }

  // --------------------------------------------------------------------------
  // LOT YÖNETİMİ
  // --------------------------------------------------------------------------

  async function openLot(lotNumber: number) {
    await apiCall(`/auctioneer/${selectedAuctionId}/lots/${lotNumber}/open`, 'POST');
    addLog(`Lot #${lotNumber} açıldı`);
  }

  async function soldLot(lotNumber: number) {
    await apiCall(`/auctioneer/${selectedAuctionId}/lots/${lotNumber}/sold`, 'POST');
    addLog(`Lot #${lotNumber} SATILDI`);
  }

  async function passLot(lotNumber: number) {
    await apiCall(`/auctioneer/${selectedAuctionId}/lots/${lotNumber}/pass`, 'POST');
    addLog(`Lot #${lotNumber} geçildi`);
  }

  async function goingOnce() {
    await apiCall(`/auctioneer/${selectedAuctionId}/going-once`, 'POST');
    addLog('BİR KEZ!');
  }

  async function goingTwice() {
    await apiCall(`/auctioneer/${selectedAuctionId}/going-twice`, 'POST');
    addLog('İKİ KEZ!');
  }

  // --------------------------------------------------------------------------
  // DURUM GÖSTERGE YARDIMCILARI
  // --------------------------------------------------------------------------

  const statusLabel: Record<string, string> = {
    LIVE: 'Canlı',
    PUBLISHED: 'Yayında',
    DRAFT: 'Taslak',
  };

  const statusColor: Record<string, string> = {
    LIVE: 'text-red-500',
    PUBLISHED: 'text-green-500',
    DRAFT: 'text-gray-500',
  };

  // --------------------------------------------------------------------------
  // JSX
  // --------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8 space-y-6">

      {/* ==================== BAŞLIK ==================== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <Radio className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Canlı Yayın</h1>
            <p className="text-sm text-gray-500">Müzayede canlı yayın kontrol paneli</p>
          </div>
        </div>

        {/* Bağlantı durumu */}
        <div className="flex items-center gap-2 text-sm">
          {broadcastState === 'live' ? (
            <span className="flex items-center gap-1.5 text-green-600">
              <Wifi className="h-4 w-4" />
              <span className="font-medium">Canlı</span>
              <span className="ml-1 flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                YAYIN
              </span>
            </span>
          ) : broadcastState === 'connecting' ? (
            <span className="flex items-center gap-1.5 text-amber-600 animate-pulse">
              <Wifi className="h-4 w-4" />
              Bağlanıyor...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-400">
              <WifiOff className="h-4 w-4" />
              Yayın kapalı
            </span>
          )}
        </div>
      </div>

      {/* ==================== MÜZAYEDE SEÇİMİ + BAŞLAT BUTONU ==================== */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

          {/* Müzayede Dropdown */}
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">
              Müzayede Seçin
            </label>
            {isLoadingAuctions ? (
              <div className="h-11 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            ) : auctions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Yayın başlatılabilir müzayede bulunamadı. Önce bir müzayede oluşturup yayınlayın.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedAuctionId}
                  onChange={(e) => setSelectedAuctionId(e.target.value)}
                  disabled={broadcastState === 'live'}
                  className="h-11 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 pr-10 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
                >
                  {auctions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.status === 'LIVE' ? '🔴 ' : a.status === 'PUBLISHED' ? '🟢 ' : '⚪ '}
                      {a.title} — {statusLabel[a.status] || a.status} ({a.type})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            )}
          </div>

          {/* Tek Tıkla Başlat / Durdur Butonu */}
          {broadcastState === 'idle' || broadcastState === 'error' ? (
            <button
              onClick={startLiveBroadcast}
              disabled={!selectedAuctionId || isLoadingAuctions}
              className="flex h-11 items-center gap-2 rounded-lg bg-red-600 px-6 font-bold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 hover:shadow-red-600/40 disabled:bg-gray-400 disabled:shadow-none sm:shrink-0"
            >
              <Video className="h-5 w-5" />
              Canlı Yayını Başlat
            </button>
          ) : broadcastState === 'connecting' ? (
            <button
              disabled
              className="flex h-11 items-center gap-2 rounded-lg bg-amber-500 px-6 font-bold text-white sm:shrink-0"
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Bağlanıyor...
            </button>
          ) : (
            <button
              onClick={stopBroadcast}
              className="flex h-11 items-center gap-2 rounded-lg bg-gray-700 px-6 font-bold text-white transition-all hover:bg-gray-800 sm:shrink-0"
            >
              <Square className="h-4 w-4" />
              Yayını Durdur
            </button>
          )}
        </div>

        {/* Seçili müzayede bilgisi */}
        {selectedAuction && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-[var(--muted)] px-4 py-2.5 text-sm">
            <span className={`font-semibold ${statusColor[selectedAuction.status] || ''}`}>
              {statusLabel[selectedAuction.status] || selectedAuction.status}
            </span>
            <span className="text-gray-400">|</span>
            <span>Tür: <strong>{selectedAuction.type}</strong></span>
            {selectedAuction.bidCount !== undefined && (
              <>
                <span className="text-gray-400">|</span>
                <span>{selectedAuction.bidCount} teklif</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ==================== VİDEO + KONTROLLER ==================== */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Video Önizleme */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-black shadow-2xl">
            {/* 16:9 aspect ratio */}
            <div className="aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-contain"
              />

              {/* Kamera kapalıyken */}
              {broadcastState === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <MonitorPlay className="h-16 w-16 opacity-30" />
                  <p className="text-lg">Yayın başlatmak için yukarıdaki butonu kullanın</p>
                </div>
              )}

              {/* Yayın aktifken üst bilgi çubuğu */}
              {broadcastState === 'live' && (
                <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      CANLI
                    </span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                      {selectedAuction?.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{viewerCount}</span>
                  </div>
                </div>
              )}

              {/* Bağlanıyor animasyonu */}
              {broadcastState === 'connecting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
                  <span className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  <p>Kamera açılıyor ve yayın başlatılıyor...</p>
                </div>
              )}
            </div>
          </div>

          {/* Yayın kontrol butonları (sadece canlıyken) */}
          {broadcastState === 'live' && (
            <div className="flex flex-wrap gap-2">
              {/* Mikrofon aç/kapat */}
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isMuted
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? 'Mikrofon Kapalı' : 'Mikrofon Açık'}
              </button>

              {/* Müzayedeci çağrıları */}
              <button
                onClick={goingOnce}
                className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
              >
                <Gavel className="h-4 w-4" />
                BİR KEZ!
              </button>
              <button
                onClick={goingTwice}
                className="flex items-center gap-2 rounded-lg bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800 transition-colors hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
              >
                <Gavel className="h-4 w-4" />
                İKİ KEZ!
              </button>
            </div>
          )}
        </div>

        {/* ==================== SAĞ PANEL ==================== */}
        <div className="space-y-4">

          {/* Lot Yönetimi (oturum varsa) */}
          {session?.lots && session.lots.length > 0 && broadcastState === 'live' && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h3 className="font-semibold">Lot Yönetimi</h3>
                <p className="text-xs text-gray-500">{session.lots.length} lot</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {session.lots.map((lot) => (
                  <div
                    key={lot.id}
                    className="mb-1 rounded-lg bg-[var(--muted)] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        #{lot.lotNumber} {lot.product?.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          lot.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : lot.status === 'SOLD'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {lot.status === 'ACTIVE' ? 'AKTİF' :
                         lot.status === 'SOLD' ? 'SATILDI' :
                         lot.status === 'PASSED' ? 'GEÇİLDİ' : 'BEKLİYOR'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openLot(lot.lotNumber)} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Aç</button>
                      <button onClick={() => soldLot(lot.lotNumber)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">Satıldı</button>
                      <button onClick={() => passLot(lot.lotNumber)} className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600">Geç</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Olay Günlüğü */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex w-full items-center justify-between border-b border-[var(--border)] px-4 py-3 text-left"
            >
              <h3 className="font-semibold">Olay Günlüğü</h3>
              <ChevronDown className={`h-4 w-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
            </button>
            {showLogs && (
              <div className="max-h-[400px] overflow-y-auto p-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="py-4 text-center text-gray-400">Henüz olay yok</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-b border-[var(--border)] py-1 text-gray-500">
                      {log}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Hata durumunda yardım */}
          {broadcastState === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-400">Yayın başlatılamadı</p>
                  <ul className="mt-2 space-y-1 text-red-600 dark:text-red-400/80">
                    <li>- Kamera ve mikrofon izinlerini kontrol edin</li>
                    <li>- Live-service&apos;in çalıştığından emin olun (port 3010)</li>
                    <li>- Tarayıcıda HTTPS veya localhost kullanın</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
