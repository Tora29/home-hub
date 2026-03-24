-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ingredients" TEXT,
    "steps" TEXT,
    "sourceUrl" TEXT,
    "servings" INTEGER,
    "cookingTimeMinutes" INTEGER,
    "cookedCount" INTEGER NOT NULL DEFAULT 0,
    "lastCookedAt" INTEGER,
    "rating" TEXT,
    "difficulty" TEXT,
    "memo" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);
