-- CreateTable: ExpenseCategory
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL
);

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "approvedAt" INTEGER,
    "createdAt" INTEGER NOT NULL,
    FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id")
);
