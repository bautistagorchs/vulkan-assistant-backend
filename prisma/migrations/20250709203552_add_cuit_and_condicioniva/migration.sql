/*
  Warnings:

  - A unique constraint covering the columns `[cuit]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `condicionIVA` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cuit` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direccion` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localidad` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefono` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CondicionIVA" AS ENUM ('RI', 'Monotributo', 'Exento', 'ConsumidorFinal');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "condicionIVA" "CondicionIVA" NOT NULL,
ADD COLUMN     "cuit" TEXT NOT NULL,
ADD COLUMN     "direccion" TEXT NOT NULL,
ADD COLUMN     "localidad" TEXT NOT NULL,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "telefono" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Client_cuit_key" ON "Client"("cuit");
