export const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2 || typeof coord1.lat !== 'number' || typeof coord1.lng !== 'number' || typeof coord2.lat !== 'number' || typeof coord2.lng !== 'number') {
    return null;
  }

  const R = 6371; // Earth's radius in km
  
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return (Math.round(distance * 10) / 10).toFixed(1); // Returns string like "4.2"
};

export const fetchDrivingDistance = async (coord1, coord2) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const fallback = calculateDistance(coord1, coord2);
  
  if (!apiKey || !coord1 || !coord2 || typeof coord1.lat !== 'number' || typeof coord1.lng !== 'number' || typeof coord2.lat !== 'number' || typeof coord2.lng !== 'number') {
    return fallback ? fallback + ' km' : null;
  }

  try {
    const origin = `${coord1.lat},${coord1.lng}`;
    const destination = `${coord2.lat},${coord2.lng}`;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      return data.rows[0].elements[0].distance.text; // Returns e.g., "4.2 km"
    }
    return fallback ? fallback + ' km' : null;
  } catch (err) {
    console.warn('Maps API failed, falling back to Haversine', err);
    return fallback ? fallback + ' km' : null;
  }
};
