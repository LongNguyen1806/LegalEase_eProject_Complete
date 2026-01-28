import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/Verification.module.css";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaCheck, FaTimes, FaSearchPlus, FaSyncAlt, FaInfoCircle } from "react-icons/fa";

export default function Verification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewImage, setPreviewImage] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["adminPendingVerifications"],
    queryFn: async () => {
      const res = await axiosClient.get("/admin/verifications/pending");
      return res.data.success ? res.data.data : [];
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => axiosClient.post(`/admin/verifications/${id}/approve`),
    onSuccess: () => {
      Swal.fire("Approved!", "Lawyer account has been activated.", "success");
      queryClient.invalidateQueries(["adminPendingVerifications"]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Approval failed.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => axiosClient.post(`/admin/verifications/${id}/reject`),
    onSuccess: () => {
      toast.success("Verification request rejected.");
      queryClient.invalidateQueries(["adminPendingVerifications"]);
    },
    onError: () => {
      toast.error("Rejection failed.");
    },
  });

  const handleApprove = (id) => {
    Swal.fire({
      title: "Confirm Approval?",
      text: "The lawyer's account will be activated immediately.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Activate",
    }).then((result) => {
      if (result.isConfirmed) approveMutation.mutate(id);
    });
  };

  const handleReject = (id) => {
    Swal.fire({
      title: "Confirm Rejection?",
      text: "The lawyer will need to resubmit their documents.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Reject",
    }).then((result) => {
      if (result.isConfirmed) rejectMutation.mutate(id);
    });
  };

  const ImageModal = () =>
    previewImage && (
      <div className={styles.imageModal} onClick={() => setPreviewImage(null)}>
        <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
          <img src={previewImage} alt='Document Full Size' />
          <button className={styles.closeBtn} onClick={() => setPreviewImage(null)}>
            <FaTimes /> Close
          </button>
        </div>
      </div>
    );

  if (isLoading && requests.length === 0) {
    return <div className={styles.verificationLoading}>⏳ Loading pending requests...</div>;
  }

  return (
    <div className={styles.verification}>
      <div className={styles.headerFlex}>
        <div>
          <h1>Lawyer Verification Requests</h1>
          <p className={styles.verificationDesc}>
            <FaInfoCircle /> Review submitted documents to verify and activate lawyer accounts.
          </p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={() => {
            queryClient.invalidateQueries(["adminPendingVerifications"]);
            toast.info("Refreshing verification list...");
          }}>
          <FaSyncAlt /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className={styles.verificationEmpty}>
          <h3>No pending requests 🎉</h3>
          <p>All lawyer profiles have been processed.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.verificationTable}>
            <thead>
              <tr>
                <th style={{ width: "60px" }}>ID</th>
                <th style={{ width: "250px" }}>Lawyer Info</th>
                <th style={{ width: "220px" }}>License Info</th>
                <th>Attached Documents</th>
                <th className={styles.center} style={{ width: "180px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.verifyid}>
                  <td className={styles.center}>#{req.verifyid}</td>

                  <td>
                    <div className={styles.lawyerInfo} style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/verifications/${req.lawyerid}`)}>
                      <strong className={styles.lawyerName}>{req.lawyer?.fullname || "Unknown"}</strong>
                      <small className={styles.lawyerEmail}>{req.lawyer?.user?.email}</small>
                      <span className={styles.badgeId}>ID: {req.lawyerid}</span>
                    </div>
                  </td>

                  <td>
                    <div className={styles.metaInfo}>
                      <p>
                        <strong>License:</strong> {req.licensenumber}
                      </p>
                      <p>
                        <strong>ID Card:</strong> {req.idcardnumber}
                      </p>
                      <p className={styles.timeAgo}>Submitted: {new Date(req.updated_at).toLocaleDateString()}</p>
                    </div>
                  </td>

                  <td>
                    <div className={styles.docGrid}>
                      {req.document_urls?.map((url, index) => (
                        <div key={index} className={styles.docThumbnail} onClick={() => setPreviewImage(url)}>
                          <img
                            src={url}
                            alt={`Doc ${index + 1}`}
                            loading='lazy'
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/80?text=Error";
                            }}
                          />
                          <div className={styles.zoomIcon}>
                            <FaSearchPlus />
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className={styles.center}>
                    <div className={styles.actions}>
                      <button className={`${styles.btn} ${styles.approve}`} onClick={() => handleApprove(req.verifyid)} disabled={approveMutation.isPending}>
                        <FaCheck /> Approve
                      </button>
                      <button className={`${styles.btn} ${styles.reject}`} onClick={() => handleReject(req.verifyid)} disabled={rejectMutation.isPending}>
                        <FaTimes /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ImageModal />
    </div>
  );
}
