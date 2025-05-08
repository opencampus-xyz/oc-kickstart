"use client";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { enqueueSnackbar } from "notistack";
import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext({});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    isMasterAdmin: false,
    isAdmin: false,
    isRegisteredUser: false,
    user: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const { isInitialized: isAuthInitialized, authState } = useOCAuth();

  const fetchWithAuth = useAuthenticatedFetch();
  const getUser = async () => {
    if (isAuthInitialized) {
      if (authState.isAuthenticated) {
        try {
          const response = await fetchWithAuth("/user", {
            method: "GET",
          });
          const data = await response.json();
          setUser(data);
          setIsInitialized(true);
        } catch (error) {
          enqueueSnackbar("Error fetching user", {
            variant: "error",
          });
        }
      }
    }
  };

  useEffect(() => {
    getUser();
  }, [authState]);

  return (
    <UserContext.Provider value={{ ...user, isInitialized, getUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
