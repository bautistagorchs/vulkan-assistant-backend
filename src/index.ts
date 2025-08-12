import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/index.routes";
import { prisma } from "./lib/prisma";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api", routes);

prisma
  .$connect()
  .then(() => {
    console.log("✅ Conexión a la base de datos establecida");
  })
  .catch((error) => {
    console.error("❌ Error al conectar con la base de datos:", error);
  });

app.listen(process.env.PORT, () => {
  console.log("Backend listening on port " + process.env.PORT);
});
