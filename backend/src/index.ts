import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Configure CORS with specific options
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Goog-Api-Key', 'X-Goog-FieldMask'],
  credentials: true
}));

app.use(express.json());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

interface CitySearchRequest {
  cityName: string;
}

interface TripRecommendRequest {
  cityName: string;
  budget: string;
  tripType: string;
}

interface Place {
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: string;
  regularOpeningHours?: any;
  priceLevel?: string;
  photos?: Array<{
    name: string;
    uri: string;
    widthPx: number;
    heightPx: number;
  }>;
  websiteUri?: string;
  phoneNumber?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface PlacesResponse {
  places?: Place[];
}

interface CitySearchResponse {
  places?: Array<{
    displayName: {
      text: string;
    };
    formattedAddress: string;
    location: {
      latitude: number;
      longitude: number;
    };
  }>;
}

// City search endpoint
app.post('/api/cities/search', async (req: Request<{}, {}, CitySearchRequest>, res: Response) => {
  try {
    const { cityName } = req.body;
    console.log(`[Cities API] Searching for city: ${cityName}`);
    
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key is not configured');
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    const response = await axios.post<CitySearchResponse>(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        textQuery: `city of ${cityName}, France`,
        languageCode: "en",
        maxResultCount: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
        }
      }
    );

    console.log(`[Cities API] Found ${response.data.places?.length || 0} cities`);
    console.log('[Cities API] Response data:', JSON.stringify(response.data, null, 2));
    
    // Make sure we're sending the places array to the frontend
    if (!response.data.places) {
      res.json({ places: [] });
    } else {
      res.json({ places: response.data.places });
    }
  } catch (error) {
    console.error('[Cities API] Error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('[Cities API] Response:', (error as any).response?.data);
    }
    res.status(500).json({ 
      error: 'Failed to fetch cities',
      details: error && typeof error === 'object' && 'response' in error 
        ? (error as any).response?.data 
        : error
    });
  }
});

// Places search endpoint
app.post('/api/places/search', async (req: Request<{}, {}, { cityName: string, type: string }>, res: Response) => {
  try {
    const { cityName, type } = req.body;
    console.log(`[Places API] Searching for ${type} in ${cityName}`);
    
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key is not configured');
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    const response = await axios.post<PlacesResponse>(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        textQuery: `${type} in ${cityName}`,
        maxResultCount: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.regularOpeningHours,places.priceLevel,places.photos,places.websiteUri,places.phoneNumber,places.location'
        }
      }
    );

    console.log(`[Places API] Found ${response.data.places?.length || 0} places`);
    res.json(response.data);
  } catch (error) {
    console.error('[Places API] Error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('[Places API] Response:', (error as any).response?.data);
    }
    res.status(500).json({ 
      error: 'Failed to fetch places',
      details: error && typeof error === 'object' && 'response' in error 
        ? (error as any).response?.data 
        : error
    });
  }
});

// Trip recommendation endpoint
app.post('/api/trips/recommend', async (req: Request<{}, {}, TripRecommendRequest>, res: Response) => {
  try {
    const { cityName, budget, tripType } = req.body;
    console.log(`[Recommendations] Generating trip for ${cityName} (${budget}, ${tripType})`);
    
    // Get attractions
    const attractionsResponse = await axios.post<PlacesResponse>(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: `tourist attractions in ${cityName}`,
        languageCode: "en"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos'
        }
      }
    );

    // Get restaurants
    const restaurantsResponse = await axios.post<PlacesResponse>(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: `restaurants in ${cityName}`,
        languageCode: "en"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos'
        }
      }
    );

    const attractions = attractionsResponse.data.places || [];
    const restaurants = restaurantsResponse.data.places || [];

    console.log(`[Recommendations] Found ${attractions.length} attractions and ${restaurants.length} restaurants`);

    const recommendation = {
      city: cityName,
      day1: {
        morning: {
          title: "Morning Exploration",
          description: "Start your day exploring the city's main attractions",
          places: attractions.slice(0, 2)
        },
        afternoon: {
          title: "Afternoon Activities",
          description: "Continue discovering the city's highlights",
          places: attractions.slice(2, 4)
        },
        evening: {
          title: "Evening Entertainment",
          description: "Enjoy dinner and evening activities",
          places: restaurants.slice(0, 2)
        }
      },
      day2: {
        morning: {
          title: "Morning Activities",
          description: "Start your second day with local experiences",
          places: attractions.slice(4, 6)
        },
        afternoon: {
          title: "Afternoon Exploration",
          description: "More city highlights and activities",
          places: attractions.slice(6, 8)
        },
        evening: {
          title: "Farewell Evening",
          description: "End your trip with memorable experiences",
          places: restaurants.slice(2, 4)
        }
      }
    };

    res.json(recommendation);
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('[Recommendations] Response:', (error as any).response?.data);
    }
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      details: error && typeof error === 'object' && 'response' in error 
        ? (error as any).response?.data 
        : error
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);