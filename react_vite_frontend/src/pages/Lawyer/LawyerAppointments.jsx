import { useState, useMemo, useTransition } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleLawyer/LawyerAppointments.module.css";

import {
  FaCalendarCheck,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaFlagCheckered,
  FaListUl,
  FaRegCalendarAlt,
  FaRegClock,
  FaUser,
  FaGavel,
  FaInfoCircle,
  FaSpinner,
} from "react-icons/fa";

const calculateEndTime = (startTime, duration) => {
  if (!startTime || !duration) return "";
  const [h, m] = startTime.split(":").map(Number);
  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + duration);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US") : "");

const statusClassMap = {
  Pending: styles.statusPending,
  Confirmed: styles.statusConfirmed,
  Completed: styles.statusCompleted,
  Cancelled: styles.statusCancelled,
  Refund_Pending: styles.statusRefundPending,
  Expired: styles.statusExpired,
};

const getTabIcon = (status) => {
  switch (status) {
    case "All":
      return <FaListUl />;
    case "Pending":
      return <FaClock />;
    case "Confirmed":
      return <FaCheckCircle />;
    case "Completed":
      return <FaFlagCheckered />;
    case "Cancelled":
      return <FaTimesCircle />;
    default:
      return null;
  }
};

export default function LawyerAppointments() {
  const [filterStatus, setFilterStatus] = useState("All");
  const [isPending, startTransition] = useTransition();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["lawyer-appointments"],
    queryFn: async () => {
      const res = await axiosClient.get("/lawyer/appointments");
      return res.data.success ? res.data.data.data : [];
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const filteredApps = useMemo(() => {
    if (filterStatus === "All") return appointments;
    if (filterStatus === "Cancelled") {
      return appointments.filter((a) => ["Cancelled", "Refund_Pending", "Expired"].includes(a.status));
    }
    return appointments.filter((a) => a.status === filterStatus);
  }, [appointments, filterStatus]);

  const handleTabChange = (status) => {
    startTransition(() => {
      setFilterStatus(status);
    });
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>
        <FaCalendarCheck style={{ marginRight: "12px", color: "#1C357E" }} />
        Appointment Management
      </h2>

      <div className={`${styles.tabs} ${isPending ? styles.tabsLoading : ""}`}>
        {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map((status) => (
          <div key={status} className={`${styles.tab} ${filterStatus === status ? styles.activeTab : ""}`} onClick={() => handleTabChange(status)}>
            <span style={{ marginRight: "8px", display: "flex", alignItems: "center" }}>{getTabIcon(status)}</span>
            {status === "Cancelled" ? "Cancelled / Expired" : status}
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.loading}>
            <FaSpinner className={styles.spinner} /> Loading data...
          </div>
        ) : (
          <div className={`${styles.tableWrapper} ${isPending ? styles.opacityLow : ""}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <FaUser style={{ marginRight: "8px" }} /> Customer
                  </th>
                  <th>
                    <FaGavel style={{ marginRight: "8px" }} /> Service
                  </th>
                  <th>
                    <FaRegCalendarAlt style={{ marginRight: "8px" }} /> Time & Date
                  </th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredApps.length ? (
                  filteredApps.map((app) => (
                    <tr key={app.appointid}>
                      <td>
                        <div className={styles.customerName}>{app.customer?.fullname || "N/A"}</div>
                        <div className={styles.customerPhone}>{app.customer?.phonenumber}</div>
                      </td>

                      <td>
                        <span className={styles.serviceBadge}>{app.packagename}</span>
                      </td>

                      <td>
                        <div className={styles.time}>
                          <FaRegClock style={{ marginRight: "6px", fontSize: "12px", color: "#64748b" }} />
                          {app.starttime?.slice(0, 5)} – {calculateEndTime(app.starttime, app.duration)}
                        </div>
                        <div className={styles.date}>
                          <FaRegCalendarAlt style={{ marginRight: "6px", fontSize: "12px", color: "#64748b" }} />
                          {formatDate(app.slot?.availabledate)}
                        </div>
                      </td>

                      <td>
                        <span className={`${styles.statusBadge} ${statusClassMap[app.status]}`}>{app.status === "Refund_Pending" ? "Refund Pending" : app.status}</span>
                      </td>

                      <td className={styles.actionCell}>
                        <Link to={`/lawyer/appointments/${app.appointid}`} className={styles.detailLink}>
                          <FaInfoCircle style={{ marginRight: "4px" }} /> Details
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      <FaTimesCircle style={{ marginBottom: "8px", fontSize: "24px", opacity: 0.5 }} />
                      <br />
                      No appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
