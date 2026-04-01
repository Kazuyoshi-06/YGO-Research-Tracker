-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WatchlistEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deck" TEXT NOT NULL DEFAULT '',
    "cardId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "setName" TEXT,
    "rarity" TEXT,
    "status" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatchlistEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WatchlistEntry" ("cardId", "createdAt", "deck", "id", "quantity", "rarity", "setName", "sortOrder", "updatedAt") SELECT "cardId", "createdAt", "deck", "id", "quantity", "rarity", "setName", "sortOrder", "updatedAt" FROM "WatchlistEntry";
DROP TABLE "WatchlistEntry";
ALTER TABLE "new_WatchlistEntry" RENAME TO "WatchlistEntry";
CREATE INDEX "WatchlistEntry_cardId_idx" ON "WatchlistEntry"("cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
