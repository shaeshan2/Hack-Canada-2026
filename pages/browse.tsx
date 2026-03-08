import Head from "next/head";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import ListingCard from "../components/ListingCard";
import type { BrowseListing, BrowseListingApiRecord, ParsedSearch } from "../types";

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
    addTo: (layer: unknown) => void;
  };
};

export default function BrowsePage() {
  const router = useRouter();
  const initialQ = typeof router.query.q === "string" ? router.query.q : "";
  const [query, setQuery] = useState(initialQ);
  const [parsed, setParsed] = useState<ParsedSearch | null>(null);
  const [results, setResults] = useState<BrowseListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [manualPriceMin, setManualPriceMin] = useState<string>("");
  const [manualPriceMax, setManualPriceMax] = useState<string>("");
  const [manualBedrooms, setManualBedrooms] = useState<string>("");
  const [manualRadius, setManualRadius] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{
    setView: (coords: [number, number], zoom: number) => void;
    fitBounds: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => void;
    remove: () => void;
  } | null>(null);
  const markerLayerRef = useRef<{ clearLayers: () => void } | null>(null);

  async function runSearch(nlQuery: string) {
    setLoading(true);
    setError(null);
    try {
      const parseRes = await fetch("/api/search/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery }),
      });
      if (!parseRes.ok) {
        const payload = (await parseRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not parse query");
      }
      const parsedResult = (await parseRes.json()) as ParsedSearch;
      setParsed(parsedResult);

      const effectiveMin =
        manualPriceMin.trim() === "" ? parsedResult.price_min : Number(manualPriceMin);
      const effectiveMax =
        manualPriceMax.trim() === "" ? parsedResult.price_max : Number(manualPriceMax);
      const effectiveBedrooms =
        manualBedrooms.trim() === "" ? parsedResult.bedrooms : Number(manualBedrooms);
      const effectiveRadius =
        manualRadius.trim() === "" ? parsedResult.radius_km : Number(manualRadius);

      if (parsedResult.lat == null || parsedResult.lng == null) {
        setResults([]);
        setError(
          "We couldn't infer a mappable location from your query. Try adding a city, e.g. 'in Mississauga'."
        );
        return;
      }

      const params = new URLSearchParams({
        lat: String(parsedResult.lat),
        lng: String(parsedResult.lng),
        radius_km: String(Math.max(1, effectiveRadius || 10)),
      });
      if (Number.isFinite(effectiveMin as number)) params.set("price_min", String(effectiveMin));
      if (Number.isFinite(effectiveMax as number)) params.set("price_max", String(effectiveMax));
      if (Number.isFinite(effectiveBedrooms as number)) {
        params.set("bedrooms", String(effectiveBedrooms));
      }

      const nearbyRes = await fetch(`/api/listings/nearby?${params.toString()}`);
      if (!nearbyRes.ok) {
        const payload = (await nearbyRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not load listings");
      }
      const listings = (await nearbyRes.json()) as BrowseListing[];
      setResults(listings);
    } catch (e) {
      setResults([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }

  async function loadAllListings() {
    setLoading(true);
    setError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/listings");
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not load listings");
      }
      const listings = (await res.json()) as BrowseListingApiRecord[];
      setResults(
        listings.map((listing) => ({
          ...listing,
          imageUrl: listing.photos?.[0]?.url ?? listing.imageUrl,
          distanceKm: 0,
        }))
      );
    } catch (e) {
      setResults([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    const q = typeof router.query.q === "string" ? router.query.q.trim() : "";
    if (!q) {
      void loadAllListings();
      return;
    }
    setQuery(q);
    void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.q]);

  const mapPoints = useMemo(
    () =>
      results.filter(
        (listing): listing is BrowseListing & { latitude: number; longitude: number } =>
          listing.latitude != null && listing.longitude != null
      ),
    [results]
  );

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;
    let cancelled = false;

    async function ensureLeaflet(): Promise<LeafletLike> {
      if (typeof window === "undefined") {
        throw new Error("Map unavailable on server");
      }
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
            scrollWheelZoom: true,
          });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(map);
          mapRef.current = map;
          markerLayerRef.current = L.layerGroup().addTo(map) as { clearLayers: () => void };
        }

        markerLayerRef.current?.clearLayers();

        for (const listing of mapPoints) {
          L.circleMarker([listing.latitude, listing.longitude], {
            radius: 7,
            color: "#10b981",
            weight: 2,
            fillColor: "#34d399",
            fillOpacity: 0.82,
          }).addTo(markerLayerRef.current as unknown);
        }

        if (parsed?.lat != null && parsed?.lng != null) {
          mapRef.current.setView([parsed.lat, parsed.lng], 11);
          return;
        }

        if (mapPoints.length === 0) {
          mapRef.current.setView([43.6532, -79.3832], 8);
          return;
        }

        const lats = mapPoints.map((p) => p.latitude);
        const lngs = mapPoints.map((p) => p.longitude);
        mapRef.current.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [22, 22] }
        );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
    };
  }, [showMap, mapPoints, parsed]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      void router.push("/browse");
      void loadAllListings();
      return;
    }
    void router.push(`/browse?q=${encodeURIComponent(trimmed)}`);
    void runSearch(trimmed);
  }

  function resetFilters() {
    setManualPriceMin("");
    setManualPriceMax("");
    setManualBedrooms("");
    setManualRadius("");
    if (query.trim()) {
      void runSearch(query.trim());
      return;
    }
    void loadAllListings();
  }

  return (
    <>
      <Head>
        <title>Browse Homes — DeedScan</title>
      </Head>
      <main className="buyer-browse">
        <section className="section-inner buyer-browse-shell">
          <header className="buyer-browse-header animate-in">
            <div className="buyer-browse-title-row">
              <Link href="/" className="buyer-back-link" aria-label="Back to home">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M15 5L8 12L15 19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <h1>Browse Homes</h1>
            </div>
          </header>

          <form onSubmit={onSubmit} className="buyer-search-bar animate-in animate-in-delay-1">
            <div className="buyer-search-input-wrap">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Try: "3-bed under $700k near schools in Mississauga"'
              />
              <button
                type="submit"
                className="buyer-search-icon-btn"
                disabled={loading}
                aria-label={loading ? "Searching listings" : "Search listings"}
                title={loading ? "Searching..." : "Search"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M11 4a7 7 0 1 0 4.472 12.384l4.572 4.572a1 1 0 0 0 1.414-1.414l-4.572-4.572A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </form>

          <section className="buyer-browse-layout animate-in animate-in-delay-2">
            <aside className="buyer-filters">
              <div className="buyer-filters-head">
                <h2>Refine Results</h2>
                <p>Adjust budget, home size, and distance in one place.</p>
              </div>

              <div className="buyer-filter-block">
                <p className="buyer-filter-title">Price Range (CAD)</p>
                <div className="buyer-filter-grid">
                  <label>
                    Min
                    <input
                      type="number"
                      value={manualPriceMin}
                      onChange={(e) => setManualPriceMin(e.target.value)}
                      placeholder={parsed?.price_min?.toString() ?? "No minimum"}
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      value={manualPriceMax}
                      onChange={(e) => setManualPriceMax(e.target.value)}
                      placeholder={parsed?.price_max?.toString() ?? "No maximum"}
                    />
                  </label>
                </div>
              </div>

              <div className="buyer-filter-block">
                <p className="buyer-filter-title">Home Details</p>
                <div className="buyer-filter-grid">
                  <label>
                    Bedrooms
                    <input
                      type="number"
                      min={0}
                      value={manualBedrooms}
                      onChange={(e) => setManualBedrooms(e.target.value)}
                      placeholder={parsed?.bedrooms?.toString() ?? "Any"}
                    />
                  </label>
                  <label>
                    Radius (km)
                    <input
                      type="number"
                      min={1}
                      value={manualRadius}
                      onChange={(e) => setManualRadius(e.target.value)}
                      placeholder={parsed?.radius_km?.toString() ?? "10"}
                    />
                  </label>
                </div>
              </div>

              <div className="buyer-filter-actions">
                <button
                  type="button"
                  className="btn btn-outline buyer-apply-btn"
                  onClick={() => (query.trim() ? void runSearch(query.trim()) : void loadAllListings())}
                  disabled={loading}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="buyer-filter-reset"
                  onClick={resetFilters}
                  disabled={loading}
                >
                  Reset
                </button>
              </div>
            </aside>

            <section className="buyer-results">
              <div className="buyer-results-top">
                <p>
                  {parsed?.locationText
                    ? `Showing around ${parsed.locationText}`
                    : "All available listings"}{" "}
                  · {results.length} listings
                </p>
                <button type="button" className="btn btn-outline" onClick={() => setShowMap((v) => !v)}>
                  {showMap ? "Card Grid" : "Map View"}
                </button>
              </div>

              {error && <p className="buyer-error">{error}</p>}

              {loading ? (
                <div className="buyer-ai-loading">
                  <span className="buyer-ai-spinner">✨</span>
                  <h3>AI is analyzing your search...</h3>
                  <p>Scanning the market for the best matches across Canada.</p>
                </div>
              ) : showMap ? (
                <div className="buyer-map-wrap">
                  {mapPoints.length > 0 || (parsed?.lat != null && parsed?.lng != null) ? (
                    <div ref={mapContainerRef} className="buyer-map-canvas" aria-label="Listings map" />
                  ) : (
                    <p>No map available for this query.</p>
                  )}
                </div>
              ) : (
                <div className="buyer-card-grid">
                  {results.map((listing, i) => {
                    return (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        index={i}
                        showMessageSeller
                        initialIsSaved={listing.isSaved}
                      />
                    );
                  })}
                  {!loading && hasLoaded && results.length === 0 && !error && (
                    <p>No listings found. Try widening your radius or budget.</p>
                  )}
                </div>
              )}
            </section>
          </section>
        </section>
      </main>
    </>
  );
}
