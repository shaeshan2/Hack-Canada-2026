export type AppRole = "BUYER" | "SELLER_PENDING" | "SELLER_VERIFIED" | "ADMIN";

export type SessionUser = { name?: string; email?: string } | null;

export type ListingSeller = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

export type ListingCardData = {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  confidenceScore: number | null;
  imageUrl: string | null;
  createdAt: string;
  seller: ListingSeller;
  isSaved?: boolean;
};

export type HomePageProps = {
  listings: ListingCardData[];
  user: SessionUser;
  role: AppRole | null;
};

export type ParsedSearch = {
  rawQuery: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  price_min: number | null;
  price_max: number | null;
  bedrooms: number | null;
};

export type BrowseListing = ListingCardData & {
  bedrooms: number | null;
  sqft: number | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
};

export type BrowseListingApiRecord = Omit<BrowseListing, "distanceKm"> & {
  photos?: Array<{ id: string; url: string; order: number }>;
};

export type ConversationItem = {
  listingId: string;
  listing: { id: string; title: string; address: string };
  otherUser: { id: string; name: string | null };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
};

export type MessagesPageProps = {
  user: SessionUser;
  userId: string | null;
};

export type ListingDetailData = {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  imageUrl: string | null;
  sqft: number | null;
  bedrooms: number | null;
  confidenceScore: number | null;
  breakdownJson: string | null;
  flagsJson: string | null;
  latitude: number | null;
  longitude: number | null;
  seller: { id: string; name: string | null; role: string };
  photos: { id: string; url: string; order: number }[];
};

export type ListingDetailProps = {
  listing: ListingDetailData | null;
  user: SessionUser;
};

export type PriceEstimateResult = {
  price_range: string;
  explanation: string;
} | null;
