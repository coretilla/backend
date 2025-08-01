-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'SWAP';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "btc_amount" DECIMAL(20,8),
ADD COLUMN     "btc_price" DECIMAL(15,2),
ADD COLUMN     "status" TEXT DEFAULT 'COMPLETED',
ADD COLUMN     "transaction_hash" TEXT;
