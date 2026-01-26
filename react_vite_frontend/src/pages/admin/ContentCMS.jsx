import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/admin/ContentCMS.module.css";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import CKEditorAdapter from "../../utils/CKEditorAdapter";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaTrash, FaImage, FaLock } from "react-icons/fa";

export default function ContentCMS() {
  const queryClient = useQueryClient();
  const tabs = ["All", "News", "Guide", "FAQ", "Terms of Service", "Privacy Policy", "Cookie Policy"];

  const [filterType, setFilterType] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [type, setType] = useState("News");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const isImageType = type === "News" || type === "Guide";

  function MyCustomUploadAdapterPlugin(editor) {
    editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
      return new CKEditorAdapter(loader);
    };
  }

  const { data: contents = [], isLoading: loading } = useQuery({
    queryKey: ["adminContent", filterType],
    queryFn: async () => {
      const url = filterType === "All" ? "/admin/content" : `/admin/content?type=${filterType}`;
      const res = await axiosClient.get(url);
      return res.data.success ? res.data.data : [];
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingItem) {
        payload.append("_method", "PUT");
        return axiosClient.post(`/admin/content/${editingItem.contentid}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        return axiosClient.post("/admin/content", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Content updated successfully!" : "New content added successfully!");
      setIsModalOpen(false);
      queryClient.invalidateQueries(["adminContent"]);
    },
    onError: (error) => {
      toast.error("Error: " + (error.response?.data?.message || "Please check the input data."));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append("type", type);
    payload.append("title", title);
    payload.append("body", body);
    if (imageFile) {
      payload.append("contentimage", imageFile);
    }
    submitMutation.mutate(payload);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/admin/content/${id}`),
    onSuccess: () => {
      toast.success("Content deleted successfully!");
      queryClient.invalidateQueries(["adminContent"]);
    },
    onError: () => {
      toast.error("Unable to delete this content.");
    },
  });

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this content?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    const initialType = filterType !== "All" ? filterType : "News";
    setType(initialType);
    setTitle("");
    setBody("");
    setImageFile(null);
    setPreviewImage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setType(item.type);
    setTitle(item.title || "");
    setBody(item.body);
    setImageFile(null);
    setPreviewImage(item.contentimage ? `${DOMAIN}/storage/${item.type}/${item.contentimage}` : null);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.cmsContainer}>
      <div className={styles.cmsHeader}>
        <h1>Content CMS</h1>
        <button className={styles.btnAdd} onClick={openAddModal}>
          <FaPlus style={{ marginRight: "8px" }} /> Add New Content
        </button>
      </div>

      <div className={styles.cmsFilters}>
        {tabs.map((t) => (
          <button key={t} className={`${styles.filterBtn} ${filterType === t ? styles.active : ""}`} onClick={() => setFilterType(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <p className={styles.loading}>Loading data...</p>
        ) : (
          <table className={styles.cmsTable}>
            <thead>
              <tr>
                <th className={styles.colId}>ID</th>
                <th className={styles.colThumb}>Thumbnail</th>
                <th className={styles.colType}>Type</th>
                <th>Title</th>
                <th>Excerpt</th>
                <th className={styles.center}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contents.length > 0 ? (
                contents.map((item) => (
                  <tr key={item.contentid}>
                    <td>{item.contentid}</td>
                    <td>
                      {item.contentimage ? (
                        <img
                          src={`${DOMAIN}/storage/${item.type}/${item.contentimage}`}
                          alt='thumb'
                          className={styles.thumbImg}
                          style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                        />
                      ) : (
                        <span style={{ color: "#ccc", fontSize: "11px" }}>No image</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${styles[item.type.replace(/\s+/g, "").toLowerCase()]}`}>{item.type}</span>
                    </td>
                    <td className={styles.titleText}>{item.title}</td>
                    <td className={styles.excerpt}>{item.body.replace(/<[^>]*>?/gm, "").substring(0, 60)}...</td>
                    <td className={styles.center}>
                      <button className={styles.btnEdit} onClick={() => openEditModal(item)}>
                        <FaEdit /> Edit
                      </button>
                      <button className={styles.btnDelete} onClick={() => handleDelete(item.contentid)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='6' className={styles.noData}>
                    No data in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? "Edit Content" : "Add New Content"}</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Content Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} disabled={!!editingItem} className={editingItem ? styles.disabledInput : ""}>
                  <option value='News'>News</option>
                  <option value='Guide'>Guide</option>
                  <option value='FAQ'>FAQ</option>
                  <option value='Terms of Service'>Terms of Service</option>
                  <option value='Privacy Policy'>Privacy Policy</option>
                  <option value='Cookie Policy'>Cookie Policy</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Title</label>
                <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              {isImageType && (
                <div className={styles.formGroup}>
                  <label>Thumbnail Image {type === "News" && "(Required)"}</label>
                  <input type='file' accept='image/*' onChange={handleFileChange} />
                  {previewImage && (
                    <div className={styles.previewBox}>
                      <img src={previewImage} alt='Preview' />
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Body Content</label>
                <div className='editor-container'>
                  <CKEditor
                    editor={ClassicEditor}
                    data={body}
                    config={{
                      extraPlugins: isImageType ? [MyCustomUploadAdapterPlugin] : [],
                      toolbar: isImageType
                        ? ["heading", "|", "bold", "italic", "link", "bulletedList", "numberedList", "|", "imageUpload", "blockQuote", "insertTable", "undo", "redo"]
                        : ["heading", "|", "bold", "italic", "link", "bulletedList", "numberedList", "|", "blockQuote", "insertTable", "undo", "redo"],
                      placeholder: `Write ${type} details here...`,
                    }}
                    onChange={(event, editor) => setBody(editor.getData())}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type='button' className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type='submit' className={styles.btnSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Saving..." : editingItem ? "Update Changes" : "Publish Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
