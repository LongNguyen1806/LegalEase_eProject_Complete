import { useEffect, useState } from "react";
import axiosClient from "../../api/apiAxios";
import DatePicker from "react-multi-date-picker";
import "react-multi-date-picker/styles/layouts/mobile.css";
import { formatFullDate, formatDisplayTime } from "../../utils/dateUtils";
import styles from "../../assets/styles/client/StyleLawyer/LawyerSchedule.module.css";

import { toast } from "sonner";
import Swal from "sweetalert2";

export default function LawyerSchedule() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  const [selectedDates, setSelectedDates] = useState([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const fetchSlots = async (type = activeTab, isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setSlots([]);
    }
    try {
      const res = await axiosClient.get("/lawyer/availability", {
        params: { type },
      });
      if (res.data.success) {
        setSlots(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
      toast.error("Failed to load schedule data");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots(activeTab);
    const interval = setInterval(() => {
      fetchSlots(activeTab, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleEditClick = (slot) => {
    setEditingId(slot.slotid);
    setStartTime(formatDisplayTime(slot.starttime));
    setEndTime(formatDisplayTime(slot.endtime));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedDates([]);
    setStartTime("08:00");
    setEndTime("17:00");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingId && selectedDates.length === 0) {
      return toast.warning("Please select at least one date on the calendar!");
    }
    if (endTime <= startTime) {
      return toast.warning("End time must be after start time!");
    }

    setSubmitting(true);
    try {
      let res;
      if (editingId) {
        res = await axiosClient.put(`/lawyer/availability/${editingId}`, {
          starttime: startTime,
          endtime: endTime,
        });
      } else {
        const dateArray = selectedDates.map((d) => d.format("YYYY-MM-DD"));
        res = await axiosClient.post("/lawyer/availability", {
          dates: dateArray,
          starttime: startTime,
          endtime: endTime,
        });
      }

      if (res.data.success) {
        toast.success(res.data.message || "Operation successful!");
        cancelEdit();
        fetchSlots("upcoming");
        setActiveTab("upcoming");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "System error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this work shift?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const res = await axiosClient.delete(`/lawyer/availability/${id}`);
        if (res.data.success) {
          toast.success("Work shift deleted successfully.");
          fetchSlots(activeTab);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to delete.");
      }
    }
  };

  const renderStatusBadge = (slot) => {
    if (slot.is_booked) {
      return <span className={styles.badgeBooked}>🛡️ Booked</span>;
    }
    if (activeTab === "history" || slot.is_expired) {
      return <span className={styles.badgeExpired}>⌛ Expired</span>;
    }
    return <span className={styles.badgeAvailable}>✅ Available</span>;
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>📅 Schedule Management</h2>

      <div className={`${styles.card} ${editingId ? styles.cardEdit : styles.cardCreate}`}>
        <h3 className={styles.cardTitle}>{editingId ? "🟠 Edit Time Slot" : "➕ Bulk Create Work Shifts"}</h3>

        <form className={styles.form} onSubmit={handleSubmit}>
          {!editingId ? (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select dates (Current month + Full next month):</label>
              <DatePicker
                value={selectedDates}
                onChange={setSelectedDates}
                multiple
                format='YYYY-MM-DD'
                minDate={new Date()}
                maxDate={maxDate}
                containerClassName={styles.datePicker}
              />
              <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "5px" }}>
                * You can schedule until the end of <strong>{maxDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong>.
              </p>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label className={styles.label}>Currently editing:</label>
              <div className={styles.editingDate}>
                {(() => {
                  const slot = slots.find((s) => s.slotid === editingId);
                  return slot ? formatFullDate(slot.availabledate) : "";
                })()}
              </div>
            </div>
          )}

          <div className={styles.timeGroup}>
            <label className={styles.label}>Start Time</label>
            <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={styles.input} />
          </div>

          <div className={styles.timeGroup}>
            <label className={styles.label}>End Time</label>
            <input type='time' value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={styles.input} />
          </div>

          <div className={styles.actionGroup}>
            <button type='submit' disabled={submitting} className={`${styles.submitBtn} ${editingId ? styles.btnEdit : styles.btnCreate}`}>
              {submitting ? "Processing..." : editingId ? "Update" : "Confirm Creation"}
            </button>

            {editingId && (
              <button type='button' onClick={cancelEdit} className={styles.cancelBtn}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={styles.tabs}>
        <button onClick={() => setActiveTab("upcoming")} className={`${styles.tabBtn} ${activeTab === "upcoming" ? styles.tabActive : ""}`}>
          Upcoming
        </button>
        <button onClick={() => setActiveTab("history")} className={`${styles.tabBtn} ${activeTab === "history" ? styles.tabActive : ""}`}>
          Shift History
        </button>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>⏳ Loading...</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.length > 0 ? (
                  slots.map((slot) => (
                    <tr key={slot.slotid}>
                      <td>{formatFullDate(slot.availabledate)}</td>
                      <td className={styles.timeSlot}>
                        {formatDisplayTime(slot.starttime)} - {formatDisplayTime(slot.endtime)}
                      </td>
                      <td>{renderStatusBadge(slot)}</td>
                      <td>
                        {activeTab === "upcoming" && !slot.is_booked && !slot.is_expired ? (
                          <div className={styles.rowActions}>
                            <button onClick={() => handleEditClick(slot)} className={styles.editBtn}>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(slot.slotid)} className={styles.deleteBtn}>
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className={styles.noAction}>No actions available</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='4' className={styles.empty}>
                      No work shift data available.
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
