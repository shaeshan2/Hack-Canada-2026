BEGIN TRANSACTION;

-- Clean previous demo rows so reseeding stays deterministic.
DELETE FROM "Photo" WHERE "listingId" LIKE 'demo_listing_%';
DELETE FROM "FraudFlag" WHERE "listingId" LIKE 'demo_listing_%';
DELETE FROM "Listing" WHERE "id" LIKE 'demo_listing_%';
DELETE FROM "User" WHERE "id" LIKE 'demo_seller_%';
DELETE FROM "User" WHERE "id" = 'demo_admin_001';

-- Demo admin (use ALLOW_DB_ADMIN_FALLBACK=true to access /admin/review with this account)
INSERT INTO "User" ("id", "auth0Id", "email", "name", "role", "blockedReason", "createdAt", "updatedAt") VALUES
  ('demo_admin_001', 'auth0|demo_admin_001', 'admin@deedscan.demo', 'DeedScan Admin', 'ADMIN', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ensure test@test.com (Auth0 password: Test@123) always has ADMIN role.
-- Only updates if the row already exists (after first login). Safe to re-run anytime.
-- Workflow: log in as test@test.com once, then re-run `npm run seed:demo`.
UPDATE "User" SET role = 'ADMIN', updatedAt = CURRENT_TIMESTAMP
  WHERE email = 'test@test.com';

-- Demo sellers (verified so they can own listings)
INSERT INTO "User" ("id", "auth0Id", "email", "name", "role", "blockedReason", "createdAt", "updatedAt") VALUES
  ('demo_seller_001', 'auth0|demo_seller_001', 'amelia.chen@deedscan.demo', 'Amelia Chen', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_002', 'auth0|demo_seller_002', 'liam.patel@deedscan.demo', 'Liam Patel', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_003', 'auth0|demo_seller_003', 'sophia.martin@deedscan.demo', 'Sophia Martin', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_004', 'auth0|demo_seller_004', 'noah.kim@deedscan.demo', 'Noah Kim', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_005', 'auth0|demo_seller_005', 'chloe.roy@deedscan.demo', 'Chloe Roy', 'SELLER_VERIFIED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Demo listings across multiple cities, with varied confidence/price/bedrooms.
INSERT INTO "Listing" (
  "id", "title", "description", "address", "price", "imageUrl", "sqft", "bedrooms",
  "latitude", "longitude", "confidenceScore", "sellerId", "createdAt", "updatedAt"
) VALUES
  ('demo_listing_001', 'Detached Family Home in North York', 'Bright 4-bedroom detached home with finished basement, large backyard, and two-car garage.', '1250 Sheppard Ave W, Toronto, ON', 1499000, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80', 2400, 4, 43.7557, -79.4550, 91, 'demo_seller_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_002', 'Modern Condo by the Waterfront', '2-bedroom corner condo with skyline views and floor-to-ceiling windows.', '88 Harbour St, Toronto, ON', 899000, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80', 980, 2, 43.6419, -79.3790, 86, 'demo_seller_002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_003', 'Executive Home in Erin Mills', 'Spacious 5-bedroom home with vaulted ceilings, office, and premium finishes.', '6200 Erin Mills Pkwy, Mississauga, ON', 1849000, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80', 2950, 5, 43.5736, -79.7163, 93, 'demo_seller_003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_004', 'Family Semi in Bram East', 'Move-in ready semi-detached with finished basement and private yard.', '10 Beaumaris Dr, Brampton, ON', 1049000, 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1400&q=80', 1900, 4, 43.7608, -79.7617, 79, 'demo_seller_004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_005', 'Downtown Ottawa Condo', 'Transit-friendly 1+den condo close to Parliament and riverfront trails.', '428 Sparks St, Ottawa, ON', 579000, 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80', 720, 1, 45.4215, -75.6972, 88, 'demo_seller_005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_006', 'Hamilton Starter Bungalow', 'Updated bungalow with detached garage and fenced backyard.', '175 Ottawa St N, Hamilton, ON', 649000, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80', 1180, 3, 43.2557, -79.8711, 72, 'demo_seller_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_007', 'Vaughan Townhome Near Transit', '3-bed townhome near VMC with rooftop terrace and open-concept main floor.', '1 Bass Pro Mills Dr, Vaughan, ON', 989000, 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1400&q=80', 1600, 3, 43.8070, -79.5077, 84, 'demo_seller_002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_008', 'Markham Family Detached', 'Detached 4-bedroom on quiet street with renovated kitchen and large lot.', '16th Ave, Markham, ON', 1395000, 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?auto=format&fit=crop&w=1400&q=80', 2300, 4, 43.8561, -79.3370, 90, 'demo_seller_003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_009', 'Calgary Inner-City Infill', 'Modern infill with legal basement suite and detached double garage.', '17 Ave SW, Calgary, AB', 939000, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80', 2050, 4, 51.0447, -114.0719, 67, 'demo_seller_004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_010', 'Vancouver Kitsilano Condo', 'Bright 2-bedroom condo steps from beach, shops, and bike paths.', '2083 W 4th Ave, Vancouver, BC', 1199000, 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1400&q=80', 910, 2, 49.2636, -123.1547, 95, 'demo_seller_005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_011', 'Montreal Plateau Duplex Unit', 'Large upper unit with exposed brick, balcony, and metro access.', '3700 Rue Saint-Denis, Montreal, QC', 749000, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1400&q=80', 1350, 3, 45.5088, -73.5540, 81, 'demo_seller_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_012', 'Halifax Oceanview Townhouse', '3-bedroom townhouse with harbor views, updated bathrooms, and deck.', '1751 Lower Water St, Halifax, NS', 689000, 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=80', 1420, 3, 44.6488, -63.5752, 76, 'demo_seller_002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_013', 'Edmonton Family Home', '4-bedroom two-storey in newer community with finished basement.', 'Windermere Blvd SW, Edmonton, AB', 729000, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80', 2100, 4, 53.5461, -113.4938, 69, 'demo_seller_003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_014', 'Mississauga Budget Condo', 'Well-kept 1-bedroom condo near Square One with parking included.', '385 Prince of Wales Dr, Mississauga, ON', 519000, 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1400&q=80', 640, 1, 43.5890, -79.6441, 58, 'demo_seller_004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_listing_015', 'Scarborough Value Townhouse', '3-bedroom townhouse with finished rec room and low maintenance fees.', '4500 Kingston Rd, Toronto, ON', 819000, 'https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=1400&q=80', 1320, 3, 43.7489, -79.1884, 52, 'demo_seller_005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Multiple photos per listing for richer card/detail pages.
INSERT INTO "Photo" ("id", "url", "order", "listingId", "createdAt") VALUES
  ('demo_photo_001_1', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_001', CURRENT_TIMESTAMP),
  ('demo_photo_001_2', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_001', CURRENT_TIMESTAMP),
  ('demo_photo_002_1', 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_002', CURRENT_TIMESTAMP),
  ('demo_photo_002_2', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_002', CURRENT_TIMESTAMP),
  ('demo_photo_003_1', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_003', CURRENT_TIMESTAMP),
  ('demo_photo_003_2', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_003', CURRENT_TIMESTAMP),
  ('demo_photo_004_1', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_004', CURRENT_TIMESTAMP),
  ('demo_photo_004_2', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_004', CURRENT_TIMESTAMP),
  ('demo_photo_005_1', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_005', CURRENT_TIMESTAMP),
  ('demo_photo_005_2', 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_005', CURRENT_TIMESTAMP),
  ('demo_photo_006_1', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_006', CURRENT_TIMESTAMP),
  ('demo_photo_006_2', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_006', CURRENT_TIMESTAMP),
  ('demo_photo_007_1', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_007', CURRENT_TIMESTAMP),
  ('demo_photo_007_2', 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_007', CURRENT_TIMESTAMP),
  ('demo_photo_008_1', 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_008', CURRENT_TIMESTAMP),
  ('demo_photo_008_2', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_008', CURRENT_TIMESTAMP),
  ('demo_photo_009_1', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_009', CURRENT_TIMESTAMP),
  ('demo_photo_009_2', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_009', CURRENT_TIMESTAMP),
  ('demo_photo_010_1', 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_010', CURRENT_TIMESTAMP),
  ('demo_photo_010_2', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_010', CURRENT_TIMESTAMP),
  ('demo_photo_011_1', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_011', CURRENT_TIMESTAMP),
  ('demo_photo_011_2', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_011', CURRENT_TIMESTAMP),
  ('demo_photo_012_1', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_012', CURRENT_TIMESTAMP),
  ('demo_photo_012_2', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_012', CURRENT_TIMESTAMP),
  ('demo_photo_013_1', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_013', CURRENT_TIMESTAMP),
  ('demo_photo_013_2', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_013', CURRENT_TIMESTAMP),
  ('demo_photo_014_1', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_014', CURRENT_TIMESTAMP),
  ('demo_photo_014_2', 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_014', CURRENT_TIMESTAMP),
  ('demo_photo_015_1', 'https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=1400&q=80', 0, 'demo_listing_015', CURRENT_TIMESTAMP),
  ('demo_photo_015_2', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80', 1, 'demo_listing_015', CURRENT_TIMESTAMP);

COMMIT;
