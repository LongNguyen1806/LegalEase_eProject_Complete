import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { formatFullDate, formatDisplayTime, formatMoney } from "../../utils/dateUtils";
import styles from "../../assets/styles/client/StyleCustomer/MyAppointments.module.css";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import Swal from "sweetalert2";

import {
  FaArrowLeft,
  FaUserTie,
  FaMapMarkerAlt,
  FaRegHospital,
  FaCalendarAlt,
  FaClock,
  FaRegStickyNote,
  FaWallet,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUndoAlt,
} from "react-icons/fa";

export default function MyAppointments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const {
    data: appointment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/customer/my-appointments/${id}`);
      return res.data.data;
    },
    refetchInterval: 5000, 
    enabled: !!id,
    retry: 1,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason) =>
      axiosClient.put(`/customer/appointments/${id}/cancel`, { reason }),
    onSuccess: (res) => {
      if (res.data.success) {
        Swal.fire({
          title: "Cancelled!",
          text: res.data.message || "Your appointment has been successfully cancelled.",
          icon: "success",
          confirmButtonColor: "#1e293b",
        });
        setShowCancelModal(false);
        setCancelReason("");
        queryClient.invalidateQueries(["appointment", id]);
      }
    },
    onError: (error) => {
      toast.error("Cancellation failed", {
        description: error.response?.data?.message || "Unable to process cancellation.",
      });
    },
  });

  const getStatusClass = (status) => {
    const map = {
      Pending: styles.statusPending,
      Confirmed: styles.statusConfirmed,
      Completed: styles.statusCompleted,
      Cancelled: styles.statusCancelled,
      Refund_Pending: styles.statusRefund,
    };
    return map[status] || styles.statusDefault;
  };

  const renderPaymentStatus = (status) => {
    const map = {
      Success: "Paid",
      Refund_Pending: "⏳ Refund Pending",
      Refunded: "↩️ Refunded",
      Cancelled: "Cancelled",
    };
    const cls = {
      Success: styles.success,
      Refund_Pending: styles.pending,
      Refunded: styles.refunded,
      Cancelled: styles.cancelled,
    };
    return (
      <span className={`${styles.payStatus} ${cls[status] || styles.pending}`}>
        {map[status] || "Unpaid"}
      </span>
    );
  };

  const getEndTime = (startStr, duration) => {
    if (!startStr) return "";
    const [h, m] = startStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m + duration);
    return formatDisplayTime(d.toTimeString());
  };

  const handleOpenCancelModal = () => {
    if (!appointment?.can_cancel) {
      toast.warning("The cancellation deadline has passed.", {
        description: "Cancellation is only allowed at least 24 hours before the appointment.",
        duration: 5000,
      });
      return;
    }
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (cancelReason.trim().length < 10) {
      toast.error("Reason too short", {
        description: "Please provide a specific reason (minimum 10 characters).",
      });
      return;
    }
    cancelMutation.mutate(cancelReason);
  };

  if (isLoading) return <div className={styles.loadingScreen}>⏳ Loading appointment details...</div>;
  
  if (isError || !appointment)
    return (
      <div className={styles.errorContainer}>
        <h3>⚠️ Appointment not found or you do not have permission to view it.</h3>
      </div>
    );

  return (
    <div className={styles.myAppointmentPage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <button onClick={() => navigate("/customer/appointments")} className={styles.backBtn}>
            <FaArrowLeft /> Back to List
          </button>
          <div className={styles.headerRight}>
            <span className={styles.apptId}>ID: #{appointment.appointid}</span>
            <span className={`${styles.statusBadge} ${getStatusClass(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.leftCol}>
            <div className={`${styles.infoCard} ${styles.lawyerCard}`}>
              <div className={styles.cardHeader}>
                <FaUserTie style={{ marginRight: "8px" }} /> LAWYER INFORMATION
              </div>
              <div className={styles.lawyerProfile}>
                <SafeImage
                  src={appointment.lawyer?.profileimage}
                  type="lawyer"
                  alt={appointment.lawyer?.fullname || "Lawyer Avatar"}
                  className={styles.lawyerAvatar}
                />
                <div className={styles.lawyerDetails}>
                  <h3>{appointment.lawyer?.fullname}</h3>
                  <div className={styles.lawyerContactSmall}>
                    <p>📞 {appointment.lawyer?.phonenumber || "N/A"}</p>
                    <p>📧 {appointment.lawyer?.user?.email || "N/A"}</p>
                  </div>
                  <button
                    className={styles.viewProfileLink}
                    onClick={() => navigate(`/lawyers/${appointment.lawyerid}`)}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>

            <div className={`${styles.infoCard} ${styles.locationCard}`}>
              <div className={styles.cardHeader}>
                <FaMapMarkerAlt style={{ marginRight: "8px" }} /> LOCATION & CONTACT
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.icon}>
                    <FaRegHospital />
                  </span>
                  <span className={styles.text}>
                    {appointment.lawyer?.office?.addressdetail || "Updating..."}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.icon}>
                    <FaMapMarkerAlt />
                  </span>
                  <span className={styles.text}>
                    {appointment.lawyer?.office?.location?.cityname || "United States"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={`${styles.infoCard} ${styles.detailCard}`}>
              <div className={styles.cardHeader}>
                <FaCalendarAlt style={{ marginRight: "8px" }} /> APPOINTMENT DETAILS
              </div>
              <div className={styles.cardBody}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Date:</span>
                  <span className={`${styles.value} ${styles.dateHighlight}`}>
                    {formatFullDate(appointment.slot?.availabledate)}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Time:</span>
                  <span className={`${styles.value} ${styles.timeHighlight}`}>
                    <FaClock style={{ marginRight: "5px", fontSize: "0.9em" }} />
                    {formatDisplayTime(appointment.starttime)} -{" "}
                    {getEndTime(appointment.starttime, appointment.duration)}
                  </span>
                </div>
                <div className={styles.noteBox}>
                  <span className={styles.label}>
                    <FaRegStickyNote style={{ marginRight: "5px" }} /> Notes & Notifications:
                  </span>
                  <div className={styles.noteContent}>
                    {appointment.note ? (
                      appointment.note.split("|").map((p, i) => (
                        <p
                          key={i}
                          className={
                            p.trim().startsWith("[") ? styles.systemMsg : styles.userNote
                          }
                        >
                          {p.trim()}
                        </p>
                      ))
                    ) : (
                      <i>No notes available</i>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.infoCard} ${styles.paymentCard}`}>
              <div className={styles.cardHeader}>
                <FaWallet style={{ marginRight: "8px" }} /> PAYMENT DETAILS
              </div>
              <div className={styles.cardBody}>
                <div className={`${styles.paymentRow} ${styles.detailFee}`}>
                  <span>Consultation Fee:</span>
                  <span>{formatMoney(Math.round(appointment.invoice?.amount / 1.1))}</span>
                </div>
                <div className={`${styles.paymentRow} ${styles.detailFee}`}>
                  <span>Service Fee (10%):</span>
                  <span>
                    {formatMoney(
                      appointment.invoice?.amount - Math.round(appointment.invoice?.amount / 1.1)
                    )}
                  </span>
                </div>

                <div className={`${styles.paymentRow} ${styles.totalRowBox}`}>
                  <span>Total Paid:</span>
                  <b className={styles.totalPrice}>{formatMoney(appointment.invoice?.amount)}</b>
                </div>

                <div className={styles.paymentRow}>
                  <span>Payment Status:</span>
                  {renderPaymentStatus(appointment.invoice?.status)}
                </div>

                <hr className={styles.paymentDivider} />

                {(appointment.status === "Refund_Pending" ||
                  appointment.status === "Cancelled" ||
                  appointment.invoice?.status === "Refunded") && (
                  <div className={styles.refundSummaryBox}>
                    <h4 className={styles.refundTitle}>Refund Information</h4>
                    <div className={`${styles.paymentRow} ${styles.refundHighlight}`}>
                      <span>Actual Refund Amount:</span>
                      <b className={styles.refundValue}>
                        {formatMoney(appointment.invoice?.refundamount || 0)}
                      </b>
                    </div>

                    {appointment.invoice?.refundamount < appointment.invoice?.amount &&
                    appointment.invoice?.refundamount > 0 ? (
                      <p className={`${styles.refundNote} ${styles.warning}`}>
                        <FaExclamationTriangle size={12} /> 10% Service Fee (
                        {formatMoney(
                          appointment.invoice?.amount - appointment.invoice?.refundamount
                        )}
                        ) was deducted as per cancellation policy.
                      </p>
                    ) : appointment.invoice?.refundamount > 0 ? (
                      <p className={`${styles.refundNote} ${styles.success}`}>
                        <FaCheckCircle size={12} /> Full refund applied (100% money back).
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actionArea}>
              {(appointment.status === "Pending" || appointment.status === "Confirmed") && (
                <>
                  {appointment.can_cancel ? (
                    <button
                      className={`${styles.btn} ${styles.btnCancel}`}
                      onClick={handleOpenCancelModal}
                    >
                      Cancel Appointment
                    </button>
                  ) : (
                    <div className={styles.cancelDeadlineWarning}>
                      <FaExclamationTriangle /> <b>Cannot cancel:</b> You can only cancel at least
                      24 hours before the scheduled time.
                    </div>
                  )}
                </>
              )}

              {appointment.status === "Completed" && (
                <button
                  className={`${styles.btn} ${styles.btnReview}`}
                  onClick={() => navigate(`/lawyers/${appointment.lawyerid}/review`)}
                >
                  <FaCheckCircle style={{ marginRight: "8px" }} /> Write a Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className={styles.customModalOverlay}>
          <div className={styles.customModal}>
            <h3>Reason for Cancellation</h3>
            <p>Please provide a reason to help us process your refund quickly.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter detailed reason (min 10 characters)..."
              rows={5}
            />
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowCancelModal(false)}>
                Close
              </button>
              <button
                className={styles.btnDanger}
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
              >
                <FaUndoAlt style={{ marginRight: "8px" }} />{" "}
                {cancelMutation.isPending ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}