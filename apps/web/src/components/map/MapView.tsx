import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Incident } from '../../types/incident';
import type { ResourceItem } from '../../types/resource';
import type { Vehicle } from '../../types/vehicle';
import type { Shelter } from '../../types/shelter';
import styles from './MapView.module.css';

interface MapViewProps {
  incidents?: Incident[];
  resources?: ResourceItem[];
  vehicles?: Vehicle[];
  shelters?: Shelter[];
  selectedIncident?: Incident | null;
  selectedVehicle?: Vehicle | null;
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
  onSelectIncident,
  onSelectShelter,
  onSelectVehicle,
  layerFilters
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // CartoDB Positron is a beautiful, light, clean styled map, perfect for dashboards.
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [77.22, 28.61], // Center of Delhi (lng, lat)
      zoom: 11,
      minZoom: 9,
      maxZoom: 18
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update Markers when data or filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Draw Incidents
    if (layerFilters.incidents) {
      incidents.forEach(incident => {
        const el = document.createElement('div');
        el.className = `${styles.marker} ${
          incident.severity === 'CRITICAL' 
            ? styles.markerCritical 
            : incident.severity === 'HIGH' 
              ? styles.markerHigh 
              : styles.markerMedium 
        }`;
        
        // Add dot inside
        const dot = document.createElement('div');
        dot.className = styles.markerDot;
        el.appendChild(dot);

        // Click handler
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectIncident?.(incident);
        });

        // Tooltip popup
        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles['badge' + incident.severity]}">${incident.severity}</span>
              <h4 class="${styles.popupTitle}">${incident.type.replace('_', ' ')}</h4>
              <p class="${styles.popupLoc}">${incident.location}</p>
              <p class="${styles.popupDesc}">${incident.description.substring(0, 80)}...</p>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([incident.coordinates.lng, incident.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 2. Draw Shelters
    if (layerFilters.shelters) {
      shelters.forEach(shelter => {
        const el = document.createElement('div');
        el.className = `${styles.marker} ${styles.markerShelter} ${
          shelter.status === 'FULL' ? styles.markerShelterFull : ''
        }`;
        
        const label = document.createElement('span');
        label.innerText = 'S';
        el.appendChild(label);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectShelter?.(shelter);
        });

        const pct = Math.round((shelter.capacityOccupied / shelter.capacityTotal) * 100);
        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles.badgeShelter}">SHELTER: ${shelter.status}</span>
              <h4 class="${styles.popupTitle}">${shelter.name}</h4>
              <p class="${styles.popupLoc}">${shelter.locationName}</p>
              <div class="${styles.popupCapacityBar}">
                <div class="${styles.popupCapacityFill}" style="width: ${pct}%"></div>
              </div>
              <p class="${styles.popupCapText}">Capacity: ${shelter.capacityOccupied}/${shelter.capacityTotal} (${pct}% full)</p>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([shelter.coordinates.lng, shelter.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 3. Draw Vehicles
    if (layerFilters.vehicles) {
      vehicles.forEach(vehicle => {
        const el = document.createElement('div');
        el.className = `${styles.marker} ${styles.markerVehicle} ${
          styles['markerVehicle' + vehicle.status]
        }`;

        const arrow = document.createElement('div');
        arrow.className = styles.vehicleInner;
        el.appendChild(arrow);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectVehicle?.(vehicle);
        });

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles.badgeVehicle}">${vehicle.type} / ${vehicle.status}</span>
              <h4 class="${styles.popupTitle}">${vehicle.name}</h4>
              <p class="${styles.popupDesc}">Capacity: ${vehicle.capacity}</p>
              ${vehicle.cargo ? `<p class="${styles.popupCargo}">Cargo: <strong>${vehicle.cargo}</strong></p>` : ''}
              <p class="${styles.popupCapText}">Contact: ${vehicle.driverName} (${vehicle.driverContact})</p>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([vehicle.location.lng, vehicle.location.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 4. Draw Resources
    if (layerFilters.resources) {
      resources.forEach(res => {
        if (!res.coordinates) return;
        const el = document.createElement('div');
        el.className = `${styles.marker} ${styles.markerResource} ${
          styles['markerResource' + res.status]
        }`;

        const dot = document.createElement('div');
        dot.className = styles.markerDot;
        el.appendChild(dot);

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div class="${styles.mapPopup}">
              <span class="${styles.popupBadge} ${styles.badgeResource}">${res.category} / ${res.status}</span>
              <h4 class="${styles.popupTitle}">${res.name}</h4>
              <p class="${styles.popupLoc}">${res.locationName}</p>
              <p class="${styles.popupCapText}">Stock: ${res.quantity} ${res.unit}</p>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([res.coordinates.lng, res.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

  }, [incidents, resources, vehicles, shelters, layerFilters, onSelectIncident, onSelectShelter, onSelectVehicle]);

  // Fly to selected incident
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedIncident) return;

    map.flyTo({
      center: [selectedIncident.coordinates.lng, selectedIncident.coordinates.lat],
      zoom: 14,
      essential: true,
      duration: 1500
    });
  }, [selectedIncident]);

  // Fly to selected vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicle) return;

    map.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: 14,
      essential: true,
      duration: 1500
    });
  }, [selectedVehicle]);

  // Draw Route overlays when routes layer and vehicles destinations are active
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawRoutes = () => {
      // Remove existing routes layers
      vehicles.forEach(vehicle => {
        const sourceId = `route-source-${vehicle.id}`;
        const layerId = `route-layer-${vehicle.id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      });

      if (!layerFilters.routes) return;

      vehicles.forEach(vehicle => {
        if (!vehicle.destination || vehicle.status !== 'EN_ROUTE' && vehicle.status !== 'DISPATCHED') return;

        const sourceId = `route-source-${vehicle.id}`;
        const layerId = `route-layer-${vehicle.id}`;

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [vehicle.location.lng, vehicle.location.lat],
                // Add a slight curve so it looks like realistic road routing
                [(vehicle.location.lng + vehicle.destination.lng) / 2 + 0.015, (vehicle.location.lat + vehicle.destination.lat) / 2 - 0.005],
                [vehicle.destination.lng, vehicle.destination.lat]
              ]
            }
          }
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#F47C20',
            'line-width': 3,
            'line-dasharray': [3, 2],
            'line-opacity': 0.75
          }
        });
      });
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

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapContainerRef} className={styles.mapContainer} />
      <div className={styles.overlayOverlay} />
    </div>
  );
};

export default MapView;
