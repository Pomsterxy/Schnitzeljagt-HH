import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../data/types';

import type { MapMarker } from './MapView';

const iconCache = new Map<string, L.DivIcon>();
function emojiIcon(emoji: string, active?: boolean, done?: boolean) {
  const key = `${emoji}|${active}|${done}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: 'emoji-marker',
      html: `<span class="emoji-pin${active ? ' active' : ''}${done ? ' done' : ''}">${emoji}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join(';');
  useEffect(() => {
    if (points.length === 0) return;
    try {
      if (points.length === 1) map.setView(points[0], 16, { animate: false });
      else map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 17, animate: false });
    } catch {
      /* Karte wird gerade abgebaut */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

function ClickHandler({ onClick }: { onClick?: (c: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick?.([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export function MapView({
  markers,
  me,
  accuracy,
  target,
  radius,
  path,
  fit,
  onMapClick,
  onMarkerClick,
  height = 300,
}: {
  markers: MapMarker[];
  me?: LatLng | null;
  accuracy?: number;
  target?: LatLng;
  radius?: number;
  path?: LatLng[];
  fit: LatLng[];
  onMapClick?: (c: LatLng) => void;
  onMarkerClick?: (id: string) => void;
  height?: number | string;
}) {
  const center = fit[0] ?? [53.595, 10.02];
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} zoomAnimation={false} fadeAnimation={false} markerZoomAnimation={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBounds points={fit} />
        <ClickHandler onClick={onMapClick} />
        {path && path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#c2410c', weight: 4, dashArray: '2 9', lineCap: 'round' }} />}
        {target && radius && <Circle center={target} radius={radius} pathOptions={{ color: '#c2410c', weight: 2, fillOpacity: 0.1 }} />}
        {markers.map((m) => (
          <Marker key={m.id} position={m.coords} icon={emojiIcon(m.emoji, m.active, m.done)} eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m.id) } : undefined}>
            {m.label && <Tooltip>{m.label}</Tooltip>}
          </Marker>
        ))}
        {me && (
          <>
            {accuracy && accuracy > 8 && (
              <Circle center={me} radius={accuracy} pathOptions={{ color: '#0a84ff', weight: 1, fillOpacity: 0.08 }} />
            )}
            <CircleMarker center={me} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#0a84ff', fillOpacity: 1 }} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
