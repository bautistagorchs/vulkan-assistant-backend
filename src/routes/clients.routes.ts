import { Router } from "express";
import { prisma } from "../lib/prisma";
const router = Router();

router.get("/", async (req, res) => {
  const clients = await prisma.client.findMany();
  res.json(clients);
});

router.post("/", async (req, res) => {
  const {
    name,
    cuit,
    direccion,
    localidad,
    telefono,
    condicionIVA,
    email,
    notas,
  } = req.body;

  if (!name || !cuit || !condicionIVA) {
    return res.status(400).json({
      error:
        "Faltan datos requeridos: nombre, CUIT y condición frente al IVA son obligatorios.",
    });
  }

  const existing = await prisma.client.findUnique({ where: { cuit } });
  if (existing) {
    return res
      .status(409)
      .json({ error: "Ya existe un cliente con ese CUIT." });
  }

  try {
    const client = await prisma.client.create({
      data: {
        name,
        cuit,
        direccion,
        localidad,
        telefono,
        condicionIVA,
        email,
        notas,
      },
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: "Error al crear el cliente" });
  }
});

router.delete("/all", async (req, res) => {
  // const { confirm } = req.body;

  // if (!confirm) {
  //   return res.status(400).json({
  //     error:
  //       "Confirmation required to delete all clients. Pass { confirm: true } in the body.",
  //   });
  // }
  if (req.body.confirm !== true) {
    return res.status(400).json({
      error:
        "Confirmation required to delete all clients. Pass { confirm: true } in the body.",
    });
  }
  // await prisma.client.deleteMany();
  res.json({ message: "No clients deleted." });
});

// DELETE /api/clients/:id (delete one client with confirmation)
router.delete("/:id", async (req, res) => {
  const { confirm } = req.body;
  if (!confirm) {
    return res.status(400).json({
      error:
        "Confirmation required to delete client. Pass { confirm: true } in the body.",
    });
  }
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid client id." });
  }
  await prisma.client.delete({ where: { id } });
  res.json({ message: `Client ${id} deleted.` });
});

export default router;
