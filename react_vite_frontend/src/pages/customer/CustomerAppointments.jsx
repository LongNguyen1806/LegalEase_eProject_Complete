import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleCustomer/CustomerAppointments.module.css";
import SafeImage from "../../components/common/SafeImage";

export default function CustomerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await axiosClient.get("/customer/appointments");
        if (res.data.success) {
          setAppointments(res.data.data);
        }
      } catch (error) {
        console.error("Error loading list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, []);

  const getStatusBadge = (status) => {
    
    switch (status) {
      case "Pending":
        return <span className={`${styles.badge} ${styles.badgePending}`}>⏳ Pending</span>;
      case "Confirmed":
        return <span className={`${styles.badge} ${styles.badgeConfirmed}`}>✅ Confirmed</span>;
      case "Completed":
        return <span className={`${styles.badge} ${styles.badgeCompleted}`}>🎉 Completed</span>;
      case "Cancelled":
        return <span className={`${styles.badge} ${styles.badgeCancelled}`}>❌ Cancelled</span>;
      case "Refund_Pending":
        return <span className={`${styles.badge} ${styles.badgeRefund}`}>💸 Refund Pending</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgeDefault}`}>{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("EN-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) return <div className={styles.loadingState}>⏳ Loading appointment history...</div>;

  return (
    <div className={styles.apptListPage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>📅 My Appointment History</h1>
          <p>Manage and track the status of your legal consultations.</p>
        </div>

        {appointments.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3>You have no appointments yet</h3>
            <p>Find a lawyer and book your consultation today.</p>
            <Link to='/lawyers' className={styles.btnBookNow}>
              Find a Lawyer Now →
            </Link>
          </div>
        ) : (
          <div className={styles.apptGrid}>
            {appointments.map((app) => (
              <div key={app.appointid} className={styles.apptCard}>
                <div className={styles.cardTop}>
                  <div className={styles.timeBox}>
                    <span className={styles.time}>{app.starttime.substring(0, 5)}</span>
                    <span className={styles.date}>{formatDate(app.slot?.availabledate)}</span>
                  </div>
                  <div className={styles.statusBox}>{getStatusBadge(app.status)}</div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.lawyerInfo}>
                    <SafeImage
                      src={app.lawyer?.profileimage}
                      type="lawyer"
                      alt={app.lawyer?.fullname || "Lawyer Avatar"}
                      className={styles.lawyerAvatar}
                    />
                    <div>
                      <h4 className={styles.lawyerName}>{app.lawyer?.fullname || "Anonymous Lawyer"}</h4>
                      <p className={styles.serviceName}>📦 {app.packagename}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.priceInfo}>
                    <span className={styles.label}>Cost:</span>
                    <span className={styles.price}>${app.invoice?.amount ? Number(app.invoice.amount).toLocaleString() : 0}</span>
                  </div>
                  <button className={styles.btnDetail} onClick={() => navigate(`/customer/my-appointments/${app.appointid}`)}>
                    View Details ➜
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
