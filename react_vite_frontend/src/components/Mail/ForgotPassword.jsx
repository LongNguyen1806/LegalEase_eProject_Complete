import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { toast } from "sonner";
import axiosClient from "../../api/apiAxios";
import "../../assets/styles/client/StylePublic/LoginClient.css";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post("/forgot-password", { email });
      if (res.data.success) {
        toast.success(res.data.message);
        setStep(2);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Email not found or system error.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      return toast.error("Passwords do not match!");
    }

    setLoading(true);
    try {
      const res = await axiosClient.post("/reset-password", {
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        navigate("/login"); 
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid OTP or request failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='login-container'>
      <div style={{ marginBottom: "20px" }}>
        <Link to="/login" style={{ display: "flex", alignItems: "center", gap: "5px", color: "#1c357e", textDecoration: "none", fontSize: "14px" }}>
          <FaArrowLeft size={12} /> Back to Sign In
        </Link>
      </div>

      <h2 className='login-title'>
        {step === 1 ? "Forgot Password" : "Reset Password"}
      </h2>
      
      <p style={{ textAlign: "center", color: "#666", marginBottom: "20px", fontSize: "14px" }}>
        {step === 1 
          ? "Enter your email address to receive a verification code." 
          : `We've sent a 6-digit code to ${email}`}
      </p>

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className='login-form'>
          <div className='form-group'>
            <label>Email Address</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='example@email.com'
              required
              disabled={loading}
            />
          </div>
          <button type='submit' className='login-button' disabled={loading}>
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className='login-form'>
          <div className='form-group'>
            <label>Verification Code (OTP)</label>
            <input
              type='text'
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder='Enter 6-digit code'
              required
              maxLength={6}
            />
          </div>

          <div className='form-group'>
            <label>New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='At least 8 characters'
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#666" }}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </span>
            </div>
          </div>

          <div className='form-group'>
            <label>Confirm New Password</label>
            <input
              type='password'
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder='Re-enter new password'
              required
            />
          </div>

          <button type='submit' className='login-button' disabled={loading}>
            {loading ? "Processing..." : "Reset Password"}
          </button>
          
          <button 
            type="button" 
            onClick={() => setStep(1)} 
            style={{ width: "100%", background: "none", border: "none", color: "#666", marginTop: "10px", cursor: "pointer", fontSize: "13px" }}
          >
            Didn't receive code? Try another email
          </button>
        </form>
      )}
    </div>
  );
}