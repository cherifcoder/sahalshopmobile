import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Connexion unique à MongoDB Atlas.
 * On précise le nom de la base pour éviter d'écrire dans la base "test" par défaut.
 */
export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDb,
    serverSelectionTimeoutMS: 15000,
  });

  console.log(`✅ MongoDB connecté (base : ${mongoose.connection.name})`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
