import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import SafeImage from "../../components/common/SafeImage";
import styles from "../../assets/styles/admin/LawyerVerifyDetail.module.css";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { 
  FaCheck, FaTimes, FaArrowLeft, FaIdCard, FaBalanceScale, 
  FaMapMarkerAlt, FaAward, FaUserCircle, FaSearchPlus 
} from "react-icons/fa";

export default function LawyerVerifyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedImg, setSelectedImg] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lawyerDetailAdmin", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/admin/users/${id}`);
      return res.data.success ? res.data.data : null;
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => axiosClient.post(`/admin/verifications/${data?.verifications[0]?.verifyid}/approve`),
    onSuccess: () => {
      Swal.fire("Approved!", "Lawyer account activated.", "success");
      queryClient.invalidateQueries(["adminPendingVerifications"]);
      navigate("/admin/verifications");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Error"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => axiosClient.post(`/admin/verifications/${data?.verifications[0]?.verifyid}/reject`),
    onSuccess: () => {
      toast.success("Rejected.");
      navigate("/admin/verifications");
    },
  });

  if (isLoading) return <div className={styles.loading}>⌛ Loading details...</div>;
  if (!data) return <div className={styles.error}>User not found!</div>;

  const { profile, user, offices, specialties, degrees, verifications } = data;
  const currentVerify = verifications?.[0] || {};

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back to List
      </button>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <SafeImage src={profile?.profileimage} type="lawyer" className={styles.avatar} />
          <div>
            <h1>{profile?.fullname}</h1>
            <span className={styles.statusBadge} data-status={data.verification_status}>
              {data.verification_status}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.approveBtn} onClick={() => approveMutation.mutate()}>
            <FaCheck /> Approve Lawyer
          </button>
          <button className={styles.rejectBtn} onClick={() => rejectMutation.mutate()}>
            <FaTimes /> Reject Request
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3><FaUserCircle /> Account & Personal Info</h3>
          <div className={styles.infoRow}><span>Email:</span> <strong>{user?.email}</strong></div>
          <div className={styles.infoRow}><span>Phone:</span> <strong>{profile?.phonenumber}</strong></div>
          <div className={styles.infoRow}><span>Experience:</span> <strong>{profile?.experienceyears} Years</strong></div>
          <div className={styles.infoRow}><span>ID Card No:</span> <strong>{currentVerify?.idcardnumber}</strong></div>
        </section>

        <section className={styles.card}>
          <h3><FaBalanceScale /> Professional Credentials</h3>
          <div className={styles.infoRow}><span>License No:</span> <strong>{currentVerify?.licensenumber}</strong></div>
          <div className={styles.specList}>
            <span>Specializations:</span>
            <div className={styles.tags}>
              {specialties?.map((s, i) => <span key={i} className={styles.tag}>{s.specname}</span>)}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h3><FaMapMarkerAlt /> Office Location</h3>
          {offices?.map((off, i) => (
            <div key={i} className={styles.officeBox}>
              <strong>{off.cityname}</strong>
              <p>{off.addressdetail}</p>
            </div>
          ))}
        </section>

        <section className={styles.card}>
          <h3><FaAward /> Achievements</h3>
          <ul className={styles.achieveList}>
            {degrees?.map((d, i) => <li key={i}>{d.title}</li>)}
          </ul>
        </section>
      </div>

      <div className={styles.docSection}>
        <h3><FaIdCard /> Verification Documents</h3>
        <div className={styles.docGrid}>
          {currentVerify?.documentimage?.map((url, i) => (
            <div key={i} className={styles.docItem} onClick={() => setSelectedImg(url)}>
              <img src={url} alt="Doc" />
              <div className={styles.overlay}><FaSearchPlus /> View</div>
            </div>
          ))}
        </div>
      </div>

      {selectedImg && (
        <div className={styles.lightbox} onClick={() => setSelectedImg(null)}>
          <img src={selectedImg} alt="Preview" />
        </div>
      )}
    </div>
  );
}