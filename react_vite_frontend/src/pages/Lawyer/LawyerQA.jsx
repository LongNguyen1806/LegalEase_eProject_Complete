import { useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleLawyer/LawyerQA.module.css";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaComments, FaInbox, FaHistory, FaUserCircle, FaRegClock, FaCheckCircle, FaPaperPlane, FaSpinner, FaExclamationCircle } from "react-icons/fa";

import { formatFullDate } from "../../utils/dateUtils";

const fetchQuestionsApi = async (tab) => {
  const endpoint = tab === "unanswered" ? "/lawyer/community/questions-for-lawyer" : "/lawyer/community/my-answered-questions";

  const res = await axiosClient.get(endpoint);
  return res.data.data.data || [];
};

export default function LawyerQA() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("unanswered");
  const [isPending, startTransition] = useTransition();
  const [answerInputs, setAnswerInputs] = useState({});

  const {
    data: questions = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["lawyer-questions", activeTab],
    queryFn: () => fetchQuestionsApi(activeTab),
    placeholderData: (previousData) => previousData,
    staleTime: 5,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: ({ qId, content }) => axiosClient.post(`/lawyer/community/questions/${qId}/answers`, { content }),
    onSuccess: () => {
      Swal.fire({
        title: "Success!",
        text: "Your answer has been submitted and is awaiting admin approval.",
        icon: "success",
        confirmButtonColor: "#2563eb",
      });

      queryClient.invalidateQueries({ queryKey: ["lawyer-questions"] });
      setAnswerInputs({});
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || "Failed to submit the answer.";
      toast.error(`Error: ${errorMsg}`);
    },
  });

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const handleInputChange = (qId, value) => {
    setAnswerInputs((prev) => ({ ...prev, [qId]: value }));
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        <FaComments style={{ marginRight: "12px", color: "#2563eb" }} />
        Q&A Management
      </h2>

      <div className={styles.tabs}>
        <button
          onClick={() => handleTabChange("unanswered")}
          className={`${styles.tabBase} ${activeTab === "unanswered" ? styles.tabActive : styles.tabInactive}`}
          disabled={isPending}>
          <FaInbox style={{ marginRight: "8px" }} />
          New questions {activeTab === "unanswered" && isFetching}
        </button>

        <button
          onClick={() => handleTabChange("history")}
          className={`${styles.tabBase} ${activeTab === "history" ? styles.tabActive : styles.tabInactive}`}
          disabled={isPending}>
          <FaHistory style={{ marginRight: "8px" }} />
          Consultation history {activeTab === "history" && isFetching}
        </button>
      </div>

      <div className={`${styles.list} ${isFetching || isPending ? styles.dimmed : ""}`} style={{ minHeight: "600px" }}>
        {isLoading && questions.length === 0 ? (
          <div className={styles.loading}>
            <FaSpinner className='animate-spin' style={{ fontSize: "24px", marginBottom: "10px" }} />
            <p>Loading data...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className={styles.empty}>
            <FaExclamationCircle style={{ fontSize: "32px", marginBottom: "10px", color: "#cbd5e1" }} />
            <p>{activeTab === "unanswered" ? "There are currently no new questions from customers." : "You have not provided consultation for any questions yet."}</p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.questionid} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{q.title}</h3>
                <span>
                  <FaUserCircle style={{ marginRight: "5px" }} />
                  Asked by: {q.customer?.customer_profile?.fullname || "Anonymous"}
                  <span style={{ margin: "0 8px" }}>•</span>
                  <FaRegClock style={{ marginRight: "5px" }} />
                  {formatFullDate(q.created_at)}
                </span>
              </div>

              <div className={styles.questionBox}>{q.content}</div>

              {activeTab === "unanswered" ? (
                <div className={styles.answerBox}>
                  <textarea
                    className={styles.textarea}
                    placeholder='Enter your legal consultation (minimum 10 characters)...'
                    rows='3'
                    value={answerInputs[q.questionid] || ""}
                    onChange={(e) => handleInputChange(q.questionid, e.target.value)}
                  />
                  <div className={styles.actionRight}>
                    <button
                      onClick={() => {
                        const content = answerInputs[q.questionid];
                        if (!content || content.trim().length < 10) {
                          return toast.warning("Consultation content is too short (minimum 10 characters)!");
                        }
                        mutation.mutate({ qId: q.questionid, content });
                      }}
                      disabled={mutation.isPending}
                      className={mutation.isPending ? styles.btnDisabled : styles.btn}>
                      {mutation.isPending ? (
                        <FaSpinner className='animate-spin' />
                      ) : (
                        <>
                          <FaPaperPlane style={{ marginRight: "8px" }} /> Submit answer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.historyBox}>
                  <div className={styles.historyTitle}>
                    <FaCheckCircle style={{ color: "#10b981", marginRight: "8px" }} />
                    Your consultation content:
                  </div>
                  <p>{q.answers?.[0]?.content || "Content is being updated..."}</p>
                  <div className={styles.status}>
                    Status:{" "}
                    {q.answers?.[0]?.isapproved ? (
                      <span className={styles.approved}>
                        <FaCheckCircle /> Approved
                      </span>
                    ) : (
                      <span className={styles.pending}>
                        <FaRegClock /> Pending approval
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
