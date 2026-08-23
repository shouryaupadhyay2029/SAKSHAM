import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Incident } from '../../types/incident';
import type { ResourceItem } from '../../types/resource';
import type { Vehicle } from '../../types/vehicle';
import type { Shelter } from '../../types/shelter';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './MapView.module.css';

interface MapViewProps {
  incidents?: Incident[];
  resources?: ResourceItem[];
  vehicles?: Vehicle[];
  shelters?: Shelter[];
  selectedIncident?: Incident | null;
  selectedVehicle?: Vehicle | null;
  hoveredIncidentId?: string | null;
  focusMode?: boolean;
  onSelectIncident?: (incident: Incident) => void;
  onSelectShelter?: (shelter: Shelter) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  layerFilters: {
    incidents: boolean;
    resources: boolean;
    vehicles: boolean;
    shelters: boolean;
    routes: boolean;
  };
}

export const MapView: React.FC<MapViewProps> = ({
  incidents = [],
  resources = [],
  vehicles = [],
  shelters = [],
  selectedIncident,
  selectedVehicle,
  hoveredIncidentId,
  focusMode = false,
  onSelectIncident,
  onSelectShelter,
  onSelectVehicle,
  layerFilters
}) => {
  const navigate = useNavigate();
  const { requests } = useOperationalState();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  // Map from incident ID → marker DOM element, for imperative class management
  const incidentMarkerEls = useRef<Map<string, HTMLElement>>(new Map());
  const [zoomLevel, setZoomLevel] = React.useState<number>(4.8);
  const [mapMode, setMapMode] = React.useState<'STREETS' | 'TACTICAL'>('STREETS');
  const [activeSelection, setActiveSelection] = React.useState<{
    type: 'INCIDENT' | 'VEHICLE' | 'SHELTER' | 'RESOURCE';
    data: any;
  } | null>(null);

  useEffect(() => {
    if (selectedIncident) {
      setActiveSelection({ type: 'INCIDENT', data: selectedIncident });
    }
  }, [selectedIncident]);

  useEffect(() => {
    if (selectedVehicle) {
      setActiveSelection({ type: 'VEHICLE', data: selectedVehicle });
    }
  }, [selectedVehicle]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    const mapStyle = apiKey 
      ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${apiKey}` 
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [78.9, 22.5],
      zoom: 4.8,
      minZoom: 4,
      maxZoom: 18
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    map.on('zoom', () => {
      setZoomLevel(map.getZoom());
    });

    return () => { map.remove(); };
  }, []);

  // Update map style when mapMode toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    const styleUrl = mapMode === 'STREETS'
      ? (apiKey ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${apiKey}` : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json')
      : (apiKey ? `https://api.maptiler.com/maps/darkmatter/style.json?key=${apiKey}` : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');
    map.setStyle(styleUrl);
  }, [mapMode]);

  // Update Markers when data, filters or zoom change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    incidentMarkerEls.current.clear();

    const isClustered = zoomLevel < 7;

    if (isClustered) {
      const METRO_AREAS = [
        { id: 'delhi', name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
        { id: 'mumbai', name: 'Mumbai Region', lat: 19.0760, lng: 72.8777 },
        { id: 'bengaluru', name: 'Bengaluru Region', lat: 12.9716, lng: 77.5946 },
        { id: 'kolkata', name: 'Kolkata Region', lat: 22.5726, lng: 88.3639 },
        { id: 'jaipur', name: 'Jaipur Region', lat: 26.9124, lng: 75.7873 },
        { id: 'pune', name: 'Pune Region', lat: 18.5204, lng: 73.8567 },
        { id: 'mysuru', name: 'Mysuru Region', lat: 12.2958, lng: 76.6394 }
      ];

      const clusters = METRO_AREAS.map(area => {
        let count = 0;
        if (layerFilters.incidents) {
          count += incidents.filter(item => 
            Math.abs(item.coordinates.lat - area.lat) < 1.5 && Math.abs(item.coordinates.lng - area.lng) < 1.5
          ).length;
        }
        if (layerFilters.shelters) {
          count += shelters.filter(item => 
            Math.abs(item.coordinates.lat - area.lat) < 1.5 && Math.abs(item.coordinates.lng - area.lng) < 1.5
          ).length;
        }
        if (layerFilters.vehicles) {
          count += vehicles.filter(item => 
            Math.abs(item.location.lat - area.lat) < 1.5 && Math.abs(item.location.lng - area.lng) < 1.5
          ).length;
        }
        if (layerFilters.resources) {
          count += resources.filter(item => 
            item.coordinates && Math.abs(item.coordinates.lat - area.lat) < 1.5 && Math.abs(item.coordinates.lng - area.lng) < 1.5
          ).length;
        }
        return { ...area, count };
      }).filter(cluster => cluster.count > 0);

      clusters.forEach(cluster => {
        const el = document.createElement('div');
        el.className = styles.marker;
        el.style.width = '42px';
        el.style.height = '42px';
        el.style.borderRadius = '50%';
        el.style.background = 'rgba(232, 111, 22, 0.95)';
        el.style.border = '2.5px solid #ffffff';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = '#ffffff';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '13px';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 0 12px rgba(0,0,0,0.6)';
        el.innerText = String(cluster.count);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          map.flyTo({
            center: [cluster.lng, cluster.lat],
            zoom: 9.5,
            essential: true
          });
        });

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <h4 class="${styles.popupTitle}">${cluster.name}</h4>
              <p class="${styles.popupCapText}">${cluster.count} Active Assets</p>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cluster.lng, cluster.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      return;
    }

    // 1. Draw Incidents
    if (layerFilters.incidents) {
      incidents.forEach(incident => {
        const el = document.createElement('div');
        el.className = styles.markerContainer;

        const visual = document.createElement('div');
        visual.className = `${styles.markerVisual} ${
          incident.severity === 'CRITICAL'
            ? styles.markerCritical
            : incident.severity === 'HIGH'
              ? styles.markerHigh
              : styles.markerMedium
        }`;
        visual.setAttribute('data-incident-id', incident.id);
        el.appendChild(visual);

        const dot = document.createElement('div');
        dot.className = styles.markerDot;
        visual.appendChild(dot);

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles['badge' + incident.severity]}">${incident.severity}</span>
              <h4 class="${styles.popupTitle}">${incident.type.replace(/_/g, ' ')}</h4>
              <p class="${styles.popupLoc}">${incident.location}</p>
              ${incident.displacedCount ? `<p class="${styles.popupCapText}">~${incident.displacedCount} displaced</p>` : ''}
            </div>
          `);

        visual.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectIncident?.(incident);
          setActiveSelection({ type: 'INCIDENT', data: incident });
          if (activePopupRef.current) activePopupRef.current.remove();
          popup.setLngLat([incident.coordinates.lng, incident.coordinates.lat]).addTo(map);
          activePopupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([incident.coordinates.lng, incident.coordinates.lat])
          .addTo(map);

        markersRef.current.push(marker);
        incidentMarkerEls.current.set(incident.id, visual);
      });
    }

    // 2. Draw Shelters
    if (layerFilters.shelters) {
      shelters.forEach(shelter => {
        const el = document.createElement('div');
        el.className = styles.markerContainer;

        const visual = document.createElement('div');
        visual.className = `${styles.markerVisual} ${styles.markerShelter} ${
          shelter.status === 'FULL' ? styles.markerShelterFull : ''
        }`;
        el.appendChild(visual);

        const label = document.createElement('span');
        label.innerText = 'S';
        visual.appendChild(label);

        const pct = Math.round((shelter.capacityOccupied / shelter.capacityTotal) * 100);
        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles.badgeShelter}">SHELTER · ${shelter.status}</span>
              <h4 class="${styles.popupTitle}">${shelter.name}</h4>
              <p class="${styles.popupLoc}">${shelter.locationName}</p>
              <div class="${styles.popupCapacityBar}">
                <div class="${styles.popupCapacityFill}" style="width: ${pct}%"></div>
              </div>
              <p class="${styles.popupCapText}">${shelter.capacityOccupied}/${shelter.capacityTotal} occupied · ${pct}% full</p>
            </div>
          `);

        visual.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectShelter?.(shelter);
          setActiveSelection({ type: 'SHELTER', data: shelter });
          if (activePopupRef.current) activePopupRef.current.remove();
          popup.setLngLat([shelter.coordinates.lng, shelter.coordinates.lat]).addTo(map);
          activePopupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([shelter.coordinates.lng, shelter.coordinates.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 3. Draw Vehicles
    if (layerFilters.vehicles) {
      vehicles.forEach(vehicle => {
        const el = document.createElement('div');
        el.className = styles.markerContainer;

        const visual = document.createElement('div');
        visual.className = `${styles.markerVisual} ${styles.markerVehicle} ${
          styles['markerVehicle' + vehicle.status] || ''
        }`;
        el.appendChild(visual);

        const arrow = document.createElement('div');
        arrow.className = styles.vehicleInner;
        visual.appendChild(arrow);

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles.badgeVehicle}">${vehicle.type} · ${vehicle.status}</span>
              <h4 class="${styles.popupTitle}">${vehicle.name}</h4>
              <p class="${styles.popupCapText}">Capacity: ${vehicle.capacity}</p>
              ${vehicle.cargo ? `<p class="${styles.popupCargo}">Cargo: <strong>${vehicle.cargo}</strong></p>` : ''}
            </div>
          `);

        visual.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectVehicle?.(vehicle);
          setActiveSelection({ type: 'VEHICLE', data: vehicle });
          if (activePopupRef.current) activePopupRef.current.remove();
          popup.setLngLat([vehicle.location.lng, vehicle.location.lat]).addTo(map);
          activePopupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([vehicle.location.lng, vehicle.location.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 4. Draw Resources
    if (layerFilters.resources) {
      resources.forEach(res => {
        if (!res.coordinates) return;
        const el = document.createElement('div');
        el.className = styles.markerContainer;

        const visual = document.createElement('div');
        visual.className = `${styles.markerVisual} ${styles.markerResource} ${
          styles['markerResource' + res.status] || ''
        }`;
        el.appendChild(visual);

        const dot = document.createElement('div');
        dot.className = styles.markerDot;
        visual.appendChild(dot);

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles.badgeResource}">${res.category} · ${res.status}</span>
              <h4 class="${styles.popupTitle}">${res.name}</h4>
              <p class="${styles.popupLoc}">${res.locationName}</p>
              <p class="${styles.popupCapText}">Stock: ${res.quantity} ${res.unit}</p>
            </div>
          `);

        visual.addEventListener('click', (e) => {
          e.stopPropagation();
          setActiveSelection({ type: 'RESOURCE', data: res });
          if (activePopupRef.current) activePopupRef.current.remove();
          popup.setLngLat([res.coordinates.lng, res.coordinates.lat]).addTo(map);
          activePopupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([res.coordinates.lng, res.coordinates.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

  }, [incidents, resources, vehicles, shelters, layerFilters, onSelectIncident, onSelectShelter, onSelectVehicle, zoomLevel]);

  // ── Hover effect: highlight hovered incident marker ─────────────────────────
  useEffect(() => {
    incidentMarkerEls.current.forEach((el, id) => {
      if (id === hoveredIncidentId) {
        el.classList.add(styles.markerHovered);
      } else {
        el.classList.remove(styles.markerHovered);
      }
    });
  }, [hoveredIncidentId]);

  // ── Focus mode: dim unrelated markers ──────────────────────────────────────
  useEffect(() => {
    incidentMarkerEls.current.forEach((el, id) => {
      if (!focusMode) {
        el.classList.remove(styles.markerDimmed);
        el.classList.remove(styles.markerActive);
      } else {
        if (selectedIncident && id === selectedIncident.id) {
          el.classList.remove(styles.markerDimmed);
          el.classList.add(styles.markerActive);
        } else {
          el.classList.add(styles.markerDimmed);
          el.classList.remove(styles.markerActive);
        }
      }
    });
  }, [focusMode, selectedIncident]);

  // ── Fly to selected incident ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedIncident) return;
    map.flyTo({
      center: [selectedIncident.coordinates.lng, selectedIncident.coordinates.lat],
      zoom: 14,
      essential: true,
      duration: 1000,
      easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
    });
  }, [selectedIncident]);

  // ── Fly to selected vehicle ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicle) return;
    map.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: 14,
      essential: true,
      duration: 1000,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }, [selectedVehicle]);

  // ── Draw route overlays ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawRoutes = async () => {
      vehicles.forEach(vehicle => {
        const sourceId = `route-source-${vehicle.id}`;
        const layerId = `route-layer-${vehicle.id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      });

      if (!layerFilters.routes) return;

      for (const vehicle of vehicles) {
        if (!vehicle.destination || (vehicle.status !== 'EN_ROUTE' && vehicle.status !== 'DISPATCHED')) continue;

        const sourceId = `route-source-${vehicle.id}`;
        const layerId = `route-layer-${vehicle.id}`;

        let coordinates: [number, number][] = [
          [vehicle.location.lng, vehicle.location.lat],
          [
            (vehicle.location.lng + vehicle.destination.lng) / 2 + 0.015,
            (vehicle.location.lat + vehicle.destination.lat) / 2 - 0.005,
          ],
          [vehicle.destination.lng, vehicle.destination.lat]
        ];

        try {
          const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';
          const res = await fetch(`${apiBaseUrl}/routing/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: { lat: vehicle.location.lat, lng: vehicle.location.lng },
              destination: { lat: vehicle.destination.lat, lng: vehicle.destination.lng }
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.geometry?.coordinates) {
              coordinates = data.geometry.coordinates;
            }
          }
        } catch (err) {
          console.warn('[ROUTING FALLBACK] Failed to load OSRM geometry, using straight line:', err);
        }

        // Verify map is still loaded and active
        const currentMap = mapRef.current;
        if (!currentMap) return;

        if (!currentMap.getSource(sourceId)) {
          currentMap.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates
              }
            }
          });

          currentMap.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#E86F16',
              'line-width': 2.5,
              'line-dasharray': [4, 3],
              'line-opacity': 0.65
            }
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      drawRoutes();
    } else {
      map.on('style.load', drawRoutes);
    }

    return () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      vehicles.forEach(vehicle => {
        const sourceId = `route-source-${vehicle.id}`;
        const layerId = `route-layer-${vehicle.id}`;
        try {
          if (currentMap.getLayer(layerId)) currentMap.removeLayer(layerId);
          if (currentMap.getSource(sourceId)) currentMap.removeSource(sourceId);
        } catch (_) {}
      });
    };
  }, [vehicles, layerFilters.routes]);

  const renderDetailPanel = () => {
    if (!activeSelection) return null;

    const { type, data } = activeSelection;

    return (
      <div className={styles.detailPanel}>
        <div className={styles.panelHeader}>
          <span className={`${styles.panelBadge} ${styles['badge' + type]}`}>{type}</span>
          <button className={styles.panelClose} onClick={() => setActiveSelection(null)}>×</button>
        </div>
        <div className={styles.panelContent}>
          {type === 'INCIDENT' && (
            <>
              <h4 className={styles.panelTitle}>{data.type.replace(/_/g, ' ')}</h4>
              <p className={styles.panelRow}><strong>ID:</strong> {data.id}</p>
              <p className={styles.panelRow}><strong>Severity:</strong> {data.severity}</p>
              <p className={styles.panelRow}><strong>Location:</strong> {data.location}</p>
              <p className={styles.panelRow}><strong>Status:</strong> {data.status}</p>
              {data.affectedPeople > 0 && <p className={styles.panelRow}><strong>People Affected:</strong> {data.affectedPeople}</p>}
              <button 
                className={styles.panelActionButton}
                onClick={() => {
                  const demand = requests.find(r => r.incidentId === data.id);
                  if (demand) {
                    navigate(`/operations/matching?requestId=${demand.id}`);
                  } else {
                    navigate('/operations/matching');
                  }
                }}
              >
                Find Resources & Match
              </button>
            </>
          )}

          {type === 'VEHICLE' && (
            <>
              <h4 className={styles.panelTitle}>{data.name}</h4>
              <p className={styles.panelRow}><strong>ID:</strong> {data.id}</p>
              <p className={styles.panelRow}><strong>Type:</strong> {data.type}</p>
              <p className={styles.panelRow}><strong>Status:</strong> {data.status}</p>
              <p className={styles.panelRow}><strong>Capacity:</strong> {data.capacity}</p>
              {data.cargo && <p className={styles.panelRow}><strong>Cargo:</strong> {data.cargo}</p>}
              <button 
                className={styles.panelActionButton}
                onClick={() => {
                  navigate(`/dispatch?vehicleId=${data.id}`);
                }}
              >
                Go to Dispatch Console
              </button>
            </>
          )}

          {type === 'SHELTER' && (
            <>
              <h4 className={styles.panelTitle}>{data.name}</h4>
              <p className={styles.panelRow}><strong>ID:</strong> {data.id}</p>
              <p className={styles.panelRow}><strong>Location:</strong> {data.locationName}</p>
              <p className={styles.panelRow}><strong>Status:</strong> {data.status}</p>
              <p className={styles.panelRow}><strong>Capacity:</strong> {data.capacityOccupied} / {data.capacityTotal} occupied</p>
            </>
          )}

          {type === 'RESOURCE' && (
            <>
              <h4 className={styles.panelTitle}>{data.name}</h4>
              <p className={styles.panelRow}><strong>ID:</strong> {data.id}</p>
              <p className={styles.panelRow}><strong>Type:</strong> {data.category}</p>
              <p className={styles.panelRow}><strong>Location:</strong> {data.locationName}</p>
              <p className={styles.panelRow}><strong>Available Qty:</strong> {data.quantity} {data.unit}</p>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapContainerRef} className={styles.mapContainer} />
      <div className={styles.overlayOverlay} />
      <div className={styles.modeSelector}>
        <button 
          className={`${styles.modeButton} ${mapMode === 'STREETS' ? styles.modeButtonActive : ''}`}
          onClick={() => setMapMode('STREETS')}
        >
          Streets
        </button>
        <button 
          className={`${styles.modeButton} ${mapMode === 'TACTICAL' ? styles.modeButtonActive : ''}`}
          onClick={() => setMapMode('TACTICAL')}
        >
          Tactical
        </button>
      </div>
      {renderDetailPanel()}
    </div>
  );
};

export default MapView;
