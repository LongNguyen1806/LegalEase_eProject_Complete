import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/apiAxios";
import styles from "../../assets/styles/admin/LoginAdmin.module.css";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Scale, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosClient.post("/login", {
        email: email,
        password: password,
      });

      const { access_token, user } = response.data;
      const { roleid, userid } = user;

      if (Number(roleid) !== 1) {
        setLoading(false);
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: "You do not have permission to access the admin panel.",
          confirmButtonColor: "#1c357e",
        });
        return;
      }

      localStorage.setItem("ADMIN_ACCESS_TOKEN", access_token);
      const adminInfo = {
        userid: userid,
        roleid: roleid,
        email: email,
      };
      localStorage.setItem("ADMIN_INFO", JSON.stringify(adminInfo));

      toast.success("Login successful! Redirecting to dashboard...");

      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Login Error:", err);
      const serverMsg = err.response?.data?.message || "Login failed. Please check your email or password.";
      toast.error(serverMsg);
      setLoading(false);
    }
  };

  return (
    <div className={styles.adminLoginWrapper}>
      <div className={styles.logo}>
        <Scale size={32} style={{ marginRight: "10px" }} />
        <span>LegalEase</span>
      </div>

      <form className={styles.adminLoginForm} onSubmit={handleLogin}>
        <h2 className={styles.adminLoginTitle}>System Administration</h2>

        <div className={styles.adminFormGroup}>
          <label>Email Address</label>
          <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='admin@legalease.vn' required />
        </div>

        <div className={styles.adminFormGroup}>
          <label>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter your password'
              required
              autoComplete='current-password'
              style={{ width: "100%", paddingRight: "45px" }}
            />
            <div
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                zIndex: 10,
              }}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
        </div>

        <button type='submit' className={styles.adminLoginBtn} disabled={loading}>
          {loading ? "Processing Authentication..." : "Secure Login"}
        </button>
      </form>
    </div>
  );
}
