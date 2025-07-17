import { Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = Router();

// GET /api/products
router.get("/", async (req, res) => {
  const products = await prisma.product.findMany({
    include: { prices: true },
  });
  res.json(products);
});

// POST /api/products
router.post("/", async (req, res) => {
  const { name, basePrice, stockKg } = req.body;
  const product = await prisma.product.create({
    data: { name, basePrice, stockKg },
  });
  res.status(201).json(product);
});

// DELETE /api/products (delete all products with confirmation)
router.delete("/", async (req, res) => {
  const { confirm } = req.body;
  if (!confirm) {
    return res
      .status(400)
      .json({
        error:
          "Confirmation required to delete all products. Pass { confirm: true } in the body.",
      });
  }
  await prisma.product.deleteMany();
  res.json({ message: "All products deleted." });
});

// DELETE /api/products/:id (delete one product with confirmation)
router.delete("/:id", async (req, res) => {
  const { confirm } = req.body;
  if (!confirm) {
    return res
      .status(400)
      .json({
        error:
          "Confirmation required to delete product. Pass { confirm: true } in the body.",
      });
  }
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid product id." });
  }
  await prisma.product.delete({ where: { id } });
  res.json({ message: `Product ${id} deleted.` });
});

export default router;
