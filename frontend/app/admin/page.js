"use client";
import { useUser } from "@/providers/UserProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Admin() {
  const router = useRouter();
  const { isInitialized, isAdmin } = useUser();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAdmin) {
      router.push("/home");
    }
    router.push("/admin/tags");
  }, [isAdmin, router]);
  return <div></div>;
}
