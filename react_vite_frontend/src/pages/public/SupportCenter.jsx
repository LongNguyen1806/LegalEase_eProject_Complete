import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import "../../assets/styles/client/StylePublic/SupportCenter.css";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaUserCircle, FaCalendarAlt, FaComments, FaBook, FaSearch, FaChevronDown, FaChevronUp, FaCheckCircle, FaSpinner, FaArrowRight } from "react-icons/fa";

export default function SupportCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { user } = useContext(AuthContext);
  const isLoggedIn = !!user;
  const isLawyer = user?.roleid === 2;

  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    return tabParam === "library" ? "library" : "qa";
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [expandedQaId, setExpandedQaId] = useState(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "library" || tab === "qa") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const {
    data: qaListData,
    isLoading: qaLoading,
    isFetching: qaFetching,
  } = useQuery({
    queryKey: ["qa-list", searchKeyword],
    queryFn: async () => {
      const res = await axiosClient.get("/community/questions", {
        params: { keyword: searchKeyword },
      });
      return res.data.data.data;
    },
    enabled: activeTab === "qa",
    keepPreviousData: true,
  });

  const {
    data: contentListData,
    isLoading: libLoading,
    isFetching: libFetching,
  } = useQuery({
    queryKey: ["library-list", searchKeyword],
    queryFn: async () => {
      const res = await axiosClient.get("/contents", {
        params: { keyword: searchKeyword },
      });
      return res.data.data.data;
    },
    enabled: activeTab === "library",
    keepPreviousData: true,
  });

  const qaList = qaListData || [];
  const contentList = (contentListData || []).filter((item) => item.type !== "News");

  const mutation = useMutation({
    mutationFn: (newQ) => axiosClient.post("/customer/community/questions", newQ),
    onSuccess: () => {
      Swal.fire({
        title: "Success!",
        text: "Your question has been submitted and is pending approval.",
        icon: "success",
        confirmButtonColor: "#1c357e",
      });
      setNewTitle("");
      setNewQuestion("");
      queryClient.invalidateQueries(["qa-list"]);
    },
    onError: (error) => {
      if (error.response?.status === 403) {
        toast.error("Action denied: Only Customers can ask questions.");
      } else {
        toast.error("Submission failed. Please check your inputs.");
      }
    },
  });

  const handleSearchSubmit = () => {
    setSearchKeyword(keywordInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setKeywordInput("");
    setSearchKeyword("");
    navigate("/support", { replace: true });
  };

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!isLoggedIn) return navigate("/login");
    if (isLawyer) {
      toast.error("Lawyers cannot ask questions here.");
      return;
    }

    mutation.mutate({
      title: newTitle,
      content: newQuestion,
    });
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("EN-US") : "");

  const stripHtmlAndDecode = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.replace(/\s+/g, " ").trim();
  };

  const isLoading = activeTab === "qa" ? qaLoading : libLoading;
  const isFetching = activeTab === "qa" ? qaFetching : libFetching;

  return (
    <div className='support-wrapper'>
      <div className='support-container'>
        <div className='support-header'>
          <h1>Q&A & Legal Knowledge</h1>
          <p>Community questions with lawyers & legal library</p>

          <div className='support-search-box'>
            <FaSearch className='search-icon-inside' />
            <input
              type='text'
              className='support-search-input'
              placeholder={activeTab === "qa" ? "Search questions..." : "Search articles..."}
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button className='support-search-btn' onClick={handleSearchSubmit}>
              Search
            </button>

            {isFetching && !isLoading && (
              <span className='support-search-loading'>
                <FaSpinner className='animate-spin' />
              </span>
            )}
          </div>
        </div>

        <div className='support-tabs'>
          <button className={activeTab === "qa" ? "active" : ""} onClick={() => handleTabChange("qa")}>
            <FaComments style={{ marginRight: "8px" }} /> Ask a Lawyer
          </button>
          <button className={activeTab === "library" ? "active" : ""} onClick={() => handleTabChange("library")}>
            <FaBook style={{ marginRight: "8px" }} /> Legal Library
          </button>
        </div>

        {isLoading ? (
          <div className='loading-container'>
            <FaSpinner className='animate-spin' />
            <p className='loading-text'>Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === "qa" && (
              <div className='qa-section'>
                <div className='ask-box'>
                  <h3>
                    <FaComments style={{ color: "#1c357e" }} /> Ask a Lawyer
                  </h3>

                  {!isLoggedIn ? (
                    <div className='login-reminder'>
                      Please <Link to='/login'>log in</Link> to ask a question.
                    </div>
                  ) : isLawyer ? (
                    <div className='login-reminder lawyer-view'>
                      <strong>👋 Hello, {user?.fullname || "Counselor"}!</strong>
                      <br />
                      You are viewing as a Lawyer.
                    </div>
                  ) : (
                    <form onSubmit={handleAskQuestion}>
                      <input
                        type='text'
                        className='ask-input-title'
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder='Title (e.g., Divorce procedure in Hanoi...)'
                        required
                        maxLength={255}
                      />
                      <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder='Describe your legal issue in detail...' required />
                      <button disabled={mutation.isLoading}>
                        {mutation.isLoading ? (
                          <>
                            <FaSpinner className='animate-spin' /> Submitting...
                          </>
                        ) : (
                          "Submit Question"
                        )}
                      </button>
                    </form>
                  )}
                </div>

                <div className={`qa-list ${isFetching ? "dimmed" : ""}`}>
                  {qaList.length ? (
                    qaList.map((q) => (
                      <div key={q.questionid} className='qa-item'>
                        <div className='qa-meta'>
                          <span>
                            <FaUserCircle /> {q.customer?.customer_profile?.fullname || "Anonymous"}
                          </span>
                          <span>
                            <FaCalendarAlt /> {formatDate(q.created_at)}
                          </span>
                        </div>

                        <h3 className='qa-title'>{q.title}</h3>
                        <p className='qa-content'>{q.content}</p>

                        <button className='btn-toggle-answers' onClick={() => setExpandedQaId(expandedQaId === q.questionid ? null : q.questionid)}>
                          {expandedQaId === q.questionid ? (
                            <>
                              <FaChevronUp /> Hide Answers
                            </>
                          ) : (
                            <>
                              <FaChevronDown /> View {q.answers?.length || 0} Answers
                            </>
                          )}
                        </button>

                        {expandedQaId === q.questionid && (
                          <div className='answer-list'>
                            {q.answers?.length ? (
                              q.answers.map((ans) => (
                                <div key={ans.answerid} className='answer-item'>
                                  <SafeImage 
                                    src={ans.lawyer?.lawyer_profile?.profileimage}
                                    type="lawyer"
                                    className='lawyer-qa-avatar'
                                    alt={ans.lawyer?.fullname || "Lawyer Avatar"}
                                  />
                                  <div className='answer-content-box'>
                                    <div className='lawyer-name'>
                                      Lawyer {ans.lawyer?.lawyer_profile?.fullname} <FaCheckCircle style={{ color: "#10b981", fontSize: "12px" }} />
                                    </div>
                                    <p>{ans.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className='no-answer'>No answers yet from lawyers.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className='empty-box'>No matching questions found.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "library" && (
              <div className={`library-grid ${isFetching ? "dimmed" : ""}`}>
                {contentList.length ? (
                  contentList.map((item) => (
                    <div key={item.contentid} className='library-card'>
                      <span className={`badge ${item.type}`}>{item.type}</span>
                      <h3>{item.title}</h3>
                      <p>{stripHtmlAndDecode(item.body).length > 150 ? `${stripHtmlAndDecode(item.body).substring(0, 150)}...` : stripHtmlAndDecode(item.body)}</p>
                      <Link to={`/contents/${item.contentid}`} className='read-more-link'>
                        Read details <FaArrowRight style={{ fontSize: "12px", marginLeft: "5px" }} />
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className='empty-box'>No content found.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
