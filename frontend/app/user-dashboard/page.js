"use client";
import { useUser } from "@/providers/UserProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "../globals.css";

export default function Admin() {
  const router = useRouter();
  const { isRegisteredUser } = useUser();

  useEffect(() => {
    if (!isRegisteredUser) {
      router.push("/signup");
    }
    router.push("/user-dashboard/profile");
  }, [isRegisteredUser, router]);
  return <div></div>;
}
