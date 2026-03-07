-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "bedrooms" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "confidenceScore" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "latitude" REAL;
ALTER TABLE "Listing" ADD COLUMN "longitude" REAL;
ALTER TABLE "Listing" ADD COLUMN "sqft" INTEGER;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
