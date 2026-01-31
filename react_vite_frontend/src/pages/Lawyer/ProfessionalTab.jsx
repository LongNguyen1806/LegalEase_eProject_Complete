import { useState, useRef, useEffect, Fragment } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleLawyer/ProfessionalTab.module.css";
import { FaTrashAlt, FaGavel, FaAward, FaIdCard, FaFilePdf, FaFileImage, FaMoneyBillWave, FaSave, FaHistory, FaTimes } from "react-icons/fa";
import { FiUploadCloud } from "react-icons/fi";
import { toast } from "sonner";
import Swal from "sweetalert2";

export default function ProfessionalTab({ data, specsMaster, reload }) {
  const queryClient = useQueryClient();
  const profile = data.lawyer_profile || {};

  const getDocumentPaths = (docData) => {
    if (!docData) return [];
    if (Array.isArray(docData)) return docData;
    if (typeof docData === "string") {
      try {
        const parsed = JSON.parse(docData);
        return Array.isArray(parsed) ? parsed : [docData];
      } catch {
        return [docData];
      }
    }
    return [];
  };

  const verificationList = Array.isArray(data.verifications) ? data.verifications : data.verification ? [data.verification] : [];
  const latestVerify = verificationList[0] || {};
  const status = latestVerify.status || "Not Submitted";

  const [expYears, setExpYears] = useState(profile.experienceyears || 0);
  const [selectedSpecs, setSelectedSpecs] = useState((data.specializations || []).map((s) => s.specid));
  const [achievements, setAchievements] = useState(data.achievements || []);
  const [newAchieve, setNewAchieve] = useState("");

  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const [verifyForm, setVerifyForm] = useState({
    idcardnumber: latestVerify.idcardnumber || "",
    licensenumber: latestVerify.licensenumber || "",
    documentimages: [],
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (data.achievements) setAchievements(data.achievements);

    if (data.specializations && data.specializations.length > 0) {
      const firstSpec = data.specializations[0];
      setMinPrice(firstSpec.pivot?.specminprice || 0);
      setMaxPrice(firstSpec.pivot?.specmaxprice || 0);
    }
  }, [data]);

  const updatePriceMutation = useMutation({
    mutationFn: (payload) => axiosClient.put("/lawyer/update-price", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Service pricing updated!");
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to update price";
      toast.error(msg);
    },
  });

  const expertiseMutation = useMutation({
    mutationFn: (payload) => axiosClient.put("/lawyer/profile", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Expertise saved successfully!");
    },
  });

  const addAchieveMutation = useMutation({
    mutationFn: (title) => axiosClient.post("/lawyer/achievements", { title }),
    onSuccess: () => {
      setNewAchieve("");
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Achievement added!");
    },
  });

  const removeAchieveMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/lawyer/achievements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Removed successfully");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (payload) =>
      axiosClient.post("/lawyer/verify", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      setVerifyForm((prev) => ({ ...prev, documentimages: [] }));
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Documents uploaded successfully! 🔐");
    },
  });

  const deleteVerifyMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/lawyer/verify/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Deleted successfully");
    },
  });

  const handleUpdatePrice = () => {
    if (minPrice < 0 || maxPrice < 0) {
      return toast.error("Price cannot be negative!");
    }
    if (Number(minPrice) > Number(maxPrice)) {
      return toast.error("Min price cannot be greater than Max price!");
    }
    updatePriceMutation.mutate({
      specminprice: minPrice,
      specmaxprice: maxPrice,
    });
  };

  const handleSaveExpertise = () => {
    if (expYears === "" || expYears === null) {
      return toast.error("Please enter your years of experience!");
    }
    if (expYears < 0) {
      return toast.error("Years of experience cannot be negative!");
    }
    expertiseMutation.mutate({
      fullname: profile.fullname,
      phonenumber: profile.phonenumber,
      experienceyears: expYears,
      specialization_ids: selectedSpecs,
    });
  };

  const handleRemoveAchievement = async (id) => {
    const result = await Swal.fire({
      title: "Remove this achievement?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });
    if (result.isConfirmed) removeAchieveMutation.mutate(id);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length) {
      setVerifyForm((prev) => ({ ...prev, documentimages: Array.from(e.target.files) }));
    }
  };

  const handleSubmitVerification = (e) => {
    e.preventDefault();
    if (!verifyForm.documentimages.length) return toast.error("Please select files");
    const payload = new FormData();
    payload.append("idcardnumber", verifyForm.idcardnumber);
    payload.append("licensenumber", verifyForm.licensenumber);
    verifyForm.documentimages.forEach((f) => payload.append("documentimages[]", f));
    verifyMutation.mutate(payload);
  };

  const handleDeleteVerify = async (id, st) => {
    if (st === "Approved") return toast.error("Approved documents cannot be deleted");
    const result = await Swal.fire({
      title: "Delete submission?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });
    if (result.isConfirmed) deleteVerifyMutation.mutate(id);
  };

  const statusConfig = {
    Pending: { label: "⏳ Pending Review", class: styles.statusPending },
    Approved: { label: "✅ Verified", class: styles.statusConfirmed },
    Updating: { label: "🔄 Updating", class: styles.statusRefundPending },
    Rejected: { label: "❌ Rejected", class: styles.statusCancelled },
    "Not Submitted": { label: "⚪ Not Submitted", class: styles.statusExpired },
  };

  return (
    <div className={styles.grid}>
      <div className={styles.leftCol}>
        <h3 className={styles.sectionTitle}>
          <FaGavel /> Professional Expertise
        </h3>
        <div className={styles.formGroup}>
          <label className={styles.label}>Years of Experience</label>
          <input type='number' className={styles.inputSmall} value={expYears} min={0} max={50} onChange={(e) => setExpYears(e.target.value)} />
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>Practice Areas</span>
          <div className={styles.tags}>
            {specsMaster.map((spec) => {
              const selected = selectedSpecs.includes(spec.specid);
              return (
                <div
                  key={spec.specid}
                  className={`${styles.tag} ${selected ? styles.tagSelected : ""}`}
                  onClick={() => (selected ? setSelectedSpecs(selectedSpecs.filter((id) => id !== spec.specid)) : setSelectedSpecs([...selectedSpecs, spec.specid]))}>
                  {spec.specname}
                </div>
              );
            })}
          </div>
        </div>

        <button className={styles.btnSecondary} onClick={handleSaveExpertise} disabled={expertiseMutation.isPending}>
          {expertiseMutation.isPending ? "Saving..." : "Save Expertise"}
        </button>

        <hr className={styles.divider} />
        <h3 className={styles.sectionTitle}>
          <FaMoneyBillWave /> Service Pricing
        </h3>
        <p className={styles.pricingDescription}>Set your consultation rates for all practice areas.</p>
        <div className={styles.specPriceCard}>
          <div className={styles.priceRow}>
            <div className={styles.inputWrapper}>
              <small className={styles.priceLabel}>Min Price ($)</small>
              <input type='number' className={`${styles.input} ${styles.priceInput}`} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </div>
            <div className={styles.inputWrapper}>
              <small className={styles.priceLabel}>Max Price ($)</small>
              <input type='number' className={`${styles.input} ${styles.priceInput}`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
            <button className={styles.btnSavePrice} onClick={handleUpdatePrice} disabled={updatePriceMutation.isPending}>
              {updatePriceMutation.isPending ? "..." : <FaSave />}
            </button>
          </div>
        </div>

        <hr className={styles.divider} />
        <h3 className={styles.sectionTitle}>
          <FaAward /> Degrees & Certificates
        </h3>
        <div className={styles.achieveInput}>
          <input className={styles.input} placeholder='e.g. Master of Laws' value={newAchieve} onChange={(e) => setNewAchieve(e.target.value)} />
          <button className={styles.btnSecondary} onClick={() => addAchieveMutation.mutate(newAchieve)} disabled={addAchieveMutation.isPending}>
            {addAchieveMutation.isPending ? "..." : "+ Add"}
          </button>
        </div>
        <ul className={styles.list}>
          {achievements.map((a) => (
            <li key={a.achieveid} className={styles.listItem}>
              <span>{a.title}</span>
              <button className={styles.removeBtn} onClick={() => handleRemoveAchievement(a.achieveid)}>
                <FaTrashAlt />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.rightCol}>
        <div className={styles.headerRow}>
          <h3 className={styles.sectionTitle}>
            <FaIdCard /> Legal Verification
          </h3>
          <span className={`${styles.statusBadge} ${statusConfig[status]?.class || ""}`}>{statusConfig[status]?.label || status}</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Identity Information</label>
          <input
            className={styles.input}
            value={verifyForm.idcardnumber}
            onChange={(e) => setVerifyForm({ ...verifyForm, idcardnumber: e.target.value })}
            disabled={status === "Approved"}
            placeholder='ID number'
          />
          <input
            className={styles.input}
            value={verifyForm.licensenumber}
            onChange={(e) => setVerifyForm({ ...verifyForm, licensenumber: e.target.value })}
            disabled={status === "Approved"}
            placeholder='Lawyer license number'
          />
        </div>

        <div className={styles.verifyHistoryWrapper}>
          <h4 className={styles.subTitle}>
            <FaHistory /> Uploaded Documents
          </h4>
          <div className={styles.unifiedFileGrid}>
            {verificationList.map((ver, vIdx) => {
              const files = getDocumentPaths(ver.documentimage);
              return (
                <Fragment key={vIdx}>
                  {files.map((f, fIdx) => (
                    <div key={`${vIdx}-${fIdx}`} className={styles.fileContainer}>
                      <a className={styles.fileCard} href={`${DOMAIN}/storage/${f}`} target='_blank' rel='noreferrer'>
                        <div className={styles.fileIcon}>{f.toLowerCase().endsWith(".pdf") ? <FaFilePdf /> : <FaFileImage />}</div>
                        <span className={styles.fileLabel}>File {fIdx + 1}</span>
                      </a>
                      {ver.status !== "Approved" && fIdx === 0 && (
                        <button className={styles.miniDeleteBtn} onClick={() => handleDeleteVerify(ver.verifyid, ver.status)} title='Delete this submission group'>
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  ))}
                </Fragment>
              );
            })}
            {verificationList.length === 0 && <p className={styles.emptyText}>No documents uploaded yet.</p>}
          </div>
        </div>

        <div className={styles.uploadActions}>
          <button type='button' className={styles.btnSecondary} onClick={() => fileInputRef.current.click()}>
            <FiUploadCloud /> {verifyForm.documentimages.length > 0 ? "Change Selected Files" : "Select Documents"}
          </button>
          {verifyForm.documentimages.length > 0 && (
            <button type='button' className={styles.btnPrimary} onClick={handleSubmitVerification} disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? "Uploading..." : `Upload Documents (${verifyForm.documentimages.length})`}
            </button>
          )}
        </div>
        <input ref={fileInputRef} type='file' hidden multiple accept='image/*,.pdf' onChange={handleFileSelect} />
      </div>
    </div>
  );
}
