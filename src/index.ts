import { PrismaClient } from "@prisma/client";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/index.routes";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api", routes);

app.listen(process.env.PORT, () => {
  console.log("Backend listening on port " + process.env.PORT);
});
