import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../../providers/UserProvider";

const ProtectedRoute = ({ children }) => {
  const { isInitialized, authState } = useOCAuth();
  const {
    isMasterAdmin,
    isAdmin,
    isRegisteredUser,
    isInitialized: isUserInitialized,
  } = useUser();
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !authState.isAuthenticated) {
      router.push("/home");
    }

    if (isUserInitialized) {
      if (isAdmin || isMasterAdmin || isRegisteredUser) {
        setAllowed(true);
      } else {
        router.push("/home");
      }
    }
  }, [
    isInitialized,
    authState,
    isUserInitialized,
    isMasterAdmin,
    isAdmin,
    isRegisteredUser,
  ]);

  return allowed ? children : <></>;
};

export default ProtectedRoute;
