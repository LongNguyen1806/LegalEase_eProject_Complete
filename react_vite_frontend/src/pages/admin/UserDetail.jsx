import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/UserDetail.module.css";
import { formatFullDate } from "../../utils/dateUtils";
import SafeImage from "../../components/common/SafeImage";

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get(`/admin/users/${id}`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error(error);
        alert("User not found!");
        navigate("/admin/users");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) return <div className={styles.userdetailLoading}>Loading...</div>;
  if (!data) return <div className={styles.userdetailLoading}>No data.</div>;

  const { user, profile, offices, degrees, rolename, verification_status, verifications, specialties } = data;

  return (
    <div className={styles.userdetail}>
      <div className={styles.userdetailHeader}>
        <button className={styles.btnBack} onClick={() => navigate("/admin/users")}>
          ← Back
        </button>
        <h1>User Details: #{user.userid}</h1>
      </div>
      <div className={styles.card}>
        <div className={styles.accountHeaderFlex}>
          <div className={styles.avatarSection}>
            <SafeImage src={profile?.profileimage} type={user.roleid === 2 ? "lawyer" : "customer"} className={styles.detailAvatar} />
          </div>

          <div style={{ flex: 1 }}>
            <h3>Account Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Full Name</span>
                <span className={styles.infoValue}>{profile?.fullname || "N/A"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{user.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Role</span>
                <span className={styles.infoValue}>{rolename}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status</span>
                <span className={styles.infoValue}>
                  {user.isactive ? <span className={styles.statusActive}>Active</span> : <span className={styles.statusDisabled}>Disabled</span>}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Phone</span>
                <span className={styles.infoValue}>{profile?.phonenumber || "Not updated"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Joined At</span>
                <span className={styles.infoValue}>{formatFullDate(user.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.roleid === 2 && (
        <>
          <div className={styles.card}>
            <h3>Lawyer Profile</h3>
            <div className={`${styles.infoGrid} ${styles.mb15}`}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Verification</span>
                <span className={styles.infoValue}>
                  <span className={`${styles.verify} ${styles[verification_status?.toLowerCase() || "rejected"]}`}>{verification_status}</span>
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Experience</span>
                <span className={styles.infoValue}>{profile?.experienceyears || 0} Years</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Biography</span>
              <div className={styles.bioBox}>{profile?.bio || "No biography provided."}</div>
            </div>
          </div>
          <div className={styles.card}>
            <h3>⚖️ Legal Specialties</h3>
            {specialties?.length ? (
              <div className={styles.infoGrid}>
                {specialties.map((s, idx) => (
                  <div key={idx} className={styles.infoItem}>
                    <span className={styles.infoValue}>{s.specname}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.mutedItalic}>No specialties listed.</p>
            )}
          </div>
          <div className={styles.card}>
            <h3>📂 Verification Documents</h3>
            {verifications && verifications.length > 0 ? (
              <div className={styles.verificationListContainer}>
                {verifications.map((v, vIdx) => {
                  const docPaths = Array.isArray(v.documentimage) ? v.documentimage : [];

                  return (
                    <div key={v.verifyid || vIdx} className={styles.verificationGroup}>
                      {verifications.length > 1 && (
                        <h4 className={styles.groupTitle}>
                          Request #{v.verifyid} -<span className={styles[`status${v.status}`]}> {v.status}</span>
                          <small> ({formatFullDate(v.updated_at)})</small>
                        </h4>
                      )}

                      {docPaths.length > 0 ? (
                        <div className={styles.fileGridAdmin}>
                          {docPaths.map((fullUrl, imgIdx) => (
                            <div key={imgIdx} className={styles.fileItemAdmin}>
                              <div className={styles.filePreviewBox} onClick={() => window.open(fullUrl, "_blank")}>
                                {fullUrl.toLowerCase().endsWith(".pdf") ? (
                                  <span className={styles.pdfIcon}>📕 PDF</span>
                                ) : (
                                  <img src={fullUrl} alt={`Doc ${imgIdx + 1}`} onError={(e) => (e.target.src = "https://via.placeholder.com/100?text=Error")} />
                                )}
                              </div>
                              <span className={styles.infoLabel}>Doc #{imgIdx + 1}</span>
                              <br />
                              <a href={fullUrl} target='_blank' rel='noreferrer' className={styles.btnView}>
                                View Full
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.mutedItalic}>No files attached to this request.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.mutedItalic}>No verification requests found.</p>
            )}
          </div>

          <div className={styles.twoColumn}>
            <div className={styles.card}>
              <h3>📍 Offices</h3>
              {offices?.length ? (
                <ul className={styles.detailList}>
                  {offices.map((o) => (
                    <li key={o.officeid}>
                      <strong>{o.cityname || "Unknown City"}:</strong> {o.addressdetail}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.mutedItalic}>None</p>
              )}
            </div>
            <div className={styles.card}>
              <h3>🎓 Awards & Achievements</h3>
              {degrees?.length ? (
                <ul className={styles.detailList}>
                  {degrees.map((d) => (
                    <li key={d.achieveid}>
                      <strong>{d.title}</strong>
                      {d.year && <span className={styles.mutedText}> ({d.year})</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.mutedItalic}>None</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
