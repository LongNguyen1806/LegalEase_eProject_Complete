import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/Dashboard.module.css";

import { FaUsers, FaCalendarCheck, FaUserCheck, FaArrowRight } from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const res = await axiosClient.get("/admin/dashboard");
      return res.data.success ? res.data.data : null;
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  const renderSkeleton = () => (
    <div className={styles.dashboardGrid}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.dashboardCard}>
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.dashboardTitle}>Dashboard Overview</h1>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <div className={styles.dashboardGrid}>
          <div className={styles.dashboardCard}>
            <h3 className={styles.cardTitle}>
              <FaUsers color='#1c357e' /> Users
            </h3>
            <div className={styles.cardContent}>
              <p>
                <span>Customers</span> <b>{stats?.users.total_customers}</b>
              </p>
              <p>
                <span>Total Lawyers</span> <b>{stats?.users.total_lawyers}</b>
              </p>
              <p style={{ color: "#059669" }}>
                <span>Active Lawyers</span> <b>{stats?.users.active_lawyers}</b>
              </p>
            </div>
          </div>

          <div className={styles.dashboardCard}>
            <h3 className={styles.cardTitle}>
              <FaCalendarCheck color='#1c357e' /> Appointments
            </h3>
            <div className={styles.cardContent}>
              <p>
                <span>Total Bookings</span> <b>{stats?.appointments.total}</b>
              </p>
              <p style={{ color: "#d97706" }}>
                <span>Pending Approval</span> <b>{stats?.appointments.pending}</b>
              </p>
            </div>
          </div>

          <div className={`${styles.dashboardCard} ${styles.dashboardCardAlert}`} onClick={() => navigate("/admin/verifications")}>
            <h3 className={styles.cardTitle}>
              <FaUserCheck color='#ea580c' /> Pending Verifications
            </h3>
            <p style={{ fontSize: "14px", color: "#9a3412" }}>Lawyers waiting for system approval</p>
            <div className={styles.alertFooter}>
              <h1>{stats?.pending_verifications}</h1>
              <span className={styles.alertBadge}>
                Review Now <FaArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
