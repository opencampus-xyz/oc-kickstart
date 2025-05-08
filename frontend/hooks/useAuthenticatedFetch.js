import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useSnackbar } from "notistack";
import { fetchWithAuthToken } from "../utils";

const useAuthenticatedFetch = () => {
  const { authState, isInitialized } = useOCAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchWithAuth = async (url, options = {}) => {
    if (isInitialized && !authState?.isAuthenticated) {
      enqueueSnackbar("User is not authenticated", { variant: "error" });
      throw new Error("User is not authenticated");
    }

    return fetchWithAuthToken(url, options, authState.idToken);
  };

  return fetchWithAuth;
};

export default useAuthenticatedFetch;
