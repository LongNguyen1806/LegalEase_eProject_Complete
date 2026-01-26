import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import styles from "../../assets/styles/client/StyleLawyer/SubscriptionPlans.module.css";
import { formatDisplayDate, formatMoney } from "../../utils/dateUtils";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { 
  FaCheckCircle, FaTimesCircle, FaRocket, FaCrown, 
  FaArrowUp, FaCalendarAlt, FaShieldAlt, FaSpinner 
} from "react-icons/fa";

export default function SubscriptionPlans() {
  const { user, setUser } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ["payment-plans"],
    queryFn: async () => {
      const res = await axiosClient.get("/payment/plans");
      return res.data.success ? res.data.data.sort((a, b) => a.price - b.price) : [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: currentSub = null, isLoading: isSubLoading } = useQuery({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      const res = await axiosClient.get("/payment/current-subscription");
      return res.data.success ? res.data.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleBuy = async (planId, price, planName) => {
    const result = await Swal.fire({
      title: "Confirm Upgrade",
      text: `Confirm payment for the "${planName}" plan with a price of ${formatMoney(price, "$")}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1C357E",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, upgrade now!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await axiosClient.post("/payment/subscription", { planid: planId });

      if (res.data.success) {
        toast.success(`🎉 Upgrade to ${planName} successful!`);

        if (user?.lawyer_profile) {
          setUser({
            ...user,
            lawyer_profile: { ...user.lawyer_profile, ispro: 1 },
          });
        }

        queryClient.invalidateQueries(["current-subscription"]);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Transaction failed.";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  const renderFeatures = (plan) => {
    const isFree = Number(plan.price) === 0;
    return (
      <ul className={styles.features}>
        <li><FaCheckCircle className={styles.iconV} /> Full profile display</li>
        <li><FaCheckCircle className={styles.iconV} /> Online appointment booking</li>
        <li><FaCheckCircle className={styles.iconV} /> Answer questions online</li>
        {isFree ? (
          <>
            <li className={styles.disabled}><FaTimesCircle className={styles.iconX} /> Verified PRO badge</li>
            <li className={styles.disabled}><FaTimesCircle className={styles.iconX} /> Priority search visibility</li>
          </>
        ) : (
          <>
            <li><FaShieldAlt className={`${styles.iconV} ${styles.pro}`} /> <strong>Verified PRO badge</strong></li>
            <li><FaCheckCircle className={styles.iconV} /> <strong>Priority search visibility</strong></li>
            <li className={styles.highlight}>
              <FaRocket className={`${styles.iconV} ${styles.rocket}`} /> <strong>Increase client reach</strong>
            </li>
          </>
        )}
      </ul>
    );
  };

  const renderButton = (plan) => {
    const planPrice = Number(plan.price);
    const isFreePlan = planPrice === 0;
    const isYearlyPlan = plan.planname.includes("Year") || planPrice > 1000000;
    const isMonthlyPlan = !isFreePlan && !isYearlyPlan;

    if (currentSub) {
      const currentIsYearly = currentSub.planname.includes("Year") || Number(currentSub.price) > 1000000;

      if (currentSub.planid === plan.planid) {
        return (
          <button className={`${styles.btnSubscribe} ${styles.current}`} disabled>
            <FaCheckCircle style={{ marginRight: "8px" }} /> Currently in use
          </button>
        );
      }

      if (isFreePlan) return null;
      if (currentIsYearly && isMonthlyPlan) return null;

      if (!currentIsYearly && isYearlyPlan) {
        return (
          <button className={`${styles.btnSubscribe} ${styles.upgrade}`} onClick={() => handleBuy(plan.planid, planPrice, plan.planname)}>
            <FaArrowUp style={{ marginRight: "8px" }} /> Upgrade now
          </button>
        );
      }
      return null;
    }

    if (isFreePlan) {
      return (
        <button className={`${styles.btnSubscribe} ${styles.current}`} disabled>
          <FaCheckCircle style={{ marginRight: "8px" }} /> Currently in use
        </button>
      );
    }

    return (
      <button className={styles.btnSubscribe} onClick={() => handleBuy(plan.planid, planPrice, plan.planname)}>
        Upgrade now
      </button>
    );
  };

  if (isPlansLoading || isSubLoading)
    return (
      <div className={styles.loading}>
        <FaSpinner className={styles.spinnerIcon} />
        <p>Loading information...</p>
      </div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2><FaCrown style={{ color: "#f1c40f", marginRight: "10px" }} /> Upgrade to Pro Account</h2>

        <div className={`${styles.statusAlert} ${currentSub ? styles.active : ""}`}>
          {currentSub ? (
            <>
              <FaCalendarAlt style={{ marginRight: "10px" }} />
              <span>
                You are using the <strong>{currentSub.planname}</strong> plan.
                <br />
                Expiration date: <strong>{formatDisplayDate(currentSub.enddate)}</strong>
              </span>
            </>
          ) : (
            <>
              <FaShieldAlt style={{ marginRight: "10px" }} />
              <span>You are using a <strong>Free</strong> account. Upgrade to unlock features.</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {plans.map((plan) => {
          const isRecommended = plan.planname.includes("Year");
          return (
            <div key={plan.planid} className={`${styles.card} ${isRecommended ? styles.recommended : ""}`}>
              {isRecommended && <div className={styles.badge}>Best value</div>}

              <div className={styles.cardHeader}>
                <h3>{plan.planname}</h3>
                <div className={styles.price}>
                  {formatMoney(plan.price, "$")}
                </div>
              </div>

              <div className={styles.cardBody}>
                <p className={styles.desc}>
                  {Number(plan.price) === 0 ? "A basic plan for lawyers new to the platform." : "Unlock full power to grow your legal career."}
                </p>
                {renderFeatures(plan)}
              </div>

              <div className={styles.cardFooter}>{renderButton(plan)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}