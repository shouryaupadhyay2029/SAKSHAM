import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Play, Pause, RotateCcw, AlertOctagon, Truck } from 'lucide-react';
import type { Depot, DemandPoint, OptimizedRoute, DroppedDemand } from '../../services/optimizerService';
import styles from './RouteMapView.module.css';

export interface HazardZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'FLOOD' | 'COLLAPSE' | 'DEBRIS' | 'FIRE';
  description: string;
}

interface RouteMapViewProps {
  depots: Depot[];
  demandPoints: DemandPoint[];
  routes: OptimizedRoute[];
  droppedDemands?: DroppedDemand[];
  hazards?: HazardZone[];
  selectedVehicleId?: string | null;
  onSelectRoute?: (route: OptimizedRoute) => void;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
}

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  depots,
  demandPoints,
  routes,
  droppedDemands = [],
  hazards = [],
  selectedVehicleId,
  onSelectRoute,
  center = [78.96, 21.8],
  zoom = 4.2,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const convoyMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Convoy Simulation Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const animFrameRef = useRef<number | null>(null);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: center,
      zoom: zoom,
      minZoom: 1,
      maxZoom: 19,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update Route Polylines, Depots, Stops, and Hazards
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const drawRoutesAndMarkers = () => {
      // 1. Clean existing route layers and sources
      const existingLayers = map.getStyle()?.layers || [];
      existingLayers.forEach((layer) => {
        if (layer.id.startsWith('route-layer-') || layer.id.startsWith('route-glow-')) {
          map.removeLayer(layer.id);
        }
      });

      const existingSources = Object.keys(map.getStyle()?.sources || {});
      existingSources.forEach((sourceId) => {
        if (sourceId.startsWith('route-source-')) {
          map.removeSource(sourceId);
        }
      });

      // 2. Draw Route Polylines
      routes.forEach((route) => {
        const isSelected = !selectedVehicleId || selectedVehicleId === route.vehicleId;
        const opacity = isSelected ? 0.95 : 0.25;
        const lineWidth = isSelected ? 4 : 2;

        let geojson: any = route.routeGeometry;

        // Fallback: construct straight-line geometry if not returned by OSRM
        if (!geojson || !geojson.features?.length) {
          const coords: [number, number][] = [[route.depotLng, route.depotLat]];
          route.stops.forEach((s) => coords.push([s.lng, s.lat]));
          coords.push([route.depotLng, route.depotLat]);

          geojson = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coords,
                },
              },
            ],
          };
        }

        const sourceId = `route-source-${route.vehicleId}`;
        const glowLayerId = `route-glow-${route.vehicleId}`;
        const lineLayerId = `route-layer-${route.vehicleId}`;

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          // Glow outline casing
          map.addLayer({
            id: glowLayerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': route.color || '#E86F16',
              'line-width': lineWidth + 4,
              'line-opacity': opacity * 0.35,
              'line-blur': 2,
            },
          });

          // Main line
          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': route.color || '#E86F16',
              'line-width': lineWidth,
              'line-opacity': opacity,
            },
          });

          // Click handler for route line
          map.on('click', lineLayerId, () => {
            onSelectRoute?.(route);
          });
          map.on('mouseenter', lineLayerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', lineLayerId, () => {
            map.getCanvas().style.cursor = '';
          });
        }
      });

      // 3. Draw Depot Markers
      depots.forEach((depot, idx) => {
        const el = document.createElement('div');
        el.className = styles.markerDepot;
        el.innerHTML = `<span>D${idx + 1}</span>`;

        const totalFleet = depot.vehicles.length;
        const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
          <div class="${styles.popupHeader}">
            <span class="${styles.popupBadge}" style="background: rgba(232, 111, 22, 0.2); color: #E86F16;">DEPOT / WAREHOUSE</span>
          </div>
          <h4 class="${styles.popupTitle}">${depot.name || `Depot ${idx + 1}`}</h4>
          <p class="${styles.popupDetail}">Fleet: <strong>${totalFleet} Vehicles</strong></p>
          <div class="${styles.popupStatGrid}">
            <div class="${styles.popupStat}">Lat: <strong>${depot.lat.toFixed(4)}</strong></div>
            <div class="${styles.popupStat}">Lng: <strong>${depot.lng.toFixed(4)}</strong></div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([depot.lng, depot.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 4. Draw Route Stops (Numbered by visit sequence)
      routes.forEach((route) => {
        const isSelected = !selectedVehicleId || selectedVehicleId === route.vehicleId;
        if (!isSelected && selectedVehicleId) return;

        route.stops.forEach((stop) => {
          const el = document.createElement('div');
          el.className = styles.markerStop;
          el.style.setProperty('--route-color', route.color || '#E86F16');
          el.style.setProperty('--route-glow', `${route.color}66`);
          el.innerHTML = `<span>${stop.arrivalOrder}</span>`;

          const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
            <div class="${styles.popupHeader}">
              <span class="${styles.popupBadge}" style="background: ${route.color}33; color: ${route.color};">
                STOP #${stop.arrivalOrder} · ${route.vehicleName || route.vehicleId}
              </span>
            </div>
            <h4 class="${styles.popupTitle}">${stop.demandPointName || stop.demandPointId}</h4>
            <p class="${styles.popupDetail}">Delivered Load: <strong>${stop.demand} units</strong></p>
            <div class="${styles.popupStatGrid}">
              <div class="${styles.popupStat}">Cumul. Dist: <strong>${stop.cumulativeDistanceKm} km</strong></div>
              <div class="${styles.popupStat}">ETA Time: <strong>~${stop.cumulativeDurationMin} mins</strong></div>
            </div>
          `);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });
      });

      // 5. Draw Hazard / Obstacle Zones
      hazards.forEach((hazard) => {
        const el = document.createElement('div');
        el.className = styles.markerHazard;
        el.innerHTML = `<span>⚠️</span>`;

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
          <div class="${styles.popupHeader}">
            <span class="${styles.popupBadge}" style="background: rgba(239, 68, 68, 0.3); color: #EF4444;">HAZARD / ROAD CLOSURE</span>
          </div>
          <h4 class="${styles.popupTitle}">${hazard.name}</h4>
          <p class="${styles.popupDetail}" style="color: #FCA5A5;">${hazard.description}</p>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([hazard.lng, hazard.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 6. Draw Unallocated / Dropped Demand Points
      droppedDemands.forEach((dd) => {
        const dp = demandPoints.find((p) => p.id === dd.demandPointId);
        if (!dp) return;

        const el = document.createElement('div');
        el.className = styles.markerDropped;
        el.innerHTML = `<span>!</span>`;

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
          <div class="${styles.popupHeader}">
            <span class="${styles.popupBadge}" style="background: rgba(239, 68, 68, 0.2); color: #EF4444;">UNSERVED DEMAND</span>
          </div>
          <h4 class="${styles.popupTitle}">${dp.name || dp.id}</h4>
          <p class="${styles.popupDetail}" style="color: #FCA5A5;">${dd.reason}</p>
          <div class="${styles.popupStatGrid}">
            <div class="${styles.popupStat}">Demand: <strong>${dp.demand} units</strong></div>
            <div class="${styles.popupStat}">Priority: <strong>${dp.priority || 'MEDIUM'}</strong></div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([dp.lng, dp.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 7. Auto-fit bounding box
      const allCoords: [number, number][] = [];
      depots.forEach((d) => allCoords.push([d.lng, d.lat]));
      demandPoints.forEach((dp) => allCoords.push([dp.lng, dp.lat]));

      if (allCoords.length > 1) {
        const bounds = allCoords.reduce(
          (b, coord) => b.extend(coord),
          new maplibregl.LngLatBounds(allCoords[0], allCoords[0])
        );
        map.fitBounds(bounds, { padding: 80, maxZoom: 11.5, duration: 1000 });
      }
    };

    if (map.isStyleLoaded()) {
      drawRoutesAndMarkers();
    } else {
      map.on('style.load', drawRoutesAndMarkers);
    }
  }, [depots, demandPoints, routes, droppedDemands, hazards, selectedVehicleId]);

  // ── Convoy Playback Animation Engine ─────────────────────────────────────
  const activeRoute = routes.find((r) => r.vehicleId === selectedVehicleId) || routes[0];

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const step = () => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 0.25 * simSpeed;
      });
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, simSpeed]);

  // Update Convoy GPS Marker Position along Route Geometry
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeRoute) return;

    let coords: [number, number][] = [];
    const geo = activeRoute.routeGeometry as any;
    if (geo?.features?.[0]?.geometry?.coordinates) {
      coords = geo.features[0].geometry.coordinates;
    } else {
      coords = [[activeRoute.depotLng, activeRoute.depotLat]];
      activeRoute.stops.forEach((s) => coords.push([s.lng, s.lat]));
      coords.push([activeRoute.depotLng, activeRoute.depotLat]);
    }

    if (coords.length < 2) return;

    const targetIdx = Math.min(
      Math.floor((simProgress / 100) * (coords.length - 1)),
      coords.length - 1
    );
    const [lng, lat] = coords[targetIdx];

    if (!convoyMarkerRef.current) {
      const el = document.createElement('div');
      el.className = styles.markerConvoy;
      el.style.setProperty('--route-color', activeRoute.color || '#E86F16');
      el.innerHTML = `<span>🚚</span>`;

      convoyMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      convoyMarkerRef.current.setLngLat([lng, lat]);
    }
  }, [simProgress, activeRoute]);

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapContainerRef} className={styles.mapContainer} />

      {/* Top Map Status Badge */}
      <div className={styles.mapOverlayControls}>
        <div className={styles.controlBadge}>
          <span className={styles.pulseDot} />
          <span>OpenStreetMap Road Network Layer</span>
        </div>
      </div>

      {/* Live Playback Convoy Simulation Ribbon */}
      {routes.length > 0 && (
        <div className={styles.simulationBar}>
          <button
            className={styles.simPlayBtn}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Simulation' : 'Play Convoy GPS Simulation'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            className={styles.simPlayBtn}
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            onClick={() => {
              setSimProgress(0);
              setIsPlaying(false);
            }}
            title="Reset Simulation"
          >
            <RotateCcw size={13} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={simProgress}
            onChange={(e) => setSimProgress(parseFloat(e.target.value))}
            className={styles.simScrubber}
          />
          <span
            className={styles.simSpeedTag}
            onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1)}
          >
            {simSpeed}x SPEED
          </span>
        </div>
      )}

      {/* Active Route Legend Overlay */}
      {routes.length > 0 && (
        <div className={styles.legendBox}>
          <div className={styles.legendTitle}>Active Vehicle Routes ({routes.length})</div>
          {routes.map((route) => {
            const isSelected = selectedVehicleId === route.vehicleId;
            return (
              <div
                key={route.vehicleId}
                className={`${styles.legendItem} ${isSelected ? styles.legendItemActive : ''}`}
                onClick={() => onSelectRoute?.(route)}
              >
                <span className={styles.legendColorBar} style={{ background: route.color }} />
                <span className={styles.legendItemText}>
                  {route.vehicleName || route.vehicleId} ({route.stops.length} stops)
                </span>
                <span className={styles.legendItemMetric}>{route.totalDistanceKm} km</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RouteMapView;
