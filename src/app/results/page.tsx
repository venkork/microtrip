import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VenueStatus from '@/components/VenueStatus';
import ItineraryEditor from '@/components/ItineraryEditor';
import EnhancedItineraryView from '@/components/EnhancedItineraryView';
import FriendsItineraries from '@/components/FriendsItineraries';
import EnhancedViewButton from '@/components/EnhancedViewButton';

interface ItineraryItem {
  id: string;
  title: string;
  time: string;
  duration: number;
  type: 'activity' | 'transportation' | 'rest' | 'meal' | 'accommodation';
  location?: string;
  notes?: string;
  weather?: {
    condition: string;
    temperature: number;
  };
  cost?: number;
  category?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const transformRecommendationToItinerary = (recommendation: any): ItineraryItem[] => {
  if (!recommendation || !recommendation.day1 || !recommendation.day2) {
    return [];
  }

  const transformPlaces = (places: any[], timeSlot: string) => {
    if (!Array.isArray(places)) return [];
    
    return places.map((place, index) => ({
      id: place.id || `place-${Date.now()}-${index}`,
      title: place.name || 'Unnamed Place',
      time: timeSlot === 'morning' ? '09:00' : timeSlot === 'afternoon' ? '14:00' : '19:00',
      duration: 60,
      type: 'activity' as const,
      location: place.name,
      address: place.address,
      cost: 0,
      category: place.category || 'activity'
    }));
  };

  const itineraryItems: ItineraryItem[] = [
    ...transformPlaces(recommendation.day1.morning?.places || [], 'morning'),
    ...transformPlaces(recommendation.day1.afternoon?.places || [], 'afternoon'),
    ...transformPlaces(recommendation.day1.evening?.places || [], 'evening'),
    ...transformPlaces(recommendation.day2.morning?.places || [], 'morning'),
    ...transformPlaces(recommendation.day2.afternoon?.places || [], 'afternoon'),
    ...transformPlaces(recommendation.day2.evening?.places || [], 'evening'),
  ];

  return itineraryItems;
};

export default function Results() {
  const [recommendation, setRecommendation] = useState<TripRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancedView, setIsEnhancedView] = useState(false);
  const [editedItinerary, setEditedItinerary] = useState<ItineraryItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedRecommendation = localStorage.getItem('tripRecommendations');
    if (storedRecommendation) {
      try {
        const parsed = JSON.parse(storedRecommendation);
        setRecommendation(parsed);
        setEditedItinerary(transformRecommendationToItinerary(parsed));
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{error}</h2>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-gray-900">
              Your Trip to {recommendation.city}
            </h1>
            <EnhancedViewButton
              isEnhanced={isEnhancedView}
              onClick={() => setIsEnhancedView(!isEnhancedView)}
            />
          </div>
          <p className="mt-2 text-lg text-gray-600">
            {recommendation.dates.start} - {recommendation.dates.end}
          </p>
        </div>

        {isEnhancedView ? (
          <EnhancedItineraryView
            city={recommendation.city}
            tripId="current"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Trip Overview</h2>
                <p className="text-gray-600">
                  Explore {recommendation.city} with this personalized itinerary.
                  We've curated the best spots based on your preferences.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Itinerary</h2>
                <ItineraryEditor
                  initialItems={editedItinerary}
                  onSave={(items: ItineraryItem[]) => setEditedItinerary(items)}
                  budget={1000}
                  onItemSelect={(id: string) => console.log('Selected item:', id)}
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Live Updates</h2>
                <div className="space-y-4">
                  {editedItinerary.map(item => (
                    item.id && (
                      <VenueStatus
                        key={item.id}
                        venueId={item.id}
                        onStatusClick={() => console.log('Status clicked:', item.title)}
                      />
                    )
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Friends' Trips</h2>
                <FriendsItineraries destination={recommendation.city} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}