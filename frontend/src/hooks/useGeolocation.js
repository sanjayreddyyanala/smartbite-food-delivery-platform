import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook wrapping navigator.geolocation.watchPosition().
 * Returns { lat, lng, error, isWatching }.
 * 
 * @param {boolean} enabled - whether to start watching
 * @param {object} options - optional PositionOptions
 */
const useGeolocation = (enabled = false, options = {}) => {
  const [position, setPosition] = useState({ lat: null, lng: null });
  const [error, setError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Stop watching if disabled
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsWatching(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
        ...options,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
    };
  }, [enabled]);

  return { ...position, error, isWatching };
};

export default useGeolocation;
