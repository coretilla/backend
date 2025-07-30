/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_client_secret" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "reference_id" TEXT,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_stripe_payment_intent_id_key" ON "deposits"("stripe_payment_intent_id");

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
