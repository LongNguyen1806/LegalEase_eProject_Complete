import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/admin/UserManagement.module.css";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaUserTie, FaUsers, FaEye, FaLock, FaLockOpen, FaTrashAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const STORAGE_URL = `${DOMAIN}/storage/`;

export default function UserManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: userData, isLoading } = useQuery({
    queryKey: ["adminUsers", activeTab, currentPage],
    queryFn: async () => {
      const res = await axiosClient.get(`/admin/users?roleid=${activeTab}&page=${currentPage}`);
      return res.data.success ? res.data.data : { data: [], total: 0, last_page: 1 };
    },
    keepPreviousData: true,
    staleTime: 30000,
  });

  const users = userData?.data || [];
  const totalPages = userData?.last_page || 1;

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success("User deleted successfully.");
      queryClient.invalidateQueries(["adminUsers"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed."),
  });

  const statusMutation = useMutation({
    mutationFn: (id) => axiosClient.patch(`/admin/users/${id}/status`),
    onSuccess: () => {
      toast.success("Account status updated.");
      queryClient.invalidateQueries(["adminUsers"]);
    },
    onError: () => toast.error("Failed to update status."),
  });

  const renderAccStatusBadge = (user) => {
    if (!user.isactive) {
      return <span className={`${styles.badge} ${styles.badgeSuspended}`}>Suspended</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>;
  };

  const renderVerifyStatusBadge = (user) => {
    if (user.verify_status === "Approved" || user.isverified === 1) return <span className={`${styles.badge} ${styles.badgeActive}`}>Approved</span>;
    if (user.verify_status === "Rejected") return <span className={`${styles.badge} ${styles.badgeRejected}`}>Rejected</span>;
    return <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>;
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Warning: This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Delete",
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate(id);
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={styles.userManagement}>
      <h1 className={styles.title}>User Management</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 2 ? styles.tabActive : ""}`}
          onClick={() => {
            setActiveTab(2);
            setCurrentPage(1);
          }}>
          <FaUserTie style={{ marginRight: "8px" }} /> Lawyers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 3 ? styles.tabActive : ""}`}
          onClick={() => {
            setActiveTab(3);
            setCurrentPage(1);
          }}>
          <FaUsers style={{ marginRight: "8px" }} /> Customers
        </button>
      </div>

      <div className={styles.tableCard}>
        <table>
          <thead>
            <tr>
              <th className={styles.firstCol}>ID</th>

              <th className={styles.center}>Avatar</th>
              <th>User Info</th>
              {activeTab === 2 && (
                <>
                  <th className={styles.center}>Plan</th>
                  <th className={styles.center}>Plan Type</th>
                  <th className={styles.center}>Start Date</th>
                  <th className={styles.center}>End Date</th>
                  <th className={styles.center}>Status</th>
                </>
              )}
              <th className={styles.center}>Acc. Status</th>
              <th className={`${styles.center} ${styles.lastCol}`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan='11' className={styles.loading}>
                  ⏳ Loading user data...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u.userid}>
                  <td className={styles.firstCol}>#{u.userid}</td>
                  <td className={styles.center}>
                    <div className={styles.avatar}>
                      <SafeImage src={u.profileimage} type={activeTab === 2 ? "lawyer" : "customer"} alt={u.fullname} />
                    </div>
                  </td>
                  <td>
                    <div className={styles.fullname}>{u.fullname || "Not updated"}</div>
                    <div className={styles.email}>{u.email}</div>
                  </td>
                  {activeTab === 2 && (
                    <>
                      <td className={styles.center}>
                        <span className={`${styles.badge} ${u.planname ? styles.badgePaid : styles.badgeFree}`}>{u.planname ? "PAID" : "FREE"}</span>
                      </td>
                      <td className={styles.center}>{u.planname || "-"}</td>
                      <td className={styles.center}>{u.startdate ? new Date(u.startdate).toLocaleDateString("en-US") : "-"}</td>
                      <td className={styles.center}>{u.enddate ? new Date(u.enddate).toLocaleDateString("en-US") : "-"}</td>
                      <td className={styles.center}>{renderVerifyStatusBadge(u)}</td>
                    </>
                  )}
                  <td className={styles.center}>{renderAccStatusBadge(u)}</td>
                  <td className={`${styles.center} ${styles.lastCol}`}>
                    <div className={styles.actions}>
                      <button onClick={() => navigate(`/admin/users/${u.userid}`)} title='View Detail'>
                        <FaEye color='#1c357e' />
                      </button>
                      <button onClick={() => statusMutation.mutate(u.userid)} title={u.isactive ? "Lock" : "Unlock"}>
                        {u.isactive ? <FaLock color='#d97706' /> : <FaLockOpen color='#059669' />}
                      </button>
                      <button onClick={() => handleDelete(u.userid)} title='Delete'>
                        <FaTrashAlt color='#dc2626' />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='11' className={styles.empty}>
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={styles.pageBtn}>
              <FaChevronLeft size={12} /> Prev
            </button>

            <div className={styles.pageNumbers}>
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`${styles.pageNumber} ${currentPage === index + 1 ? styles.pageActive : ""}`}>
                  {index + 1}
                </button>
              ))}
            </div>

            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={styles.pageBtn}>
              Next <FaChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
