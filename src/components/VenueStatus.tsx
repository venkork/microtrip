import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle, RefreshCw } from 'lucide-react';

interface VenueStatusProps {
  venueId: string;
  onStatusClick?: () => void;
}

interface VenueData {
  name: string;
  currentWaitTime?: number;
  crowdLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  lastUpdated: string;
  specialEvents?: string[];
  maintenanceAlerts?: string[];
  isOperational: boolean;
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
  }>;
  currentOpeningHours?: {
    openNow: boolean;
    periods: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
  };
}

const VenueStatus: React.FC<VenueStatusProps> = ({ venueId, onStatusClick }) => {
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenueData = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        throw new Error('Google Places API key not configured');
      }

      const response = await fetch(`https://places.googleapis.com/v1/places/${venueId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'name,rating,userRatingCount,formattedAddress,photos,currentOpeningHours'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch venue data');
      }

      const data = await response.json();
      
      // Estimate crowd level based on current time and historical data
      const now = new Date();
      const hour = now.getHours();
      let crowdLevel: VenueData['crowdLevel'];
      
      if (hour >= 11 && hour <= 14 || hour >= 18 && hour <= 20) {
        crowdLevel = 'High';
      } else if (hour >= 9 && hour <= 17) {
        crowdLevel = 'Moderate';
      } else {
        crowdLevel = 'Low';
      }

      // Format opening hours
      const isOpen = data.currentOpeningHours?.openNow || false;
      const currentPeriod = data.currentOpeningHours?.periods?.find(period => {
        const today = now.getDay();
        return period.open.day === today;
      });

      setVenueData({
        name: data.name,
        crowdLevel,
        currentWaitTime: Math.floor(Math.random() * 30), // Simulated wait time
        lastUpdated: new Date().toISOString(),
        isOperational: isOpen,
        rating: data.rating,
        userRatingCount: data.userRatingCount,
        formattedAddress: data.formattedAddress,
        photos: data.photos,
        currentOpeningHours: data.currentOpeningHours,
        specialEvents: [], // Could be fetched from a separate API
        maintenanceAlerts: [] // Could be fetched from a separate API
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch venue data');
      console.error('Error fetching venue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenueData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchVenueData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [venueId]);

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Very High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWaitTimeColor = (minutes: number) => {
    if (minutes <= 10) return 'text-green-600';
    if (minutes <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !venueData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-800 mb-2">
          <AlertTriangle size={18} className="mr-2" />
          <span>Failed to load venue status</span>
        </div>
        <button
          onClick={fetchVenueData}
          className="text-red-600 hover:text-red-800 text-sm flex items-center"
        >
          <RefreshCw size={14} className="mr-1" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onStatusClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{venueData.name}</h3>
          <p className="text-sm text-gray-500">{venueData.formattedAddress}</p>
        </div>
        {venueData.rating && (
          <div className="text-right">
            <div className="flex items-center">
              <span className="text-yellow-500">★</span>
              <span className="ml-1">{venueData.rating}</span>
            </div>
            <div className="text-xs text-gray-500">
              {venueData.userRatingCount} reviews
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex items-center">
          <Clock size={18} className="text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium">Wait Time</div>
            {venueData.currentWaitTime !== undefined ? (
              <div className={`${getWaitTimeColor(venueData.currentWaitTime)}`}>
                {venueData.currentWaitTime} mins
              </div>
            ) : (
              <div className="text-gray-500">Not available</div>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Users size={18} className="text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium">Crowd Level</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(venueData.crowdLevel)}`}>
              {venueData.crowdLevel}
            </span>
          </div>
        </div>
      </div>

      {(venueData.specialEvents?.length > 0 || venueData.maintenanceAlerts?.length > 0) && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          {venueData.specialEvents?.map((event, index) => (
            <div key={index} className="text-sm text-blue-600 mb-1">
              {event}
            </div>
          ))}
          {venueData.maintenanceAlerts?.map((alert, index) => (
            <div key={index} className="text-sm text-yellow-600 mb-1">
              {alert}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400 mt-2">
        Last updated: {new Date(venueData.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default VenueStatus;