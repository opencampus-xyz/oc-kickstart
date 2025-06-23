"use client";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { enqueueSnackbar } from "notistack";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const UserContext = createContext({});

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
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
    if (!isAuthInitialized) {
      return;
    }

    if (!authState?.isAuthenticated) {
      setUser({
        isMasterAdmin: false,
        isAdmin: false,
        isRegisteredUser: false,
        user: null,
      });
      setIsInitialized(true);
      return;
    }

        try {
          const response = await fetchWithAuth("/user", {
            method: "GET",
          });
          const data = await response.json();
          setUser(data);
        } catch (error) {
      if (authState?.isAuthenticated) {
          enqueueSnackbar("Error fetching user", {
            variant: "error",
          });
        }
      setUser({
        isMasterAdmin: false,
        isAdmin: false,
        isRegisteredUser: false,
        user: null,
      });
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    getUser();
  }, [isAuthInitialized, authState?.isAuthenticated]);

  useEffect(() => {
    if (isInitialized && authState?.isAuthenticated && !user.isRegisteredUser && !user.isMasterAdmin && !user.isAdmin) {
      if (pathname !== '/signup') {
        router.replace('/signup');
      }
    }
  }, [isInitialized, authState, user.isRegisteredUser, pathname, router]);

  return (
    <UserContext.Provider value={{ ...user, isInitialized, getUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
