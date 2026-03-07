import { useEffect, useRef, useState } from "react";

type Poi = {
    id: string;
    type: "transit" | "school" | "grocery";
    name: string;
    lat: number;
    lng: number;
    distanceText: string;
};

type NeighborhoodMapProps = {
    listingLat: number;
    listingLng: number;
    pois: Poi[];
};

type LeafletLike = {
    map: (el: HTMLElement, opts?: Record<string, unknown>) => {
        setView: (coords: [number, number], zoom: number) => void;
        fitBounds: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => void;
        remove: () => void;
    };
    tileLayer: (url: string, opts?: Record<string, unknown>) => {
        addTo: (map: unknown) => void;
    };
    layerGroup: () => {
        addTo: (map: unknown) => unknown;
        clearLayers: () => void;
    };
    circleMarker: (coords: [number, number], opts?: Record<string, unknown>) => {
        addTo: (layer: unknown) => {
            bindPopup: (content: string) => void;
        };
    };
};

export default function NeighborhoodMap({ listingLat, listingLng, pois }: NeighborhoodMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mapRef = useRef<{
        setView: (coords: [number, number], zoom: number) => void;
        fitBounds: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => void;
        remove: () => void;
    } | null>(null);
    const layerRef = useRef<{ clearLayers: () => void } | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;
        let cancelled = false;

        async function ensureLeaflet(): Promise<LeafletLike> {
            if (typeof window === "undefined") throw new Error("Map unavailable on server");
            const leafletWindow = window as typeof window & { L?: LeafletLike };
            if (leafletWindow.L) return leafletWindow.L;

            if (!document.getElementById("leaflet-css")) {
                const link = document.createElement("link");
                link.id = "leaflet-css";
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }

            await new Promise<void>((resolve, reject) => {
                if (document.getElementById("leaflet-js")) {
                    const check = () => (leafletWindow.L ? resolve() : setTimeout(check, 30));
                    check();
                    return;
                }
                const script = document.createElement("script");
                script.id = "leaflet-js";
                script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Could not load map library"));
                document.body.appendChild(script);
            });

            if (!leafletWindow.L) throw new Error("Map library unavailable");
            return leafletWindow.L;
        }

        async function renderMap() {
            try {
                const L = await ensureLeaflet();
                if (cancelled || !mapContainerRef.current) return;

                if (!mapRef.current) {
                    const map = L.map(mapContainerRef.current, {
                        zoomControl: true,
                        scrollWheelZoom: false,
                    });
                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                        attribution: '&copy; OpenStreetMap',
                    }).addTo(map);
                    mapRef.current = map;
                    layerRef.current = L.layerGroup().addTo(map) as { clearLayers: () => void };
                }

                layerRef.current?.clearLayers();

                // Color mapping for POIs
                const getColor = (type: string) => {
                    if (type === "transit") return "#3b82f6"; // blue
                    if (type === "school") return "#f59e0b"; // orange
                    if (type === "grocery") return "#10b981"; // green
                    return "#6b7280";
                };

                // Add listing marker (distinct color, e.g. primary brand color)
                L.circleMarker([listingLat, listingLng], {
                    radius: 9,
                    color: "#ffffff",
                    weight: 2,
                    fillColor: "#ef4444", // red
                    fillOpacity: 1,
                }).addTo(layerRef.current as unknown).bindPopup("<b>Property Location</b>");

                // Add POI markers
                for (const poi of pois) {
                    L.circleMarker([poi.lat, poi.lng], {
                        radius: 6,
                        color: "#ffffff",
                        weight: 1.5,
                        fillColor: getColor(poi.type),
                        fillOpacity: 0.9,
                    }).addTo(layerRef.current as unknown)
                        .bindPopup(`<b>${poi.name}</b><br/>${poi.distanceText} away`);
                }

                // Fit bounds
                if (pois.length > 0) {
                    const lats = [listingLat, ...pois.map(p => p.lat)];
                    const lngs = [listingLng, ...pois.map(p => p.lng)];
                    mapRef.current.fitBounds([
                        [Math.min(...lats), Math.min(...lngs)],
                        [Math.max(...lats), Math.max(...lngs)],
                    ], { padding: [30, 30] });
                } else {
                    mapRef.current.setView([listingLat, listingLng], 14);
                }

            } catch (err) {
                if (!cancelled) setError((err as Error).message);
            }
        }

        void renderMap();
        return () => { cancelled = true; };
    }, [listingLat, listingLng, pois]);

    useEffect(() => {
        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, []);

    if (error) {
        return <div className="ld-map-error">Could not load map: {error}</div>;
    }

    return <div ref={mapContainerRef} className="ld-neighborhood-map" />;
}
