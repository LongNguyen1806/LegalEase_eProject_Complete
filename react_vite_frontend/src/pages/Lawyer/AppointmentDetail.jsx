import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleLawyer/AppointmentDetail.module.css";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import Swal from "sweetalert2";

import { formatDisplayTime, formatFullDate, getEndTime, formatMoney } from "../../utils/dateUtils";

import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaCreditCard,
  FaCalendarAlt,
  FaClock,
  FaSuitcase,
  FaUser,
  FaStickyNote,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowCircleLeft,
  FaInfoCircle,
} from "react-icons/fa";
import { MdCached } from "react-icons/md";

const statusClassMap = {
  Pending: styles.statusPending,
  Confirmed: styles.statusConfirmed,
  Completed: styles.statusCompleted,
  Cancelled: styles.statusCancelled,
  Refund_Pending: styles.statusRefundPending,
  Expired: styles.statusExpired,
};

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: app,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["appointment-detail", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/lawyer/appointments/${id}`);
      return res.data.data;
    },
    refetchInterval: 10000,
    retry: false,
    onError: () => {
      toast.error("Appointment not found or access denied.");
      navigate("/lawyer/appointments");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ action, payload }) => {
      return await axiosClient.put(`/lawyer/appointments/${id}`, payload || { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["appointment-detail", id]);
      queryClient.invalidateQueries(["lawyer-appointments"]);
    },
    onError: (error) => {
      queryClient.invalidateQueries(["appointment-detail", id]);
    },
  });

  const handleAction = async (type) => {
    const isApprove = type === "approve";
    const result = await Swal.fire({
      title: isApprove ? "Confirm Appointment?" : "Cancel Appointment?",
      text: isApprove ? "Are you sure you want to accept this request?" : "Are you sure you want to cancel? A refund will be initiated if applicable.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isApprove ? "#2ecc71" : "#e74c3c",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: isApprove ? "Yes, Confirm it!" : "Yes, Cancel it!",
    });

    if (result.isConfirmed) {
      toast.promise(statusMutation.mutateAsync(isApprove ? { action: "approve" } : { payload: { status: "Cancelled" } }), {
        loading: "Processing request...",
        success: (res) => res.data.message || "Status updated successfully!",
        error: (err) => {
          if (err.response?.status === 409) return "Conflict: This appointment was already modified.";
          return err.response?.data?.message || "Something went wrong.";
        },
      });
    }
  };

  const handleComplete = async () => {
    const result = await Swal.fire({
      title: "Mark as Completed?",
      text: "Has the consultation session finished?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3498db",
      confirmButtonText: "Yes, it's done!",
    });

    if (result.isConfirmed) {
      toast.promise(axiosClient.post(`/lawyer/appointments/${id}/complete`), {
        loading: "Updating status...",
        success: () => {
          queryClient.invalidateQueries(["appointment-detail", id]);
          return "Consultation completed!";
        },
        error: "Failed to mark as completed.",
      });
    }
  };

  const financialData = useMemo(() => {
    if (!app) return null;
    const invoiceStatus = app.invoice?.status;
    const totalPaidByClient = app.invoice?.amount || 0; 
    const consultationPrice = Math.round(totalPaidByClient / 1.1); 
    const clientServiceFee = totalPaidByClient - consultationPrice; 
    const platformCommission = Math.round(consultationPrice * 0.2); 
    const lawyerNetEarnings = consultationPrice - platformCommission; 

    const hasPaymentHistory = ["Success", "Refund_Pending", "Refunded"].includes(invoiceStatus);
    let paymentLabel = (
      <span>
        Unpaid <FaTimesCircle />
      </span>
    );
    let paymentClass = styles.paymentUnpaid;

    if (hasPaymentHistory) {
      if (invoiceStatus === "Refunded") {
        paymentLabel = (
          <span>
            Refunded <FaArrowCircleLeft />
          </span>
        );
        paymentClass = styles.paymentRefunded;
      } else if (invoiceStatus === "Refund_Pending") {
        paymentLabel = (
          <span>
            Refund Pending <MdCached className='spin-icon' />
          </span>
        );
        paymentClass = styles.paymentRefundPending;
      } else {
        paymentLabel = (
          <span>
            Paid <FaCheckCircle />
          </span>
        );
        paymentClass = styles.paymentSuccess;
      }
    }

    return {
      totalPaidByClient,
      consultationPrice,
      clientServiceFee,
      platformCommission,
      lawyerNetEarnings,
      paymentLabel,
      paymentClass,
      invoiceStatus,
    };
  }, [app]);

  if (isLoading) return <div className={styles.loading}>Loading appointment details...</div>;
  if (isError || !app) return null;

  const { totalPaidByClient, consultationPrice, clientServiceFee, platformCommission, lawyerNetEarnings, paymentLabel, paymentClass, invoiceStatus } = financialData;

  const isRefundCase = invoiceStatus === "Refund_Pending" || invoiceStatus === "Refunded";
  const isSuccessCase = invoiceStatus === "Success" && ["Completed", "Confirmed"].includes(app.status);
  const isLawyerFinancialView = ["Confirmed", "Completed"].includes(app.status);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/lawyer/appointments")}>
          ← Back
        </button>
        <h2>Appointment #{app.appointid}</h2>
        <span className={`${styles.statusBadge} ${statusClassMap[app.status]}`}>{app.status}</span>
      </div>

      <div className={styles.columns}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <FaUser style={{ marginRight: "8px" }} /> Customer Information
          </h3>

          <div className={styles.avatarContainer}>
            <SafeImage
              src={app.customer?.profileimage}
              type="customer"
              alt="Customer Avatar"
              className={styles.customerAvatar}
            />
          </div>
          <h4 style={{ textAlign: "center", marginBottom: "15px" }}>{app.customer?.fullname || "Unknown Customer"}</h4>

          <div className={styles.customerContactInfo}>
            <p>📞 {app.customer?.phonenumber}</p>
            <p className={styles.emailText}>
              <FaEnvelope style={{ marginRight: "5px" }} /> {app.customer_email}
            </p>
          </div>

          <div className={styles.note}>
            <strong>
              <FaStickyNote style={{ marginRight: "5px" }} /> Customer's Note:
            </strong>
            <p>{app.note || "No additional notes provided."}</p>
          </div>

          <h3 className={styles.cardTitle}>
            <FaSuitcase style={{ marginRight: "8px" }} /> Service & Schedule
          </h3>
          <div className={styles.infoRow}>
            <span>Service Package</span>
            <strong>{app.packagename}</strong>
          </div>
          <div className={styles.infoRow}>
            <span>
              <FaCalendarAlt style={{ marginRight: "5px" }} /> Date
            </span>
            <span>{formatFullDate(app.slot?.availabledate)}</span>
          </div>
          <div className={styles.infoRow}>
            <span>
              <FaClock style={{ marginRight: "5px" }} /> Time Slot
            </span>
            <span>
              {formatDisplayTime(app.starttime)} - {getEndTime(app.starttime, app.duration)}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span>
              <FaMapMarkerAlt style={{ marginRight: "5px" }} /> Location
            </span>
            <span className={styles.addressText}>{app.full_office_address}</span>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <FaCreditCard style={{ marginRight: "8px" }} /> Payment Details
          </h3>

          <div className={styles.infoRow}>
            <span>Payment Status</span>
            <span className={paymentClass}>{paymentLabel}</span>
          </div>

          <div className={styles.infoRow}>
            <span>Method</span>
            <span style={{ textTransform: "capitalize" }}>
              <FaCreditCard style={{ marginRight: "5px" }} /> {app.payment_method}
            </span>
          </div>

          {app.invoice && (
            <div className={`${styles.paymentBox} ${isRefundCase ? styles.refundBox : styles.successBox}`}>
              {isLawyerFinancialView ? (
                <>
                  <div className={styles.infoRowSmall}>
                    <span>Consultation Price</span>
                    <span>{formatMoney(consultationPrice)}</span>
                  </div>
                  <div className={styles.infoRowSmall}>
                    <span>Platform Commission (20%)</span>
                    <span className={styles.feeText}>- {formatMoney(platformCommission)}</span>
                  </div>
                  <div className={styles.earning}>
                    <span>Your Net Earnings (80%)</span>
                    <span>{formatMoney(lawyerNetEarnings)}</span>
                  </div>
                  <div className={styles.infoNote}>
                    <FaInfoCircle size={10} /> The client paid a total of {formatMoney(totalPaidByClient)} (included service fees).
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.infoRowSmall}>
                    <span>Consultation Fee</span>
                    <span>{formatMoney(consultationPrice)}</span>
                  </div>
                  <div className={styles.infoRowSmall}>
                    <span>System Service Fee</span>
                    <span>{formatMoney(clientServiceFee)}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Total Paid by Client</span>
                    <strong className={styles.totalHighlight}>{formatMoney(totalPaidByClient)}</strong>
                  </div>
                  
                </>
              )}

              {isRefundCase && <div className={styles.refundNotice}>Refund management is active for this transaction.</div>}
            </div>
          )}

          <div className={styles.actions}>
            {app.status === "Pending" && (
              <>
                {invoiceStatus === "Success" && (
                  <button className={styles.confirmBtn} onClick={() => handleAction("approve")} disabled={statusMutation.isLoading}>
                    {statusMutation.isLoading ? "Confirming..." : "Confirm Request"}
                  </button>
                )}
                <button className={styles.rejectBtn} onClick={() => handleAction("reject")} disabled={statusMutation.isLoading}>
                  Cancel / Decline
                </button>
              </>
            )}

            {app.can_complete && (
              <button className={styles.completeBtn} onClick={handleComplete}>
                Mark as Completed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
