import { useEffect, useRef } from "react";
import type { LatLngExpression, Map as LeafletMap, Polyline, Marker } from "leaflet";

export type LatLng = { lat: number; lng: number };

/**
 * Leaflet-based live map. Renders OpenStreetMap tiles and updates a polyline
 * plus a "current position" marker whenever `path` / `current` change.
 * Leaflet is dynamically imported to avoid SSR issues (uses `window`).
 */
export function LiveMap({
  path,
  current,
  className,
}: {
  path: LatLng[];
  current: LatLng | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const lineRef = useRef<Polyline | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initedRef.current || !containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      const initial: LatLngExpression = current
        ? [current.lat, current.lng]
        : [20.5937, 78.9629]; // India center fallback
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(initial, current ? 17 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      const line = L.polyline([], { color: "#2c73ff", weight: 5, opacity: 0.9 }).addTo(map);
      const dotIcon = L.divIcon({
        className: "chalio-live-dot",
        html: `<span class="block h-4 w-4 rounded-full bg-brand-blue ring-4 ring-brand-blue/30 shadow"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker(initial, { icon: dotIcon }).addTo(map);
      mapRef.current = map;
      lineRef.current = line;
      markerRef.current = marker;
      initedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update path + current
  useEffect(() => {
    const line = lineRef.current;
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!line || !marker || !map) return;
    if (path.length > 0) {
      line.setLatLngs(path.map((p) => [p.lat, p.lng]) as LatLngExpression[]);
    }
    if (current) {
      marker.setLatLng([current.lat, current.lng]);
      map.setView([current.lat, current.lng], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [path, current]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      initedRef.current = false;
    };
  }, []);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}
