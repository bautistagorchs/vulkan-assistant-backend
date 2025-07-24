import { Router } from "express";
import { prisma } from "../lib/prisma";
const router = Router();

// GET /api/invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        order: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener facturas" });
  }
});

export default router;
