-- CreateTable
CREATE TABLE "Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frameType" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "atk" INTEGER,
    "def" INTEGER,
    "level" INTEGER,
    "race" TEXT NOT NULL DEFAULT '',
    "attribute" TEXT,
    "imageUrl" TEXT NOT NULL,
    "hasLocalImage" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CardSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardId" INTEGER NOT NULL,
    "setName" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "setRarity" TEXT NOT NULL,
    "setRarityCode" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CardSet_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchlistEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deck" TEXT NOT NULL DEFAULT '',
    "cardId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "setName" TEXT,
    "rarity" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatchlistEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Price" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "watchlistEntryId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "price" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Price_watchlistEntryId_fkey" FOREIGN KEY ("watchlistEntryId") REFERENCES "WatchlistEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Price_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "CardSet_cardId_idx" ON "CardSet"("cardId");

-- CreateIndex
CREATE INDEX "CardSet_setName_idx" ON "CardSet"("setName");

-- CreateIndex
CREATE UNIQUE INDEX "CardSet_cardId_setCode_key" ON "CardSet"("cardId", "setCode");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_name_key" ON "Seller"("name");

-- CreateIndex
CREATE INDEX "WatchlistEntry_cardId_idx" ON "WatchlistEntry"("cardId");

-- CreateIndex
CREATE INDEX "Price_watchlistEntryId_idx" ON "Price"("watchlistEntryId");

-- CreateIndex
CREATE INDEX "Price_sellerId_idx" ON "Price"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Price_watchlistEntryId_sellerId_key" ON "Price"("watchlistEntryId", "sellerId");
