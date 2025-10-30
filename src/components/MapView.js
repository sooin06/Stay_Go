import { useEffect, useRef, useState } from 'react';

// MapLibre GL is loaded via CDN in public/index.html

const DEFAULT_CENTER = [126.9780, 37.5665]; // Seoul City Hall (lng, lat)

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(true); // 자동 시작

  useEffect(() => {
    if (!window.maplibregl) {
      setError('지도를 불러오지 못했습니다. 네트워크를 확인하세요.');
      return;
    }

    const MAPTILER_KEY = process.env.REACT_APP_MAPTILER_KEY;
    const streetsStyle = MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
      : {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution:
                '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
            },
          ],
        };

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: streetsStyle,
      center: DEFAULT_CENTER,
      zoom: 16,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    let watchId = null;

    const startWatch = () => {
      const geo = navigator.geolocation;
      if (!geo) {
        setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        return;
      }

      watchId = geo.watchPosition(
        (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const lngLat = [longitude, latitude];

        if (!userMarkerRef.current) {
          userMarkerRef.current = new window.maplibregl.Marker({ color: '#2dd4bf' })
            .setLngLat(lngLat)
            .addTo(map);
          map.easeTo({ center: lngLat, zoom: 16, duration: 800 });
        } else {
          userMarkerRef.current.setLngLat(lngLat);
        }

        // Draw/update accuracy circle using a GeoJSON source + layer
        const circleId = 'user-accuracy-circle';
        const sourceId = 'user-accuracy-source';

        const metersToPixelsAtLat = (meters, lat) => meters / (0.075 * Math.cos(lat * Math.PI / 180));
        const pxRadius = Math.max(8, Math.min(200, metersToPixelsAtLat(accuracy, latitude)));

        if (!accuracyCircleRef.current) {
          const el = document.createElement('div');
          el.className = 'accuracy-circle';
          el.style.width = `${pxRadius * 2}px`;
          el.style.height = `${pxRadius * 2}px`;
          accuracyCircleRef.current = new window.maplibregl.Marker({ element: el })
            .setLngLat(lngLat)
            .addTo(map);
        } else {
          const el = accuracyCircleRef.current.getElement();
          el.style.width = `${pxRadius * 2}px`;
          el.style.height = `${pxRadius * 2}px`;
          accuracyCircleRef.current.setLngLat(lngLat);
        }
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

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (mapRef.current) mapRef.current.remove();
    };
  }, [tracking]);

  return (
    <div className="map-page">
      <div ref={mapContainerRef} className="map-container" />
      <div className="top-bar">
        <div className="brand">Stay Go</div>
        <div className="energy-pill">Lv 1</div>
      </div>
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
    </div>
  );
}


