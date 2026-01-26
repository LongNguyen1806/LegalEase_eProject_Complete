import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/client/StylePublic/NewsDetail.module.css";

import { formatFullDate } from "../../utils/dateUtils";

export default function NewsDetail() {
  const { id } = useParams();

  const { data: news, isLoading, isError } = useQuery({
    queryKey: ["news-detail", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/contents/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 300000, 
  });

  if (isLoading) return <div className={styles.loadingBox}>⏳ Syncing article data...</div>;
  if (isError || !news) return <div className={styles.errorBox}>⚠️ Article could not be found.</div>;

  return (
    <div className={styles.newsDetailPage}>
      <Link to="/" className={styles.btnBack}>
        ← Back to Home
      </Link>

      <header className={styles.articleHeader}>
        <div className={styles.articleMeta}>
          <span className={styles.metaCat}>
            {news.type === 'News' ? 'News' : news.type}
          </span>
          <span className={styles.metaDate}>
            📅 {formatFullDate(news.created_at)}
          </span>
        </div>
        <h1 className={styles.articleTitle}>{news.title}</h1>
      </header>

      <article 
        className={styles.articleContent}
        dangerouslySetInnerHTML={{ __html: news.body }} 
      />
      
      <footer className={styles.articleFooter}>
          <Link to="/" className={styles.viewMoreLink}>
              Discover other legal insights →
          </Link>
      </footer>
    </div>
  );
}