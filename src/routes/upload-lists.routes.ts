import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/upload-boxes-json", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ error: "Se requiere un array con datos de precios y cajas" });
    }

    const results = {
      productsUpdated: 0,
      productsCreated: 0,
      boxesCreated: 0,
      errors: [] as string[],
      products: [] as {
        name: string;
        basePrice: number;
        previousPrice?: number;
        boxesLoaded: number;
      }[],
      boxes: [] as {
        productName: string;
        kg: number;
        isFrozen: boolean;
        entryDate?: string;
      }[],
      totalProducts: data[0] ? Object.keys(data[0]).length : 0,
      totalBoxes: data.length - 1,
      productSummary: [] as {
        name: string;
        previousPrice: number | null;
        newPrice: number;
        boxesLoaded: number;
      }[],
    };

    const prices = data[0];
    const boxes = data.slice(1);
    const boxesCountByProduct = new Map<string, number>();

    // Contar cajas por producto
    for (const boxData of boxes) {
      const { productName } = boxData;
      if (productName) {
        const currentCount = boxesCountByProduct.get(productName) || 0;
        boxesCountByProduct.set(productName, currentCount + 1);
      }
    }

    // Validar precios de productos (sin guardar)
    for (const [productName, price] of Object.entries(prices)) {
      try {
        const basePrice = price as number;
        const boxesLoaded = boxesCountByProduct.get(productName) || 0;

        const product = await prisma.product.findFirst({
          where: {
            name: { equals: productName, mode: "insensitive" },
          },
        });

        const previousPrice = product?.basePrice || null;

        if (!product) {
          results.productsCreated++;
        } else {
          results.productsUpdated++;
        }

        results.productSummary.push({
          name: productName,
          previousPrice,
          newPrice: basePrice,
          boxesLoaded,
        });

        results.products.push({
          name: productName,
          basePrice,
          previousPrice: previousPrice ?? undefined,
          boxesLoaded,
        });
      } catch (error) {
        results.errors.push(
          `Error validando producto ${productName}: ${error}`
        );
      }
    }

    // Validar cajas (sin guardar)
    for (const boxData of boxes) {
      const { productName, kg, isFrozen, entryDate } = boxData;

      if (
        !productName ||
        typeof kg !== "number" ||
        typeof isFrozen !== "boolean"
      ) {
        results.errors.push(`Caja inválida: ${JSON.stringify(boxData)}`);
        continue;
      }

      results.boxesCreated++;
      results.boxes.push({ productName, kg, isFrozen, entryDate });
    }

    res.status(200).json({
      success: true,
      message: "Validación completada - Datos listos para confirmar",
      results,
    });
  } catch (error) {
    console.error("Error in upload-boxes-json handler:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/confirm-boxes-json", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ error: "Se requiere un array con datos de precios y cajas" });
    }

    // const results = {
    //   productsUpdated: 0,
    //   productsCreated: 0,
    //   boxesCreated: 0,
    //   errors: [] as string[],
    //   products: [] as {
    //     name: string;
    //     basePrice: number;
    //     previousPrice?: number;
    //     boxesLoaded: number;
    //   }[],
    //   boxes: [] as {
    //     productName: string;
    //     kg: number;
    //     isFrozen: boolean;
    //     entryDate?: string;
    //   }[],
    //   totalProducts: data[0] ? Object.keys(data[0]).length : 0,
    //   totalBoxes: data.length - 1, // Restamos el primer elemento que son los precios
    //   productSummary: [] as {
    //     name: string;
    //     previousPrice: number | null;
    //     newPrice: number;
    //     boxesLoaded: number;
    //   }[],
    // };

    // Precios de los productos
    const prices = data[0];

    const boxes = data.slice(1);

    // Mapa para contar cajas por producto
    const boxesCountByProduct = new Map<string, number>();

    // Primero contamos las cajas por producto
    for (const boxData of boxes) {
      const { productName } = boxData;
      if (productName) {
        const currentCount = boxesCountByProduct.get(productName) || 0;
        boxesCountByProduct.set(productName, currentCount + 1);
      }
    }

    // 1. Procesar precios de productos
    for (const [productName, price] of Object.entries(prices)) {
      try {
        const basePrice = price as number;
        const boxesLoaded = boxesCountByProduct.get(productName) || 0;

        // Buscar el producto por nombre
        let product = await prisma.product.findFirst({
          where: {
            name: {
              equals: productName,
              mode: "insensitive",
            },
          },
        });

        let previousPrice: number | null = null;

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: productName,
              basePrice: basePrice,
              active: true,
              hasStock: boxesLoaded > 0,
            },
          });
          // results.productsCreated++;
          // results.products.push({ name: productName, basePrice, boxesLoaded });
        } else {
          // Guardar precio anterior
          previousPrice = product.basePrice;

          // Actualizar basePrice del producto existente
          await prisma.product.update({
            where: { id: product.id },
            data: {
              basePrice: basePrice,
            },
          });
          // results.productsUpdated++;
          // results.products.push({
          //   name: productName,
          //   basePrice,
          //   previousPrice,
          //   boxesLoaded,
          // });
        }

        // Agregar al resumen
        // results.productSummary.push({
        //   name: productName,
        //   previousPrice,
        //   newPrice: basePrice,
        //   boxesLoaded,
        // });

        // Crear nuevo registro de precio histórico
        await prisma.productPrice.create({
          data: {
            productId: product.id,
            finalPrice: basePrice,
            validFrom: new Date(),
          },
        });
      } catch (productError) {
        console.error(
          `Error procesando producto ${productName}:`,
          productError
        );
        // results.errors.push(`Producto ${productName}: ${productError}`);
      }
    }

    // 2. Procesar cajas individuales
    for (const boxData of boxes) {
      try {
        const { productName, kg, isFrozen, entryDate } = boxData;

        if (
          !productName ||
          typeof kg !== "number" ||
          typeof isFrozen !== "boolean"
        ) {
          // results.errors.push(`Caja inválida: ${JSON.stringify(boxData)}`);
          continue;
        }

        // Buscar el producto por nombre
        const product = await prisma.product.findFirst({
          where: {
            name: {
              equals: productName,
              mode: "insensitive",
            },
          },
        });

        if (!product) {
          // results.errors.push(
          //   `Producto no encontrado para caja: ${productName}`
          // );
          continue;
        }

        // Crear la caja
        await prisma.box.create({
          data: {
            productId: product.id,
            kg: kg,
            isFrozen: isFrozen,
            entryDate: entryDate ? new Date(entryDate) : null,
          },
        });
        // results.boxesCreated++;
        // results.boxes.push({
        //   productName,
        //   kg,
        //   isFrozen,
        //   entryDate,
        // });
      } catch (boxError) {
        console.error(`Error procesando caja:`, boxError);
        // results.errors.push(`Caja ${JSON.stringify(boxData)}: ${boxError}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Procesamiento completado",
      // results: results,
    });
  } catch (error) {
    console.error("Error in confirm-boxes-json handler:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
