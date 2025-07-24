import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET - Obtener todo el stock (productos con cajas disponibles)
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        boxes: {
          where: {
            usedInOrderItemId: null, // Solo cajas no asignadas a órdenes
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [
        { hasStock: "desc" }, // Productos con stock primero
        { name: "asc" },
      ],
    });

    // Actualizar hasStock basado en cajas disponibles
    for (const product of products) {
      const hasBoxes = product.boxes.length > 0;
      if (product.hasStock !== hasBoxes) {
        await prisma.product.update({
          where: { id: product.id },
          data: { hasStock: hasBoxes },
        });
        product.hasStock = hasBoxes;
      }
    }

    res.json({ products });
  } catch (error) {
    console.error("Error obteniendo stock:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT - Actualizar producto
router.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, basePrice, active } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(active !== undefined && { active }),
      },
      include: {
        boxes: {
          where: { usedInOrderItemId: null },
        },
      },
    });

    res.json({ product: updatedProduct });
  } catch (error) {
    console.error("Error actualizando producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// PUT - Actualizar caja
router.put("/boxes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { kg, isFrozen } = req.body;

    const updatedBox = await prisma.box.update({
      where: { id: parseInt(id) },
      data: {
        ...(kg !== undefined && { kg: parseFloat(kg) }),
        ...(isFrozen !== undefined && { isFrozen }),
      },
    });

    res.json({ box: updatedBox });
  } catch (error) {
    console.error("Error actualizando caja:", error);
    res.status(500).json({ error: "Error al actualizar caja" });
  }
});

// DELETE - Eliminar caja
router.delete("/boxes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.box.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Caja eliminada exitosamente" });
  } catch (error) {
    console.error("Error eliminando caja:", error);
    res.status(500).json({ error: "Error al eliminar caja" });
  }
});

// POST - Agregar nueva caja a producto
router.post("/products/:id/boxes", async (req, res) => {
  try {
    const { id } = req.params;
    const { kg, isFrozen } = req.body;

    const newBox = await prisma.box.create({
      data: {
        productId: parseInt(id),
        kg: parseFloat(kg),
        isFrozen: isFrozen || false,
      },
    });

    // Actualizar hasStock del producto
    await prisma.product.update({
      where: { id: parseInt(id) },
      data: { hasStock: true },
    });

    res.json({ box: newBox });
  } catch (error) {
    console.error("Error creando caja:", error);
    res.status(500).json({ error: "Error al crear caja" });
  }
});

export default router;
