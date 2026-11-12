import { getToken } from "./config";

let baseUrl = "";
let token = null;
let unauthorizedHandler = null;

export function setApiBaseUrl(url) {
  baseUrl = url.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  return baseUrl;
}

export function setAuthToken(value) {
  token = value || null;
}

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, params) {
  if (!baseUrl) throw new ApiError("Adresse du serveur non configurée.", 0);
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

async function request(path, { method = "GET", body, params, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Impossible de joindre le serveur. Vérifiez l'adresse de l'API et votre connexion.",
      0
    );
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const message =
      payload?.message ||
      (response.status === 401 ? "Session expirée." : "Une erreur est survenue.");
    throw new ApiError(message, response.status, payload?.details);
  }

  return payload;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

/**
 * Télécharge la facture PDF puis ouvre le partage natif.
 * Le fichier est nommé avec le numéro de facture de la vente.
 */
export async function shareInvoice(sale) {
  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  const authToken = token || (await getToken());

  const uri = `${FileSystem.cacheDirectory}Facture-${sale.invoiceNumber}.pdf`;
  const result = await FileSystem.downloadAsync(
    buildUrl(`/sales/${sale._id}/invoice`),
    uri,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  if (result.status !== 200) {
    throw new ApiError("Impossible de générer la facture.", result.status);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Facture ${sale.invoiceNumber}`,
      UTI: "com.adobe.pdf",
    });
  }
  return result.uri;
}
