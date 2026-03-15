import React, { useState, useCallback } from 'react';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import toast from 'react-hot-toast';
import MapWrapper from './MapWrapper';
import AddressPicker from './AddressPicker';

/**
 * Reusable LocationPicker with two options:
 *   1. "Current Location" — browser GPS + reverse geocode
 *   2. "Choose from Map" — shows AddressPicker with draggable marker
 *
 * Props:
 *   coordinates: { lat, lng } | null — existing coordinates for edit mode
 *   onChange: ({ street, city, state, pincode, coordinates }) => void
 *   compact: boolean — if true uses smaller buttons (for modals)
 */
const LocationPicker = ({ coordinates, onChange, compact = false }) => {
  const [mode, setMode] = useState(null); // null | 'current' | 'map'
  const [detecting, setDetecting] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(coordinates || null);

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setDetecting(true);
    setMode('current');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedCoords({ lat, lng });

        // Reverse geocode to fill address fields
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setDetecting(false);
            if (status === 'OK' && results[0]) {
              const components = results[0].address_components;
              const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
              const parsed = {
                street: results[0].formatted_address?.split(',').slice(0, 2).join(',').trim() || '',
                city: get('locality') || get('administrative_area_level_2') || '',
                state: get('administrative_area_level_1') || '',
                pincode: get('postal_code') || '',
                coordinates: { lat, lng },
              };
              if (onChange) onChange(parsed);
              toast.success('Location detected!');
            } else {
              // Still return coordinates even if geocode fails
              if (onChange) onChange({ street: '', city: '', state: '', pincode: '', coordinates: { lat, lng } });
              toast.success('Coordinates captured! Fill address manually.');
            }
          });
        } else {
          setDetecting(false);
          // No Google Maps loaded yet — just set coordinates
          if (onChange) onChange({ street: '', city: '', state: '', pincode: '', coordinates: { lat, lng } });
          toast.success('Coordinates captured! Fill address manually.');
        }
      },
      (err) => {
        setDetecting(false);
        const messages = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Try again.',
          3: 'Location request timed out. Try again.',
        };
        toast.error(messages[err.code] || 'Failed to detect location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [onChange]);

  const handleChooseFromMap = useCallback(() => {
    setMode('map');
  }, []);

  const handleMapChange = useCallback((parsed) => {
    setDetectedCoords(parsed.coordinates);
    if (onChange) onChange(parsed);
  }, [onChange]);

  const btnSize = compact ? '0.75rem' : '0.85rem';
  const btnPad = compact ? '0.5rem 0.75rem' : '0.625rem 1rem';

  return (
    <div>
      {/* Label */}
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
        📍 Set Location
      </label>

      {/* Two option buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: mode === 'map' ? '0.75rem' : '0' }}>
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={detecting}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            padding: btnPad, fontSize: btnSize, fontWeight: 600,
            borderRadius: '0.625rem', cursor: detecting ? 'wait' : 'pointer',
            border: `1px solid ${mode === 'current' && detectedCoords ? 'rgba(34,197,94,0.4)' : 'var(--color-border)'}`,
            background: mode === 'current' && detectedCoords ? 'rgba(34,197,94,0.08)' : 'var(--color-bg-input)',
            color: mode === 'current' && detectedCoords ? 'var(--color-success)' : 'var(--color-text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          {detecting ? (
            <>
              <span style={{
                display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
                border: '2px solid var(--color-primary)', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
              Detecting...
            </>
          ) : mode === 'current' && detectedCoords ? (
            <>✓ Location Detected</>
          ) : (
            <>
              <HiOutlineLocationMarker size={16} />
              Current Location
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleChooseFromMap}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            padding: btnPad, fontSize: btnSize, fontWeight: 600,
            borderRadius: '0.625rem', cursor: 'pointer',
            border: `1px solid ${mode === 'map' ? 'rgba(249,115,22,0.4)' : 'var(--color-border)'}`,
            background: mode === 'map' ? 'rgba(249,115,22,0.08)' : 'var(--color-bg-input)',
            color: mode === 'map' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          🗺️ Choose from Map
        </button>
      </div>

      {/* Map — only shown when "Choose from Map" is selected */}
      {mode === 'map' && (
        <div style={{ marginTop: '0.5rem' }}>
          <MapWrapper>
            <AddressPicker
              coordinates={detectedCoords}
              onChange={handleMapChange}
            />
          </MapWrapper>
        </div>
      )}

      {/* Coordinates display */}
      {detectedCoords?.lat && (
        <div style={{
          marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--color-success)',
          textAlign: 'center', fontWeight: 500,
        }}>
          ✓ Coordinates: {Number(detectedCoords.lat).toFixed(6)}, {Number(detectedCoords.lng).toFixed(6)}
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LocationPicker;
