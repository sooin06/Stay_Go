import { useEffect, useRef, useState } from 'react';

// 기본 중심: 조치원역 (lng, lat) - 세종시 조치원
const DEFAULT_CENTER = [127.2980, 36.6015];

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

// 방문 미션 장소 데이터 (지도 기반)
const SAMPLE_PLACES = [
  {
    id: 1,
    name: '고려대학교 세종캠퍼스 종합운동장 방문',
    address: '세종특별자치시 조치원읍 세종로 2511',
    category: '대학교',
    rating: 4.5,
    distance: '0.8km',
    lat: 36.5015,
    lng: 127.2530
  },
  {
    id: 2,
    name: '조치원역에서 기차 사진 찍기',
    address: '세종특별자치시 조치원읍 조치원역로 1',
    category: '역',
    rating: 4.3,
    distance: '1.2km',
    lat: 36.6015,
    lng: 127.2980
  },
  {
    id: 3,
    name: '세종문화예술회관 공연 관람',
    address: '세종특별자치시 조치원읍 침산리',
    category: '문화시설',
    rating: 4.4,
    distance: '1.5km',
    lat: 36.5850,
    lng: 127.2800
  },
  {
    id: 4,
    name: '세종전통시장에서 로컬 음식 체험',
    address: '세종특별자치시 조치원읍 원리',
    category: '시장',
    rating: 4.6,
    distance: '1.8km',
    lat: 36.5950,
    lng: 127.2950
  },
  {
    id: 5,
    name: '수지공원에서 산책하기',
    address: '세종특별자치시 조치원읍 서창리',
    category: '공원',
    rating: 4.7,
    distance: '2.0km',
    lat: 36.5200,
    lng: 127.2400
  },
  {
    id: 6,
    name: '조치원 문화정원 방문 인증',
    address: '세종특별자치시 조치원읍 교리',
    category: '공원',
    rating: 4.5,
    distance: '2.3km',
    lat: 36.6100,
    lng: 127.3100
  },
  {
    id: 7,
    name: '세종여자고등학교 앞에서 인증샷',
    address: '세종특별자치시 조치원읍 서창리',
    category: '학교',
    rating: 4.2,
    distance: '1.0km',
    lat: 36.5100,
    lng: 127.2600
  },
  {
    id: 8,
    name: '조치원 버스터미널에서 출발지 확인',
    address: '세종특별자치시 조치원읍 원리',
    category: '터미널',
    rating: 4.3,
    distance: '1.7km',
    lat: 36.6000,
    lng: 127.3000
  }
];

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(true);
  const [showSafety, setShowSafety] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState(SAMPLE_PLACES);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  
  // 바텀시트 상태
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const bottomSheetRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  
  const lastFixRef = useRef(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const poiMarkersRef = useRef([]);
  const poisRef = useRef([
    {
      id: 'poi-korea-univ',
      name: '고려대학교 세종캠퍼스',
      description: '대학 캠퍼스를 탐방하고 학생 식당에서 식사하세요. 종합운동장에서 운동도 할 수 있어요!',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
      lng: 127.2530,
      lat: 36.5015,
      radiusMeters: 100,
    },
    {
      id: 'poi-station',
      name: '조치원역',
      description: '조치원역에서 기차를 타고 주변 지역을 탐방해보세요. 역사 앞에서 인증샷을 찍어보세요!',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
      lng: 127.2980,
      lat: 36.6015,
      radiusMeters: 50,
    },
    {
      id: 'poi-culture-center',
      name: '세종문화예술회관',
      description: '문화예술회관에서 공연을 관람하거나 전시를 감상해보세요. 주변 카페에서 휴식도 가능해요.',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
      lng: 127.2800,
      lat: 36.5850,
      radiusMeters: 60,
    },
    {
      id: 'poi-market',
      name: '세종전통시장',
      description: '전통시장에서 로컬 음식을 맛보고 지역 특산품을 구매해보세요. 활기찬 분위기를 느낄 수 있어요!',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=1200&auto=format&fit=crop',
      lng: 127.2950,
      lat: 36.5950,
      radiusMeters: 70,
    },
    {
      id: 'poi-park',
      name: '수지공원',
      description: '수지공원에서 산책하고 자연을 만끽하세요. 가족과 함께 피크닉을 즐기기에 좋은 장소예요.',
      imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop',
      lng: 127.2400,
      lat: 36.5200,
      radiusMeters: 80,
    },
    {
      id: 'poi-bus-terminal',
      name: '조치원 버스터미널',
      description: '버스터미널에서 주변 지역으로 가는 버스를 확인하고, 여행 계획을 세워보세요.',
      imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1200&auto=format&fit=crop',
      lng: 127.3000,
      lat: 36.6000,
      radiusMeters: 50,
    },
  ]);

  // 지도 초기화
  useEffect(() => {
    let watchId = null;
    let canceled = false;

    const init = async () => {
      try {
        const NAVER_CLIENT_ID = process.env.REACT_APP_NAVER_CLIENT_ID || 'yo27720eii16';
        const naverMaps = await loadNaverMaps(NAVER_CLIENT_ID);
        
        if (canceled) return;
        if (!mapContainerRef.current) return;

        const centerLatLng = new naverMaps.LatLng(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
        
        const map = new naverMaps.Map(mapContainerRef.current, {
          center: centerLatLng,
          zoom: 14,
          minZoom: 6,
          zoomControl: false,
        });

        mapRef.current = map;

        // 지도 로딩 완료 후 강제 리사이즈
        setTimeout(() => {
          if (map && typeof map.refresh === 'function') {
            map.refresh();
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

        // 위치는 조용히 백그라운드에서 가져오기
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (canceled) return;
              
              const { latitude, longitude, accuracy } = pos.coords;
              const latLng = new naverMaps.LatLng(latitude, longitude);
              
              setUserLocation({ lat: latitude, lng: longitude });
              setLocationPermission('granted');

              // 사용자 위치 마커 업데이트
              if (!userMarkerRef.current) {
                userMarkerRef.current = new naverMaps.Marker({
                  position: latLng,
                  map,
                  icon: {
                    content: '<div style="width: 20px; height: 20px; background: #4285f4; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    anchor: new naverMaps.Point(10, 10),
                  },
                });
                map.setCenter(latLng);
                map.setZoom(16);
              } else {
                userMarkerRef.current.setPosition(latLng);
              }

              // 정확도 원
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
                const dt = Math.max(1, (now - lastFixRef.current.t) / 1000);
                const meters = haversineMeters(
                  lastFixRef.current.lat,
                  lastFixRef.current.lng,
                  latitude,
                  longitude
                );
                const speed = meters / dt;
                if (speed > 12) {
                  setShowSafety(true);
                }
              }
              lastFixRef.current = { t: now, lat: latitude, lng: longitude };
            },
            (err) => {
              if (err.code === 1) {
                setLocationPermission('denied');
              }
            },
            { enableHighAccuracy: false, maximumAge: 30000, timeout: 5000 }
          );
        }
      } catch (e) {
        if (!canceled) {
          console.error('지도 초기화 에러:', e);
          setError('지도를 불러오지 못했습니다.');
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

  // 바텀시트 터치 이벤트 처리
  useEffect(() => {
    const bottomSheet = bottomSheetRef.current;
    if (!bottomSheet) return;

    const handleTouchStart = (e) => {
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      currentYRef.current = e.touches[0].clientY;
      const diff = startYRef.current - currentYRef.current;
      
      if (diff > 0) {
        setBottomSheetOpen(true);
      } else if (diff < -50) {
        setBottomSheetOpen(false);
      }
    };

    bottomSheet.addEventListener('touchstart', handleTouchStart);
    bottomSheet.addEventListener('touchmove', handleTouchMove);

    return () => {
      bottomSheet.removeEventListener('touchstart', handleTouchStart);
      bottomSheet.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('검색:', searchQuery);
  };

  const handleLocationClick = () => {
    if (userLocation && mapRef.current) {
      const naverMaps = window.naver?.maps;
      if (naverMaps) {
        const latLng = new naverMaps.LatLng(userLocation.lat, userLocation.lng);
        mapRef.current.setCenter(latLng);
        mapRef.current.setZoom(16);
      }
    } else {
      requestLocationPermission();
    }
  };

  const handlePlaceClick = (place) => {
    if (mapRef.current && window.naver?.maps && place.lat && place.lng) {
      const naverMaps = window.naver.maps;
      const latLng = new naverMaps.LatLng(place.lat, place.lng);
      mapRef.current.setCenter(latLng);
      mapRef.current.setZoom(16);
      setBottomSheetOpen(false); // 바텀시트 닫기
    }
  };

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationPermission('granted');
          setShowLocationPrompt(false);
          
          if (mapRef.current && window.naver?.maps) {
            const naverMaps = window.naver.maps;
            const latLng = new naverMaps.LatLng(latitude, longitude);
            
            if (!userMarkerRef.current) {
              userMarkerRef.current = new naverMaps.Marker({
                position: latLng,
                map: mapRef.current,
                icon: {
                  content: '<div style="width: 20px; height: 20px; background: #4285f4; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                  anchor: new naverMaps.Point(10, 10),
                },
              });
            }
            mapRef.current.setCenter(latLng);
            mapRef.current.setZoom(16);
          }
        },
        (err) => {
          if (err.code === 1) {
            setLocationPermission('denied');
            setError('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해주세요.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  return (
    <div className="search-map-view">
      {/* 상단 검색바 */}
      <div className="search-header">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="검색하기"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="button" className="location-btn" onClick={handleLocationClick}>
            →
          </button>
        </form>
      </div>

      {/* 지도 영역 */}
      <div className="map-section">
        <div ref={mapContainerRef} className="map-container" />
        {error && <div className="map-error">{error}</div>}
      </div>

      {/* 하단 장소 목록 (바텀시트) */}
      <div 
        ref={bottomSheetRef}
        className={`places-section bottom-sheet ${bottomSheetOpen ? 'open' : ''}`}
      >
        {/* 바텀시트 핸들 */}
        <div 
          className={`bottom-sheet-handle ${bottomSheetOpen ? 'open' : ''}`}
          onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
        >
          <div className="handle-bar"></div>
        </div>
        <div className="places-header">
          <h3>방문하여 미션을 수행해보아요</h3>
        </div>
        <div className="places-list">
          {places.map((place) => (
            <div key={place.id} className="place-card">
              <div className="place-info">
                <h4 className="place-name">{place.name}</h4>
                <div className="place-details">
                  <span className="place-address">📍 {place.address}</span>
                  {place.distance && <span className="place-distance"> · {place.distance}</span>}
                </div>
              </div>
              <button className="visit-btn" onClick={() => handlePlaceClick(place)}>길찾기</button>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div className="bottom-nav">
        <button className="nav-btn active">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">주변탐색</span>
        </button>
        <button className="nav-btn">
          <span className="nav-icon">☰</span>
          <span className="nav-label">메뉴</span>
        </button>
      </div>

      {/* 위치 권한 안내 모달 */}
      {showLocationPrompt && (
        <div className="location-permission-modal">
          <div className="location-permission-content">
            <div className="location-permission-icon">📍</div>
            <h3>위치 권한이 필요합니다</h3>
            <p>
              {locationPermission === 'denied' 
                ? '주변 장소를 찾기 위해 위치 접근 권한이 필요합니다. 브라우저 설정에서 위치 접근을 허용해주세요.'
                : '주변 장소를 찾기 위해 위치 접근 권한이 필요합니다.'}
            </p>
            <div className="location-permission-buttons">
              <button 
                className="permission-btn primary"
                onClick={requestLocationPermission}
              >
                위치 권한 허용
              </button>
              <button 
                className="permission-btn secondary"
                onClick={() => setShowLocationPrompt(false)}
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 안전 경고 모달 */}
      {showSafety && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title">안전 경고</div>
            <div className="modal-body">운전 중에는 사용하지 마세요. 안전한 장소에서만 이용해 주세요.</div>
            <button className="big-action" onClick={() => setShowSafety(false)}>확인</button>
          </div>
        </div>
      )}

      {/* POI 모달 */}
      {selectedPoi && (
        <PoiModal
          poi={selectedPoi}
          onClose={() => setSelectedPoi(null)}
          canClaim={canClaim(selectedPoi, lastFixRef.current)}
          onClaim={() => {
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