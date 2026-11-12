import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

let server;

async function start() {
  try {
    await connectDatabase();

    server = app.listen(env.port, "0.0.0.0", () => {
      console.log(`🚀 API SAHAL SHOP : http://localhost:${env.port}/api`);
      console.log(`🌍 Environnement : ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error("❌ Impossible de démarrer le serveur :", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`\n${signal} reçu, arrêt propre...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection :", error);
});

start();
