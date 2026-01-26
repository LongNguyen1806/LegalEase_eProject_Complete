import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/client/StylePublic/DynamicContentDetail.module.css";
import { formatFullDate } from "../../utils/dateUtils";

export default function DynamicContentDetail() {
  const { id } = useParams();

  const {
    data: content,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["content-detail", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/contents/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 300000,
  });

  if (isLoading) return <div className={styles.statusBox}>⏳ Loading content...</div>;
  if (isError || !content) return <div className={styles.statusBox}>⚠️ Content not found.</div>;

  const systemPolicies = ["Terms of Service", "Privacy Policy", "Cookie Policy"];
  const isSystemPolicy = systemPolicies.includes(content.type);
  const shouldShowHeroImage = (content.type === "News" || content.type === "Guide") && content.contentimage;

  return (
    <div className={styles.detailWrapper}>
      <header className={styles.articleHeader}>
        <div className={styles.metaInfo}>
          <span className={`${styles.badge} ${styles[content.type.replace(/\s+/g, "").toLowerCase()]}`}>{content.type}</span>
          <span className={styles.publishDate}>📅 {formatFullDate(content.created_at)}</span>
        </div>
        <h1 className={styles.mainTitle}>{content.title}</h1>
      </header>

      {shouldShowHeroImage && (
        <figure className={styles.heroImage}>
          <img
            src={content.contentimage ? `${DOMAIN}/storage/News/${content.contentimage}` : `${DOMAIN}/storage/default-news.png`}
            alt={content.title || "LegalEase Content"}
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = `${DOMAIN}/storage/default-news.png`;
            }}
          />
        </figure>
      )}
      <article className={styles.articleBody} dangerouslySetInnerHTML={{ __html: content.body }} />
      <footer className={styles.articleFooter}>
        <Link to={isSystemPolicy ? "/" : "/support?tab=library"} className={styles.exploreLink}>
          {isSystemPolicy ? "Go to Home →" : "Find more helpful articles →"}
        </Link>
      </footer>
    </div>
  );
}
