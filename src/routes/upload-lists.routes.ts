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
      boxes: [] as { productName: string; kg: number; isFrozen: boolean }[],
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
      const { productName, kg, isFrozen } = boxData;

      if (
        !productName ||
        typeof kg !== "number" ||
        typeof isFrozen !== "boolean"
      ) {
        results.errors.push(`Caja inválida: ${JSON.stringify(boxData)}`);
        continue;
      }

      results.boxesCreated++;
      results.boxes.push({ productName, kg, isFrozen });
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
      boxes: [] as { productName: string; kg: number; isFrozen: boolean }[],
      totalProducts: data[0] ? Object.keys(data[0]).length : 0,
      totalBoxes: data.length - 1, // Restamos el primer elemento que son los precios
      productSummary: [] as {
        name: string;
        previousPrice: number | null;
        newPrice: number;
        boxesLoaded: number;
      }[],
    };

    // El primer elemento contiene los precios de los productos
    const prices = data[0];

    // El resto de elementos son las cajas individuales
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
          results.productsCreated++;
          results.products.push({ name: productName, basePrice, boxesLoaded });
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
          results.productsUpdated++;
          results.products.push({
            name: productName,
            basePrice,
            previousPrice,
            boxesLoaded,
          });
        }

        // Agregar al resumen
        results.productSummary.push({
          name: productName,
          previousPrice,
          newPrice: basePrice,
          boxesLoaded,
        });

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
        results.errors.push(`Producto ${productName}: ${productError}`);
      }
    }

    // 2. Procesar cajas individuales
    for (const boxData of boxes) {
      try {
        const { productName, kg, isFrozen } = boxData;

        if (
          !productName ||
          typeof kg !== "number" ||
          typeof isFrozen !== "boolean"
        ) {
          results.errors.push(`Caja inválida: ${JSON.stringify(boxData)}`);
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
          results.errors.push(
            `Producto no encontrado para caja: ${productName}`
          );
          continue;
        }

        // Crear la caja
        await prisma.box.create({
          data: {
            productId: product.id,
            kg: kg,
            isFrozen: isFrozen,
          },
        });
        results.boxesCreated++;
        results.boxes.push({
          productName,
          kg,
          isFrozen,
        });
      } catch (boxError) {
        console.error(`Error procesando caja:`, boxError);
        results.errors.push(`Caja ${JSON.stringify(boxData)}: ${boxError}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Procesamiento completado",
      results: results,
    });
  } catch (error) {
    console.error("Error in confirm-boxes-json handler:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;

// router.post("/format-excel", async (req, res) => {
//   try {
//     const form = formidable({
//       uploadDir: "/tmp",
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024, // 10MB max
//     });

//     form.parse(req, (err, fields, files) => {
//       if (err) {
//         console.error("Error parsing form:", err);
//         return res.status(400).json({ error: "Error al procesar el archivo" });
//       }

//       // Obtener el archivo subido
//       const file = Array.isArray(files.file) ? files.file[0] : files.file;

//       if (!file) {
//         return res.status(400).json({ error: "No se encontró archivo" });
//       }

//       // Verificar que sea un archivo Excel
//       if (!file.originalFilename?.match(/\.(xlsx|xls)$/i)) {
//         return res
//           .status(400)
//           .json({ error: "El archivo debe ser un Excel (.xlsx o .xls)" });
//       }

//       try {
//         // Leer el archivo Excel
//         const workbook = XLSX.readFile(file.filepath);

//         // Obtener la primera hoja (asumiendo que siempre viene en la primera)
//         const firstSheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[firstSheetName];

//         // Procesar directamente las celdas B y C desde la fila 5 en adelante
//         const cortesPrecios: {
//           [key: string]: { precio: number; stock: number };
//         } = {};
//         let processedRows = 0;

//         // Obtener el rango de datos (ej: B2:K45)
//         const range = XLSX.utils.decode_range(worksheet["!ref"] || "B5:D45");

//         // Iterar desde la fila 5 (índice 4) hasta el final del rango
//         for (let row = 4; row <= range.e.r; row++) {
//           const corteCell = worksheet[`B${row + 1}`]; // B5, B6, B7, etc.
//           const precioCell = worksheet[`C${row + 1}`]; // C5, C6, C7, etc.
//           const stockCell = worksheet[`D${row + 1}`]; // D5, D6, D7, etc.

//           if (
//             corteCell &&
//             precioCell &&
//             stockCell &&
//             corteCell.v &&
//             precioCell.w !== undefined
//           ) {
//             const corte = corteCell.v.toString().trim();
//             const precio = parseFloat(
//               precioCell.w.split(" ")[1].replace(",", "")
//             );
//             const stock = parseFloat(stockCell.w);

//             // Verificar que el precio sea un número válido
//             if (typeof precio === "number" && !isNaN(precio)) {
//               cortesPrecios[corte] = { precio, stock };
//               processedRows++;
//             }
//           }
//         }

//         // Limpiar archivo temporal
//         fs.unlinkSync(file.filepath);

//         // Devolver los datos formateados
//         res.json({
//           success: true,
//           fileName: file.originalFilename,
//           cortesPrecios: cortesPrecios,
//           totalRows: processedRows,
//         });
//       } catch (parseError) {
//         console.error("Error parsing Excel:", parseError);
//         // Limpiar archivo temporal en caso de error
//         if (fs.existsSync(file.filepath)) {
//           fs.unlinkSync(file.filepath);
//         }
//         res.status(400).json({ error: "Error al procesar el archivo Excel" });
//       }
//     });
//   } catch (error) {
//     console.error("Error in upload handler:", error);
//     res.status(500).json({ error: "Error interno del servidor" });
//   }
// });

// router.post("/confirm-new-list", async (req, res) => {
//   try {
//     const { cortesPrecios } = req.body;

//     if (!cortesPrecios || typeof cortesPrecios !== "object") {
//       return res
//         .status(400)
//         .json({ error: "Se requiere el objeto cortesPrecios" });
//     }

//     const results = {
//       updated: 0,
//       created: 0,
//       errors: [] as string[],
//     };

//     // Procesar cada corte/precio/stock
//     for (const [nombreCorte, data] of Object.entries(cortesPrecios)) {
//       try {
//         // Extraer precio y stock del objeto
//         const { precio, stock } = data as { precio: number; stock: number };

//         // Buscar el producto por nombre
//         let product = await prisma.product.findFirst({
//           where: {
//             name: {
//               contains: nombreCorte,
//               mode: "insensitive",
//             },
//           },
//         });

//         if (!product) {
//           // Crear el producto si no existe
//           product = await prisma.product.create({
//             data: {
//               name: nombreCorte,
//               basePrice: precio,
//               active: true,
//             },
//           });
//           results.created++;
//         } else {
//           // Actualizar basePrice del producto existente
//           await prisma.product.update({
//             where: { id: product.id },
//             data: {
//               basePrice: precio,
//             },
//           });
//           results.updated++;
//         }

//         // Crear una nueva caja con el stock ingresado
//         if (stock > 0) {
//           await prisma.box.create({
//             data: {
//               productId: product.id,
//               kg: stock,
//               isFrozen: false, // Valor por defecto, se puede ajustar según necesidad
//             },
//           });
//         }

//         // Crear nuevo registro de precio histórico
//         await prisma.productPrice.create({
//           data: {
//             productId: product.id,
//             finalPrice: precio,
//             validFrom: new Date(),
//           },
//         });
//       } catch (productError) {
//         console.error(`Error procesando ${nombreCorte}:`, productError);
//         results.errors.push(`${nombreCorte}: ${productError}`);
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: "Procesamiento completado",
//       results: results,
//     });
//   } catch (error) {
//     console.error("Error in update-prices handler:", error);
//     res.status(500).json({ error: "Error interno del servidor" });
//   }
// });
