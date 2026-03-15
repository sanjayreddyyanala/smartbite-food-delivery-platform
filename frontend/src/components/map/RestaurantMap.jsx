import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '0.75rem',
};

const RestaurantMap = ({ coordinates, name, address }) => {
  const [showInfo, setShowInfo] = useState(false);

  const center = {
    lat: coordinates?.lat || 17.385,
    lng: coordinates?.lng || 78.4867,
  };

  const onMarkerClick = useCallback(() => setShowInfo(true), []);
  const onInfoClose = useCallback(() => setShowInfo(false), []);

  if (!coordinates?.lat || !coordinates?.lng) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>📍 Location not available</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      }}
    >
      <Marker position={center} onClick={onMarkerClick} />
      {showInfo && (
        <InfoWindow position={center} onCloseClick={onInfoClose}>
          <div style={{ color: '#333', padding: '0.25rem' }}>
            <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 700 }}>{name}</h4>
            {address && <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>{address}</p>}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default RestaurantMap;
