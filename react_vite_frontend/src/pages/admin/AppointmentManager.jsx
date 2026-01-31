import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/admin/AppointmentManager.module.css";
import { formatFullDate, formatDisplayTime, formatMoney } from "../../utils/dateUtils";
import { useBookingStore } from "../../store/useBookingStore";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import Swal from "sweetalert2";

export default function AdminAppointments() {
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters, setPendingCount } = useBookingStore();

  const [searchTerm, setSearchTerm] = useState(filters.keyword);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adminAppointments", filters],
    queryFn: async () => {
      const res = await axiosClient.get("/admin/appointments", { params: filters });
      const result = res.data.data;

      const pending = result.data.filter((a) => a.status === "Pending").length;
      setPendingCount(pending);

      return result;
    },
    refetchInterval: 20000,
    keepPreviousData: true,
  });

  const appointments = data?.data || [];
  const totalPages = data?.last_page || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ keyword: searchTerm, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, setFilters]);

  const cancelMutation = useMutation({
    mutationFn: (id) => axiosClient.put(`/admin/appointments/${id}/cancel`),
    onSuccess: (res) => {
      toast.success(res.data.message || "Appointment cancelled");
      queryClient.invalidateQueries(["adminAppointments"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Cancel failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/admin/appointments/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.message || "Data deleted successfully");
      queryClient.invalidateQueries(["adminAppointments"]);
      setIsModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed"),
  });

  const handleCancel = (id) => {
    Swal.fire({
      title: "Confirm Cancellation?",
      text: "This will notify both lawyer and customer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, cancel it!",
    }).then((result) => {
      if (result.isConfirmed) cancelMutation.mutate(id);
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "DANGER ZONE",
      text: "Permanently delete this record? This cannot be undone!",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete permanently",
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate(id);
    });
  };

  const getStatusBadge = (st) => {
    const badgeClasses = [styles.statusBadge];

    if (st === "Pending") badgeClasses.push(styles.statusPending);
    if (st === "Confirmed") badgeClasses.push(styles.statusConfirmed);
    if (st === "Completed") badgeClasses.push(styles.statusCompleted);
    if (st === "Cancelled") badgeClasses.push(styles.statusCancelled);
    if (st === "Refund_Pending") badgeClasses.push(styles.statusRefundPending);
    if (st === "Refunded") badgeClasses.push(styles.statusRefunded);

    return <span className={badgeClasses.join(" ")}>{st}</span>;
  };

  return (
    <div className={styles.cmsContainer}>
      <div className={styles.cmsHeader}>
        <h1>Booking Management</h1>
      </div>

      <div className={styles.filtersContainer}>
        <input
          type='text'
          placeholder='Search ID, Lawyer, Customer...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.filterInput}
        />
        <select value={filters.status} onChange={(e) => setFilters({ status: e.target.value, page: 1 })} className={styles.filterSelect}>
          <option value='All'>All Status</option>
          <option value='Pending'>Pending</option>
          <option value='Confirmed'>Confirmed</option>
          <option value='Completed'>Completed</option>
          <option value='Cancelled'>Cancelled</option>
          <option value='Refund_Pending'>Refund Pending</option>
          <option value='Refunded'>Refunded</option>
        </select>
        <input type='date' value={filters.date} onChange={(e) => setFilters({ date: e.target.value, page: 1 })} className={styles.filterSelect} />
        <button
          onClick={() => {
            setSearchTerm("");
            resetFilters();
          }}
          className={styles.clearBtn}>
          Clear All
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <p className={styles.loadingText}>Synchronizing data...</p>
        ) : (
          <table className={styles.cmsTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Lawyer</th>
                <th>Customer</th>
                <th>Date & Time (US)</th>
                <th>Payment ($)</th>
                <th>Status</th>
                <th style={{ minWidth: "150px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length > 0 ? (
                appointments.map((app) => (
                  <tr key={app.appointid}>
                    <td>#{app.appointid}</td>
                    <td>
                      <div className={styles.lawyerInfo}>
                        <SafeImage
                          src={app.lawyer?.profileimage}
                          type="lawyer"
                          alt={app.lawyer?.fullname || "Lawyer Avatar"}
                          className={styles.lawyerAvatar}
                        />
                        <span>{app.lawyer?.fullname || "N/A"}</span>
                      </div>
                    </td>
                    <td>{app.customer?.fullname || "Deleted User"}</td>
                    <td>
                      <div className={styles.dateTimeBold}>{formatFullDate(app.slot?.availabledate)}</div>
                      <div className={styles.timeSmall}>
                        {formatDisplayTime(app.starttime)} ({app.duration}m)
                      </div>
                    </td>
                    <td>
                      {app.invoice ? (
                        <span className={app.invoice.status === "Success" ? styles.invoiceSuccess : styles.invoicePending}>{formatMoney(app.invoice.amount, "$")}</span>
                      ) : (
                        <span className={styles.unpaidText}>Unpaid</span>
                      )}
                    </td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setIsModalOpen(true);
                          }}
                          title='Details'>
                          ℹ️
                        </button>
                        {["Pending", "Confirmed"].includes(app.status) && (
                          <button onClick={() => handleCancel(app.appointid)} title='Cancel'>
                            ⚠️
                          </button>
                        )}
                        <button onClick={() => handleDelete(app.appointid)} title='Delete'>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='7' style={{ textAlign: "center", padding: "50px" }}>
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.paginationContainer}>
        <button disabled={filters.page <= 1} onClick={() => setFilters({ page: filters.page - 1 })}>
          Prev
        </button>
        <span>
          Page {filters.page} of {totalPages}
        </span>
        <button disabled={filters.page >= totalPages} onClick={() => setFilters({ page: filters.page + 1 })}>
          Next
        </button>
      </div>

      {isModalOpen && selectedApp && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Appointment Dossier #{selectedApp.appointid}</h2>
              {getStatusBadge(selectedApp.status)}
            </div>

            <div className={styles.modalBody}>
              <div className={styles.profileSection}>
                <div className={styles.profileCard}>
                  <h4 className={styles.sectionTitle}>Lawyer Information</h4>
                  <div className={styles.cardHeader}>
                    <SafeImage src={selectedApp.lawyer?.profileimage} type="lawyer" className={styles.detailAvatar} />
                    <div className={styles.cardMainInfo}>
                      <span className={styles.fullName}>{selectedApp.lawyer?.fullname}</span>
                      <span className={styles.subInfo}>{selectedApp.lawyer?.user?.email}</span>
                      <span className={styles.verifiedTag}>{selectedApp.lawyer?.isverified ? "✓ Verified Professional" : "Unverified"}</span>
                    </div>
                  </div>
                  <div className={styles.cardStats}>
                    <p><strong>Experience:</strong> {selectedApp.lawyer?.experienceyears} Years</p>
                    <p><strong>Specialty:</strong> {selectedApp.lawyer?.specializations?.map(s => s.specname).join(", ") || "General Practice"}</p>
                    <p><strong>Phone:</strong> {selectedApp.lawyer?.phonenumber || "Not provided"}</p>
                  </div>
                </div>

                <div className={styles.profileCard}>
                  <h4 className={styles.sectionTitle}>Customer Information</h4>
                  <div className={styles.cardHeader}>
                    <SafeImage src={selectedApp.customer?.profileimage} type="customer" className={styles.detailAvatar} />
                    <div className={styles.cardMainInfo}>
                      <span className={styles.fullName}>{selectedApp.customer?.fullname}</span>
                      <span className={styles.subInfo}>{selectedApp.customer?.user?.email}</span>
                      <span className={styles.phoneInfo}>{selectedApp.customer?.phonenumber}</span>
                    </div>
                  </div>
                  <p className={styles.customerContext}>Registered Client</p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoGroup}>
                  <h4 className={styles.sectionTitle}>Service Details</h4>
                  <p><strong>Service Package:</strong> {selectedApp.packagename}</p>
                  <p><strong>Duration:</strong> {selectedApp.duration} Minutes</p>
                  <p><strong>Scheduled:</strong> {formatDisplayTime(selectedApp.starttime)} | {formatFullDate(selectedApp.slot?.availabledate)}</p>
                </div>

                <div className={styles.infoGroup}>
                  <h4 className={styles.sectionTitle}>Office Location</h4>
                  <p><strong>City/Province:</strong> {selectedApp.lawyer?.office?.location?.cityname || "N/A"}</p>
                  <p><strong>Address:</strong> {selectedApp.lawyer?.office?.addressdetail || "In-person consultation"}</p>
                </div>
              </div>

              <div className={styles.financeSection}>
                <h4 className={styles.sectionTitle}>Financial Records</h4>
                {selectedApp.invoice ? (
                  <div className={styles.invoiceDetails}>
                    <div className={styles.invoiceRow}>
                      <span>Transaction ID: <strong>{selectedApp.invoice.transactionno}</strong></span>
                      <span>Amount: <strong className={styles.invoiceSuccess}>{formatMoney(selectedApp.invoice.amount, "$")}</strong></span>
                    </div>
                    <div className={styles.invoiceRow}>
                      <span>Method: {selectedApp.invoice.paymentmethod}</span>
                      <span>Payment Status: <strong>{selectedApp.invoice.status}</strong></span>
                    </div>
                    {selectedApp.invoice.refundamount > 0 && (
                      <div className={styles.refundRow}>
                        Refunded Amount: <strong>{formatMoney(selectedApp.invoice.refundamount, "$")}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={styles.unpaidWarning}>No invoice generated for this appointment.</p>
                )}
              </div>

              <div className={styles.noteSection}>
                <h4 className={styles.sectionTitle}>Case Description / Notes</h4>
                <div className={styles.noteBox}>
                  {selectedApp.note || "No additional notes provided by the customer."}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>Close Dossier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}