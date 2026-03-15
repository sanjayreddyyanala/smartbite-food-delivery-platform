import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '350px',
  borderRadius: '0.75rem',
};

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

const DeliveryMap = ({ restaurantCoords, customerCoords, driverLocation }) => {
  const [directions, setDirections] = useState(null);
  const directionsRequested = useRef(false);

  // Calculate the center of the map
  const center = driverLocation?.lat
    ? { lat: driverLocation.lat, lng: driverLocation.lng }
    : restaurantCoords?.lat
    ? { lat: restaurantCoords.lat, lng: restaurantCoords.lng }
    : { lat: 17.385, lng: 78.4867 };

  // Request directions once on mount (restaurant → customer)
  useEffect(() => {
    if (directionsRequested.current) return;
    if (!restaurantCoords?.lat || !customerCoords?.lat) return;
    if (!window.google?.maps?.DirectionsService) return;

    directionsRequested.current = true;

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
        destination: { lat: customerCoords.lat, lng: customerCoords.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        } else {
          console.warn('Directions request failed:', status);
        }
      }
    );
  }, [restaurantCoords?.lat, customerCoords?.lat]);

  const hasValidCoords = restaurantCoords?.lat || customerCoords?.lat;

  if (!hasValidCoords) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>📍 Tracking not available</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: mapStyles,
      }}
    >
      {/* Route polyline */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#f97316',
              strokeWeight: 4,
              strokeOpacity: 0.8,
            },
          }}
        />
      )}

      {/* Restaurant marker */}
      {restaurantCoords?.lat && (
        <Marker
          position={{ lat: restaurantCoords.lat, lng: restaurantCoords.lng }}
          label={{ text: '🏪', fontSize: '1.5rem' }}
          title="Restaurant"
        />
      )}

      {/* Customer marker */}
      {customerCoords?.lat && (
        <Marker
          position={{ lat: customerCoords.lat, lng: customerCoords.lng }}
          label={{ text: '🏠', fontSize: '1.5rem' }}
          title="Delivery Address"
        />
      )}

      {/* Live delivery partner marker */}
      {driverLocation?.lat && (
        <Marker
          position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#f97316" stroke="white" stroke-width="3"/><text x="16" y="21" text-anchor="middle" font-size="14">🛵</text></svg>'
            ),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          }}
          title="Delivery Partner"
        />
      )}
    </GoogleMap>
  );
};

export default DeliveryMap;
