import { useContext, useMemo, useTransition } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Swal from "sweetalert2";

import { formatMoney } from "../../utils/dateUtils";

import {
  FaGraduationCap,
  FaStar,
  FaPhoneAlt,
  FaCalendarAlt,
  FaUser,
  FaScroll,
  FaTrophy,
  FaCommentDots,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCcPaypal,
  FaGooglePay,
  FaCcMastercard,
  FaPenNib,
  FaIdCard,
  FaSpinner,
  FaCrown,
  FaCcVisa,
  FaApplePay,
  FaMoneyBillWave,
} from "react-icons/fa";
import { MdEmail, MdLocationOn } from "react-icons/md";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import styles from "../../assets/styles/client/StylePublic/LawyerDetail.module.css";
import SafeImage from "../../components/common/SafeImage";

export default function LawyerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [isPending, startTransition] = useTransition();

  const {
    data: lawyer,
    isLoading: isLawyerLoading,
    error: lawyerError,
  } = useQuery({
    queryKey: ["lawyerDetail", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/lawyers/${id}`);
      if (!res.data.success) throw new Error("Lawyer not found");
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: canReview = false } = useQuery({
    queryKey: ["reviewPermission", id, user?.id],
    queryFn: async () => {
      if (user?.roleid !== 3) return false;
      const res = await axiosClient.get("/customer/appointments");
      if (res.data.success) {
        return !!res.data.data.find((a) => a.lawyerid == id && (a.status === "Confirmed" || a.status === "Completed"));
      }
      return false;
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { profile, office, reviews, achievements, location, startYear, verificationStatus, mapUrl, rawAvatar, priceRange } = useMemo(() => {
    if (!lawyer) return {};
    const p = lawyer.lawyer_profile || {};
    const o = lawyer.office || {};
    const r = lawyer.reviews || [];
    const a = lawyer.achievements || [];
    const loc = o.location || {};
    const sYear = new Date().getFullYear() - (p.experienceyears || 0);
    const status = lawyer.current_verification_status || "unverified";
    const encodedAddr = encodeURIComponent(`${o.addressdetail}, ${loc.cityname}`);

    const mUrl =
      o.latitude && o.longitude
        ? `https://maps.google.com/maps?q=${o.latitude},${o.longitude}&z=15&output=embed`
        : `https://maps.google.com/maps?q=${encodedAddr}&z=15&output=embed`;

    const avatar = p.profileimage || null;

    const min = lawyer.min_price || 0;
    const max = lawyer.max_price || 0;

    const priceRangeStr = min === 0 && max === 0 ? "Contact for pricing" : `${formatMoney(min, "USD")} - ${formatMoney(max, "USD")}`;

    return {
      profile: p,
      office: o,
      reviews: r,
      achievements: a,
      location: loc,
      startYear: sYear,
      verificationStatus: status,
      mapUrl: mUrl,
      rawAvatar: avatar,
      priceRange: priceRangeStr,
    };
  }, [lawyer]);

  const handleBooking = () => {
    if (!user) {
      toast.info("Please log in!", {
        description: "You need a customer account to book a consultation.",
      });
      navigate("/login");
      return;
    }
    if (user.roleid !== 3) {
      Swal.fire({
        icon: "warning",
        title: "Access Denied",
        text: "Only customers can book consultations.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }
    startTransition(() => {
      navigate(`/booking/${id}`);
    });
  };

  const handleWriteReview = () => {
    startTransition(() => {
      navigate(`/lawyers/${id}/review`);
    });
  };

  if (isLawyerLoading)
    return (
      <div
        className={styles["ld-loading"]}
        style={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}>
        <FaSpinner className={styles["spinner-icon"]} style={{ fontSize: "2rem", marginBottom: "10px" }} />
        <p>Loading lawyer profile...</p>
      </div>
    );

  if (lawyerError)
    return (
      <div className={styles["ld-error"]}>
        <FaExclamationTriangle /> Connection error or lawyer not found.
      </div>
    );

  if (!lawyer) return null;

  return (
    <div className={`${styles["lawyer-detail-page"]} ${isPending ? styles["opacity-50"] : ""}`}>
      <div className={styles["ld-banner-card"]}>
        <div className={styles["ld-banner-left"]}>
          <div className={styles["ld-avatar-circle"]}>
            <SafeImage src={rawAvatar} type='lawyer' alt={profile.fullname} width='150' height='150' />
            {lawyer.planname && (
              <div className={styles["pro-badge-overlay"]}>
                <FaCrown /> PRO
              </div>
            )}
          </div>
          <div className={styles["ld-info"]}>
            <h1 className={styles["ld-name"]}>{profile.fullname}</h1>
            <div className={styles["ld-badges"]}>
              <span className={styles["ld-badge-gray"]}>
                <FaGraduationCap className={styles["icon-mr"]} /> {profile.experienceyears}+ Years Experience
              </span>
              <span className={styles["ld-badge-gold"]}>
                <FaStar className={styles["icon-mr"]} /> {lawyer.average_rating || "5.0"} ({reviews.length} reviews)
              </span>
            </div>
            <div className={styles["ld-contact-row"]}>
              <div className={styles["ld-contact-item"]}>
                <small>Phone</small> <FaPhoneAlt className={styles["icon-mr"]} /> <strong>{profile.phonenumber}</strong>
              </div>
              <div className={styles["ld-contact-item"]}>
                <small>Email</small> <MdEmail className={styles["icon-mr"]} /> <strong>{lawyer.email}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className={styles["ld-banner-right"]}>
          <button className={styles["btn-book-big"]} onClick={handleBooking} disabled={isPending}>
            <FaCalendarAlt className={styles["icon-mr"]} /> BOOK CONSULTATION
          </button>
        </div>
      </div>

      <div className={styles["ld-grid-layout"]}>
        <div className={styles["ld-left-col"]}>
          <div className={styles["ld-card"]}>
            <h3>
              <FaUser className={styles["icon-mr"]} /> Introduction
            </h3>
            <p className={styles["ld-bio"]}>{profile.bio || "The lawyer has not updated their biography yet."}</p>
          </div>

          <div className={styles["ld-card"]}>
            <h3>
              <FaScroll className={styles["icon-mr"]} /> Practice Information
            </h3>
            <div className={styles["ld-license-box"]}>
              <div className={styles["license-row"]}>
                <MdLocationOn className={styles["icon-mr"]} /> Area: <strong>{location.cityname}</strong>
              </div>
              <div className={styles["license-row"]}>
                <FaCalendarAlt className={styles["icon-mr"]} /> Practicing since: <strong>{startYear}</strong>
              </div>
              <div className={styles["license-row"]}>
                <FaIdCard className={styles["icon-mr"]} /> License number: <strong>{lawyer.verifications?.[0]?.licensenumber || "N/A"}</strong>
              </div>
              <div style={{ marginTop: "15px" }}>
                <h3>Practice Areas</h3>
                <p>{lawyer.specializations?.map((s) => s.specname).join(" - ") || "General legal consulting"}</p>
              </div>
              <div className={`${styles["verify-status"]} ${verificationStatus === "Approved" ? styles["success"] : styles["warning"]}`}>
                {verificationStatus === "Approved" && (
                  <>
                    <FaCheckCircle className={styles["icon-mr"]} /> Verified profile
                  </>
                )}
                {verificationStatus === "Updating" && (
                  <>
                    <FaSpinner className={`${styles["icon-mr"]} ${styles["spinner-icon"]}`} /> Lawyer Profile Updating
                  </>
                )}
                {(verificationStatus === "pending" || verificationStatus === "unverified") && (
                  <>
                    <FaExclamationTriangle className={styles["icon-mr"]} /> Verification pending
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles["ld-right-col"]}>
          <div className={styles["ld-card"]}>
            <h3>
              <FaTrophy className={styles["icon-mr"]} /> Awards & Certifications
            </h3>
            {achievements.length > 0 ? (
              <ul className={styles["achieve-list"]}>
                {achievements.map((a) => (
                  <li key={a.achieveid}>
                    <strong>{a.title}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles["text-muted"]}>Updating...</p>
            )}
          </div>

          <div className={styles["ld-card"]}>
            <h3>
              <FaMoneyBillWave className={styles["icon-mr"]} /> Service Fees 💲
            </h3>
            <div className={styles["fee-item"]}>
              <strong>Consultation fee:</strong> {priceRange}
            </div>
            <div className={styles["fee-item"]} style={{ marginTop: "15px" }}>
              <strong>Payment methods:</strong>
              <p style={{ display: "flex", alignItems: "center", gap: "15px", margin: "10px 0" }}>
                {" "}
                <FaCcVisa color='#1A1F71' size='1.5rem' /> Visa{" "}
              </p>{" "}
              <p style={{ display: "flex", alignItems: "center", gap: "15px", margin: "10px 0" }}>
                {" "}
                <FaApplePay color='#000000' size='1.5rem' /> ApplePay{" "}
              </p>{" "}
              <p style={{ display: "flex", alignItems: "center", gap: "15px", margin: "10px 0" }}>
                {" "}
                <FaCcPaypal color='#003087' size='1.5rem' /> Paypal{" "}
              </p>{" "}
              <p style={{ display: "flex", alignItems: "center", gap: "15px", margin: "10px 0" }}>
                {" "}
                <FaCcMastercard color='#EB001B' size='1.5rem' /> MasterCard{" "}
              </p>{" "}
              <p style={{ display: "flex", alignItems: "center", gap: "15px", margin: "10px 0" }}>
                {" "}
                <FaGooglePay color='#4285F4' size='1.5rem' /> GPay{" "}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles["ld-reviews-full"]}>
        <div className={styles["card-header-flex"]}>
          <h3>
            <FaCommentDots className={styles["icon-mr"]} /> Client Reviews
          </h3>
          {canReview ? (
            <button className={styles["btn-write"]} onClick={handleWriteReview} disabled={isPending}>
              <FaPenNib className={styles["icon-mr"]} /> Write a review
            </button>
          ) : (
            <small className={styles["text-muted"]}>(You must complete a consultation to review)</small>
          )}
        </div>

        <div className={styles["ld-reviews-list"]}>
          {reviews.map((r) => (
            <div key={r.revid} className={styles["review-item"]}>
              <div className={styles["review-top"]}>
                <strong>{r.appointment?.customer?.fullname || "Anonymous client"}</strong>
                <div className={styles["stars"]}>
                  {[...Array(r.rating || 5)].map((_, i) => (
                    <FaStar key={i} color='#ffc107' />
                  ))}
                </div>
              </div>
              <p>"{r.comment}"</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles["ld-footer-card"]}>
        <h3>
          <FaMapMarkerAlt className={styles["icon-mr"]} /> Office & Contact
        </h3>

        <div className={styles["footer-info-horizontal"]}>
          <div className={styles["footer-item"]}>
            <FaMapMarkerAlt className={styles["icon-mr"]} color='#1c357e' />
            <span>
              {office.addressdetail}, {location.cityname}
            </span>
          </div>
          <div className={styles["footer-item"]}>
            <FaPhoneAlt className={styles["icon-mr"]} color='#059669' />
            <span>{profile.phonenumber}</span>
          </div>
          <div className={styles["footer-item"]}>
            <MdEmail className={styles["icon-mr"]} color='#dc2626' />
            <span>{lawyer.email}</span>
          </div>
        </div>

        <div className={styles["footer-map-full"]}>
          <iframe src={mapUrl} title='Office Location Map' loading='lazy' style={{ border: 0 }} allowFullScreen></iframe>
        </div>
      </div>
    </div>
  );
}
