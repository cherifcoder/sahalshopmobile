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

let connectionPromise;

/**
 * Connexion idempotente pour les environnements serverless (Vercel).
 * La connexion est réutilisée entre les invocations à chaud.
 */
export function ensureDatabase() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!connectionPromise) {
    connectionPromise = connectDatabase().finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}
