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
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder,directions`;
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

// 방문 미션 장소 데이터 (지도 기반 - 정확한 좌표)
// 조치원역 중심: 36.6015, 127.2980
const SAMPLE_PLACES = [
  {
    id: 1,
    name: '조치원역 광장 10분 머물기',
    address: '세종특별자치시 조치원읍 으뜸길 215',
    category: '역',
    rating: 4.3,
    distance: '0.0km',
    lat: 36.60110319,
    lng: 127.29652964
  },
  {
    id: 2,
    name: '세종문화예술회관 15분 머물기',
    address: '세종특별자치시 조치원읍 문예화관길 280',
    category: '문화시설',
    rating: 4.4,
    distance: '0.5km',
    lat: 36.5995146,
    lng: 127.28750608
  },
  {
    id: 3,
    name: '침산공원 20분 머물기',
    address: '세종특별자치시 조치원읍 침산리 179-3',
    category: '공원',
    rating: 4.7,
    distance: '0.6km',
    lat: 36.59903685,
    lng: 127.293629
  },
  {
    id: 4,
    name: '세종전통시장 10분 머물기',
    address: '세종특별자치시 조치원읍 조치원8길 42',
    category: '시장',
    rating: 4.6,
    distance: '0.8km',
    lat: 36.60041113,
    lng: 127.29960703
  },
  {
    id: 5,
    name: '조치원 버스터미널 5분 머물기',
    address: '세종특별자치시 조치원읍 조치원로 54 2동',
    category: '터미널',
    rating: 4.3,
    distance: '0.9km',
    lat: 36.60170895,
    lng: 127.30295523
  },
  {
    id: 6,
    name: '세종 북부소방서 10분 머물기',
    address: '세종특별자치시 조치원읍 세종로 2439',
    category: '공공시설',
    rating: 4.5,
    distance: '1.2km',
    lat: 36.60467352,
    lng: 127.2892333
  },
  {
    id: 7,
    name: '메가박스 10분 머물기',
    address: '세종특별자치시 조치원읍 조치원역로 15',
    category: '문화시설',
    rating: 4.2,
    distance: '1.0km',
    lat: 36.60285356,
    lng: 127.2981616
  },
  {
    id: 8,
    name: 'NH농협은행 5분 머물기',
    address: '세종특별자치시 조치원읍 새내로 108',
    category: '은행',
    rating: 4.3,
    distance: '0.7km',
    lat: 36.60158985,
    lng: 127.29840355
  },
  {
    id: 9,
    name: '세븐일레븐 5분 머물기',
    address: '세종특별자치시 조치원읍 세종로 2511 고려대학교 세종캠퍼스 진리관 세븐일레븐',
    category: '편의점',
    rating: 4.6,
    distance: '2.5km',
    lat: 36.61131435,
    lng: 127.28455814
  },
  {
    id: 10,
    name: '브레댄코 10분 머물기',
    address: '세종특별자치시 조치원읍 세종로 2511 고려대학교 세종캠퍼스 미래관 브레댄코',
    category: '베이커리',
    rating: 4.4,
    distance: '2.5km',
    lat: 36.61072053,
    lng: 127.28537724
  },
  {
    id: 11,
    name: 'IPARK휘트니스 15분 머물기',
    address: '세종특별자치시 조치원읍 세종로 2511 고려대학교 세종캠퍼스 IPARK휘트니스',
    category: '헬스장',
    rating: 4.3,
    distance: '2.5km',
    lat: 36.61065637,
    lng: 127.28453268
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
  // 미션 완료 상태 추적
  const [completedMissions, setCompletedMissions] = useState(new Set());
  const [activeMission, setActiveMission] = useState(null); // { placeId, startTime }
  const missionTimersRef = useRef({}); // 각 미션의 타이머 저장
  const completedMissionsRef = useRef(new Set()); // 최신 완료 상태 참조
  const activeMissionRef = useRef(null); // 최신 활성 미션 참조
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [completedMissionName, setCompletedMissionName] = useState('');
  
  // completedMissions와 activeMission을 ref에 동기화
  useEffect(() => {
    completedMissionsRef.current = completedMissions;
  }, [completedMissions]);

  useEffect(() => {
    activeMissionRef.current = activeMission;
  }, [activeMission]);
  
  // SAMPLE_PLACES와 동일한 좌표 사용
  const poisRef = useRef(
    SAMPLE_PLACES.map(place => ({
      id: `poi-${place.id}`,
      name: place.name,
      description: `${place.name}에서 미션을 수행해보세요!`,
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
      lng: place.lng,
      lat: place.lat,
      radiusMeters: 500, // 500m 범위
      stayTime: place.stayTime || 10, // 머물 시간 (분)
      placeId: place.id, // 원본 place ID 저장
    }))
  );

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

        // POI 마커 생성 함수
        const createPoiMarkers = () => {
          // 기존 마커 제거
          poiMarkersRef.current.forEach((m) => {
            if (m?.marker && m.marker.setMap) {
              m.marker.setMap(null);
            }
          });
          poiMarkersRef.current = [];

          // 새 마커 생성
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
        };

        // 초기 마커 생성 (기존 좌표 사용)
        createPoiMarkers();

        // Geocoder로 주소를 좌표로 변환하여 정확한 위치에 표시
        const geocodePlaces = async () => {
          if (!naverMaps.Service || !naverMaps.Service.geocode) {
            console.log('Geocoder 서비스가 사용 불가능합니다.');
        return;
      }

          console.log('Geocoder로 주소를 좌표로 변환 시작...');

          // 각 장소의 주소를 좌표로 변환 (순차적으로 처리하여 정확도 향상)
          const updatedPlaces = [];
          for (const place of SAMPLE_PLACES) {
            try {
              const geocodedPlace = await new Promise((resolve) => {
                // 장소 이름과 주소를 함께 검색하여 정확도 향상
                let searchQuery = place.address;
                
                // 특정 장소는 이름을 포함하여 검색 정확도 향상
                if (place.name.includes('침산공원')) {
                  searchQuery = '세종특별자치시 조치원읍 침산공원';
                } else if (place.name.includes('고려대학교') || place.name.includes('세븐일레븐') || place.name.includes('브레댄코') || place.name.includes('IPARK')) {
                  searchQuery = `${place.name} ${place.address}`;
                } else if (place.name.includes('조치원역')) {
                  searchQuery = '세종특별자치시 조치원읍 조치원역';
                } else if (place.name.includes('세종문화예술회관')) {
                  searchQuery = '세종특별자치시 조치원읍 세종문화예술회관';
                } else if (place.name.includes('세종전통시장')) {
                  searchQuery = '세종특별자치시 조치원읍 세종전통시장';
                } else if (place.name.includes('버스터미널')) {
                  searchQuery = '세종특별자치시 조치원읍 조치원 버스터미널';
                } else if (place.name.includes('NH농협은행')) {
                  searchQuery = '세종특별자치시 조치원읍 NH농협은행';
                } else if (place.name.includes('메가박스')) {
                  searchQuery = '세종특별자치시 조치원읍 메가박스';
                }
                
                naverMaps.Service.geocode(
                  { query: searchQuery },
                  (status, response) => {
                    if (status === naverMaps.Service.Status.OK && response.v2.addresses && response.v2.addresses.length > 0) {
                      // 가장 정확한 주소 선택 (도로명 주소 우선, 지번 주소 차선)
                      let addr = response.v2.addresses.find(a => a.roadAddress) || response.v2.addresses[0];
                      
                      // 여러 결과가 있을 경우 장소 이름과 가장 유사한 주소 선택
                      if (response.v2.addresses.length > 1) {
                        const nameMatch = response.v2.addresses.find(a => 
                          a.roadAddress?.includes(place.name.split(' ')[0]) || 
                          a.jibunAddress?.includes(place.name.split(' ')[0])
                        );
                        if (nameMatch) addr = nameMatch;
                      }
                      
                      const newLat = parseFloat(addr.y);
                      const newLng = parseFloat(addr.x);
                      
                      console.log(`${place.name}: "${searchQuery}" -> (${newLat}, ${newLng})`);
                      console.log(`  도로명: ${addr.roadAddress || '없음'}, 지번: ${addr.jibunAddress || '없음'}`);
                      
                      resolve({
                        ...place,
                        lat: newLat,
                        lng: newLng,
                      });
                    } else {
                      console.warn(`${place.name} 좌표 변환 실패 (검색어: "${searchQuery}"), 기존 좌표 사용: (${place.lat}, ${place.lng})`);
                      // 변환 실패 시 기존 좌표 사용
                      resolve(place);
                    }
                  }
                );
              });
              
              updatedPlaces.push(geocodedPlace);
              
              // API 호출 제한을 피하기 위해 약간의 지연
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
              console.error(`${place.name} 변환 중 오류:`, e);
              updatedPlaces.push(place);
            }
          }

          // 업데이트된 좌표로 places와 poisRef 업데이트
          setPlaces(updatedPlaces);
          poisRef.current = updatedPlaces.map(place => ({
            id: `poi-${place.id}`,
            name: place.name,
            description: `${place.name}에서 미션을 수행해보세요!`,
            imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
            lng: place.lng,
            lat: place.lat,
            radiusMeters: 500,
          }));

          // 업데이트된 좌표로 마커 재생성
          createPoiMarkers();
          console.log('모든 POI 좌표 업데이트 완료');
        };

        // Geocoder로 좌표 변환 시도 (약간의 지연 후 실행)
        setTimeout(() => {
          geocodePlaces();
        }, 1500);

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
                // 실시간으로 마커 위치 업데이트
                userMarkerRef.current.setPosition(latLng);
                // 지도 중심도 사용자 위치로 자동 이동 (부드럽게)
                map.panTo(latLng);
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
        const missionRadius = 500; // 미션 완료 범위: 500m
        
        poisRef.current.forEach((p, idx) => {
          const dist = haversineMeters(latitude, longitude, p.lat, p.lng);
                const item = poiMarkersRef.current[idx];
                const dom = item && item.el;
                if (!dom) return;
                if (dist <= nearRadius) dom.classList.add('near');
                else dom.classList.remove('near');
                
                // 500m 범위 내에 있는지 체크
                if (dist <= missionRadius) {
                  // 이미 완료된 미션이면 스킵
                  if (completedMissionsRef.current.has(p.placeId)) {
                    return;
                  }
                  
                  // 현재 활성화된 미션이 없거나 다른 미션이면 새로 시작
                  if (!activeMissionRef.current || activeMissionRef.current.placeId !== p.placeId) {
                    const startTime = Date.now();
                    const newActiveMission = {
                      placeId: p.placeId,
                      startTime: startTime,
                      stayTime: p.stayTime || 10,
                    };
                    setActiveMission(newActiveMission);
                    activeMissionRef.current = newActiveMission;
                    
                    // 기존 타이머 정리
                    if (missionTimersRef.current[p.placeId]) {
                      clearTimeout(missionTimersRef.current[p.placeId]);
                    }
                    
                    // 머물 시간 후 미션 완료
                    const stayTimeMs = (p.stayTime || 10) * 60 * 1000; // 분을 밀리초로 변환
                    missionTimersRef.current[p.placeId] = setTimeout(() => {
                      setCompletedMissions(prev => {
                        const newSet = new Set(prev);
                        newSet.add(p.placeId);
                        completedMissionsRef.current = newSet;
                        return newSet;
                      });
                      setActiveMission(null);
                      activeMissionRef.current = null;
                      delete missionTimersRef.current[p.placeId];
                      console.log(`미션 완료: ${p.name}`);
                      
                      // 완료 애니메이션 표시
                      setCompletedMissionName(p.name);
                      setShowCompletionAnimation(true);
                      setTimeout(() => {
                        setShowCompletionAnimation(false);
                      }, 3000); // 3초 후 애니메이션 숨김
                    }, stayTimeMs);
                  }
                } else {
                  // 범위를 벗어나면 미션 중단
                  if (activeMissionRef.current && activeMissionRef.current.placeId === p.placeId) {
                    if (missionTimersRef.current[p.placeId]) {
                      clearTimeout(missionTimersRef.current[p.placeId]);
                      delete missionTimersRef.current[p.placeId];
                    }
                    setActiveMission(null);
                    activeMissionRef.current = null;
                  }
                }
              });

              // 장소 목록의 거리 업데이트
              updatePlacesDistance(latitude, longitude);

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
            { 
              enableHighAccuracy: true,  // 고정밀도 위치 사용
              maximumAge: 0,  // 캐시된 위치 사용 안 함 (항상 최신 위치)
              timeout: 10000  // 타임아웃 10초
            }
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
      // 모든 미션 타이머 정리
      Object.values(missionTimersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      missionTimersRef.current = {};
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

  // 장소 목록의 거리 업데이트 (실제 도로 거리)
  const updatePlacesDistance = (userLat, userLng) => {
    const naverMaps = window.naver?.maps;
    if (!naverMaps || !naverMaps.Service || !naverMaps.Service.Direction) {
      // Direction API가 없으면 직선 거리 사용
      setPlaces(prevPlaces => 
        prevPlaces.map(place => {
          const distanceMeters = haversineMeters(userLat, userLng, place.lat, place.lng);
          let distanceText = '';
          if (distanceMeters < 1000) {
            distanceText = `${Math.round(distanceMeters)}m`;
          } else {
            distanceText = `${(distanceMeters / 1000).toFixed(1)}km`;
          }
          return { ...place, distance: distanceText };
        }).sort((a, b) => {
          const distA = haversineMeters(userLat, userLng, a.lat, a.lng);
          const distB = haversineMeters(userLat, userLng, b.lat, b.lng);
          return distA - distB;
        })
      );
      return;
    }

    // 실제 도로 거리 계산
    setPlaces(prevPlaces => {
      const updatedPlaces = prevPlaces.map(place => ({ ...place, distance: '계산 중...' }));
      
      // 각 장소에 대해 실제 도로 거리 계산 (순차적으로 호출하여 API 제한 방지)
      let callIndex = 0;
      const calculateDistance = (place) => {
        if (!place) return;
        
        const startPoint = new naverMaps.LatLng(userLat, userLng);
        const endPoint = new naverMaps.LatLng(place.lat, place.lng);
        
        // 네이버 지도 Direction API 호출
        naverMaps.Service.Direction.route({
          start: startPoint,
          goal: endPoint,
          option: {
            toll: false,
            motorway: false,
            ferry: false,
            highway: false,
          }
        }, (status, response) => {
          if (status === naverMaps.Service.Status.OK && response.route && response.route.traoptimal && response.route.traoptimal.length > 0) {
            // 실제 도로 거리 (미터)
            const distanceMeters = response.route.traoptimal[0].summary.distance;
            let distanceText = '';
            if (distanceMeters < 1000) {
              distanceText = `${Math.round(distanceMeters)}m`;
            } else {
              distanceText = `${(distanceMeters / 1000).toFixed(1)}km`;
            }
            
            setPlaces(currentPlaces => {
              const newPlaces = [...currentPlaces];
              const placeIndex = newPlaces.findIndex(p => p.id === place.id);
              if (placeIndex !== -1) {
                newPlaces[placeIndex] = { ...newPlaces[placeIndex], distance: distanceText };
              }
              // 거리순으로 정렬
              return newPlaces.sort((a, b) => {
                const distA = a.distance === '계산 중...' ? Infinity : parseFloat(a.distance.replace(/[^0-9.]/g, '')) * (a.distance.includes('km') ? 1000 : 1);
                const distB = b.distance === '계산 중...' ? Infinity : parseFloat(b.distance.replace(/[^0-9.]/g, '')) * (b.distance.includes('km') ? 1000 : 1);
                return distA - distB;
              });
            });
          } else {
            // API 호출 실패 시 직선 거리 사용
            const distanceMeters = haversineMeters(userLat, userLng, place.lat, place.lng);
            let distanceText = '';
            if (distanceMeters < 1000) {
              distanceText = `${Math.round(distanceMeters)}m`;
            } else {
              distanceText = `${(distanceMeters / 1000).toFixed(1)}km`;
            }
            
            setPlaces(currentPlaces => {
              const newPlaces = [...currentPlaces];
              const placeIndex = newPlaces.findIndex(p => p.id === place.id);
              if (placeIndex !== -1) {
                newPlaces[placeIndex] = { ...newPlaces[placeIndex], distance: distanceText };
              }
              return newPlaces.sort((a, b) => {
                const distA = a.distance === '계산 중...' ? Infinity : parseFloat(a.distance.replace(/[^0-9.]/g, '')) * (a.distance.includes('km') ? 1000 : 1);
                const distB = b.distance === '계산 중...' ? Infinity : parseFloat(b.distance.replace(/[^0-9.]/g, '')) * (b.distance.includes('km') ? 1000 : 1);
                return distA - distB;
              });
            });
          }
          
          // 다음 장소 거리 계산
          callIndex++;
          if (callIndex < prevPlaces.length) {
            setTimeout(() => calculateDistance(prevPlaces[callIndex]), 200); // API 제한 방지를 위해 200ms 간격
          }
        });
      };
      
      // 첫 번째 장소부터 시작
      if (prevPlaces.length > 0) {
        calculateDistance(prevPlaces[0]);
      }
      
      return updatedPlaces;
    });
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
      
      // 네이버 지도 길찾기 열기
      openNaverDirections(place);
    }
  };

  // 네이버 지도 길찾기 열기
  const openNaverDirections = (place) => {
    if (!place || !place.lat || !place.lng) return;
    
    // 사용자 현재 위치 또는 기본 출발지
    let startLat = DEFAULT_CENTER[1];
    let startLng = DEFAULT_CENTER[0];
    let startName = '출발지';
    
    if (userLocation && userLocation.lat && userLocation.lng) {
      startLat = userLocation.lat;
      startLng = userLocation.lng;
      startName = '내 위치';
    }
    
    const endLat = place.lat;
    const endLng = place.lng;
    const endName = encodeURIComponent(place.name);
    
    // 네이버 지도 길찾기 URL 생성
    // 자동차 경로: https://map.naver.com/v5/directions/{출발지좌표},{출발지명}/{도착지좌표},{도착지명}/-/car
    // 대중교통: https://map.naver.com/v5/directions/{출발지좌표},{출발지명}/{도착지좌표},{도착지명}/-/transit
    // 도보: https://map.naver.com/v5/directions/{출발지좌표},{출발지명}/{도착지좌표},{도착지명}/-/walk
    
    const directionsUrl = `https://map.naver.com/v5/directions/${startLng},${startLat},${startName}/${endLng},${endLat},${endName}/-/transit`;
    
    // 새 창에서 네이버 지도 길찾기 열기
    window.open(directionsUrl, '_blank');
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
      {/* 지도 영역 */}
      <div className="map-section">
        <div ref={mapContainerRef} className="map-container" />
        {error && (
          <div className="map-error">
            <span>{error}</span>
            <button 
              className="map-error-close" 
              onClick={() => setError('')}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        )}
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
          {places.map((place) => {
            const isCompleted = completedMissions.has(place.id);
            const isActive = activeMission && activeMission.placeId === place.id;
            const remainingTime = isActive 
              ? Math.max(0, Math.ceil((activeMission.stayTime * 60 * 1000 - (Date.now() - activeMission.startTime)) / 1000 / 60))
              : null;
            
            return (
              <div key={place.id} className={`place-card ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                <div className="place-info">
                  <h4 className="place-name">
                    {place.name}
                    {isCompleted && <span className="mission-badge completed">✓ 완료</span>}
                    {isActive && <span className="mission-badge active">⏱ 진행 중 ({remainingTime}분 남음)</span>}
                  </h4>
                  <div className="place-details">
                    <span className="place-address">📍 {place.address}</span>
                    {place.distance && <span className="place-distance"> · {place.distance}</span>}
                  </div>
                </div>
                <button className="visit-btn" onClick={() => handlePlaceClick(place)}>길찾기</button>
              </div>
            );
          })}
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

      {/* 미션 완료 애니메이션 */}
      {showCompletionAnimation && (
        <div className="completion-animation-overlay">
          <div className="completion-animation">
            <div className="completion-checkmark">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            <div className="completion-text">
              <h2>미션 완료!</h2>
              <p>{completedMissionName}</p>
            </div>
            <div className="completion-confetti">
              <span>🎉</span>
              <span>✨</span>
              <span>🎊</span>
            </div>
          </div>
        </div>
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
  return d <= (poi.radiusMeters || 500);
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