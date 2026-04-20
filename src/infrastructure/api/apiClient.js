import axios from "axios";
import { auth } from "../firebase/config.js";

/**
 * Core Application API Client
 * This module configures a global Axios instance responsible for backend communications.
 * It features request interceptors that securely inject valid Firebase Authorization Tokens.
 */

const apiClient = axios.create({
  // Backend serves `/v1` at the server root (no `/api` prefix). Override with VITE_API_BASE_URL.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, 
});

// -----------------------------------------------------------------------------
// Request Interceptor: Attach Firebase Auth Token
// -----------------------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config) => {
     try {
        const currentUser = auth.currentUser;
        if (currentUser) {
           const token = await currentUser.getIdToken();
           config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Multi-tenant Header Injection
        // Extract strictly bound target workspace routing identifiers
        const activeOrgId = localStorage.getItem("printq_active_org_id");
        if (activeOrgId) {
           config.headers["X-Organization-Id"] = activeOrgId;
        }

     } catch (e) {
        console.error("Token resolution error", e);
     }
     return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// -----------------------------------------------------------------------------
// Response Interceptor: Global Error Handling
// -----------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Globally trap 401 Unauthorized errors (e.g. expired tokens rejected by your server)
    if (error.response && error.response.status === 401) {
      console.warn("API request denied: 401 Unauthorized. Server rejected token.");
      // Optional: Dispatch a global logout event here if needed later
    }
    return Promise.reject(error);
  }
);

export default apiClient;
