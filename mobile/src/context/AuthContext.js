import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getToken, loadApiUrl, saveApiUrl, saveToken } from "../api/config";
import { onUnauthorized, setApiBaseUrl, setAuthToken } from "../api/client";
import { authApi } from "../api/services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [apiUrl, setApiUrlState] = useState("");
  const [initializing, setInitializing] = useState(true);
  const mounted = useRef(true);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    await saveToken(null);
    await AsyncStorage.removeItem("@sahal/user");
    if (mounted.current) {
      setTokenState(null);
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  useEffect(() => {
    mounted.current = true;
    onUnauthorized(() => {
      clearSession();
    });

    (async () => {
      try {
        const url = await loadApiUrl();
        setApiBaseUrl(url);
        if (mounted.current) setApiUrlState(url);

        const storedToken = await getToken();
        if (storedToken) {
          setAuthToken(storedToken);
          try {
            const response = await authApi.me();
            if (mounted.current) {
              setTokenState(storedToken);
              setUser(response.user);
            }
          } catch {
            await clearSession();
          }
        }
      } finally {
        if (mounted.current) setInitializing(false);
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, [clearSession]);

  const login = useCallback(async (username, password) => {
    const response = await authApi.login(username.trim(), password);
    await saveToken(response.token);
    setAuthToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const updateApiUrl = useCallback(
    async (url) => {
      const normalized = await saveApiUrl(url);
      setApiBaseUrl(normalized);
      setApiUrlState(normalized);
      return normalized;
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const response = await authApi.me();
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      apiUrl,
      initializing,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === "admin",
      login,
      logout,
      updateApiUrl,
      refreshUser,
    }),
    [
      user,
      token,
      apiUrl,
      initializing,
      login,
      logout,
      updateApiUrl,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider.");
  return context;
}
