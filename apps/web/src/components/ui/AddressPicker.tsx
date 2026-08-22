import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './AddressPicker.module.css';

interface AddressPickerProps {
  initialAddress?: string;
  initialCoords?: { lat: number; lng: number };
  onChange: (data: { address: string; lat: number; lng: number }, confirmed: boolean) => void;
}

export const AddressPicker: React.FC<AddressPickerProps> = ({
  initialAddress = '',
  initialCoords = { lat: 28.6139, lng: 77.2090 }, // Default Delhi
  onChange
}) => {
  const [query, setQuery] = useState(initialAddress);
  const [coords, setCoords] = useState(initialCoords);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle address autocomplete query
  useEffect(() => {
    if (!query.trim() || query.length < 3 || isPickingOnMap || !apiKey) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${apiKey}&bbox=68.1,8.0,97.4,35.5&proximity=${coords.lng},${coords.lat}&types=poi,address,neighbourhood,locality,place,road,postal_code`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Geocoding query failed');
        const data = await res.json();
        if (data && data.features) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error fetching geocoding suggestions:', err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, isPickingOnMap, apiKey]);

  // Initial map setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapStyle = apiKey
      ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${apiKey}`
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [coords.lng, coords.lat],
      zoom: 13,
      minZoom: 4,
      maxZoom: 18
    });

    const marker = new maplibregl.Marker({ color: '#E86F16' })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    // Handle map click for manual coordinates picking
    map.on('click', async (e) => {
      if (!isPickingOnMap) return;

      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      setCoords({ lat, lng });
      setIsConfirmed(false); // require re-confirmation on coordinate change

      // Reverse geocode to get formatted address
      if (apiKey) {
        try {
          const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}&types=poi,address,neighbourhood,locality,place`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Reverse geocoding query failed');
          const data = await res.json();
          if (data && data.features && data.features.length > 0) {
            const placeName = data.features[0].place_name;
            setQuery(placeName);
            onChange({ address: placeName, lat, lng }, false);
          } else {
            const rawAddress = `Point Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
            setQuery(rawAddress);
            onChange({ address: rawAddress, lat, lng }, false);
          }
        } catch (err) {
          console.error('Error in reverse geocoding:', err);
          const rawAddress = `Point Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
          setQuery(rawAddress);
          onChange({ address: rawAddress, lat, lng }, false);
        }
      } else {
        const rawAddress = `Point Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        setQuery(rawAddress);
        onChange({ address: rawAddress, lat, lng }, false);
      }
    });

    return () => {
      map.remove();
    };
  }, [isPickingOnMap, apiKey]);

  // Update map camera when coordinates change externally
  const handleSelectSuggestion = (feature: any) => {
    const [lng, lat] = feature.center;
    const address = feature.place_name;

    setQuery(address);
    setCoords({ lat, lng });
    setShowSuggestions(false);
    setIsConfirmed(false); // require confirmation when suggestion changes

    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
      markerRef.current.setLngLat([lng, lat]);
    }

    onChange({ address, lat, lng }, false);
  };

  const handleConfirmToggle = (checked: boolean) => {
    setIsConfirmed(checked);
    onChange({ address: query, lat: coords.lat, lng: coords.lng }, checked);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.searchContainer}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={isPickingOnMap ? "Click on map to select..." : "Search for address, POI, hospital..."}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsConfirmed(false); // require re-confirmation on change
              onChange({ address: e.target.value, lat: coords.lat, lng: coords.lng }, false);
            }}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
          />
          <button
            type="button"
            className={`${styles.mapPickBtn} ${isPickingOnMap ? styles.mapPickBtnActive : ''}`}
            onClick={() => {
              setIsPickingOnMap(!isPickingOnMap);
              setIsConfirmed(false);
              onChange({ address: query, lat: coords.lat, lng: coords.lng }, false);
            }}
          >
            {isPickingOnMap ? "Use Search" : "Pick on Map"}
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestionsList}>
            {suggestions.map((item, idx) => {
              const titleText = item.text || item.place_name;
              const subtitleText = item.place_name.startsWith(titleText)
                ? item.place_name.replace(titleText, '').replace(/^,\s*/, '')
                : item.place_name;

              return (
                <div
                  key={idx}
                  className={styles.suggestionItem}
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <span className={styles.suggestionTitle}>{titleText}</span>
                  {subtitleText && <span className={styles.suggestionSubtitle}>{subtitleText}</span>}
                </div>
              );
            })}
          </div>
        )}

        {showSuggestions && query.trim().length >= 3 && suggestions.length === 0 && (
          <div className={styles.suggestionsList}>
            <div style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(11, 33, 25, 0.6)' }}>
              We couldn't find an exact matching place. Please select a suggested location or use Pick on Map.
            </div>
          </div>
        )}
      </div>

      {query && (
        <div className={styles.locationPreviewBox}>
          <div className={styles.previewTitle}>SELECTED LOCATION</div>
          <div className={styles.previewAddress}>{query}</div>
          <div className={styles.previewCoords}>
            Coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </div>
        </div>
      )}

      <div className={styles.mapArea}>
        {isPickingOnMap && (
          <div className={styles.mapInstruction}>
            🖱️ CLICK ANYWHERE ON MAP TO CHOOSE LOCATION
          </div>
        )}
        <div ref={mapContainerRef} className={styles.miniMap} />
      </div>

      <div className={styles.confirmSection}>
        <input
          type="checkbox"
          id="confirmLocation"
          className={styles.confirmCheckbox}
          checked={isConfirmed}
          onChange={(e) => handleConfirmToggle(e.target.checked)}
        />
        <label htmlFor="confirmLocation" style={{ cursor: 'pointer', fontWeight: 600 }}>
          I confirm that this is the verified location of the incident.
        </label>
      </div>
    </div>
  );
};

export default AddressPicker;
