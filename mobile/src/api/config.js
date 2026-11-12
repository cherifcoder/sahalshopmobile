import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_URL_KEY = "@sahal/api_url_v2";
const TOKEN_KEY = "@sahal/token";

const envUrl = process.env.EXPO_PUBLIC_API_URL;

/**
 * En développement Expo Go, l'API tourne sur la machine qui sert le bundle.
 * On déduit donc son IP pour que le téléphone puisse la joindre sur le réseau local.
 */
export function detectDefaultApiUrl() {
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:5000/api`;
  }

  // Émulateur Android / simulateur iOS
  return Platform.OS === "android"
    ? "http://10.0.2.2:5000/api"
    : "http://localhost:5000/api";
}

export async function loadApiUrl() {
  const saved = await AsyncStorage.getItem(API_URL_KEY);
  return saved || detectDefaultApiUrl();
}

export async function saveApiUrl(url) {
  const normalized = url.trim().replace(/\/+$/, "");
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export const storageKeys = { API_URL_KEY, TOKEN_KEY };
