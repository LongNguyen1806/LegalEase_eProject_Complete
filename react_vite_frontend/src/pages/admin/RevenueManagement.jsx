import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/RevenueManagement.module.css";
import { DollarSign, RefreshCcw, PieChart, History, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { formatFullDate, formatMoney } from "../../utils/dateUtils";

export default function RevenueManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const availableYears = useMemo(() => {
    const startYear = 2025;
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["revenueStats", filter, currentPage],
    queryFn: async () => {
      const res = await axiosClient.get(`/admin/revenue?period=${filter}&page=${currentPage}`);
      return res.data.success ? res.data.data : null;
    },
    enabled: activeTab === "overview",
    refetchInterval: 30000,
  });

  const { data: refunds = [], isLoading: loadingRefunds } = useQuery({
    queryKey: ["refundRequests"],
    queryFn: async () => {
      const res = await axiosClient.get("/admin/revenue/refunds");
      return res.data.success ? res.data.data : [];
    },
    enabled: activeTab === "refunds",
    refetchInterval: 30000,
  });

  const refundMutation = useMutation({
    mutationFn: (invoiceId) => axiosClient.post(`/admin/revenue/refunds/${invoiceId}`),
    onSuccess: (res) => {
      Swal.fire({
        title: "Refund Processed!",
        text: res.data.message || "The refund has been successfully executed.",
        icon: "success",
        confirmButtonColor: "#1C357E",
      });
      queryClient.invalidateQueries(["refundRequests"]);
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || "Unable to process refund.";
      toast.error(`Error: ${errMsg}`);
    },
  });

  const financialMetrics = useMemo(() => {
    if (!stats) return null;

    const grossBooking = stats.revenue_sources.booking_gross || 0;
    const baseGMV = grossBooking / 1.1;
    const totalLawyerPayout = baseGMV * 0.8;
    const totalServiceFees = stats.revenue_sources.service_fee_total || 0;
    const totalCommissions = stats.revenue_sources.commission_total || 0;
   return { baseGMV, totalLawyerPayout, totalServiceFees, totalCommissions }; 
}, [stats]);

  const currentTransactions = stats?.recent_transactions?.data || [];
  const totalPages = stats?.recent_transactions?.last_page || 0;

  if (loadingStats || loadingRefunds) return <div className={styles.loading}>⏳ Synchronizing financial data...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>
            <DollarSign size={32} /> Revenue & Financial Management
          </h1>
          <p>Monitor platform cash flow, fees, and lawyer commissions</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button className={activeTab === "overview" ? styles.activeTab : ""} onClick={() => setActiveTab("overview")}>
              <PieChart size={18} /> Overview
            </button>
            <button className={activeTab === "refunds" ? styles.activeTab : ""} onClick={() => setActiveTab("refunds")}>
              <RefreshCcw size={18} /> Refund Requests
            </button>
          </div>

          {activeTab === "overview" && (
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.select}>
              <option value='all'>All Time</option>
              <option value='day'>Today</option>
              <option value='month'>This Month</option>

              {availableYears.map((year) => (
                <option key={year} value={year.toString()}>
                  Year {year}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {activeTab === "overview" && stats && financialMetrics && (
        <>
          <div className={styles.summaryGrid}>
            <div className={`${styles.card} ${styles.greenCard}`}>
              <p>Subscription Revenue</p>
              <h2>{formatMoney(stats.revenue_sources.subscription, "$")}</h2>
              <small>100% Net Profit from Lawyers</small>
            </div>

            <div className={`${styles.card} ${styles.blueCard}`}>
              <div className={styles.cardMain}>
                <p>Gross Booking Value (GMV)</p>
                <h2>{formatMoney(stats.revenue_sources.booking_gross, "$")}</h2>
              </div>
              <div className={styles.breakdown}>
                <div className={styles.breakdownItem}>
                  <span>Service Fee (10% Client)</span>
                  <b>{formatMoney(financialMetrics.totalServiceFees, "$")}</b>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Commission (20% Lawyer)</span>
                  <b>{formatMoney(financialMetrics.totalCommissions, "$")}</b>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Lawyer Payout (80%)</span>
                  <span className={styles.muted}>{formatMoney(financialMetrics.totalLawyerPayout, "$")}</span>
                </div>
              </div>
            </div>

            <div className={`${styles.card} ${styles.darkCard}`}>
              <p>Platform Net Revenue</p>
              <h2>{formatMoney(stats.total_revenue, "$")}</h2>

              <div className={styles.miniBreakdown}>
                <div className={styles.miniRow}>
                  <span>• Service Fees (10%):</span>
                  <b>{formatMoney(stats.revenue_sources.service_fee_total, "$")}</b>
                </div>
                <div className={styles.miniRow}>
                  <span>• Commissions (20%):</span>
                  <b>{formatMoney(stats.revenue_sources.commission_total, "$")}</b>
                </div>
                <div className={styles.miniRow}>
                  <span>• Subscriptions:</span>
                  <b>{formatMoney(stats.revenue_sources.subscription, "$")}</b>
                </div>
              </div>
              <small className={styles.cardFooter}>Total Profit from all streams</small>
            </div>
          </div>

          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3>
                <History size={20} /> Transaction Audit Log
              </h3>
            </div>
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Total Paid</th>
                    <th>Admin Take (Net)</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((t) => (
                    <tr key={t.invid}>
                      <td className={styles.mono}>#{t.transactionno || t.invid}</td>
                      <td>{t.email}</td>
                      <td>
                        <span className={t.payment_type === "Subscription" ? styles.tagGreen : styles.tagBlue}>{t.payment_type}</span>
                      </td>
                      <td className={styles.amount}>{formatMoney(t.amount, "$")}</td>
                      <td className={`${styles.amount} ${styles.bold} ${styles.netHighlight}`}>{formatMoney(t.net_amount, "$")}</td>
                      <td>{formatFullDate(t.createdat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span>
                Page <b>{stats.recent_transactions.current_page}</b> of {totalPages}
              </span>
              <button disabled={currentPage === stats.recent_transactions.last_page} onClick={() => setCurrentPage((prev) => prev + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "refunds" && (
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h3>
              <ArrowRightLeft size={20} /> Pending Refund Approval
            </h3>
          </div>
          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total Paid</th>
                  <th>Refund Amount</th>
                  <th>Admin Kept (Fee)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.invid}>
                    <td className={styles.mono}>#{r.transactionno || r.invid}</td>
                    <td>{r.user?.email}</td>
                    <td className={styles.amount}>{formatMoney(r.total_customer_paid, "$")}</td>
                    <td className={`${styles.amount} ${styles.refundHighlight}`}>{formatMoney(r.suggested_refund, "$")}</td>
                    <td className={styles.feeText}>{formatMoney(r.platform_kept_fee, "$")}</td>
                    <td>
                      <button className={styles.btnRefund} onClick={() => refundMutation.mutate(r.invid)}>
                        Approve & Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
