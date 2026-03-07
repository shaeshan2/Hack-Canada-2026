import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../lib/prisma";

export type NeighborhoodData = {
    scores: {
        transit: number;
        schools: number;
        walkability: number;
    };
    pois: {
        id: string;
        type: "transit" | "school" | "grocery";
        name: string;
        lat: number;
        lng: number;
        distanceText: string;
    }[];
};

// Simple seeded PRNG to ensure the same listing gets the same POIs
function jsf32(a: number, b: number, c: number, d: number) {
    return function () {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        const t = (a - ((b << 27) | (b >>> 5))) | 0;
        a = b ^ ((c << 17) | (c >>> 15));
        b = (c + d) | 0;
        c = (d + t) | 0;
        d = (a + t) | 0;
        return (d >>> 0) / 4294967296;
    };
}

// Generate points in a radius (approx degrees)
function generatePois(lat: number, lng: number, rng: () => number, count: number, type: "transit" | "school" | "grocery", names: string[]) {
    const pois = [];
    const radiusDeg = 0.012; // ~1-2km

    for (let i = 0; i < count; i++) {
        const r = radiusDeg * Math.sqrt(rng());
        const theta = rng() * 2 * Math.PI;
        const pLat = lat + r * Math.cos(theta);
        const pLng = lng + (r * Math.sin(theta)) / Math.cos(lat * (Math.PI / 180));

        // Approximate distance in km (Haversine simplified for small distances)
        const dLat = (pLat - lat) * 111;
        const dLng = (pLng - lng) * 111 * Math.cos(lat * (Math.PI / 180));
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

        let distanceText = "";
        if (distKm < 1) {
            distanceText = Math.round(distKm * 1000) + "m";
        } else {
            distanceText = distKm.toFixed(1) + "km";
        }

        pois.push({
            id: `${type}-${i}`,
            type,
            name: names[i % names.length],
            lat: pLat,
            lng: pLng,
            distanceText,
            distKm,
        });
    }
    return pois;
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
            // Return a default empty response if no coordinates are available
            return res.status(200).json({
                scores: { transit: 0, schools: 0, walkability: 0 },
                pois: [],
            });
        }

        const { latitude: lat, longitude: lng } = listing;

        // Use lat/lng as seed so results are deterministic per listing
        const seedPart1 = Math.floor(Math.abs(lat) * 100000);
        const seedPart2 = Math.floor(Math.abs(lng) * 100000);
        const rng = jsf32(seedPart1, seedPart2, 0xdeadbeef, 0x12345678);

        // Generate Transit
        const transitNames = ["Bus Stop (Main St)", "Transit Station", "Bus Stop (Metro)", "Light Rail Station"];
        const transitPoints = generatePois(lat, lng, rng, 2 + Math.floor(rng() * 4), "transit", transitNames);

        // Generate Schools
        const schoolNames = ["Public Elementary School", "High School", "Catholic Secondary", "Academy"];
        const schoolPoints = generatePois(lat, lng, rng, 1 + Math.floor(rng() * 3), "school", schoolNames);

        // Generate Groceries
        const groceryNames = ["Supermarket", "Local Grocery store", "Fresh Market", "Convenience Store"];
        const groceryPoints = generatePois(lat, lng, rng, 1 + Math.floor(rng() * 4), "grocery", groceryNames);

        const allPois = [...transitPoints, ...schoolPoints, ...groceryPoints].sort((a, b) => a.distKm - b.distKm);

        // Very naive scoring system based on proximity of generated points
        const calcScore = (points: { distKm: number }[]) => {
            if (points.length === 0) return 30 + Math.floor(rng() * 20); // fallback base score
            const closest = points[0].distKm;
            // If closest is 0km, score 99. If closest is > 2km, score drops.
            let score = 100 - (closest * 40);
            // Add a small bonus for having many points
            score += points.length * 2;
            return Math.min(99, Math.max(20, Math.round(score)));
        };

        const data: NeighborhoodData = {
            scores: {
                transit: calcScore(transitPoints),
                schools: calcScore(schoolPoints),
                walkability: calcScore(groceryPoints),
            },
            pois: allPois.map(({ distKm, ...rest }) => rest), // Remove distKm from output
        };

        return res.status(200).json(data);
    } catch (error) {
        console.error("Neighborhood error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
