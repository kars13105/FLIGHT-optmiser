require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
let amadeusAccessToken = null;
let tokenExpiry = null;

// Helper to get Amadeus access token
async function getAmadeusToken() {
    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) return null;
    if (amadeusAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return amadeusAccessToken;
    }
    
    try {
        const response = await axios.post(
            'https://test.api.amadeus.com/v1/security/oauth2/token',
            `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        amadeusAccessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
        return amadeusAccessToken;
    } catch (error) {
        console.error("Failed to fetch Amadeus token:", error.response?.data || error.message);
        return null;
    }
}

// Mock flight data generator for when API keys are not set
function getMockFlights(from, to) {
    return [
        {
            airports: [from, to],
            airlines: ['Indigo'],
            total_cost: Math.floor(Math.random() * 5000) + 3000,
            total_duration: 2.0 + Math.random(),
            layovers: []
        },
        {
            airports: [from, 'BKK', to],
            airlines: ['Air Asia', 'Air Asia'],
            total_cost: Math.floor(Math.random() * 3000) + 2000,
            total_duration: 6.0 + Math.random() * 3,
            layovers: ['BKK']
        },
        {
            airports: [from, 'DXB', to],
            airlines: ['Emirates', 'Emirates'],
            total_cost: Math.floor(Math.random() * 10000) + 12000,
            total_duration: 5.0 + Math.random() * 2,
            layovers: ['DXB']
        }
    ];
}

app.get('/api/route', async (req, res) => {
    let { from, to, criteria, date } = req.query;
    if (!from || !to) {
        return res.status(400).json({ error: 'Missing from or to parameters' });
    }
    from = from.toUpperCase();
    to = to.toUpperCase();
    criteria = criteria || 'cost';
    
    // Default to a date 7 days from now if not provided
    if (!date) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        date = futureDate.toISOString().split('T')[0];
    }

    const token = await getAmadeusToken();
    let routes = [];

    if (token) {
        try {
            const response = await axios.get(
                'https://test.api.amadeus.com/v2/shopping/flight-offers',
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        originLocationCode: from,
                        destinationLocationCode: to,
                        departureDate: date,
                        adults: 1,
                        max: 10
                    }
                }
            );

            // Parse Amadeus Response
            const flightOffers = response.data.data || [];
            const dictionaries = response.data.dictionaries || {};
            
            routes = flightOffers.map(offer => {
                const itinerary = offer.itineraries[0];
                const segments = itinerary.segments;
                
                const airports = [segments[0].departure.iataCode];
                const airlines = [];
                const layovers = [];
                let total_duration = 0; // We'll parse PTxHxM if we want exact, or just use the whole itinerary duration
                
                // Parse ISO 8601 duration (e.g. PT2H30M)
                const parseDuration = (isoDur) => {
                    const match = isoDur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                    let hrs = parseInt(match[1] || 0);
                    let mins = parseInt(match[2] || 0);
                    return hrs + (mins / 60);
                };
                total_duration = parseDuration(itinerary.duration);
                
                segments.forEach(segment => {
                    airports.push(segment.arrival.iataCode);
                    const airlineCode = segment.carrierCode;
                    airlines.push(dictionaries.carriers[airlineCode] || airlineCode);
                });

                if (airports.length > 2) {
                    layovers.push(...airports.slice(1, -1));
                }

                return {
                    airports,
                    airlines,
                    total_cost: parseFloat(offer.price.total),
                    total_duration,
                    layovers,
                    currency: offer.price.currency
                };
            });
            
        } catch (error) {
            console.error("Amadeus API error:", error.response?.data || error.message);
            // Fallback to mock on error
            routes = getMockFlights(from, to);
        }
    } else {
        // Fallback to mock if no API key
        routes = getMockFlights(from, to);
    }

    if (routes.length === 0) {
        return res.status(404).json({ error: 'No routes found' });
    }

    // Sort based on criteria
    if (criteria === 'duration') {
        routes.sort((a, b) => a.total_duration - b.total_duration);
    } else {
        // Default to cost
        routes.sort((a, b) => a.total_cost - b.total_cost);
    }

    res.json(routes[0]); // Return the optimal route
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
module.exports = app;
