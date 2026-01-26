import { useState, useEffect, useContext, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import Notification from "../../components/Notification/Notification";
import styles from "../../assets/styles/client/StyleLawyer/LawyerLayout.module.css";

import { useProfileStore } from "../../store/useProfileStore";
import { FaChartPie, FaCalendarAlt, FaClipboardList, FaCommentDots, FaUserCircle, FaGem, FaSignOutAlt, FaBars, FaTimes, FaHome } from "react-icons/fa";
import { Scale } from "lucide-react";

const navItems = [
  { to: "/lawyer/dashboard", label: "Dashboard", icon: <FaChartPie /> },
  { to: "/lawyer/schedule", label: "Work Schedule", icon: <FaCalendarAlt /> },
  { to: "/lawyer/appointments", label: "Appointments", icon: <FaClipboardList /> },
  { to: "/lawyer/qa", label: "Answer Q&A", icon: <FaCommentDots /> },
  { to: "/lawyer/profile", label: "Personal Profile", icon: <FaUserCircle />, isProfile: true },
  { to: "/lawyer/subscription", label: "Upgrade Plan", icon: <FaGem /> },
  { to: "/", label: "Home Page", icon: <FaHome /> },
];

export default function LawyerLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useContext(AuthContext);
  const syncProfile = useProfileStore((state) => state.profile);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const prefetchTimerRef = useRef(null);
  const handlePrefetch = (item) => {
    if (!item.isProfile) return;

    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);

    prefetchTimerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ["lawyer-profile"],
        queryFn: async () => {
          const resUser = await axiosClient.get("/user-info");
          const userId = resUser.data.userid;
          const resDetail = await axiosClient.get(`/lawyers/${userId}`);
          return resDetail.data.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    }, 120);
  };

  useEffect(() => {
    const token = localStorage.getItem("CLIENT_ACCESS_TOKEN");
    if (!token || (authUser && authUser.roleid !== 2)) {
      navigate("/login");
      return;
    }
    setIsAuthChecking(false);

    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    };
  }, [navigate, authUser]);

  const handleLogout = async () => {
    try {
      await axiosClient.post("/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      logout();
      navigate("/login");
    }
  };

  const displayFullname = syncProfile.fullname || authUser?.fullname || "Lawyer";

  if (isAuthChecking) return <div className={styles.pageLoader}>Authenticating...</div>;

  return (
    <div className={styles.container}>
      {isMobile && isSidebarOpen && <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed}`}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandWrapper}>
            <span className={styles.brandLogo}>⚖️ LegalEase</span>
            <span className={styles.brandSub}>Lawyer Partner</span>
          </div>
          {isMobile && (
            <button className={styles.btnCloseSidebar} onClick={() => setIsSidebarOpen(false)}>
              <FaTimes />
            </button>
          )}
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onMouseEnter={() => handlePrefetch(item)}
              onClick={() => isMobile && setIsSidebarOpen(false)}
              className={`${styles.navLink} ${location.pathname === item.to ? styles.active : ""}`}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.btnLogout} onClick={handleLogout}>
            <FaSignOutAlt style={{ marginRight: "10px" }} /> Logout
          </button>
        </div>
      </aside>
      <div className={styles.mainArea} style={{ marginLeft: isMobile ? "0" : "260px" }}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            {isMobile && (
              <button className={styles.btnHamburger} onClick={() => setIsSidebarOpen(true)}>
                <FaBars />
              </button>
            )}
          </div>

          <div className={styles.topbarRight}>
            <Notification />
            <div className={styles.topbarDivider}></div>
            <div className={styles.userInfoTopbar}>
              <span className={styles.userFullname}>{displayFullname}</span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
