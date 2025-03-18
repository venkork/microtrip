'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Place {
  id: string;
  displayName: {
    text: string;
  };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
    authorAttributions?: Array<{
      name: string;
    }>;
  }>;
}

interface TimeSlot {
  title: string;
  description: string;
  places: Place[];
}

interface Day {
  morning: TimeSlot;
  afternoon: TimeSlot;
  evening: TimeSlot;
}

interface TripRecommendation {
  city: string;
  day1: Day;
  day2: Day;
}

const getPhotoUrl = (photoReference: string) => {
  if (!photoReference) return '';
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('API key not found');
    return '';
  }

  if (photoReference.startsWith('places/')) {
    return `https://places.googleapis.com/v1/${photoReference}/media?key=${apiKey}&maxHeightPx=400`;
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
};

const PlaceCard = ({ place }: { place: Place }) => {
  const [imageError, setImageError] = useState(false);
  const photo = place.photos?.[0];
  const photoReference = photo?.name || '';

  useEffect(() => {
    // Log detailed photo licensing information
    console.log(`📸 Photo licensing for ${place.displayName?.text}:`, {
      name: place.displayName?.text,
      hasPhoto: !!photo,
      authorAttributions: photo?.authorAttributions || 'No attribution data',
      reference: photoReference,
      // Log any other licensing-related fields from the photo object
      // This will help us see what licensing data is available
      fullPhotoData: photo
    });
  }, [place, photo, photoReference]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative h-48">
        {photo ? (
          <>
            <img
              src={getPhotoUrl(photoReference)}
              alt={place.displayName?.text || 'Place'}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('❌ Photo failed:', place.displayName?.text);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('✅ Photo loaded:', place.displayName?.text);
              }}
            />
            {photo?.authorAttributions && (
              <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                Photo by: {photo.authorAttributions[0]?.name}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold">{place.displayName?.text}</h3>
        <p className="text-gray-600">{place.formattedAddress}</p>
        {place.rating && (
          <div className="mt-2">
            <span className="text-yellow-500">★</span>
            <span className="ml-1">{place.rating}</span>
            <span className="text-gray-400 ml-1">({place.userRatingCount} reviews)</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TimeSlotSection = ({ timeSlot }: { timeSlot: TimeSlot }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
    <h3 className="text-xl font-semibold text-gray-800 mb-2">{timeSlot.title}</h3>
    <p className="text-gray-600 mb-4">{timeSlot.description}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {timeSlot.places.map((place, index) => (
        <PlaceCard key={place.id || index} place={place} />
      ))}
    </div>
  </div>
);

const DaySection = ({ day, dayNumber }: { day: Day; dayNumber: number }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Day {dayNumber}</h2>
    <TimeSlotSection timeSlot={day.morning} />
    <TimeSlotSection timeSlot={day.afternoon} />
    <TimeSlotSection timeSlot={day.evening} />
  </div>
);

export default function Results() {
  const [recommendation, setRecommendation] = useState<TripRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedRecommendation = localStorage.getItem('tripRecommendations');
    if (storedRecommendation) {
      try {
        setRecommendation(JSON.parse(storedRecommendation));
      } catch (err) {
        setError('Failed to load trip recommendations');
        console.error('Error parsing recommendations:', err);
      }
    } else {
      setError('No trip recommendations found');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan New Trip
          </button>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Your Perfect Trip to {recommendation.city}
          </h1>
          <p className="text-xl text-gray-600">
            A carefully curated 2-day itinerary just for you
          </p>
        </div>

        <DaySection day={recommendation.day1} dayNumber={1} />
        <DaySection day={recommendation.day2} dayNumber={2} />

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan Another Trip
          </button>
        </div>
      </div>
    </main>
  );
}