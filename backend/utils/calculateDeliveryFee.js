import { DELIVERY_BASE_FEE, DELIVERY_PER_KM_RATE } from '../constants/index.js';

/**
 * Calculate delivery fee based on distance between restaurant and delivery address.
 * Uses Google Distance Matrix API if GOOGLE_MAPS_API_KEY is set, otherwise falls back to
 * Haversine formula for straight-line distance estimation.
 *
 * @param {{ lat: number, lng: number }} restaurantCoords
 * @param {{ lat: number, lng: number }} deliveryCoords
 * @returns {Promise<number>} Delivery fee in ₹
 */
const calculateDeliveryFee = async (restaurantCoords, deliveryCoords) => {
  let distanceKm;

  if (process.env.GOOGLE_MAPS_API_KEY) {
    // Use Google Distance Matrix API
    try {
      const origin = `${restaurantCoords.lat},${restaurantCoords.lng}`;
      const destination = `${deliveryCoords.lat},${deliveryCoords.lng}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&key=${process.env.GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (
        data.status === 'OK' &&
        data.rows[0]?.elements[0]?.status === 'OK'
      ) {
        distanceKm = data.rows[0].elements[0].distance.value / 1000; // meters → km
      } else {
        console.warn('Distance Matrix API returned non-OK status, using fallback');
        distanceKm = haversineDistance(restaurantCoords, deliveryCoords);
      }
    } catch (error) {
      console.warn('Distance Matrix API error, using fallback:', error.message);
      distanceKm = haversineDistance(restaurantCoords, deliveryCoords);
    }
  } else {
    // Fallback: Haversine formula for straight-line distance
    distanceKm = haversineDistance(restaurantCoords, deliveryCoords);
  }

  const fee = DELIVERY_BASE_FEE + distanceKm * DELIVERY_PER_KM_RATE;
  return Math.round(fee * 100) / 100; // round to 2 decimals
};

/**
 * Haversine formula — straight-line distance between two lat/lng points.
 */
const haversineDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => (deg * Math.PI) / 180;

export default calculateDeliveryFee;
