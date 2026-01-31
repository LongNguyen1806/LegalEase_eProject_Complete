import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosClient from "../../api/apiAxios";
import Notification from "../../components/Notification/Notification";
import styles from "./AdminLayout.module.css";
import { useVerificationStore } from "../../store/useVerificationStore";
import { useBookingStore } from "../../store/useBookingStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useQAStore } from "../../store/useQAStore";
import { useShallow } from "zustand/react/shallow";

import { useQuery } from "@tanstack/react-query";

import { FaChartLine, FaWallet, FaUsersCog, FaCalendarCheck, FaUserShield, FaFileAlt, FaQuestionCircle, FaHistory, FaSignOutAlt, FaBars } from "react-icons/fa";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { pendingCount, refundCount, setPendingCount, setRefundCount } = useBookingStore(
    useShallow((state) => ({
      pendingCount: state.pendingCount,
      refundCount: state.refundCount,
      setPendingCount: state.setPendingCount,
      setRefundCount: state.setRefundCount,
    })),
  );

  const { verificationCount, setVerificationCount } = useVerificationStore(
    useShallow((state) => ({
      verificationCount: state.verificationCount,
      setVerificationCount: state.setVerificationCount,
    })),
  );

  const { questionsCount, answersCount, fetchPendingQuestions, fetchPendingAnswers } = useQAStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useQuery({
    queryKey: ["admin-sidebar-counts"],
    queryFn: async () => {
      await Promise.all([fetchUnreadCount(), fetchPendingQuestions(), fetchPendingAnswers()]);

      const res = await axiosClient.get("/admin/dashboard");

      if (res.data.success) {
        const stats = res.data.data;
        setPendingCount(stats.appointments?.pending || 0);
        setRefundCount(stats.pending_refunds || 0);
        setVerificationCount(stats.pending_verifications || 0);
      }
      return res.data;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const getActiveClass = (path) => (location.pathname.includes(path) ? styles.active : "");

  const handleLogout = async () => {
    try {
      await axiosClient.post("/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("ADMIN_ACCESS_TOKEN");
      localStorage.removeItem("ADMIN_INFO");
      navigate("/admin/login");
    }
  };

  const adminInfo = JSON.parse(localStorage.getItem("ADMIN_INFO") || "{}");
  const adminName = adminInfo.fullname || "Admin";
  const totalQABadge = questionsCount + answersCount;

  return (
    <div className={`${styles.adminContainer} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
      <aside className={styles.adminSidebar}>
        <div className={styles.sidebarContentWrapper}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarHeader}>⚖️ LegalEase Admin</div>

            <nav className={styles.sidebarMenu} onClick={() => setSidebarOpen(false)}>
              <Link to='/admin/dashboard' className={getActiveClass("dashboard")}>
                <FaChartLine className={styles.menuIcon} /> Dashboard
              </Link>

              <Link to='/admin/revenue' className={`${styles.menuLink} ${getActiveClass("revenue")}`}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <FaWallet className={styles.menuIcon} /> Revenue Management
                </div>
                {refundCount > 0 && <span className={styles.sidebarBadge}>{refundCount}</span>}
              </Link>

              <Link to='/admin/users' className={getActiveClass("users")}>
                <FaUsersCog className={styles.menuIcon} /> User Management
              </Link>

              <Link to='/admin/appointments' className={`${styles.menuLink} ${getActiveClass("appointments")}`}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <FaCalendarCheck className={styles.menuIcon} /> Booking Management
                </div>
                {pendingCount > 0 && <span className={styles.sidebarBadge}>{pendingCount}</span>}
              </Link>

              <Link to='/admin/verifications' className={`${styles.menuLink} ${getActiveClass("verifications")}`}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <FaUserShield className={styles.menuIcon} />
                  Profile Verification
                </div>
                {verificationCount > 0 && <span className={styles.sidebarBadge}>{verificationCount}</span>}
              </Link>

              <Link to='/admin/content' className={getActiveClass("content")}>
                <FaFileAlt className={styles.menuIcon} /> Content Management
              </Link>

              <Link to='/admin/qa' className={`${styles.menuLink} ${getActiveClass("qa")}`}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <FaQuestionCircle className={styles.menuIcon} /> Q&A & AI
                </div>
                {totalQABadge > 0 && <span className={styles.sidebarBadge}>{totalQABadge}</span>}
              </Link>

              <Link to='/admin/logs' className={getActiveClass("logs")}>
                <FaHistory className={styles.menuIcon} /> System Logs
              </Link>
            </nav>
          </div>

          <div className={styles.sidebarBottom}>
            <button className={styles.btnLogoutSidebar} onClick={handleLogout}>
              <FaSignOutAlt style={{ marginRight: "8px" }} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className={styles.adminOverlay} onClick={() => setSidebarOpen(false)} />}

      <div className={styles.adminContent}>
        <header className={styles.adminHeader}>
          <div className={styles.adminHeaderLeft}>
            <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(true)}>
              <FaBars />
            </button>

            <span className={styles.adminWelcome}>
              Welcome, <strong>{adminName}</strong> (Role 1)
            </span>
          </div>

          <div className={styles.adminHeaderRight}>
            <Notification unreadCount={unreadCount} />
          </div>
        </header>

        <main className={styles.adminMain}>
          <div className={styles.card}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
