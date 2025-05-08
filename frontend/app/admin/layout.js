"use client";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import styles from "./admin.module.css";

export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className={styles.pageContainer}>{children}</div>
    </ProtectedRoute>
  );
}
