import { useState, useContext } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";
import Swal from "sweetalert2";
import axiosClient from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import "../../assets/styles/client/StylePublic/LoginClient.css";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login, user } = useContext(AuthContext);

  if (user) {
    return <Navigate to='/' replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axiosClient.post("/login", { email, password });
      const { access_token, user: userData } = res.data;
      const roleid = userData.roleid;

      let finalName = userData.fullname;
      if (!finalName) {
        if (roleid === 2) {
          finalName = userData.lawyer_profile?.fullname;
        } else if (roleid === 3) {
          finalName = userData.customer_profile?.fullname;
        }
      }
      finalName = finalName || userData.email || "User";

      const finalAvatar = userData.lawyer_profile?.profileimage || 
                          userData.customer_profile?.profileimage || 
                          null;

      if (roleid === 2 || roleid === 3) {
        const userDataToSave = {
          userid: userData.userid,
          roleid: roleid,
          email: userData.email,
          fullname: finalName,
          avatar: finalAvatar, 
        };

        login(userDataToSave, access_token);
        
        toast.success("Login successful!");
        navigate("/");
      } else {
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: "This account has administrative privileges. Please log in at the Admin Panel.",
          confirmButtonColor: "#d33",
        });
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Incorrect email or password.";
      toast.error(errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <div className='login-container'>
      <h2 className='login-title'>Sign In</h2>

      {error && <p className='login-error'>{error}</p>}

      <form onSubmit={handleLogin} className='login-form'>
        <div className='form-group'>
          <label>Email</label>
          <input 
            type='email' 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder='example@email.com' 
            required 
          />
        </div>

        <div className='form-group'>
          <label>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              required
              autoComplete='current-password'
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#666",
                display: "flex",
                alignItems: "center",
              }}>
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </span>
          </div>
        </div>

        <button type='submit' className='login-button'>
          Sign In
        </button>
      </form>

      <p className='login-register'>
        Don’t have an account? <Link to='/register'>Register now</Link>
      </p>
    </div>
  );
}