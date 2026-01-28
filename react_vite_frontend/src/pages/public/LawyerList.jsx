import { useState, useContext } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { AuthContext } from "../../context/AuthContext";
import SafeImage from "../../components/common/SafeImage";
import styles from "../../assets/styles/client/StylePublic/LawyerList.module.css";
import { FaBriefcase, FaUser, FaMapMarkerAlt, FaStar, FaCheckCircle, FaSearch, FaCalendarCheck, FaChevronLeft, FaChevronRight, FaGraduationCap } from "react-icons/fa";

export default function LawyerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const pageParam = Number(searchParams.get("page")) || 1;
  const keywordParam = searchParams.get("keyword") || "";
  const locationParam = searchParams.get("location") || "";
  const specParam = searchParams.get("spec") || "";

  const [keywordInput, setKeywordInput] = useState(keywordParam);

  const { data: masterData } = useQuery({
    queryKey: ["master-data"],
    queryFn: async () => {
      const res = await axiosClient.get("/master-data");
      return res.data.data;
    },
    staleTime: Infinity,
  });

  const {
    data: responseData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["lawyers", keywordParam, locationParam, specParam, pageParam],
    queryFn: async () => {
      const res = await axiosClient.get("/lawyers", {
        params: {
          keyword: keywordParam,
          location_id: locationParam,
          specialization_id: specParam,
          page: pageParam,
        },
      });
      return res.data.data;
    },
    keepPreviousData: true,
  });

  const lawyers = responseData?.data || [];
  const lastPage = responseData?.last_page || 1;

  const handleBookingClick = (lawyerId) => {
    if (!user) {
      toast.info("Please log in!", {
        description: "You need a customer account to book a consultation.",
      });
      return navigate("/login");
    }

    if (user.roleid === 2) {
      Swal.fire({
        title: "Notification",
        text: "The appointment booking feature is available to customers only. Lawyers cannot perform this action.",
        icon: "warning",
        confirmButtonColor: "#1c357e",
      });
      return;
    }

    navigate(`/booking/${lawyerId}`);
  };

  const handleSearchSubmit = () => updateParams("keyword", keywordInput);
  const handleKeyDown = (e) => e.key === "Enter" && handleSearchSubmit();

  const updateParams = (key, value) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value) newParams.set(key, value);
      else newParams.delete(key);
      if (key !== "page") newParams.delete("page");
      return newParams;
    });
  };

  const handlePageChange = (newPage) => {
    updateParams("page", newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={styles.lawyerListPage}>
      <div className={styles.lawyerListContainer}>
        <header className={styles.listHeader}>
          <h2>Lawyer Directory</h2>
          <p>Find and consult with top-rated legal experts verified by LegalEase</p>
        </header>

        <div className={styles.filterBar}>
          <div className={styles.searchGroup}>
            <div className={styles.inputWithIcon}>
              <FaSearch className={styles.searchIcon} />
              <input
                type='text'
                placeholder='Search legal issue or lawyer name...'
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button className={styles.btnSearchTrigger} onClick={handleSearchSubmit}>
              Search
            </button>
          </div>

          <div className={styles.selectGroup}>
            <select value={locationParam} onChange={(e) => updateParams("location", e.target.value)} className={styles.filterSelect}>
              <option value=''>All locations</option>
              {masterData?.locations?.map((l) => (
                <option key={l.locid} value={l.locid}>
                  {l.cityname}
                </option>
              ))}
            </select>
            <select value={specParam} onChange={(e) => updateParams("spec", e.target.value)} className={styles.filterSelect}>
              <option value=''>All specialties</option>
              {masterData?.specializations?.map((s) => (
                <option key={s.specid} value={s.specid}>
                  {s.specname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Searching experts...</p>
          </div>
        ) : (
          <>
            <div className={`${styles.lawyerListRows} ${isFetching ? styles.dimmed : ""}`}>
              {lawyers.length > 0 ? (
                lawyers.map((lawyer, index) => {
                  const isFeatured = index < 2 && pageParam === 1;

                  return (
                    <div key={lawyer.userid} className={`${styles.lawyerRowItem} ${isFeatured ? styles.featuredRow : ""}`}>
                      <div className={styles.rowColVisual}>
                        <div className={styles.avatarWrapper}>
                          <SafeImage src={lawyer.profileimage} type='lawyer' alt={lawyer.fullname || "Lawyer"} loading='lazy' />
                          {lawyer.planname && <span className={styles.proBadgeCrown}>👑 PRO</span>}
                        </div>
                      </div>
                      <div className={styles.rowColInfo}>
                        <div className={styles.infoTop}>
                          <h3 className={styles.lawyerNameTitle}>
                            {lawyer.fullname || "Legal Counselor"}
                            {lawyer.isverified ? <FaCheckCircle className={styles.verifiedIcon} title='Verified by LegalEase' /> : null}
                          </h3>
                          <div className={styles.rowRatingInline}>
                            <FaStar className={styles.starIcon} />
                            <strong>{lawyer.average_rating ? parseFloat(lawyer.average_rating).toFixed(1) : "N/A"}</strong>
                            <span className={styles.reviewCount}>({lawyer.reviews?.length || 0} reviews)</span>
                          </div>
                        </div>

                        <div className={styles.infoDetails}>
                          <div className={styles.detailItem}>
                            <FaGraduationCap className={styles.detailIcon} />
                            <span>{lawyer.experienceyears || 0} years of experience</span>
                          </div>
                          <div className={styles.detailItem}>
                            <FaBriefcase className={styles.detailIcon} />
                            <span>
                              Practice Areas: <strong>{lawyer.specializations?.map((s) => s.specname).join(", ") || "General Practice"}</strong>
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <FaMapMarkerAlt className={styles.detailIcon} />
                            <span>{lawyer.office?.location?.cityname || "Location not updated"}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <FaUser className={styles.detailIcon} />
                            <p className={styles.bioSummary}>{lawyer.bio || "No biography available for this expert yet."}</p>
                          </div>
                        </div>
                      </div>

                      <div className={styles.rowColActions}>
                        <div className={styles.actionButtons}>
                          <button onClick={() => handleBookingClick(lawyer.userid)} className={styles.btnBookNow}>
                            <FaCalendarCheck /> Book Appointment
                          </button>

                          <Link to={`/lawyers/${lawyer.userid}`} className={styles.btnViewProfile}>
                            View Profile
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyResult}>No experts found matching your criteria.</div>
              )}
            </div>

            {lastPage > 1 && (
              <div className={styles.pagination}>
                <button disabled={pageParam === 1} onClick={() => handlePageChange(pageParam - 1)} className={styles.pageBtn}>
                  <FaChevronLeft /> Prev
                </button>
                {[...Array(lastPage)].map((_, i) => (
                  <button key={i + 1} onClick={() => handlePageChange(i + 1)} className={`${styles.pageBtn} ${pageParam === i + 1 ? styles.activePage : ""}`}>
                    {i + 1}
                  </button>
                ))}
                <button disabled={pageParam === lastPage} onClick={() => handlePageChange(pageParam + 1)} className={styles.pageBtn}>
                  Next <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
