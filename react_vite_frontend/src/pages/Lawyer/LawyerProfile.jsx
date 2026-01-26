import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import GeneralInfoTab from "./GeneralInfoTab";
import ProfessionalTab from "./ProfessionalTab";
import styles from "../../assets/styles/client/StyleLawyer/LawyerProfile.module.css";

import { FaIdCard, FaGavel, FaUserTie } from "react-icons/fa";

export default function LawyerProfile() {
  const [activeTab, setActiveTab] = useState("general");
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["lawyer-profile"],
    queryFn: async () => {
      const resUser = await axiosClient.get("/user-info");
      const userId = resUser.data.userid;
      const resDetail = await axiosClient.get(`/lawyers/${userId}`);
      return resDetail.data.data;
    },
    refetchInterval: (query) => {
      const data = query?.state?.data;
      const verifications = data?.verifications || [];
      const latestVerify = verifications[0] || data?.verification || {};
      const status = latestVerify.status;

      if (status === "Pending" || status === "Updating") {
        return 10000;
      }
      return false;
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: masterData, isLoading: isMasterLoading } = useQuery({
    queryKey: ["master-data"],
    queryFn: async () => {
      const res = await axiosClient.get("/master-data");
      return res.data.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const handleReload = () => {
    queryClient.invalidateQueries(["lawyer-profile"]);
    refetchProfile();
  };

  const handleTabChange = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const isLoading = isProfileLoading || isMasterLoading;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải hồ sơ luật sư...</p>
      </div>
    );
  }

  if (isProfileError || !profileData) {
    return <div className={styles.error}>Không thể tải dữ liệu hồ sơ. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>
        <FaUserTie style={{ marginRight: "12px", color: "#2c3e50" }} />
        Lawyer Profile Management
      </h2>

      <div className={styles.tabsHeader}>
        <button className={`${styles.tabButton} ${activeTab === "general" ? styles.active : ""}`} onClick={() => handleTabChange("general")}>
          <FaIdCard style={{ marginRight: "8px" }} /> General Information & Office
        </button>

        <button className={`${styles.tabButton} ${activeTab === "professional" ? styles.active : ""}`} onClick={() => handleTabChange("professional")}>
          <FaGavel style={{ marginRight: "8px" }} /> Expertise & Legal Capacity
        </button>
      </div>

      <div className={`${styles.tabContent} ${isPending ? styles.tabLoading : ""}`}>
        {activeTab === "general" && <GeneralInfoTab data={profileData} locsMaster={masterData?.locations || []} reload={handleReload} />}

        {activeTab === "professional" && <ProfessionalTab data={profileData} specsMaster={masterData?.specializations || []} reload={handleReload} />}
      </div>
    </div>
  );
}
