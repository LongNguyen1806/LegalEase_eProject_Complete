import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/client/StylePublic/WriteReview.module.css"; 
import { toast } from "sonner";
import Swal from "sweetalert2";

export default function WriteReview() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("CLIENT_ACCESS_TOKEN");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "Please log in to submit a review.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Go to Login"
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/login");
        }
      });
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }

    setLoading(true);

    try {
      const resHistory = await axiosClient.get("/customer/appointments");
      let validAppointId = null;

      if (resHistory.data.success) {
        const appointments = resHistory.data.data;
        const targetAppoint = appointments.find(
          (a) => a.lawyerid == id && a.status === "Completed"
        );

        if (targetAppoint) {
          validAppointId = targetAppoint.appointid;
        }
      }

      if (!validAppointId) {
        Swal.fire({
          title: "Ineligible for Review",
          text: "Error: You can only review after the lawyer has marked the appointment as Completed.",
          icon: "error",
          confirmButtonColor: "#d33"
        });
        setLoading(false);
        return;
      }

      const payload = {
        appointid: validAppointId,
        rating: rating,
        title: title,
        comment: content,
      };

      const res = await axiosClient.post("/customer/reviews", payload);

      if (res.data.success) {
        toast.success("Thank you! Your review has been submitted.");
        navigate(`/lawyers/${id}`);
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || "An error occurred.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.reviewWrapper}>
      <h1 className={styles.reviewTitle}>Lawyer Review</h1>

      <form className={styles.reviewForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Service Quality ({rating}/5)</label>
          <div className={styles.starGroup}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`${styles.star} ${star <= rating ? styles.starActive : ""}`}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Title</label>
          <input
            type="text"
            className={styles.formInput} 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Summarize your experience"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Review Details</label>
          <textarea
            rows="5"
            className={styles.formTextarea} 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Share what you liked or disliked..."
          />
        </div>

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}