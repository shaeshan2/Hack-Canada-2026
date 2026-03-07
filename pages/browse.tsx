import Head from "next/head";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type ParsedSearch = {
  rawQuery: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  price_min: number | null;
  price_max: number | null;
  bedrooms: number | null;
};

type ListingCard = {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  bedrooms: number | null;
  sqft: number | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  confidenceScore: number | null;
  distanceKm: number;
  seller: { id: string; name: string | null; email: string };
};

function confidenceLabel(score: number | null) {
  if (score == null) return { text: "Pending", cls: "pending" };
  if (score >= 85) return { text: `${score}/100`, cls: "high" };
  if (score >= 60) return { text: `${score}/100`, cls: "medium" };
  return { text: `${score}/100`, cls: "low" };
}

export default function BrowsePage() {
  const router = useRouter();
  const initialQ = typeof router.query.q === "string" ? router.query.q : "";
  const [query, setQuery] = useState(initialQ);
  const [parsed, setParsed] = useState<ParsedSearch | null>(null);
  const [results, setResults] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [manualPriceMin, setManualPriceMin] = useState<string>("");
  const [manualPriceMax, setManualPriceMax] = useState<string>("");
  const [manualBedrooms, setManualBedrooms] = useState<string>("");
  const [manualRadius, setManualRadius] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

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
      const listings = (await nearbyRes.json()) as ListingCard[];
      setResults(listings);
    } catch (e) {
      setResults([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = typeof router.query.q === "string" ? router.query.q : "";
    if (!q) return;
    setQuery(q);
    void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.q]);

  const mapUrl = useMemo(() => {
    const lat = parsed?.lat;
    const lng = parsed?.lng;
    if (lat == null || lng == null) return null;
    const delta = 0.08;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      bbox
    )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
  }, [parsed]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    void router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
    void runSearch(query.trim());
  }

  return (
    <>
      <Head>
        <title>Browse Homes — DeedScan</title>
      </Head>
      <main className="buyer-browse">
        <header className="buyer-browse-header">
          <Link href="/">← DeedScan</Link>
          <h1>Buyer Browse</h1>
          <Link href="/messages">Chat</Link>
        </header>

        <form onSubmit={onSubmit} className="buyer-search-bar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try: "3-bed under $700k near schools in Mississauga"'
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <section className="buyer-browse-layout">
          <aside className="buyer-filters">
            <h2>Filters</h2>
            <label>
              Price Min
              <input
                type="number"
                value={manualPriceMin}
                onChange={(e) => setManualPriceMin(e.target.value)}
                placeholder={parsed?.price_min?.toString() ?? "Any"}
              />
            </label>
            <label>
              Price Max
              <input
                type="number"
                value={manualPriceMax}
                onChange={(e) => setManualPriceMax(e.target.value)}
                placeholder={parsed?.price_max?.toString() ?? "Any"}
              />
            </label>
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
              />
            </label>
            <button type="button" onClick={() => void runSearch(query.trim())} disabled={loading}>
              Apply
            </button>
          </aside>

          <section className="buyer-results">
            <div className="buyer-results-top">
              <p>
                {parsed?.locationText
                  ? `Showing around ${parsed.locationText}`
                  : "Search results"}{" "}
                · {results.length} listings
              </p>
              <button type="button" onClick={() => setShowMap((v) => !v)}>
                {showMap ? "Card Grid" : "Map View"}
              </button>
            </div>

            {error && <p className="buyer-error">{error}</p>}

            {showMap ? (
              <div className="buyer-map-wrap">
                {mapUrl ? (
                  <iframe title="map" src={mapUrl} loading="lazy" />
                ) : (
                  <p>No map available for this query.</p>
                )}
              </div>
            ) : (
              <div className="buyer-card-grid">
                {results.map((listing) => {
                  const conf = confidenceLabel(listing.confidenceScore);
                  return (
                    <article key={listing.id} className="buyer-card">
                      <img
                        src={listing.imageUrl || "/images/hero-bg.png"}
                        alt={listing.title}
                      />
                      <div className="buyer-card-body">
                        <h3>{listing.title}</h3>
                        <p className="buyer-price">${listing.price.toLocaleString("en-CA")} CAD</p>
                        <p>{listing.address}</p>
                        <p>
                          {listing.bedrooms ?? "?"} beds · {listing.sqft ?? "?"} sqft ·{" "}
                          {listing.distanceKm.toFixed(1)} km
                        </p>
                        <p className={`buyer-confidence ${conf.cls}`}>Confidence: {conf.text}</p>
                        <div className="buyer-card-actions">
                          <Link href={`/listings/${listing.id}`}>View Details</Link>
                          <Link
                            href={`/messages?listingId=${listing.id}&otherUserId=${listing.seller.id}`}
                          >
                            Chat
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!loading && results.length === 0 && !error && (
                  <p>No listings found. Try widening your radius or budget.</p>
                )}
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}
