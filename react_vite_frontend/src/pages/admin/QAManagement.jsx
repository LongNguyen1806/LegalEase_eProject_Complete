import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/QAManagement.module.css";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaTrash, FaCheck, FaEye, FaFileImport, FaHistory, FaBook, FaPlus, FaUsers, FaTimes, FaUserAlt, FaCalendarAlt } from "react-icons/fa";

export default function QAManagement() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("questions");
  const [page, setPage] = useState(1);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState([]);
  const [selectedLawName, setSelectedLawName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const [knowledgeForm, setKnowledgeForm] = useState({
    specid: "",
    lawname: "",
    title: "",
    content: "",
    chunkorder: 1,
  });

  const { data: specs = [] } = useQuery({
    queryKey: ["specializations"],
    queryFn: async () => {
      const res = await axiosClient.get("/specializations");
      return res.data.success ? res.data.data : [];
    },
    staleTime: Infinity,
  });

  const { data: mainData, isLoading: loading } = useQuery({
    queryKey: ["qaManagement", activeTab, page],
    queryFn: async () => {
      let url = "";
      switch (activeTab) {
        case "questions":
          url = "/admin/qa/questions/pending";
          break;
        case "answers":
          url = "/admin/qa/answers/pending";
          break;
        case "manage_content":
          url = `/community/questions?page=${page}`;
          break;
        case "knowledge":
          url = "/admin/ai/knowledge";
          break;
        case "logs":
          url = "/admin/ai/history-logs";
          break;
        default:
          return [];
      }
      const res = await axiosClient.get(url);
      return res.data.success ? res.data.data : [];
    },
    staleTime: 30000,
  });

  const dataList = activeTab === "manage_content" ? mainData?.data || [] : mainData || [];
  const totalPages = activeTab === "manage_content" ? mainData?.last_page || 1 : 1;

  const approveMutation = useMutation({
    mutationFn: ({ id, type }) => {
      const endpoint = type === "question" ? `/admin/qa/questions/${id}/approve` : `/admin/qa/answers/${id}/approve`;
      return axiosClient.patch(endpoint);
    },
    onSuccess: () => {
      toast.success("Approved successfully!");
      queryClient.invalidateQueries(["qaManagement"]);
    },
    onError: () => toast.error("Failed to approve content."),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }) => {
      const endpoint = type === "question" ? `/admin/qa/questions/${id}` : `/admin/qa/answers/${id}`;
      return axiosClient.delete(endpoint);
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.type} successfully.`);
      queryClient.invalidateQueries(["qaManagement"]);
    },
    onError: () => toast.error("Failed to delete item."),
  });

  const deleteLawGroupMutation = useMutation({
    mutationFn: (lawname) => axiosClient.post("/admin/ai/knowledge/delete-group", { lawname }),
    onSuccess: (res) => {
      Swal.fire("Deleted!", res.data.message, "success");
      queryClient.invalidateQueries(["qaManagement"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed."),
  });

  const saveKnowledgeMutation = useMutation({
    mutationFn: (payload) => {
      if (editingItem) return axiosClient.put(`/admin/ai/knowledge/${editingItem.lawid}`, payload);
      return axiosClient.post("/admin/ai/knowledge/import", payload, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      toast.success(editingItem ? "Updated successfully!" : "Imported successfully!");
      setIsModalOpen(false);
      queryClient.invalidateQueries(["qaManagement"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Operation failed."),
  });

  const handleApprove = (id, type) => {
    Swal.fire({
      title: "Confirm Approval?",
      text: "This will make the content public.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Approve",
      confirmButtonColor: "#059669",
    }).then((result) => {
      if (result.isConfirmed) approveMutation.mutate({ id, type });
    });
  };

  const handleDelete = (id, type) => {
    Swal.fire({
      title: "Are you sure?",
      text: `This ${type} will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      confirmButtonColor: "#dc2626",
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate({ id, type });
    });
  };

  const handleViewDetails = async (lawname) => {
    try {
      toast.loading("Fetching details...");
      const res = await axiosClient.get(`/admin/ai/knowledge`, { params: { detail_lawname: lawname } });
      if (res.data.success) {
        setDetailData(res.data.data);
        setSelectedLawName(lawname);
        setIsDetailOpen(true);
      }
      toast.dismiss();
    } catch (error) {
      toast.error("Failed to load details.");
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setImportFile(null);
    setKnowledgeForm(
      item
        ? { specid: item.specid || "", lawname: item.lawname || "", title: item.title, content: item.content, chunkorder: item.chunkorder || 1 }
        : { specid: "", lawname: "", title: "", content: "", chunkorder: 1 },
    );
    setIsModalOpen(true);
  };

  const handleSaveKnowledge = (e) => {
    e.preventDefault();
    if (editingItem) {
      saveKnowledgeMutation.mutate(knowledgeForm);
    } else {
      if (!importFile) return toast.error("Please select a .txt file.");
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("specid", knowledgeForm.specid);
      formData.append("lawname", knowledgeForm.lawname);
      saveKnowledgeMutation.mutate(formData);
    }
  };

  return (
    <div className={styles.qaContainer}>
      <h1 className={styles.bold}>Q&A & AI Management</h1>

      <div className={styles.qaTabs}>
        {[
          { key: "questions", label: "Review Questions" },
          { key: "answers", label: "Review Answers" },
          { key: "manage_content", label: "Manage Public Q&A" },
          { key: "knowledge", label: "AI Knowledge" },
          { key: "logs", label: "Chat Logs" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? styles.active : ""}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className={styles.qaLoading}>⏳ Syncing data from server...</p>}

      {!loading && (
        <div className={styles.contentArea}>
          {activeTab === "questions" && (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Asked By</th>
                    <th>Question</th>
                    <th className={styles.colActionsFixed}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataList.map((q) => (
                    <tr key={q.questionid}>
                      <td className={styles.textCenter}>{q.questionid}</td>
                      <td>{q.customer?.customerprofile?.fullname || "Anonymous"}</td>
                      <td>{q.content}</td>
                      <td className={styles.actions}>
                        <button className={styles.btnSuccess} onClick={() => handleApprove(q.questionid, "question")}>
                          Approve
                        </button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(q.questionid, "question")}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "answers" && (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Lawyer</th>
                    <th>Question (Ref)</th>
                    <th>Answer Content</th>
                    <th className={styles.colActionsFixed}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataList.map((a) => (
                    <tr key={a.answerid}>
                      <td className={styles.textCenter}>{a.answerid}</td>
                      <td>{a.lawyer?.lawyerprofile?.fullname}</td>
                      <td>
                        <i>{a.question?.content?.substring(0, 30)}...</i>
                      </td>
                      <td>{a.content}</td>
                      <td className={styles.actions}>
                        <button className={styles.btnSuccess} onClick={() => handleApprove(a.answerid, "answer")}>
                          Approve
                        </button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(a.answerid, "answer")}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "manage_content" && (
            <div className={styles.qaFeedWrapper}>
              {dataList.map((q) => (
                <div key={q.questionid} className={styles.qaCard}>
                  <div className={styles.qaCardHeader}>
                    <div className={styles.qaUserInfo}>
                      <FaUserAlt className={styles.iconMuted} />
                      <span className={styles.username}>{q.customer?.customer_profile?.fullname || "Anonymous"}</span>
                    </div>
                    <div className={styles.qaDate}>
                      <FaCalendarAlt className={styles.iconMuted} />
                      <span>{q.created_at ? new Date(q.created_at).toLocaleDateString() : "1/19/2026"}</span>
                    </div>
                  </div>

                  <div className={styles.qaCardBody}>
                    <h3 className={styles.qaTitle}>{q.title}</h3>
                    <p className={styles.qaText}>{q.content}</p>
                  </div>

                  <div className={styles.qaAnswersWrapper}>
                    <div className={styles.answersHeader}>
                      <strong>Answers ({q.answers?.length || 0})</strong>
                    </div>

                    {q.answers && q.answers.length > 0 ? (
                      <div className={styles.answerList}>
                        {q.answers.map((ans) => (
                          <div key={ans.answerid} className={styles.answerItemCard}>
                            <div className={styles.answerLawyerHeader}>
                              <strong>Lawyer {ans.lawyer?.lawyer_profile?.fullname}</strong>
                              <FaCheck className={styles.verifiedIcon} />
                            </div>
                            <div className={styles.answerContentRow}>
                              <p className={styles.answerText}>{ans.content}</p>
                              <button className={styles.btnDangerSmall} onClick={() => handleDelete(ans.answerid, "answer")} title='Delete this answer'>
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noAnswerText}>No approved answers yet.</p>
                    )}
                  </div>

                  <div className={styles.qaCardFooter}>
                    <button className={styles.btnDanger} onClick={() => handleDelete(q.questionid, "question")}>
                      <FaTrash style={{ marginRight: "8px" }} /> Delete Thread
                    </button>
                    <span className={styles.idBadge}>ID: #{q.questionid}</span>
                  </div>
                </div>
              ))}

              <div className={styles.paginationControls}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={styles.btnSecondary}>
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={styles.btnSecondary}>
                  Next
                </button>
              </div>
            </div>
          )}

          {activeTab === "knowledge" && (
            <div style={{ padding: "15px" }}>
              <button className={styles.btnAdd} onClick={() => openModal()}>
                <FaPlus /> Import Law File
              </button>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Law Name</th>
                      <th>Specialization</th>
                      <th className={styles.textCenter}>Chunks</th>
                      <th className={styles.colActionsFixed}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataList.map((k, i) => (
                      <tr key={i}>
                        <td className={styles.bold}>{k.lawname}</td>
                        <td>
                          <span className={styles.specBadge}>{k.specialization?.specname}</span>
                        </td>
                        <td className={styles.textCenter}>
                          <b>{k.total_chunks}</b> part
                        </td>
                        <td className={styles.actions}>
                          <button className={styles.btnWarning} onClick={() => handleViewDetails(k.lawname)}>
                            <FaEye /> View
                          </button>
                          <button
                            className={styles.btnDanger}
                            onClick={() => {
                              Swal.fire({ title: "Delete Law?", icon: "warning", showCancelButton: true }).then(
                                (r) => r.isConfirmed && deleteLawGroupMutation.mutate(k.lawname),
                              );
                            }}>
                            <FaTrash /> Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Question</th>
                    <th>AI Response</th>
                  </tr>
                </thead>
                <tbody>
                  {dataList.map((log) => (
                    <tr key={log.chatid}>
                      <td className={styles.textCenter}>{log.chatid}</td>
                      <td>{log.user?.email || "Guest"}</td>
                      <td className={styles.questionText}>{log.question}</td>
                      <td style={{ fontSize: "13px" }}>{log.answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.qaModalOverlay}>
          <div className={styles.qaModal}>
            <div className={styles.modalHeaderFlex}>
              <h2 className={styles.bold}>{editingItem ? "✏️ Edit Chunk" : "🚀 Import Law"}</h2>
              <button className={styles.btnCloseIcon} onClick={() => setIsModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSaveKnowledge}>
              <div className={styles.formGroup}>
                <label>Specialization</label>
                <select value={knowledgeForm.specid} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, specid: e.target.value })} required>
                  <option value=''>-- Select --</option>
                  {specs.map((s) => (
                    <option key={s.specid} value={s.specid}>
                      {s.specname}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Law Name</label>
                <input type='text' value={knowledgeForm.lawname} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, lawname: e.target.value })} required />
              </div>
              {!editingItem ? (
                <div className={styles.importBox}>
                  <label>Select .txt File</label>
                  <input type='file' accept='.txt' onChange={(e) => setImportFile(e.target.files[0])} required />
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label>Title</label>
                    <input type='text' value={knowledgeForm.title} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Content</label>
                    <textarea rows={8} value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} required />
                  </div>
                </>
              )}
              <div className={styles.modalActions}>
                <button type='button' className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type='submit' className={styles.btnPrimary} disabled={saveKnowledgeMutation.isPending}>
                  {saveKnowledgeMutation.isPending ? "Processing..." : editingItem ? "Update" : "Import Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailOpen && (
        <div className={styles.qaModalOverlay}>
          <div className={styles.qaModal} style={{ maxWidth: "1000px", width: "95%" }}>
            <div className={styles.modalHeaderFlex}>
              <h2 className={styles.bold}>📖 {selectedLawName}</h2>
              <button className={styles.btnCloseIcon} onClick={() => setIsDetailOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.detailTableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Article</th>
                    <th>Content</th>
                    <th>Act</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.map((item) => (
                    <tr key={item.lawid}>
                      <td className={styles.textCenter}>{item.chunkorder}</td>
                      <td className={styles.bold}>{item.title}</td>
                      <td className={styles.preWrap}>{item.content}</td>
                      <td>
                        <button
                          className={styles.btnWarningSmall}
                          onClick={() => {
                            setIsDetailOpen(false);
                            openModal(item);
                          }}>
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={() => setIsDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
