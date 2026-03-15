import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Loading from '../common/Loading';

const LIBRARIES = ['places', 'geocoding'];

const MapWrapper = ({ children }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  if (loadError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>Failed to load Google Maps. Please check your API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return <Loading message="Loading map..." />;
  }

  return <>{children}</>;
};

export default MapWrapper;
