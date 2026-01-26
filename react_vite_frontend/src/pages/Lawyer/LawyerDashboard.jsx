import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleLawyer/LawyerDashboard.module.css";
import { formatDisplayDate, formatMoney } from "../../utils/dateUtils";
import { FaSpinner } from "react-icons/fa";

export default function LawyerDashboard() {
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);

  const {
    data: stats = {
      total_cumulative_revenue: 0,
      total_cumulative_matches: 0,
      monthly_revenue: 0,
      count_pending: 0,
      count_completed: 0,
      transactions: [],
    },
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["lawyer-stats", month, year],
    queryFn: async () => {
      const res = await axiosClient.get("/lawyer/dashboard-stats", {
        params: { month, year },
      });
      return res.data.success ? res.data.data : null;
    },
    staleTime: 60 * 1000, 
    refetchInterval: 30000, 
    keepPreviousData: true, 
  });

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            Financial Dashboard
            {isFetching && <FaSpinner className={styles.syncSpinner} style={{ marginLeft: "10px", fontSize: "14px" }} />}
          </h2>
          <p className={styles.subtitle}>Manage your wallet and consulting performance.</p>
        </div>

        <div className={styles.filters}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={styles.select}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Month {i + 1}
              </option>
            ))}
          </select>

          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={styles.select}>
            {[currentYear, currentYear - 1].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.cumulativeCard}>
        <div className={styles.cumulativeLabel}>💰 TOTAL CUMULATIVE INCOME (CURRENT WALLET)</div>

        <div className={styles.cumulativeAmount}>{formatMoney(stats.total_cumulative_revenue, "$")}</div>

        <div className={styles.cumulativeMeta}>
          <span>
            📈 Total successful cases: <strong>{stats.total_cumulative_matches}</strong>
          </span>
          <span className={styles.divider}>|</span>
          <span>📅 Real-time updated data</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.pending}`}>
          <span className={styles.statLabel}>Pending requests</span>
          <span className={styles.statValue}>{stats.count_pending}</span>
          <small className={styles.statHint}>Awaiting approval or rejection</small>
        </div>

        <div className={`${styles.statCard} ${styles.completed}`}>
          <span className={styles.statLabel}>Completed in month {month}</span>
          <span className={styles.statValue}>{stats.count_completed}</span>
          <small className={styles.statHint}>Finished consultations</small>
        </div>

        <div className={`${styles.statCard} ${styles.revenue}`}>
          <span className={styles.statLabel}>Revenue in month {month}</span>
          <span className={styles.statValue}>{formatMoney(stats.monthly_revenue, "$")}</span>
          <small className={styles.statHint}>Net income received (80%)</small>
        </div>
      </div>

      <div className={styles.tableCard}>
        <h3 className={styles.tableTitle}>
          Income History {month}/{year}
        </h3>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service Package</th>
                  <th>Completion Date</th>
                  <th>Consultation Price</th>
                  <th>Platform Fee (20%)</th>
                  <th>You Earn (80%)</th>
                </tr>
              </thead>
              <tbody>
                {stats.transactions.length > 0 ? (
                  stats.transactions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.customer_name}</strong>
                      </td>
                      <td>
                        <span className={styles.packageBadge}>{t.package}</span>
                      </td>
                      <td>{formatDisplayDate(t.completed_at)}</td>
                      <td className={styles.muted}>{formatMoney(t.total_paid, "$")}</td>
                      <td className={styles.fee}>- {formatMoney(t.platform_fee, "$")}</td>
                      <td className={styles.income}>+ {formatMoney(t.lawyer_income, "$")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='6' className={styles.emptyState}>
                      No completed transactions in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
