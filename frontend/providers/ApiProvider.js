import { BackendServiceProvider } from "@/services/backend";
import { IndexedDbServiceProvider } from "@/services/indexedDb";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { createContext, useContext, useEffect, useState } from "react";

const ApiContext = createContext({});

const mode = process.env.NEXT_PUBLIC_DB_MODE || "backend";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export const ApiProvider = ({ children }) => {
  const [apiService, setApiService] = useState(null);
  const [isApiAuthenticated, setIsApiAuthenticated] = useState(false);

  const { authState } = useOCAuth();

  useEffect(() => {
    const initApiService = async () => {
        switch (mode) {
        case "indexeddb":
            const indexedDbServiceProvider = new IndexedDbServiceProvider(authState?.OCId);
            await indexedDbServiceProvider.init();
            setIsApiAuthenticated(!!authState?.OCId)
            setApiService(indexedDbServiceProvider);
            break;
        case "backend":
        default:
            if (mode !== "backend") {
            console.warn(
                `Unknown DB_MODE: "${mode}". Using 'backend' as default.`
            );
            }
            const backendServiceProvider = new BackendServiceProvider(authState?.idToken, backendUrl);
            setIsApiAuthenticated(!!authState?.idToken)
            setApiService(backendServiceProvider);
            break;
        }
    };
    initApiService();
  }, [authState?.idToken, authState?.OCId]);

  return <ApiContext.Provider value={{ apiService, isApiAuthenticated }}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  return useContext(ApiContext);
};
