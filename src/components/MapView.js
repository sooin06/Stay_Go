import { useEffect, useRef, useState } from 'react';
import TaskOverlay from './TaskOverlay';

// 기본 중심: 서울시청 (lng, lat)
const DEFAULT_CENTER = [126.9780, 37.5665];

// 네이버 지도 스크립트 동적 로더
function loadNaverMaps(clientId) {
  return new Promise((resolve, reject) => {
    if (window.naver && window.naver.maps) {
      resolve(window.naver.maps);
      return;
    }

    if (!clientId) {
      reject(new Error('REACT_APP_NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다.'));
      return;
    }

    const existing = document.querySelector('script[data-naver-maps]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.naver && window.naver.maps) resolve(window.naver.maps);
        else reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
      });
      existing.addEventListener('error', () => {
        reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.defer = true;
    script.dataset.naverMaps = 'true';
    script.onload = () => {
      if (window.naver && window.naver.maps) resolve(window.naver.maps);
      else reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
    };
    script.onerror = () => reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
}

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(true); // 자동 시작
  const [showSafety, setShowSafety] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 't1', label: '서울로7017 상권 방문 인증', done: false },
    { id: 't2', label: '광장에서 10분간 햇볕 쬐기', done: false },
    { id: 't3', label: '로컬 상권 쿠폰 수령 포인트 찍기', done: false },
  ]);
  const lastFixRef = useRef(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const poiMarkersRef = useRef([]);
  const poisRef = useRef([
    {
      id: 'poi-seoullo',
      name: '서울로7017 스팟',
      description: '도심 보행로에서 로컬 상권 미션을 수행하세요.',
      imageUrl: 'https://images.unsplash.com/photo-1526481280698-8fcc13fd510d?q=80&w=1200&auto=format&fit=crop',
      lng: 126.9707,
      lat: 37.5551,
      radiusMeters: 60,
    },
    {
      id: 'poi-ddp',
      name: 'DDP 광장',
      description: '금요일 오후 7시에 단체 미션이 진행됩니다.',
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
      lng: 127.0094,
      lat: 37.5667,
      radiusMeters: 80,
    },
  ]);

  useEffect(() => {
    let watchId = null;
    let canceled = false;

    const init = async () => {
      try {
        console.log('🗺️ 지도 초기화 시작...');
        const NAVER_CLIENT_ID = process.env.REACT_APP_NAVER_CLIENT_ID || 'f7c9uvryyl';
        console.log('🔑 Client ID:', NAVER_CLIENT_ID);
        
        const naverMaps = await loadNaverMaps(NAVER_CLIENT_ID);
        console.log('✅ 네이버 지도 스크립트 로딩 완료:', naverMaps);
        
        if (canceled) return;
        if (!mapContainerRef.current) {
          console.error('❌ 지도 컨테이너를 찾을 수 없습니다');
          return;
        }

        const centerLatLng = new naverMaps.LatLng(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
        console.log('📍 지도 중심점:', centerLatLng);

        const map = new naverMaps.Map(mapContainerRef.current, {
          center: centerLatLng,
          zoom: 16,
          minZoom: 6,
          zoomControl: true,
          zoomControlOptions: {
            position: naverMaps.Position.RIGHT_BOTTOM,
          },
        });

        console.log('🗺️ 지도 인스턴스 생성 완료:', map);
        mapRef.current = map;

        // 지도 로딩 완료 후 강제 리사이즈 (화면에 보이도록)
        setTimeout(() => {
          if (map && typeof map.refresh === 'function') {
            map.refresh();
            console.log('🔄 지도 새로고침 완료');
          }
        }, 100);

        // POI markers (mission points)
        poiMarkersRef.current = poisRef.current.map((p) => {
          const el = document.createElement('div');
          el.className = 'poi-marker';
          el.innerHTML = '<div class="poi-core"></div><div class="poi-ring"></div>';
          el.addEventListener('click', () => setSelectedPoi(p));
          const marker = new naverMaps.Marker({
            position: new naverMaps.LatLng(p.lat, p.lng),
            map,
            icon: {
              content: el,
              anchor: new naverMaps.Point(16, 16),
            },
          });
          return { marker, el };
        });

        const startWatch = () => {
          const geo = navigator.geolocation;
          if (!geo) {
            setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
            return;
          }

          watchId = geo.watchPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              const latLng = new naverMaps.LatLng(latitude, longitude);

              if (!userMarkerRef.current) {
                userMarkerRef.current = new naverMaps.Marker({
                  position: latLng,
                  map,
                  icon: {
                    content: '<div class="user-marker"></div>',
                    anchor: new naverMaps.Point(12, 12),
                  },
                });
                map.setCenter(latLng);
                map.setZoom(16);
              } else {
                userMarkerRef.current.setPosition(latLng);
              }

              // 정확도 원 (meters 단위 radius)
              if (!accuracyCircleRef.current) {
                accuracyCircleRef.current = new naverMaps.Circle({
                  map,
                  center: latLng,
                  radius: Math.max(10, accuracy),
                  fillColor: '#3b82f6',
                  fillOpacity: 0.15,
                  strokeColor: '#3b82f6',
                  strokeOpacity: 0.5,
                  strokeWeight: 1,
                });
              } else {
                accuracyCircleRef.current.setCenter(latLng);
                accuracyCircleRef.current.setRadius(Math.max(10, accuracy));
              }

              // 근처 POI 하이라이트
              const nearRadius = 120;
              poisRef.current.forEach((p, idx) => {
                const dist = haversineMeters(latitude, longitude, p.lat, p.lng);
                const item = poiMarkersRef.current[idx];
                const dom = item && item.el;
                if (!dom) return;
                if (dist <= nearRadius) dom.classList.add('near');
                else dom.classList.remove('near');
              });

              // 이동 속도 감지
              const now = Date.now();
              if (lastFixRef.current) {
                const dt = Math.max(1, (now - lastFixRef.current.t) / 1000); // seconds
                const meters = haversineMeters(
                  lastFixRef.current.lat,
                  lastFixRef.current.lng,
                  latitude,
                  longitude
                );
                const speed = meters / dt; // m/s
                if (speed > 12) {
                  // ~43 km/h, 주행으로 판단
                  setShowSafety(true);
                }
              }
              lastFixRef.current = { t: now, lat: latitude, lng: longitude };
            },
            (err) => {
              const codeMsg = {
                1: '권한이 거부되었습니다. 브라우저 사이트 설정에서 위치 접근을 허용하세요.',
                2: '위치 소스를 확인할 수 없습니다. Wi‑Fi/GPS 기능을 켜고 다시 시도하세요.',
                3: '요청이 시간 초과되었습니다. 하늘이 보이는 곳으로 이동해 보세요.',
              };
              setError(codeMsg[err.code] || err.message || '위치 정보를 가져오지 못했습니다.');
            },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
          );
        };

        if (tracking) startWatch();
      } catch (e) {
        console.error('❌ 지도 초기화 에러:', e);
        if (!canceled) {
          setError(
            e?.message ||
              '네이버 지도를 불러오지 못했습니다. 네트워크와 환경변수(REACT_APP_NAVER_CLIENT_ID)를 확인하세요.'
          );
        }
      }
    };

    init();

    return () => {
      canceled = true;
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
      poiMarkersRef.current.forEach((m) => {
        const marker = m?.marker || m;
        if (marker && marker.setMap) marker.setMap(null);
      });
      poiMarkersRef.current = [];
      if (userMarkerRef.current && userMarkerRef.current.setMap) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (mapRef.current && mapRef.current.destroy) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [tracking]);

  return (
    <div className="map-page">
      <div ref={mapContainerRef} className="map-container" />
      <div className="top-bar">
        <div className="brand">Stay Go</div>
        <div className="energy-pill">Lv 1</div>
      </div>
      <TaskOverlay
        tasks={tasks}
        onToggle={(id) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))}
      />
      <div className="bottom-card">
        {!tracking && (
          <button className="big-action" onClick={() => { setError(''); setTracking(true); }}>
            탐색 시작
          </button>
        )}
        {error && (
          <button className="big-action" onClick={() => { setError(''); setTracking(true); }}>
            다시 시도
          </button>
        )}
        {error && <div className="toast error">{error}</div>}
      </div>
      <div className="toast" style={{position:'absolute',left:12,bottom:12,color:'#9fb8ff',fontSize:12}}>
        본 프로젝트는 특정 게임의 자산을 사용하지 않으며, 유사한 테마만 적용합니다.
      </div>
      {showSafety && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title">안전 경고</div>
            <div className="modal-body">운전 중에는 사용하지 마세요. 안전한 장소에서만 이용해 주세요.</div>
            <button className="big-action" onClick={() => setShowSafety(false)}>확인</button>
          </div>
        </div>
      )}
      {selectedPoi && (
        <PoiModal
          poi={selectedPoi}
          onClose={() => setSelectedPoi(null)}
          canClaim={canClaim(selectedPoi, lastFixRef.current)}
          onClaim={() => {
            setTasks((prev) => prev.map((t) => (t.id === 't1' ? { ...t, done: true } : t)));
            setSelectedPoi(null);
          }}
        />
      )}
    </div>
  );
}

// Haversine distance (meters)
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function canClaim(poi, lastFix) {
  if (!lastFix) return false;
  const d = haversineMeters(lastFix.lat, lastFix.lng, poi.lat, poi.lng);
  return d <= (poi.radiusMeters || 60);
}

function PoiModal({ poi, onClose, canClaim, onClaim }) {
  return (
    <div className="modal-backdrop">
      <div className="modal poi">
        <div className="modal-title">{poi.name}</div>
        <img src={poi.imageUrl} alt={poi.name} className="poi-cover" />
        <div className="modal-body">{poi.description}</div>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button className="big-action" onClick={onClose}>닫기</button>
          <button className="big-action" disabled={!canClaim} onClick={onClaim}>
            {canClaim ? '방문 인증' : '가까이 이동하세요'}
          </button>
        </div>
      </div>
    </div>
  );
}


