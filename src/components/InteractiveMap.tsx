import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapPoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface PlaceDetails {
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingsTotal?: number;
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
  }>;
}

interface InteractiveMapProps {
  points: MapPoint[];
  onPointSelect?: (id: string) => void;
  initialCenter?: { lat: number; lng: number };
  height?: string;
}

const InteractiveMap = React.forwardRef<any, InteractiveMapProps>((
  { points, onPointSelect, initialCenter, height = '400px' },
  ref
) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [placeDetails, setPlaceDetails] = useState<Record<string, PlaceDetails>>({});

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '',
        version: 'weekly',
        libraries: ['places']
      });

      try {
        await loader.load();
        if (!mapRef.current) return;

        const center = initialCenter || { lat: 48.8566, lng: 2.3522 }; // Default to Paris
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(mapInstance);
        setInfoWindow(new google.maps.InfoWindow());

        if (ref) {
          // @ts-ignore
          ref.current = mapInstance;
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, []);

  const fetchPlaceDetails = async (placeId: string) => {
    if (!placeId || placeDetails[placeId]) return;

    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '',
          'X-Goog-FieldMask': 'name,formattedAddress,rating,userRatingsTotal,photos'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch place details');

      const data = await response.json();
      setPlaceDetails(prev => ({
        ...prev,
        [placeId]: data
      }));
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  const getPhotoUrl = (photoName: string) => {
    return `https://places.googleapis.com/v1/${photoName}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&maxHeightPx=200`;
  };

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Create new markers
    const newMarkers = points.map(point => {
      const marker = new google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        title: point.title,
        animation: google.maps.Animation.DROP
      });

      marker.addListener('click', () => highlightMarker(marker, point));
      return marker;
    });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => bounds.extend(marker.getPosition()!));
      map.fitBounds(bounds);

      // Don't zoom in too far on single points
      const zoom = map.getZoom();
      if (zoom && zoom > 16) map.setZoom(16);
    }
  }, [map, points]);

  const highlightMarker = async (marker: google.maps.Marker, point: MapPoint) => {
    if (!infoWindow || !map) return;

    // Fetch place details if we have a placeId and haven't fetched it yet
    if (point.placeId && !placeDetails[point.placeId]) {
      await fetchPlaceDetails(point.placeId);
    }

    const place = point.placeId ? placeDetails[point.placeId] : null;

    let content = `<div class="p-4 max-w-sm">
      <h3 class="text-lg font-semibold mb-2">${point.title}</h3>`;

    if (place) {
      if (place.photos && place.photos.length > 0) {
        const photoUrl = getPhotoUrl(place.photos[0].name);
        content += `<img src="${photoUrl}" class="w-full h-32 object-cover rounded mb-2" alt="${point.title}">`;
      }

      content += `
        <p class="text-gray-600 mb-2">${place.formattedAddress}</p>
        ${place.rating ? `
          <div class="flex items-center mb-2">
            <span class="text-yellow-500">★</span>
            <span class="ml-1">${place.rating}</span>
            <span class="text-gray-500 text-sm ml-2">(${place.userRatingsTotal} reviews)</span>
          </div>
        ` : ''}
      `;
    }

    content += '</div>';

    infoWindow.setContent(content);
    infoWindow.open(map, marker);

    if (onPointSelect) {
      onPointSelect(point.id);
    }
  };

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height, 
        width: '100%',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
    />
  );
});

InteractiveMap.displayName = 'InteractiveMap';

export default InteractiveMap;