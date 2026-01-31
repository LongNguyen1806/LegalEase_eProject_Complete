import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/SystemLogs.module.css";

export default function SystemLogs() {
  const [currentPage, setCurrentPage] = useState(1);

  const { 
  data: queryResponse, 
  isLoading, 
  isFetching, 
  refetch 
} = useQuery({
  queryKey: ["adminLogs", currentPage],
  queryFn: async () => {
    const res = await axiosClient.get(`/admin/logs?page=${currentPage}`);
    return res.data;
  },
  staleTime: 30000, 
  refetchOnWindowFocus: true,
  keepPreviousData: true 
});

  const logs = queryResponse?.data?.data || [];
  const pagination = {
    current_page: queryResponse?.data?.current_page || 1,
    last_page: queryResponse?.data?.last_page || 1,
  };

  const getActionClass = (actionContent) => {
    if (!actionContent) return "";
    const content = actionContent.toLowerCase();
    if (content.includes("deleted")) return styles.danger;
    if (content.includes("approved") || content.includes("created")) return styles.success;
    if (content.includes("rejected") || content.includes("deactivated")) return styles.warning;
    return "";
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const showLoading = isLoading || isFetching;

  return (
    <div className={styles.systemLogs}>
      <div className={styles.logsHeader}>
        <h1>📜 System Logs (Audit Logs)</h1>
        <button 
          className={styles.btnRefresh} 
          onClick={() => refetch()} 
          disabled={isFetching}
        >
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p className={styles.logsDesc}>Displaying 10 actions per page.</p>

      {showLoading && logs.length === 0 ? (
        <p className={styles.logsLoading}>Loading data...</p>
      ) : (
        <div className={styles.logsTableCard}>
          <div className={styles.logsTableWrapper}>
            <table style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Performed By (Admin)</th>
                  <th>Action</th>
                  <th className={styles.center}>Log ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <tr 
                      key={log.logid} 
                      className={index % 2 === 0 ? styles.even : styles.odd}
                    >
                      <td>{new Date(log.timestamp).toLocaleString("EN-US")}</td>
                      <td className={styles.adminEmail}>
                        {log.admin ? log.admin.email : `Admin ID: ${log.adminid}`}
                      </td>
                      <td className={`${styles.logAction} ${getActionClass(log.action)}`}>
                        {log.action}
                      </td>
                      <td className={`${styles.center} ${styles.muted}`}>#{log.logid}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='4' className={styles.empty}>
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.paginationControls}>
            <button 
              disabled={pagination.current_page === 1 || isFetching}
              onClick={() => handlePageChange(pagination.current_page - 1)}
              className={styles.btnPage}
            >
              Previous
            </button>

            <span className={styles.pageInfo}>
              Page <strong>{pagination.current_page}</strong> of {pagination.last_page}
            </span>

            <button 
              disabled={pagination.current_page === pagination.last_page || isFetching}
              onClick={() => handlePageChange(pagination.current_page + 1)}
              className={styles.btnPage}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}