import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useSnackbar } from "notistack";
import { fetchWithAuthToken } from "../db/utils";

const useAuthenticatedFetch = () => {
  const { authState, isInitialized } = useOCAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchWithAuth = async (url, options = {}) => {
    // Don't make any requests until auth is initialized
    if (!isInitialized) {
      throw new Error("Authentication not initialized");
    }

    // Don't make requests if not authenticated
    if (!authState?.isAuthenticated) {
      enqueueSnackbar("User is not authenticated", { variant: "error" });
      throw new Error("User is not authenticated");
    }

    // Don't make requests without a token
    if (!authState?.idToken) {
      enqueueSnackbar("Authentication token is missing", { variant: "error" });
      throw new Error("Authentication token is missing");
    }

    return fetchWithAuthToken(url, options, authState.idToken);
  };

  return fetchWithAuth;
};

export default useAuthenticatedFetch;
