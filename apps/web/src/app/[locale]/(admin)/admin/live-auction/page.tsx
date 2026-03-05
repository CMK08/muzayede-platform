'use client';

/**
 * ============================================================================
 * CANLI MÜZAYEDE KONTROL PANELİ (Auctioneer Control Panel)
 * ============================================================================
 *
 * Bu sayfa, admin veya müzayede evi yetkilileri tarafından canlı müzayedeleri
 * yönetmek için kullanılır. Temel işlevleri:
 *
 * 1. CANLI YAYIN (WebRTC):
 *    - Kameradan video ve ses yakalama
 *    - WebRTC üzerinden izleyicilere canlı yayın gönderme
 *    - Socket.IO ile sinyal (signaling) iletişimi
 *
 * 2. MÜZAYEDE OTURUMU:
 *    - Oturum oluşturma / başlatma / sonlandırma
 *    - Lot açma / satma / geçme işlemleri
 *    - "Bir kez!" / "İki kez!" müzayedeci çağrıları
 *
 * 3. API ENTEGRASYONU:
 *    - Auctioneer API'si live-service (port 3010) üzerinde çalışır
 *    - API gateway (port 4000) /api/v1/auctioneer/* route'unu proxy eder
 *    - WebSocket bağlantısı doğrudan live-service'e (port 3010) yapılır
 *
 * KULLANIM AKIŞI:
 *    1. Aktif müzayedelerden birini seç veya ID gir
 *    2. "Oturum Oluştur" ile müzayede oturumu başlat
 *    3. "Yayını Başlat" ile kamerayı aç ve WebRTC yayını başlat
 *    4. Lotları sırayla aç, teklifleri takip et
 *    5. "Bir kez!" → "İki kez!" → "Satıldı!" akışını takip et
 *    6. Tüm lotlar bitince oturumu sonlandır
 *
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// --------------------------------------------------------------------------
// TİP TANIMLARI
// --------------------------------------------------------------------------

/**
 * Müzayede oturumu - canlı müzayede sırasında oluşturulan oturum bilgisi.
 * Her oturum bir müzayedeye bağlıdır ve o müzayedenin lotlarını içerir.
 */
interface AuctionSession {
  id: string;            // Oturum benzersiz kimliği
  auctionId: string;     // Bağlı müzayede ID'si
  status: string;        // Oturum durumu: CREATED, ACTIVE, ENDED
  currentLotIndex: number; // Şu an açık olan lot sırası
  lots: Array<{          // Müzayededeki lot (ürün) listesi
    id: string;
    lotNumber: number;
    status: string;      // PENDING, ACTIVE, SOLD, PASSED
    product: { title: string };
  }>;
}

/**
 * API'den gelen müzayede listesi elemanı.
 * Aktif/canlı müzayedeleri listelemek için kullanılır.
 */
interface LiveAuction {
  id: string;
  title: string;
  status: string;        // LIVE, PUBLISHED, COMPLETED vb.
  type: string;          // english, dutch, sealed_bid vb.
  bidCount: number;      // Toplam teklif sayısı
}

// --------------------------------------------------------------------------
// ANA KOMPONENT
// --------------------------------------------------------------------------

export default function LiveAuctionControlPage() {
  const searchParams = useSearchParams();

  // --- Referanslar (DOM ve bağlantılar) ---
  const videoRef = useRef<HTMLVideoElement>(null);         // Kamera önizleme video elementi
  const socketRef = useRef<Socket | null>(null);           // Socket.IO bağlantısı (WebRTC signaling için)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // Her izleyici için ayrı WebRTC bağlantısı
  const localStreamRef = useRef<MediaStream | null>(null); // Kameradan gelen medya akışı (video + ses)

  // --- State değişkenleri ---
  const [token, setToken] = useState('');                  // JWT erişim token'ı (localStorage'dan alınır)
  const [auctionId, setAuctionId] = useState('');          // Seçilen müzayede ID'si
  const [session, setSession] = useState<AuctionSession | null>(null); // Aktif oturum bilgisi
  const [isStreaming, setIsStreaming] = useState(false);    // Yayın durumu (kamera açık mı?)
  const [viewerCount, setViewerCount] = useState(0);       // Anlık izleyici sayısı
  const [logs, setLogs] = useState<string[]>([]);          // Olay günlüğü mesajları
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]); // API'den gelen aktif müzayedeler
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // --------------------------------------------------------------------------
  // YARDIMCI FONKSİYONLAR
  // --------------------------------------------------------------------------

  /**
   * Olay günlüğüne zaman damgalı mesaj ekler.
   * Son 100 mesajı tutar, en yeni en üstte görünür.
   */
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  }, []);

  // --------------------------------------------------------------------------
  // SAYFA YÜKLENDİĞİNDE: Token ve müzayede listesi al
  // --------------------------------------------------------------------------

  useEffect(() => {
    // localStorage'dan JWT token'ı al (login sırasında kaydedilmiş olmalı)
    const storedToken = localStorage.getItem('accessToken') || '';
    setToken(storedToken);

    // URL query parametresinden müzayede ID'si oku (örn: ?auctionId=xxx)
    const qsAuctionId = searchParams.get('auctionId');
    if (qsAuctionId) {
      setAuctionId(qsAuctionId);
    }

    // API'den aktif/canlı müzayedeleri çek
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/auctions?status=LIVE`, {
      headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setLiveAuctions(data.data);
      })
      .catch(() => {
        // LIVE müzayede yoksa PUBLISHED olanları da dene
        fetch(`${apiUrl}/auctions?status=PUBLISHED`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.data) setLiveAuctions(data.data);
          })
          .catch(() => {});
      });
  }, [searchParams]);

  // Sayfa kapanırken yayını ve bağlantıları temizle
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionsRef.current.forEach((pc) => pc.close());
      socketRef.current?.disconnect();
    };
  }, []);

  // --------------------------------------------------------------------------
  // WEBRTC YAYIN BAŞLATMA
  // --------------------------------------------------------------------------

  /**
   * Canlı yayını başlatır:
   * 1. Socket.IO ile live-service'e bağlanır (/webrtc namespace)
   * 2. Kendini "broadcaster" (yayıncı) olarak kaydeder
   * 3. Kamerayı açar
   * 4. Yeni izleyiciler bağlandığında otomatik WebRTC bağlantısı kurar
   */
  function startBroadcast() {
    if (!auctionId) {
      addLog('Lütfen önce bir müzayede seçin veya ID girin');
      return;
    }

    if (!token) {
      addLog('Oturum bulunamadı - lütfen giriş yapın');
      return;
    }

    setConnectionStatus('connecting');
    addLog('Sinyal sunucusuna bağlanılıyor...');

    // Socket.IO bağlantısı: doğrudan live-service'e (port 3010) yapılır
    // NOT: API gateway WebSocket proxy desteklemez, bu yüzden direkt bağlantı gerekir
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010';

    const socket = io(`${socketUrl}/webrtc`, {
      auth: { token },                   // JWT token ile kimlik doğrulama
      transports: ['websocket'],          // Sadece WebSocket kullan (polling değil)
      reconnectionAttempts: 5,            // Bağlantı koparsa 5 kez dene
      reconnectionDelay: 2000,            // Her deneme arasında 2 saniye bekle
    });

    socketRef.current = socket;

    // --- Socket.IO Olay Dinleyicileri ---

    // Bağlantı başarılı olduğunda
    socket.on('connect', () => {
      setConnectionStatus('connected');
      addLog('WebRTC sinyal sunucusuna bağlandı');
      // Kendimizi bu müzayedenin yayıncısı olarak kaydet
      socket.emit('register-broadcaster', {
        auctionId,
        userId: 'auctioneer',
      });
    });

    // Yayıncı kaydı onaylandığında
    socket.on('broadcaster-registered', (data) => {
      addLog(`Yayıncı olarak kaydedildi (${data.viewerCount || 0} izleyici)`);
      setViewerCount(data.viewerCount || 0);
      startCamera(); // Kamerayı aç
    });

    // Yeni bir izleyici bağlandığında → ona video göndermek için WebRTC bağlantısı kur
    socket.on('new-viewer', async (data) => {
      addLog(`Yeni izleyici: ${data.viewerId} (toplam: ${data.viewerCount})`);
      setViewerCount(data.viewerCount);
      await createOfferForViewer(data.viewerId);
    });

    // İzleyiciden SDP yanıtı geldiğinde → WebRTC el sıkışmasını tamamla
    socket.on('answer', async (data) => {
      const pc = peerConnectionsRef.current.get(data.viewerId);
      if (pc) {
        await pc.setRemoteDescription(data.sdp);
        addLog(`İzleyici yanıtı alındı: ${data.viewerId}`);
      }
    });

    // İzleyiciden ICE adayı geldiğinde → ağ bağlantı bilgisini ekle
    socket.on('ice-candidate', (data) => {
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        pc.addIceCandidate(data.candidate).catch(console.error);
      }
    });

    // Bir izleyici ayrıldığında → o izleyicinin bağlantısını temizle
    socket.on('viewer-left', (data) => {
      setViewerCount(data.viewerCount);
      const pc = peerConnectionsRef.current.get(data.viewerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.viewerId);
      }
      addLog(`İzleyici ayrıldı (kalan: ${data.viewerCount})`);
    });

    // Bağlantı hatası
    socket.on('connect_error', (err) => {
      setConnectionStatus('disconnected');
      addLog(`Bağlantı hatası: ${err.message}`);
    });

    // Sunucu taraflı hata
    socket.on('error', (data) => {
      addLog(`Sunucu hatası: ${data.message}`);
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
      addLog(`Bağlantı koptu: ${reason}`);
    });
  }

  // --------------------------------------------------------------------------
  // KAMERA VE MİKROFON AÇMA
  // --------------------------------------------------------------------------

  /**
   * Kullanıcının kamerasını ve mikrofonunu açar.
   * 720p video ve ses yakalar, video elementine bağlar.
   * Tarayıcı izin isteyecektir (ilk kullanımda).
   */
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 }, // 720p, 30fps
        audio: true,                                           // Mikrofon açık
      });
      localStreamRef.current = stream;

      // Video elementine bağla (kamera önizlemesi)
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
      addLog('Kamera ve mikrofon açıldı - yayın aktif');
    } catch (err) {
      addLog(`Kamera hatası: ${err}. Tarayıcı izinlerini kontrol edin.`);
    }
  }

  // --------------------------------------------------------------------------
  // WEBRTC TEKLİF (OFFER) OLUŞTURMA
  // --------------------------------------------------------------------------

  /**
   * Yeni bir izleyici için WebRTC bağlantısı kurar.
   * Her izleyici ayrı bir RTCPeerConnection alır (SFU benzeri yapı).
   *
   * Akış: Yayıncı → Offer gönder → İzleyici Answer döner → Bağlantı kurulur
   * ICE (Interactive Connectivity Establishment): Ağ rotası keşfi
   */
  async function createOfferForViewer(viewerId: string) {
    if (!localStreamRef.current || !socketRef.current) return;

    // Yeni WebRTC bağlantısı oluştur
    const pc = new RTCPeerConnection({
      iceServers: [
        // STUN sunucuları: NAT arkasındaki gerçek IP adresini bulmak için
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Kamera ve mikrofon akışını bağlantıya ekle
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // ICE adayı bulunduğunda sinyal sunucusu üzerinden izleyiciye gönder
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('broadcaster-ice-candidate', {
          viewerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Bağlantıyı Map'e kaydet (izleyici ayrılınca temizlemek için)
    peerConnectionsRef.current.set(viewerId, pc);

    // SDP Offer oluştur ve sinyal sunucusu üzerinden izleyiciye gönder
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit('broadcaster-offer', {
      viewerId,
      sdp: offer,
    });
  }

  // --------------------------------------------------------------------------
  // YAYIN DURDURMA
  // --------------------------------------------------------------------------

  /**
   * Canlı yayını tamamen durdurur:
   * 1. Kamerayı ve mikrofonu kapatır
   * 2. Tüm izleyicilerle WebRTC bağlantısını keser
   * 3. Socket.IO bağlantısını koparır
   */
  function stopBroadcast() {
    // Kamerayı ve mikrofonu kapat
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Tüm izleyici WebRTC bağlantılarını kapat
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Socket.IO bağlantısını kapat
    socketRef.current?.disconnect();
    socketRef.current = null;

    setIsStreaming(false);
    setConnectionStatus('disconnected');
    addLog('Yayın durduruldu');
  }

  // --------------------------------------------------------------------------
  // MÜZAYEDECİ API ÇAĞRILARI
  // --------------------------------------------------------------------------

  /**
   * Live-service API'sine istek gönderir.
   * API gateway (port 4000) üzerinden /api/v1/auctioneer/* yoluna proxy edilir.
   * Tüm istekler JWT token ile kimlik doğrulamalıdır.
   */
  async function apiCall(path: string, method = 'POST', body?: object) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
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
        addLog(`API Hata (${res.status}): ${data.message || res.statusText}`);
      }
      return data;
    } catch (err) {
      addLog(`API Bağlantı Hatası: ${err}`);
      return null;
    }
  }

  /**
   * Müzayede oturumu oluşturur.
   * Oturum, canlı müzayedeyi yönetmek için gereklidir.
   * Müzayedenin lot listesini ve durumunu döndürür.
   */
  async function createSession() {
    addLog('Oturum oluşturuluyor...');
    const data = await apiCall('/auctioneer/sessions', 'POST', {
      auctionId,
    });
    if (data && data.id) {
      setSession(data);
      addLog(`Oturum oluşturuldu: ${data.id}`);
    } else if (data) {
      // API farklı formatta dönebilir
      addLog(`Yanıt: ${JSON.stringify(data).slice(0, 200)}`);
    }
  }

  /** Oturumu başlatır - lotlar artık açılabilir duruma gelir */
  async function startSession() {
    if (!session) {
      addLog('Önce bir oturum oluşturun');
      return;
    }
    const data = await apiCall(
      `/auctioneer/sessions/${session.id}/start`,
      'POST',
    );
    if (data) addLog('Oturum başlatıldı - artık lot açabilirsiniz');
  }

  /** Oturumu sonlandırır ve yayını durdurur */
  async function endSession() {
    if (!session) return;
    const data = await apiCall(
      `/auctioneer/sessions/${session.id}/end`,
      'POST',
    );
    if (data) {
      addLog('Oturum sonlandırıldı');
      stopBroadcast();
      setSession(null);
    }
  }

  /** Belirtilen lot numarasını müzayedeye açar - teklif almaya başlar */
  async function openLot(lotNumber: number) {
    const data = await apiCall(
      `/auctioneer/${auctionId}/lots/${lotNumber}/open`,
      'POST',
    );
    if (data) addLog(`Lot #${lotNumber} açıldı - teklifler bekleniyor`);
  }

  /** "BİR KEZ!" çağrısı - 15 saniyelik geri sayım başlatır */
  async function goingOnce() {
    await apiCall(`/auctioneer/${auctionId}/going-once`, 'POST');
    addLog('BİR KEZ! çağrısı yapıldı (15 sn geri sayım)');
  }

  /** "İKİ KEZ!" çağrısı - 10 saniyelik son geri sayım */
  async function goingTwice() {
    await apiCall(`/auctioneer/${auctionId}/going-twice`, 'POST');
    addLog('İKİ KEZ! çağrısı yapıldı (10 sn geri sayım)');
  }

  /** Lotu satıldı olarak işaretler - en yüksek teklif sahibi kazanır */
  async function soldLot(lotNumber: number) {
    const data = await apiCall(
      `/auctioneer/${auctionId}/lots/${lotNumber}/sold`,
      'POST',
    );
    if (data) addLog(`Lot #${lotNumber} SATILDI!`);
  }

  /** Lotu geçer - hiçbir teklif kabul edilmedi */
  async function passLot(lotNumber: number) {
    const data = await apiCall(
      `/auctioneer/${auctionId}/lots/${lotNumber}/pass`,
      'POST',
    );
    if (data) addLog(`Lot #${lotNumber} GEÇİLDİ (satılmadı)`);
  }

  // --------------------------------------------------------------------------
  // KULLANICI ARAYÜZÜ (JSX)
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Sayfa başlığı ve bağlantı durumu göstergesi */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Müzayedeci Kontrol Paneli
        </h1>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {connectionStatus === 'connected' ? 'Bağlı' :
             connectionStatus === 'connecting' ? 'Bağlanıyor...' :
             'Bağlantı yok'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===================== SOL PANEL: Video ve Kontroller ===================== */}
        <div className="lg:col-span-2 space-y-4">

          {/* --- Müzayede Seçimi --- */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h2 className="text-lg font-semibold mb-3">Müzayede Ayarları</h2>

            {/* Aktif müzayede butonları - API'den gelen LIVE/PUBLISHED müzayedeler */}
            {liveAuctions.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Aktif Müzayedeler
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

            {/* Manuel müzayede ID girişi + oturum oluştur butonu */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Müzayede ID
                </label>
                <input
                  type="text"
                  value={auctionId}
                  onChange={(e) => setAuctionId(e.target.value)}
                  placeholder="Müzayede ID girin veya yukarıdan seçin"
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <button
                onClick={createSession}
                disabled={!auctionId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Oturum Oluştur
              </button>
            </div>

            {/* Aktif müzayede yoksa bilgilendirme mesajı */}
            {liveAuctions.length === 0 && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Şu an LIVE veya PUBLISHED durumunda müzayede bulunamadı.
                Admin panelinden bir müzayede oluşturup yayınlayın.
              </p>
            )}
          </div>

          {/* --- Kamera Önizleme --- */}
          <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              muted        // Kendi sesimizi duymamak için
              playsInline  // iOS'ta tam ekrana geçmeyi engelle
              className="w-full h-full object-contain"
            />
            {/* Kamera kapalıyken gösterilen mesaj */}
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                Kamera kapalı - &quot;Yayını Başlat&quot; butonuna tıklayın
              </div>
            )}
            {/* Yayın aktifken gösterilen durum bilgileri */}
            {isStreaming && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  CANLI
                </span>
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {viewerCount} izleyici
                </span>
              </div>
            )}
          </div>

          {/* --- Yayın Kontrol Butonları --- */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex gap-3 flex-wrap">
            {/* Yayın başlat/durdur butonu */}
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
            {/* Oturum başlat/bitir butonları */}
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

          {/* --- Müzayedeci Çağrıları (Going Once / Going Twice) --- */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h2 className="text-lg font-semibold mb-3">Müzayedeci Çağrıları</h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={goingOnce}
                disabled={!auctionId}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold text-lg"
              >
                BİR KEZ!
              </button>
              <button
                onClick={goingTwice}
                disabled={!auctionId}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold text-lg"
              >
                İKİ KEZ!
              </button>
            </div>
          </div>

          {/* --- Lot Yönetimi (Oturum oluşturduktan sonra görünür) --- */}
          {session?.lots && session.lots.length > 0 && (
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
                      {/* Lot durum etiketi */}
                      <span
                        className={`text-xs ml-2 px-2 py-0.5 rounded ${
                          lot.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : lot.status === 'SOLD'
                              ? 'bg-blue-100 text-blue-800'
                              : lot.status === 'PASSED'
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {lot.status === 'ACTIVE' ? 'AKTİF' :
                         lot.status === 'SOLD' ? 'SATILDI' :
                         lot.status === 'PASSED' ? 'GEÇİLDİ' :
                         lot.status}
                      </span>
                    </div>
                    {/* Lot eylem butonları */}
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

        {/* ===================== SAĞ PANEL: Olay Günlüğü ===================== */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-[600px] flex flex-col">
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">Olay Günlüğü</h2>
              <p className="text-xs text-gray-500">Tüm işlemler burada görünür</p>
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
                  Henüz olay yok - bir müzayede seçip yayını başlatın
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
