-- Demo sellers (seller_verified so listings are valid)
INSERT OR IGNORE INTO "User" ("id", "auth0Id", "email", "name", "role", "blockedReason", "createdAt", "updatedAt") VALUES
  ('demo_seller_001', 'auth0|demo_seller_001', 'amelia.chen@deedscan.demo', 'Amelia Chen', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_002', 'auth0|demo_seller_002', 'liam.patel@deedscan.demo', 'Liam Patel', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_003', 'auth0|demo_seller_003', 'sophia.martin@deedscan.demo', 'Sophia Martin', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Demo listings
INSERT OR REPLACE INTO "Listing" (
  "id", "title", "description", "address", "price", "imageUrl", "sqft", "bedrooms",
  "latitude", "longitude", "confidenceScore", "sellerId", "createdAt", "updatedAt"
) VALUES
  (
    'demo_listing_001',
    'Detached Family Home in North York',
    'Bright 4-bedroom detached home with finished basement, large backyard, and two-car garage. Close to transit, schools, and parks.',
    '1250 Sheppard Ave W, Toronto, ON',
    1499000,
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    2400,
    4,
    43.7557,
    -79.4550,
    91,
    'demo_seller_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'demo_listing_002',
    'Modern Condo Downtown Toronto',
    '2-bedroom corner condo with skyline views, open-concept kitchen, and floor-to-ceiling windows. Steps from Union Station.',
    '88 Harbour St, Toronto, ON',
    899000,
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
    980,
    2,
    43.6419,
    -79.3790,
    86,
    'demo_seller_002',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'demo_listing_003',
    'Townhouse Near Waterfront',
    'Renovated 3-bedroom townhouse with private rooftop terrace, smart-home features, and dedicated parking.',
    '35 Queens Quay E, Toronto, ON',
    1125000,
    'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80',
    1650,
    3,
    43.6462,
    -79.3707,
    84,
    'demo_seller_003',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'demo_listing_004',
    'Luxury Semi-Detached in Midtown',
    'Newly updated semi-detached with designer finishes, chef kitchen, and landscaped backyard. Walkable to cafes and subway.',
    '220 Eglinton Ave W, Toronto, ON',
    1735000,
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    2100,
    4,
    43.7053,
    -79.4118,
    89,
    'demo_seller_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'demo_listing_005',
    'Starter Home in Scarborough',
    'Well-kept 3-bedroom home with finished lower level and large lot. Great option for first-time buyers.',
    '4500 Kingston Rd, Toronto, ON',
    819000,
    'https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=1200&q=80',
    1320,
    3,
    43.7489,
    -79.1884,
    78,
    'demo_seller_002',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'demo_listing_006',
    'Executive Home in Mississauga',
    'Spacious 5-bedroom executive home with vaulted ceilings, home office, and premium finishes throughout.',
    '6200 Erin Mills Pkwy, Mississauga, ON',
    1849000,
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    2950,
    5,
    43.5736,
    -79.7163,
    93,
    'demo_seller_003',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
