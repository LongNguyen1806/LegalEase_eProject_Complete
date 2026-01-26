import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import { formatFullDate, formatDisplayTime, formatMoney } from "../../utils/dateUtils";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { useQuery } from "@tanstack/react-query";

import { Calendar } from "react-multi-date-picker";
import styles from "../../assets/styles/client/StyleCustomer/BookingPage.module.css";

export default function BookingPage() {
  const { lawyerId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [packageName, setPackageName] = useState("Legal Express");
  const [note, setNote] = useState("");
  const [activeDate, setActiveDate] = useState("");

  const packageOptions = {
    "Legal Express": 60,
    "Legal Premium": 120,
  };

  const {
    data: scheduleData = { slots: [], appointments: [], price_list: {}, lawyer_info: {} },
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["lawyer-schedule", lawyerId],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(`/customer/lawyers/${lawyerId}/schedule`);
        return res.data.data;
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 404) {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: error.response.data?.message || "An error occurred.",
            confirmButtonColor: "#3085d6",
          });
          navigate("/find-lawyers");
        }
        throw error;
      }
    },
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (scheduleData.slots?.length > 0 && !activeDate) {
      const firstDateStr = scheduleData.slots[0].availabledate.split(" ")[0];
      setActiveDate(firstDateStr);
    }
  }, [scheduleData.slots, activeDate]);

  const isTimeDisabled = (dateStr, timeStr) => {
    if (scheduleData.lawyer_info?.server_time) {
      const [sDate, sTime] = scheduleData.lawyer_info.server_time.split(" ");
      const cleanDateStr = dateStr.split(" ")[0];

      if (cleanDateStr === sDate) {
        const [currH, currM] = sTime.split(":").map(Number);
        const [targetH, targetM] = timeStr.split(":").map(Number);
        if (targetH * 60 + targetM <= currH * 60 + currM) return true;
      }
    }

    const bookedApps = scheduleData.appointments || [];
    const [h, m] = timeStr.split(":").map(Number);
    const checkTime = h * 60 + m;

    return bookedApps.some((app) => {
      if (app.slot?.availabledate.split(" ")[0] !== dateStr.split(" ")[0]) return false;
      const [ah, am] = app.starttime.split(":").map(Number);
      const start = ah * 60 + am;
      const end = start + app.duration;
      return checkTime >= start && checkTime < end;
    });
  };

  const generateTimeline = (start, end) => {
    const times = [];
    let current = parseInt(start.split(":")[0]);
    const endHour = parseInt(end.split(":")[0]);
    while (current < endHour) {
      times.push(`${current < 10 ? "0" + current : current}:00`);
      current++;
    }
    return times;
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!selectedTime) {
      return toast.warning("Selection Required", {
        description: "Please select a specific time slot on the calendar.",
      });
    }
    const now = new Date();
    const [hour, minute] = selectedTime.split(":").map(Number);
    const slotDate = new Date(selectedSlot.availabledate.split(" ")[0].replace(/-/g, "/"));
    slotDate.setHours(hour, minute, 0, 0);

    if (slotDate <= now) {
      Swal.fire({
        icon: "warning",
        title: "Time Slot Expired",
        text: "This time slot has just expired. Please select a future time.",
        confirmButtonColor: "#d33",
      });
      refetch();
      return;
    }

    const duration = packageOptions[packageName];
    const finalPrice = scheduleData.price_list?.[duration] || 0;
    const rawLawyer = scheduleData.lawyer_info;

    const bookingData = {
      lawyer: {
        userid: rawLawyer.userid,
        fullname: rawLawyer.fullname,
        user: { email: rawLawyer.email, phonenumber: rawLawyer.phonenumber },
        lawyer_profile: {
          profileimage: rawLawyer.profileimage,
          specialization: { specname: rawLawyer.specname },
        },
        office: { location: { address: rawLawyer.address } },
      },
      estimatedPrice: finalPrice,
      slotid: selectedSlot.slotid,
      availabledate: selectedSlot.availabledate,
      packagename: packageName,
      starttime: `${selectedTime}:00`,
      duration,
      note,
    };

    navigate("/payment/checkout", { state: { bookingData } });
  };

  const { slotsByDate, availableDates } = useMemo(() => {
    const grouped = (scheduleData.slots || []).reduce((acc, slot) => {
      const dateKey = slot.availabledate.split(" ")[0];
      acc[dateKey] = acc[dateKey] || [];
      acc[dateKey].push(slot);
      return acc;
    }, {});
    return { slotsByDate: grouped, availableDates: Object.keys(grouped) };
  }, [scheduleData.slots]);

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );

  return (
    <div className={styles.bookingContainer}>
      <div className={styles.scheduleSection}>
        <h3 className={styles.sectionTitle}>1. Select consultation time with {scheduleData.lawyer_info?.fullname}</h3>

        <div className={`${styles.dateGroup} ${styles.calendarLayout}`}>
          <div className={styles.calendarWrapper}>
            <Calendar
              value={activeDate}
              onChange={(date) => {
                const dateStr = date?.format("YYYY-MM-DD");
                setActiveDate(dateStr);
                if (selectedSlot && selectedSlot.availabledate.split(" ")[0] !== dateStr) {
                  setSelectedTime("");
                  setSelectedSlot(null);
                }
              }}
              minDate={new Date()}
              mapDays={({ date }) => {
                let isAvailable = availableDates.includes(date.format("YYYY-MM-DD"));
                if (isAvailable) return { className: styles.highlightAvailable };
              }}
              className={styles.customBookingCalendar}
            />
          </div>

          <div className={styles.timeSlotsContainer}>
            {activeDate && slotsByDate[activeDate] ? (
              slotsByDate[activeDate].map((slot) => (
                <div key={slot.slotid} className={styles.shiftInnerGroup}>
                  <div className={styles.shiftInfo}>
                    Work Shift: {formatDisplayTime(slot.starttime)} - {formatDisplayTime(slot.endtime)}
                  </div>
                  <div className={styles.timeGrid}>
                    {generateTimeline(slot.starttime, slot.endtime).map((time) => {
                      const disabled = isTimeDisabled(activeDate, time);
                      const selected = selectedTime === time && selectedSlot?.slotid === slot.slotid;

                      return (
                        <button
                          key={time}
                          type='button'
                          disabled={disabled}
                          className={`${styles.timeBtn} ${disabled ? styles.disabled : ""} ${selected ? styles.selected : ""}`}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setSelectedTime(time);
                          }}>
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyHint}>No available shifts for this date.</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.infoSection}>
        <h3 className={styles.sectionTitle}>2. Request Details</h3>

        <form onSubmit={handleProceedToPayment} className={styles.formCard}>
          <div className={styles.confirmBox}>
            <div className={styles.labelMuted}>Selected Schedule:</div>
            <div className={styles.confirmTime}>
              {selectedTime ? (
                <>
                  <strong>{selectedTime}</strong> | {formatFullDate(activeDate)}
                </>
              ) : (
                <span className={styles.placeholderText}>Not selected yet</span>
              )}
            </div>
          </div>

          <label className={styles.label}>Select Consultation Package</label>
          <select value={packageName} onChange={(e) => setPackageName(e.target.value)} className={styles.input}>
            <option value='Legal Express'>Express Package (60 mins)</option>
            <option value='Legal Premium'>Premium Package (120 mins)</option>
          </select>

          <label className={styles.label}>Describe your issue (Note to lawyer)</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Please briefly summarize your legal issue...'
            required
            minLength={10}
          />

          <div className={styles.priceSummary}>
            <div className={styles.priceRow}>
              <span>Estimated Total:</span>
              <span className={styles.priceTotalValue}>{formatMoney(scheduleData.price_list?.[packageOptions[packageName]], "$")}</span>
            </div>
            <p className={styles.priceNote}>* The fee includes taxes and system service charges.</p>
          </div>

          <button type='submit' className={styles.submitBtn} disabled={!selectedTime}>
            Proceed to Payment →
          </button>
        </form>
      </div>
    </div>
  );
}
