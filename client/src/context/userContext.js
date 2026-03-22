import { createContext, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

export const UserContext = createContext();

const parseStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenExpired = (token, skewSeconds = 15) => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
};

const UserProvider = ({ children }) => {  
  const [currentUser, setCurrentUser] = useState(
    parseStoredUser()
  );
  const [toasts, setToasts] = useState([]);
  const lastAuthToastAtRef = useRef(0);
  const refreshInFlightRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAuthSession = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("user");
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshToken = currentUser?.refreshToken;
    if (!refreshToken) return false;

    refreshInFlightRef.current = axios
      .post(`${process.env.REACT_APP_BASE_URL}/users/refresh`, { refreshToken })
      .then((response) => {
        const nextToken = response.data?.token;
        const nextRefreshToken = response.data?.refreshToken || refreshToken;

        if (!nextToken) {
          throw new Error("No access token returned from refresh endpoint.");
        }

        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            token: nextToken,
            refreshToken: nextRefreshToken,
          };
        });

        return true;
      })
      .catch(() => {
        clearAuthSession();
        return false;
      })
      .finally(() => {
        refreshInFlightRef.current = null;
      });

    return refreshInFlightRef.current;
  }, [clearAuthSession, currentUser?.refreshToken]);

  const handleAuthFailure = useCallback((error, fallbackMessage = "Session expired. Please login again.") => {
    const status = error?.response?.status;
    if (status !== 401 && status !== 403) return false;

    clearAuthSession();

    const now = Date.now();
    if (now - lastAuthToastAtRef.current > 1500) {
      showToast(error?.response?.data?.message || fallbackMessage, "error");
      lastAuthToastAtRef.current = now;
    }

    return true;
  }, [clearAuthSession, showToast]);

  useEffect(() => {
    if (!currentUser?.token) return;
    if (!isTokenExpired(currentUser.token)) return;

    refreshAccessToken().then((ok) => {
      if (!ok) {
        showToast("Session expired. Please login again.", "error");
      }
    });
  }, [currentUser?.token, refreshAccessToken, showToast]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.removeItem("user");
      return;
    }
    localStorage.setItem("user", JSON.stringify(currentUser));
  }, [currentUser]);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        toasts,
        showToast,
        dismissToast,
        clearAuthSession,
        refreshAccessToken,
        handleAuthFailure,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;