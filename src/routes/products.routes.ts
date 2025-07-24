import { Router } from "express";
import { prisma } from "../lib/prisma";
const router = Router();

router.get("/get-all", async (req, res) => {
  const products = await prisma.product.findMany({
    where: {
      active: true,
    },
  });
  res.json(products);
});

router.get("/get-by-id/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid product id." });
  }
  const product = await prisma.product.findUnique({
    where: { id },
  });
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }
  res.json(product);
});

router.get("/get-boxes/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid product id." });
  }
  const boxes = await prisma.box.findMany({
    where: { productId: id },
  });
  console.log("Boxes for product ID", id, ":", boxes);
  res.json({ boxes });
});

router.post("/", async (req, res) => {
  const { name, basePrice } = req.body;
  const product = await prisma.product.create({
    data: { name, basePrice },
  });
  res.status(201).json(product);
});

// DELETE /api/products (delete all products with confirmation)
router.delete("/", async (req, res) => {
  const { confirm } = req.body;
  if (!confirm) {
    return res.status(400).json({
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
    return res.status(400).json({
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
