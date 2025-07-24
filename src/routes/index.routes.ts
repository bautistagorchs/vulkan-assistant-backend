import { Router } from "express";
import uploadLists from "./upload-lists.routes";
import products from "./products.routes";
import clients from "./clients.routes";
import orders from "./orders.routes";
import invoices from "./invoices.routes";

const router = Router();

router.use("/upload", uploadLists);
router.use("/products", products);
router.use("/clients", clients);
router.use("/orders", orders);
router.use("/invoices", invoices);
router.use("/health", (req, res) => {
  res.json({ message: "API is up and running" });
});

export default router;
