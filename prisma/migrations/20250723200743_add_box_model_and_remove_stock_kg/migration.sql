/*
  Warnings:

  - You are about to drop the column `boxes` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `stockKg` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "boxes";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stockKg";

-- CreateTable
CREATE TABLE "Box" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "usedInOrderItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_usedInOrderItemId_fkey" FOREIGN KEY ("usedInOrderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
