/*
  Warnings:

  - You are about to drop the `SalesTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesTransactionItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SalesTransaction" DROP CONSTRAINT "SalesTransaction_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SalesTransactionItem" DROP CONSTRAINT "SalesTransactionItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesTransactionItem" DROP CONSTRAINT "SalesTransactionItem_transactionId_fkey";

-- DropTable
DROP TABLE "SalesTransaction";

-- DropTable
DROP TABLE "SalesTransactionItem";

-- DropEnum
DROP TYPE "TransactionStatus";
