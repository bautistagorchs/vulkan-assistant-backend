import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { OrderItem } from "../types/types";
const prisma = new PrismaClient();
const router = Router();

// POST /api/orders
router.post("/", async (req, res) => {
  try {
    const { clientId, items } = req.body;

    if (!clientId || !items?.length) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const order = await prisma.order.create({
      data: {
        client: { connect: { id: clientId } },
        items: {
          create: items.map((item: any) => {
            const totalKg = item.boxes * 23;
            const subtotal = totalKg * item.unitPrice;
            return {
              product: { connect: { id: item.productId } },
              boxes: item.boxes,
              totalKg,
              unitPrice: item.unitPrice,
              subtotal,
            };
          }),
        },
      },
      include: { items: true },
    });

    const total = order.items.reduce(
      (sum: number, i: OrderItem) => sum + i.subtotal,
      0
    );

    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        total,
        paymentStatus: "PENDING",
      },
    });

    res.status(201).json({ order, invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el pedido" });
  }
});

export default router;
