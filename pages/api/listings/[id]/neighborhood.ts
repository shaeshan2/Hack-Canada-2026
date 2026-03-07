import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export type NeighborhoodData = {
    scores: {
        transit: number;
        schools: number;
        walkability: number;
    };
    aiSummary: string;
    pois: {
        id: string;
        type: "transit" | "school" | "grocery";
        name: string;
        lat: number;
        lng: number;
        distanceText: string;
    }[];
};

type OverpassElement = {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
};

type OverpassResponse = {
    elements: OverpassElement[];
};

// Haversine distance in km
function calcDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;
    if (typeof id !== "string") {
        return res.status(400).json({ error: "Invalid ID" });
    }

    try {
        const listing = await prisma.listing.findUnique({
            where: { id },
            select: { latitude: true, longitude: true },
        });

        if (!listing || listing.latitude == null || listing.longitude == null) {
            return res.status(200).json({
                scores: { transit: 0, schools: 0, walkability: 0 },
                aiSummary: "No neighborhood data available.",
                pois: [],
            });
        }

        const { latitude: lat, longitude: lng } = listing;

        // Radius in meters (1.5km)
        const RADIUS = 1500;

        // Build the Overpass QL query
        // This looks for bus stops, platforms, schools, supermarkets, and convenience stores near the listing.
        const query = `
      [out:json][timeout:15];
      (
        node["highway"="bus_stop"](around:${RADIUS}, ${lat}, ${lng});
        node["public_transport"="platform"](around:${RADIUS}, ${lat}, ${lng});
        node["amenity"="school"](around:${RADIUS}, ${lat}, ${lng});
        way["amenity"="school"](around:${RADIUS}, ${lat}, ${lng});
        node["shop"="supermarket"](around:${RADIUS}, ${lat}, ${lng});
        node["shop"="convenience"](around:${RADIUS}, ${lat}, ${lng});
      );
      out center;
    `;

        // Fetch from Overpass public API
        const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (!overpassRes.ok) {
            throw new Error("Overpass API error");
        }

        const overpassData = (await overpassRes.json()) as OverpassResponse;
        const elements = overpassData.elements || [];

        const poisRaw = elements.map(el => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            if (!elLat || !elLng) return null;

            let type: "transit" | "school" | "grocery" | null = null;
            let name = el.tags?.name;

            if (el.tags?.highway === "bus_stop" || el.tags?.public_transport === "platform") {
                type = "transit";
                name = name || "Transit Stop";
            } else if (el.tags?.amenity === "school") {
                type = "school";
                name = name || "School";
            } else if (el.tags?.shop === "supermarket" || el.tags?.shop === "convenience") {
                type = "grocery";
                name = name || "Grocery Store";
            }

            if (!type) return null;

            const distKm = calcDistanceKM(lat, lng, elLat, elLng);

            return {
                id: `osm-${el.id}`,
                type,
                name: name as string,
                lat: elLat,
                lng: elLng,
                distKm,
            };
        }).filter((x): x is NonNullable<typeof x> => x !== null);

        // Group and sort by distance
        const transitPoints = poisRaw.filter(p => p.type === "transit").sort((a, b) => a.distKm - b.distKm);
        const schoolPoints = poisRaw.filter(p => p.type === "school").sort((a, b) => a.distKm - b.distKm);
        const groceryPoints = poisRaw.filter(p => p.type === "grocery").sort((a, b) => a.distKm - b.distKm);

        // Naive scoring based on real distances
        const calcScore = (points: typeof poisRaw) => {
            if (points.length === 0) return 0;
            const closest = points[0].distKm;
            // Closer is better. A pin exactly at 0km gives 100. At 1.5km gives 40.
            let score = 100 - (closest * 40);
            // Give bonus for density (number of nearby points)
            score += Math.min(points.length * 2, 20);
            return Math.min(99, Math.max(5, Math.round(score)));
        };

        // Format all POIs for the frontend (Limit to closest ones to not overload the map)
        const MAX_TRANSIT = 15;
        const MAX_OTHER = 8;
        const allPois = [
            ...transitPoints.slice(0, MAX_TRANSIT),
            ...schoolPoints.slice(0, MAX_OTHER),
            ...groceryPoints.slice(0, MAX_OTHER)
        ].sort((a, b) => a.distKm - b.distKm);

        const transitScore = calcScore(transitPoints);
        const schoolScore = calcScore(schoolPoints);
        const walkScore = calcScore(groceryPoints);

        // Generate AI Summary
        const prompt = `Write a single, crisp, enthusiastic 10-15 word sentence wrapping up the vibe of this neighborhood based on these scores (out of 100): Transit: ${transitScore}, Schools: ${schoolScore}, Walkability: ${walkScore}. Do not use formatting like bold or asterisks. Return strictly the sentence.`;

        let aiSummary = "A well-connected neighborhood with great local amenities.";
        try {
            const aiRes = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
            });
            if (aiRes.text) {
                aiSummary = aiRes.text.trim();
            }
        } catch (e) {
            console.error("AI summary generation failed:", e);
        }

        const data: NeighborhoodData = {
            scores: {
                transit: transitScore,
                schools: schoolScore,
                walkability: walkScore,
            },
            aiSummary,
            pois: allPois.map(({ distKm, ...rest }) => ({
                ...rest,
                distanceText: distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`
            })),
        };

        return res.status(200).json(data);
    } catch (error) {
        console.error("Neighborhood error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
