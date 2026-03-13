-- Better Auth が管理するテーブル
CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image"         TEXT,
  "createdAt"     DATETIME NOT NULL,
  "updatedAt"     DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATETIME NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  DATETIME,
  "refreshTokenExpiresAt" DATETIME,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             DATETIME NOT NULL,
  "updatedAt"             DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  DATETIME NOT NULL,
  "createdAt"  DATETIME,
  "updatedAt"  DATETIME
);

-- アプリ固有テーブル
CREATE TABLE IF NOT EXISTS "tag" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "dish" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "recipeUrl"  TEXT,
  "recipeText" TEXT,
  "effort"     TEXT NOT NULL,
  "category"   TEXT NOT NULL,
  "cookedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "dish_tag" (
  "dishId" TEXT NOT NULL,
  "tagId"  TEXT NOT NULL,
  PRIMARY KEY ("dishId", "tagId"),
  FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tagId")  REFERENCES "tag"("id")  ON DELETE CASCADE
);
