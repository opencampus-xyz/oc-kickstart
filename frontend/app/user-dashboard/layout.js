"use client";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import styles from "./user-dashboard.module.css";

export default function UserDashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className={styles.pageContainer}>{children}</div>
    </ProtectedRoute>
  );
}
