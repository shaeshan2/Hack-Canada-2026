BEGIN TRANSACTION;

-- Clean previous demo rows so reseeding stays deterministic.
DELETE FROM "Message" WHERE "listingId" LIKE 'demo_listing_%';
DELETE FROM "Photo" WHERE "listingId" LIKE 'demo_listing_%';
DELETE FROM "FraudFlag" WHERE "listingId" LIKE 'demo_listing_%';
DELETE FROM "Listing" WHERE "id" LIKE 'demo_listing_%';
DELETE FROM "SellerVerificationSubmission" WHERE "id" LIKE 'demo_svs_%';
DELETE FROM "User" WHERE "id" LIKE 'demo_buyer_%';
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

-- Demo sellers awaiting verification (these appear in the admin review queue).
INSERT INTO "User" ("id", "auth0Id", "email", "name", "role", "blockedReason", "createdAt", "updatedAt") VALUES
  ('demo_seller_006', 'auth0|demo_seller_006', 'james.wilson@deedscan.demo', 'James Wilson', 'SELLER_PENDING', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_seller_007', 'auth0|demo_seller_007', 'isabella.clark@deedscan.demo', 'Isabella Clark', 'SELLER_PENDING', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Demo buyers for chat threads.
INSERT INTO "User" ("id", "auth0Id", "email", "name", "role", "blockedReason", "createdAt", "updatedAt") VALUES
  ('demo_buyer_001', 'auth0|demo_buyer_001', 'ava.morgan@deedscan.demo', 'Ava Morgan', 'BUYER', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_buyer_002', 'auth0|demo_buyer_002', 'lucas.brown@deedscan.demo', 'Lucas Brown', 'BUYER', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('demo_buyer_003', 'auth0|demo_buyer_003', 'mia.singh@deedscan.demo', 'Mia Singh', 'BUYER', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

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

-- Seed conversations so /messages has realistic history + unread badges.
INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt") VALUES
  ('demo_msg_001', 'Hi Amelia, is the basement finished and permitted?', 1, 'demo_buyer_001', 'demo_seller_001', 'demo_listing_001', datetime('now', '-4 day')),
  ('demo_msg_002', 'Yes, fully finished and we have city permits on file.', 1, 'demo_seller_001', 'demo_buyer_001', 'demo_listing_001', datetime('now', '-4 day', '+18 minutes')),
  ('demo_msg_003', 'Great. Are you open to offers with a 60-day close?', 0, 'demo_buyer_001', 'demo_seller_001', 'demo_listing_001', datetime('now', '-3 day')),
  ('demo_msg_004', 'Is parking included in this condo unit?', 1, 'demo_buyer_002', 'demo_seller_002', 'demo_listing_002', datetime('now', '-2 day')),
  ('demo_msg_005', 'Yes, one underground spot is included.', 0, 'demo_seller_002', 'demo_buyer_002', 'demo_listing_002', datetime('now', '-2 day', '+12 minutes')),
  ('demo_msg_006', 'Do you have recent utility costs for winter months?', 1, 'demo_buyer_003', 'demo_seller_005', 'demo_listing_005', datetime('now', '-1 day')),
  ('demo_msg_007', 'Average is about $165/month including hydro.', 0, 'demo_seller_005', 'demo_buyer_003', 'demo_listing_005', datetime('now', '-1 day', '+9 minutes')),
  ('demo_msg_008', 'Can we schedule a showing Saturday afternoon?', 0, 'demo_buyer_002', 'demo_seller_004', 'demo_listing_004', datetime('now', '-6 hours'));

-- If test@test.com exists (local Auth0 test user), seed inbox examples for that account too.
INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt")
SELECT 'demo_msg_test_001', 'Hi, could you share the strata fees for this listing?', 0, 'demo_seller_003', u.id, 'demo_listing_003', datetime('now', '-90 minutes')
FROM "User" u
WHERE u.email = 'test@test.com'
LIMIT 1;

INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt")
SELECT 'demo_msg_test_002', 'Absolutely, fees are $412/month and include water.', 0, u.id, 'demo_seller_003', 'demo_listing_003', datetime('now', '-75 minutes')
FROM "User" u
WHERE u.email = 'test@test.com'
LIMIT 1;

INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt")
SELECT 'demo_msg_test_003', 'Is this townhouse still available for private showing?', 0, u.id, 'demo_seller_005', 'demo_listing_015', datetime('now', '-70 minutes')
FROM "User" u
WHERE u.email = 'test@test.com'
LIMIT 1;

INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt")
SELECT 'demo_msg_test_004', 'Yes, we have openings this Friday and Sunday.', 0, 'demo_seller_005', u.id, 'demo_listing_015', datetime('now', '-62 minutes')
FROM "User" u
WHERE u.email = 'test@test.com'
LIMIT 1;

INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt")
SELECT 'demo_msg_test_005', 'Can you share recent strata minutes for this condo?', 1, u.id, 'demo_seller_002', 'demo_listing_002', datetime('now', '-55 minutes')
FROM "User" u
WHERE u.email = 'test@test.com'
LIMIT 1;

INSERT INTO "Message" ("id", "content", "read", "senderId", "recipientId", "listingId", "createdAt")
SELECT 'demo_msg_test_006', 'Sure, I can send them after 6 PM today.', 0, 'demo_seller_002', u.id, 'demo_listing_002', datetime('now', '-49 minutes')
FROM "User" u
WHERE u.email = 'test@test.com'
LIMIT 1;

-- ─────────────────────────────────────────────────────────
-- Fraud breakdown data for all demo listings
-- ─────────────────────────────────────────────────────────
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":95,"reverseImage":90,"exifMatch":88,"priceSanity":92,"addressValid":90}', "flagsJson"='[]' WHERE "id"='demo_listing_001';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":88,"reverseImage":84,"exifMatch":82,"priceSanity":90,"addressValid":86}', "flagsJson"='[]' WHERE "id"='demo_listing_002';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":96,"reverseImage":92,"exifMatch":90,"priceSanity":94,"addressValid":93}', "flagsJson"='[]' WHERE "id"='demo_listing_003';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":80,"reverseImage":76,"exifMatch":82,"priceSanity":80,"addressValid":77}', "flagsJson"='[]' WHERE "id"='demo_listing_004';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":90,"reverseImage":86,"exifMatch":88,"priceSanity":90,"addressValid":86}', "flagsJson"='[]' WHERE "id"='demo_listing_005';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":74,"reverseImage":68,"exifMatch":70,"priceSanity":78,"addressValid":72}', "flagsJson"='["Minor EXIF inconsistency detected"]' WHERE "id"='demo_listing_006';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":86,"reverseImage":82,"exifMatch":84,"priceSanity":86,"addressValid":82}', "flagsJson"='[]' WHERE "id"='demo_listing_007';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":93,"reverseImage":89,"exifMatch":88,"priceSanity":90,"addressValid":90}', "flagsJson"='[]' WHERE "id"='demo_listing_008';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":70,"reverseImage":55,"exifMatch":62,"priceSanity":78,"addressValid":72}', "flagsJson"='["Possible duplicate photo","GPS coordinates do not match address"]' WHERE "id"='demo_listing_009';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":98,"reverseImage":95,"exifMatch":94,"priceSanity":96,"addressValid":92}', "flagsJson"='[]' WHERE "id"='demo_listing_010';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":83,"reverseImage":79,"exifMatch":80,"priceSanity":84,"addressValid":79}', "flagsJson"='[]' WHERE "id"='demo_listing_011';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":78,"reverseImage":72,"exifMatch":76,"priceSanity":80,"addressValid":74}', "flagsJson"='["Reverse image search returned a partial match"]' WHERE "id"='demo_listing_012';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":65,"reverseImage":62,"exifMatch":74,"priceSanity":72,"addressValid":74}', "flagsJson"='["Stock photo match found","Address could not be fully verified"]' WHERE "id"='demo_listing_013';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":48,"reverseImage":42,"exifMatch":56,"priceSanity":75,"addressValid":65}', "flagsJson"='["Duplicate photo detected","Image found in other online listings","Low photo authenticity score"]' WHERE "id"='demo_listing_014';
UPDATE "Listing" SET "breakdownJson"='{"perceptualHash":38,"reverseImage":48,"exifMatch":52,"priceSanity":68,"addressValid":58}', "flagsJson"='["Photos appear reused from a different property","Address verification incomplete","Significant price outlier detected"]' WHERE "id"='demo_listing_015';

-- ─────────────────────────────────────────────────────────
-- FraudFlag rows (admin review queue)
-- ─────────────────────────────────────────────────────────
INSERT INTO "FraudFlag" ("id","listingId","status","confidenceScore","breakdownJson","matchedImagesJson","notes","createdAt","reviewedAt","reviewedById") VALUES
  ('demo_flag_015','demo_listing_015','PENDING_REVIEW',52,'{"perceptualHash":38,"reverseImage":48,"exifMatch":52,"priceSanity":68,"addressValid":58}','[]',NULL,datetime('now','-2 day'),NULL,NULL),
  ('demo_flag_014','demo_listing_014','PENDING_REVIEW',58,'{"perceptualHash":48,"reverseImage":42,"exifMatch":56,"priceSanity":75,"addressValid":65}','[]',NULL,datetime('now','-1 day'),NULL,NULL),
  ('demo_flag_009','demo_listing_009','PENDING_REVIEW',67,'{"perceptualHash":70,"reverseImage":55,"exifMatch":62,"priceSanity":78,"addressValid":72}','[]',NULL,datetime('now','-3 day'),NULL,NULL),
  ('demo_flag_012','demo_listing_012','APPROVED',76,'{"perceptualHash":78,"reverseImage":72,"exifMatch":76,"priceSanity":80,"addressValid":74}','[]','Reviewed: reverse image match was from the same property listed previously.',datetime('now','-5 day'),datetime('now','-4 day'),'demo_admin_001'),
  ('demo_flag_013','demo_listing_013','APPROVED',69,'{"perceptualHash":65,"reverseImage":62,"exifMatch":74,"priceSanity":72,"addressValid":74}','[]','Reviewed: stock photo used as placeholder; original photos provided and verified.',datetime('now','-6 day'),datetime('now','-5 day'),'demo_admin_001');

-- ─────────────────────────────────────────────────────────
-- Seller verification submissions (admin review queue)
-- ─────────────────────────────────────────────────────────
INSERT INTO "SellerVerificationSubmission" ("id","userId","govIdDocumentUrl","ownershipProofUrl","status","rejectionReason","aiAnalysis","aiConfidence","submittedAt","reviewedAt","reviewedById") VALUES
  ('demo_svs_001','demo_seller_006','/uploads/mmgmvb78-wd82d7f.png','/uploads/mmgmvb78-wd82d7f.png','PENDING',NULL,NULL,NULL,datetime('now','-1 day'),NULL,NULL),
  ('demo_svs_002','demo_seller_007','/uploads/mmgmvb78-wd82d7f.png','/uploads/mmgmvb78-wd82d7f.png','PENDING',NULL,NULL,NULL,datetime('now','-4 hours'),NULL,NULL),
  ('demo_svs_003','demo_seller_001','/uploads/mmgmvb78-wd82d7f.png','/uploads/mmgmvb78-wd82d7f.png','APPROVED',NULL,'Documents appear authentic. Property ownership confirmed.',94,datetime('now','-30 day'),datetime('now','-29 day'),'demo_admin_001'),
  ('demo_svs_004','demo_seller_002','/uploads/mmgmvb78-wd82d7f.png','/uploads/mmgmvb78-wd82d7f.png','APPROVED',NULL,'All documents verified successfully.',91,datetime('now','-25 day'),datetime('now','-24 day'),'demo_admin_001');

COMMIT;
