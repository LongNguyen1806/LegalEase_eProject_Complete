import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/client/StylePublic/HomePage.module.css";
import SafeImage from "../../components/common/SafeImage";
import { FiSearch, FiMapPin, FiStar, FiCalendar, FiArrowRight, FiArrowRightCircle, FiCheckCircle } from "react-icons/fi";
import { LuCrown } from "react-icons/lu";

export default function HomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [selectedLoc, setSelectedLoc] = useState("");

  const { data: masterData, isLoading: masterLoading } = useQuery({
    queryKey: ["master-data"],
    queryFn: async () => {
      const res = await axiosClient.get("/master-data");
      return res.data.data;
    },
    staleTime: Infinity,
  });

  const locations = masterData?.locations || [];

  const { data: featuredLawyers, isLoading: lawyerLoading } = useQuery({
    queryKey: ["featured-lawyers-home"],
    queryFn: async () => {
      const res = await axiosClient.get("/featured-lawyers");
      return res.data.data;
    },
  });

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ["latest-news"],
    queryFn: async () => {
      const res = await axiosClient.get("/contents", {
        params: { type: "News", limit: 3 },
      });
      return res.data.data;
    },
  });

  const latestNews = newsData || [];

  const stripHtmlAndDecode = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (selectedLoc) params.append("location", selectedLoc);
    navigate(`/lawyers?${params.toString()}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className={styles.homepage}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Find the Right Lawyer Today</h1>
        <p className={styles.heroSubtitle}>Connecting you with top-rated, verified legal experts in your area.</p>

        <div className={styles.searchBox}>
          <div className={styles.searchInput}>
            <FiSearch className={styles.searchBoxIcon} />
            <input
              type='text'
              placeholder='Search legal issue or lawyer name...'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.searchSelect}>
            <FiMapPin className={styles.searchBoxIcon} />
            <select value={selectedLoc} onChange={(e) => setSelectedLoc(e.target.value)}>
              <option value=''>City, State or Province</option>
              {!masterLoading &&
                locations.map((l) => (
                  <option key={l.locid} value={l.locid}>
                    {l.cityname}
                  </option>
                ))}
            </select>
          </div>

          <button className={styles.searchBtn} onClick={handleSearch}>
            SEARCH <FiArrowRightCircle size={20} />
          </button>
        </div>
      </section>

      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2>Featured Lawyers</h2>
          <p className={styles.sectionSub}>Connect with our highest-rated legal professionals based on verified expertise</p>
        </div>

        {lawyerLoading ? (
          <div className={styles.loadingContainer}>⏳ Loading top experts...</div>
        ) : (
          <div className={styles.lawyerGrid}>
            {featuredLawyers?.length > 0 ? (
              featuredLawyers.map((lawyer) => (
                <div className={styles.lawyerCard} key={lawyer.userid}>
                  <div className={styles.lawyerImageWrapper}>
                    <SafeImage src={lawyer.profileimage} type='lawyer' alt={lawyer.fullname} />
                    {(lawyer.ispro || lawyer.planname) && (
                      <div className={styles.proBadge}>
                        <LuCrown /> PRO
                      </div>
                    )}
                  </div>

                  <div className={styles.lawyerInfo}>
                    <h3 className={styles.lawyerName}>
                      {lawyer.fullname || "Legal Expert"}
                      {lawyer.isverified && <FiCheckCircle className={styles.verifiedIcon} title='Verified' />}
                    </h3>

                    <div className={styles.tagsList}>
                      {lawyer.specializations?.slice(0, 2).map((s) => (
                        <span key={s.specid} className={styles.tagItem}>
                          {s.specname}
                        </span>
                      ))}
                    </div>

                    <div className={styles.lawyerMeta}>
                      <span className={styles.metaItem}>
                        <FiStar className={styles.star} />
                        {lawyer.average_rating ? parseFloat(lawyer.average_rating).toFixed(1) : "N/A"}
                      </span>
                      <span className={styles.metaItem}>
                        <FiMapPin /> {lawyer.office?.location?.cityname || "Vietnam"}
                      </span>
                    </div>
                    <Link to={`/lawyers/${lawyer.userid}`} className={styles.btnCardAction}>
                      View profile
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.emptyText}>Featured lawyers updated periodically.</p>
            )}
          </div>
        )}

        <div className={styles.viewAllContainer}>
          <Link to='/lawyers' className={styles.btnViewAll}>
            View all lawyers
          </Link>
        </div>
      </section>

      <section className={`${styles.sectionContainer} ${styles.newsSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Legal News & Insights</h2>
          <p className={styles.sectionSub}>Stay informed with the latest updates from our legal community</p>
        </div>

        {newsLoading ? (
          <div className={styles.loadingContainer}>⏳ Loading news...</div>
        ) : (
          <div className={styles.newsGrid}>
            {latestNews.length > 0 ? (
              latestNews.map((news) => (
                <div className={styles.newsCard} key={news.contentid}>
                  <div className={styles.newsThumb}>
                    <img
                      src={news.contentimage ? `${DOMAIN}/storage/News/${news.contentimage}` : `${DOMAIN}/storage/News/news-default.png`}
                      alt={news.title}
                      onError={(e) => (e.target.src = `${DOMAIN}/storage/News/news-default.png`)}
                    />
                  </div>

                  <div className={styles.newsBody}>
                    <div className={styles.newsMeta}>
                      <span className={styles.newsTypeTag}>{news.type}</span>
                      <span className={styles.newsDate}>
                        <FiCalendar />
                        {new Date(news.created_at).toLocaleDateString("en-US")}
                      </span>
                    </div>

                    <h3 className={styles.newsTitle}>
                      <Link to={`/news/${news.contentid}`}>{news.title}</Link>
                    </h3>

                    <p className={styles.newsExcerpt}>{stripHtmlAndDecode(news.body).substring(0, 90)}...</p>

                    <Link to={`/news/${news.contentid}`} className={styles.newsReadMore}>
                      Read more <FiArrowRight />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.emptyText}>No news articles available.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
