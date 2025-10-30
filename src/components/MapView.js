import { useEffect, useRef, useState } from 'react';

// MapLibre GL is loaded via CDN in public/index.html

const DEFAULT_CENTER = [126.9780, 37.5665]; // Seoul City Hall (lng, lat)

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.maplibregl) {
      setError('지도를 불러오지 못했습니다. 네트워크를 확인하세요.');
      return;
    }

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: DEFAULT_CENTER,
      zoom: 14,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    const geo = navigator.geolocation;
    if (!geo) {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    const watchId = geo.watchPosition(
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
        setError(err.message || '위치 정보를 가져오지 못했습니다.');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <div className="map-page">
      <div ref={mapContainerRef} className="map-container" />
      <div className="top-bar">
        <div className="brand">Stay Go</div>
        <div className="energy-pill">Lv 1</div>
      </div>
      <div className="bottom-card">
        <button className="big-action">탐색 시작</button>
        {error && <div className="toast error">{error}</div>}
      </div>
      <div className="toast" style={{position:'absolute',left:12,bottom:12,color:'#9fb8ff',fontSize:12}}>
        본 프로젝트는 특정 게임의 자산을 사용하지 않으며, 유사한 테마만 적용합니다.
      </div>
    </div>
  );
}


