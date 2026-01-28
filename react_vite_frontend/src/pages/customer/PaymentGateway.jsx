import { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import styles from "../../assets/styles/client/StyleCustomer/PaymentGateway.module.css";
import SafeImage from "../../components/common/SafeImage";

import { toast } from "sonner";
import Swal from "sweetalert2";

import { formatFullDate, formatDisplayTime, formatMoney } from "../../utils/dateUtils";

import {
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaApplePay,
  FaGooglePay,
  FaCheckCircle,
  FaArrowLeft,
  FaShieldAlt,
  FaRegCalendarAlt,
  FaRegClock,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaStickyNote,
  FaHistory,
} from "react-icons/fa";

export default function PaymentGateway() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const bookingData = location.state?.bookingData;

  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("Visa");

  const paymentMethods = [
    { name: "Visa", icon: <FaCcVisa color='#1A1F71' /> },
    { name: "ApplePay", icon: <FaApplePay color='#000000' /> },
    { name: "PayPal", icon: <FaCcPaypal color='#003087' /> },
    { name: "MasterCard", icon: <FaCcMastercard color='#EB001B' /> },
    { name: "GPay", icon: <FaGooglePay color='#4285F4' /> },
  ];

  useEffect(() => {
    if (!bookingData) {
      toast.error("Booking information not found. Please try again.");
      navigate("/");
    }
  }, [bookingData, navigate]);

  const handleConfirmPayment = async () => {
    if (processing) return;

    const result = await Swal.fire({
      title: "Confirm Payment?",
      text: `Are you sure you want to proceed with the payment of ${formatMoney(totalAmount)}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Pay Now",
      cancelButtonText: "Review Details",
      confirmButtonColor: "#1890ff",
      cancelButtonColor: "#94a3b8",
    });

    if (!result.isConfirmed) return;

    setProcessing(true);
    const loadingToast = toast.loading("Connecting to payment gateway...");

    try {
      const storeRes = await axiosClient.post("/customer/appointments", {
        slotid: bookingData.slotid,
        packagename: bookingData.packagename,
        starttime: bookingData.starttime,
        duration: bookingData.duration,
        note: bookingData.note,
        payment_method: selectedMethod,
      });

      if (!storeRes.data.success) throw new Error("Failed to create appointment.");

      toast.info("Authorizing transaction...", { id: loadingToast });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("Transaction approved!", { id: loadingToast });
      setPaymentSuccess(true);
    } catch (error) {
      setProcessing(false);
      const status = error.response?.status;
      const serverMsg = error.response?.data?.message || "Transaction failed.";

      if (status === 400 || status === 409) {
        toast.dismiss(loadingToast);

        await Swal.fire({
          title: "Session Expired",
          text: serverMsg,
          icon: "warning",
          confirmButtonText: "Go Back to Calendar",
          confirmButtonColor: "#1e293b",
          allowOutsideClick: false,
        });

        const lawyerId = bookingData.lawyer?.userid;
        console.log("Navigate to ID:", lawyerId);
        navigate(`/booking/${lawyerId}`);
      } else {
        toast.error(`Error: ${serverMsg}`, { id: loadingToast });
      }
    }
  };

  if (!bookingData) return null;

  const totalAmount = Number(bookingData.estimatedPrice);
  const consultationFee = Math.round(totalAmount / 1.1);
  const serviceFee = totalAmount - consultationFee;

  return (
    <div className={styles.pgWrapper}>
      <div className={styles.pgHeaderNav}>
        <button onClick={() => navigate(-1)} className={styles.pgBackLink}>
          <FaArrowLeft style={{ marginRight: "8px" }} /> Back to Booking
        </button>
      </div>

      <div className={styles.pgMainLayout}>
        <div className={styles.pgLeftColumn}>
          <h2 className={styles.pgSectionTitle}>Payment</h2>
          <p className={styles.pgSectionSubtitle}>Complete your transaction to secure the appointment</p>

          <div className={styles.pgMethodSection}>
            <label className={styles.pgLabel}>Payment Method</label>
            <div className={styles.pgMethodGrid}>
              {paymentMethods.map((m) => (
                <div key={m.name} className={`${styles.pgMethodItem} ${selectedMethod === m.name ? styles.active : ""}`} onClick={() => setSelectedMethod(m.name)}>
                  <span className={styles.pgMethodIcon}>{m.icon}</span>
                  <span className={styles.pgMethodName}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.pgCardSimulated}>
            <div className={styles.pgFormGroup}>
              <label className={styles.pgLabel}>Card Number</label>
              <input type='text' value='**** **** **** 3456' disabled className={styles.pgInputDisabled} />
            </div>
            <div className={styles.pgFormRow}>
              <div className={styles.pgFormGroup}>
                <label className={styles.pgLabel}>Expiry Date</label>
                <input type='text' value='MM/YY' disabled className={styles.pgInputDisabled} />
              </div>
              <div className={styles.pgFormGroup}>
                <label className={styles.pgLabel}>CVV</label>
                <input type='text' value='***' disabled className={styles.pgInputDisabled} />
              </div>
            </div>
            <div className={styles.pgFormGroup}>
              <label className={styles.pgLabel}>Cardholder Name</label>
              <input type='text' value={user?.fullname?.toUpperCase() || "CUSTOMER NAME"} disabled className={styles.pgInputDisabled} />
            </div>
          </div>

          <div className={styles.pgContactSection}>
            <h4 className={styles.pgSubTitle}>Your Contact Information</h4>
            <div className={styles.pgFormRow}>
              <div className={styles.pgFormGroup}>
                <label className={styles.pgLabel}>Full Name</label>
                <input type='text' value={user?.customer_profile?.fullname || user?.fullname || ""} disabled className={styles.pgInputFilled} />
              </div>
              <div className={styles.pgFormGroup}>
                <label className={styles.pgLabel}>Phone Number</label>
                <input type='text' value={user?.customerProfile?.phonenumber || user?.customer_profile?.phonenumber || "N/A"} disabled className={styles.pgInputFilled} />
              </div>
            </div>
            <div className={styles.pgFormGroup}>
              <label className={styles.pgLabel}>Email Address</label>
              <input type='text' value={user?.email || ""} disabled className={styles.pgInputFilled} />
            </div>
          </div>

          <div className={styles.pgSecurityNote}>
            <FaShieldAlt style={{ marginRight: "8px" }} /> Secure and encrypted transaction
          </div>

          <button onClick={handleConfirmPayment} disabled={processing} className={`${styles.pgMainPayBtn} ${processing ? styles.loading : ""}`}>
            {processing ? "Processing..." : `Pay ${formatMoney(totalAmount)} Now`}
          </button>
        </div>

        <div className={styles.pgRightColumn}>
          <div className={styles.pgSummaryCard}>
            <h4 className={styles.pgSummaryTitle}>Appointment Summary</h4>

            <div className={styles.pgLawyerMiniProfile}>
              <SafeImage src={bookingData.lawyer?.lawyer_profile?.profileimage} type='lawyer' alt={bookingData.lawyer?.fullname || "Lawyer"} />
              <div>
                <p className={styles.pgLawyerName}>Lawyer {bookingData.lawyer?.fullname}</p>
                <p className={styles.pgLawyerSpec}>{bookingData.lawyer?.lawyer_profile?.specialization?.specname || "Legal Consultant"}</p>
                <div className={styles.pgLawyerContact}>
                  <span>
                    <FaEnvelope size={10} /> {bookingData.lawyer?.user?.email}
                  </span>
                  <span>
                    <FaPhoneAlt size={10} /> {bookingData.lawyer?.user?.phonenumber}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.pgDetailList}>
              <div className={styles.pgDetailItem}>
                <span>
                  <FaRegCalendarAlt className={styles.icon} /> Date
                </span>
                <strong>{formatFullDate(bookingData.availabledate)}</strong>
              </div>
              <div className={styles.pgDetailItem}>
                <span>
                  <FaRegClock className={styles.icon} /> Time
                </span>
                <strong>
                  {formatDisplayTime(bookingData.starttime)} ({bookingData.duration} mins)
                </strong>
              </div>
              <div className={styles.pgDetailItem}>
                <span>
                  <FaMapMarkerAlt className={styles.icon} /> Location
                </span>
                <strong>{bookingData.lawyer?.office?.location?.address || "Online Consultation"}</strong>
              </div>

              <div className={styles.pgDetailItemNote}>
                <span>
                  <FaStickyNote className={styles.icon} /> Your Note:
                </span>
                <p>"{bookingData.note || "No notes provided"}"</p>
              </div>
            </div>

            <hr className={styles.pgHr} />

            <div className={styles.pgPriceBreakdown}>
              <div className={styles.pgPriceItem}>
                <span>Consultation Fee</span>
                <span>{formatMoney(consultationFee)}</span>
              </div>
              <div className={styles.pgPriceItem}>
                <span>Service Fee (10%)</span>
                <span>{formatMoney(serviceFee)}</span>
              </div>
              <div className={styles.pgTotalRow}>
                <span>Total Amount</span>
                <span className={styles.pgFinalPrice}>{formatMoney(totalAmount)}</span>
              </div>
            </div>

            <div className={styles.pgPolicyBox}>
              <p>
                <strong>Cancellation Policy:</strong>
              </p>
              <p>Cancel at least 24 hours in advance: a non-refundable 10% service fee applies. The remaining amount will be refunded.</p>
            </div>
          </div>
        </div>
      </div>

      {paymentSuccess && (
        <div className={styles.pgModalOverlay}>
          <div className={styles.pgSuccessModal}>
            <div className={styles.pgSuccessIcon}>
              <FaCheckCircle color='#10b981' size={80} />
            </div>
            <h3>Payment Successful!</h3>
            <p>Your request has been sent to Lawyer {bookingData.lawyer?.fullname}. Please wait for their confirmation.</p>
            <button onClick={() => navigate("/customer/appointments")} className={styles.pgBtnDone}>
              View My Appointments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
