import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.75rem',
};

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 }; // Hyderabad fallback

const AddressPicker = ({ coordinates, onChange }) => {
  const [center, setCenter] = useState(
    coordinates?.lat ? { lat: coordinates.lat, lng: coordinates.lng } : DEFAULT_CENTER
  );
  const [markerPos, setMarkerPos] = useState(center);
  const [geocoding, setGeocoding] = useState(false);
  const geocoderRef = useRef(null);
  const hasSetBrowserPos = useRef(false);

  // Get user's current position on first mount (only if no coordinates provided)
  useEffect(() => {
    if (coordinates?.lat || hasSetBrowserPos.current) return;
    hasSetBrowserPos.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc);
          setMarkerPos(loc);
        },
        () => {
          // Silently fail — use default center
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [coordinates?.lat]);

  // Update marker when external coordinates change
  useEffect(() => {
    if (coordinates?.lat && coordinates?.lng) {
      const loc = { lat: coordinates.lat, lng: coordinates.lng };
      setCenter(loc);
      setMarkerPos(loc);
    }
  }, [coordinates?.lat, coordinates?.lng]);

  const reverseGeocode = useCallback((lat, lng) => {
    if (!window.google?.maps?.Geocoder) return;

    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }

    setGeocoding(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setGeocoding(false);
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
      }
    });
  }, [onChange]);

  const handleDragEnd = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  return (
    <div style={{ position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          ],
        }}
      >
        <Marker
          position={markerPos}
          draggable={true}
          onDragEnd={handleDragEnd}
        />
      </GoogleMap>
      {geocoding && (
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', color: 'white', padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
          Finding address...
        </div>
      )}
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        📍 Drag the marker or click on the map to pick an address
      </p>
    </div>
  );
};

export default AddressPicker;
