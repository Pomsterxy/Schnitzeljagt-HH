import { lazy, Suspense, type ComponentProps } from 'react';
import type { LatLng } from '../data/types';

/** Karte erst laden, wenn sie gebraucht wird (Leaflet ist groß) – schnellerer App-Start */
const Impl = lazy(() => import('./MapViewImpl').then((m) => ({ default: m.MapView })));

export interface MapMarker {
  id: string;
  coords: LatLng;
  emoji: string;
  label?: string;
  done?: boolean;
  active?: boolean;
}

export function MapView(props: ComponentProps<typeof Impl>) {
  return (
    <Suspense fallback={<div className="map-wrap map-loading" style={{ height: props.height ?? 300 }} aria-hidden="true" />}>
      <Impl {...props} />
    </Suspense>
  );
}
