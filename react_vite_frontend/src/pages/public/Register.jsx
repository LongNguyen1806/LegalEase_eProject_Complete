import { useState, useContext } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import axiosClient from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import "../../assets/styles/client/StylePublic/Register.css";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Register() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirmation: "",
    fullname: "",
    phonenumber: "",
    roleid: 3,
    terms: false,
  });

  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to='/' replace />;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.password_confirmation) {
      toast.error("Password confirmation does not match!");
      return;
    }

    if (!formData.terms) {
      toast.warning("You must agree to the terms of service.");
      return;
    }

    try {
      await axiosClient.post("/register", formData);

      Swal.fire({
        title: "Registration Successful!",
        text: "Your account has been created. Please log in.",
        icon: "success",
        confirmButtonColor: "#1C357E",
        confirmButtonText: "Go to Login",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/login");
        }
      });
    } catch (err) {
      if (err.response && err.response.data.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        toast.error(firstError);
      } else {
        toast.error("Registration failed. Please try again later.");
      }
    }
  };

  return (
    <div className='register-container'>
      <h2 className='register-title'>Create a Client Account</h2>

      {error && <p className='register-error'>{error}</p>}

      <form onSubmit={handleSubmit} className='register-form'>
        <div className='form-group'>
          <label>
            Full Name <span className='required-star'>*</span>
          </label>
          <input name='fullname' type='text' value={formData.fullname} onChange={handleChange} required />
        </div>

        <div className='form-group'>
          <label>
            Email <span className='required-star'>*</span>
          </label>
          <input name='email' type='email' value={formData.email} onChange={handleChange} required />
        </div>

        <div className='form-group'>
          <label>
            Phone Number <span className='required-star'>*</span>
          </label>
          <input name='phonenumber' type='text' value={formData.phonenumber} onChange={handleChange} />
        </div>

        <div className='form-group'>
          <label>Password</label>
          <div style={{ position: "relative" }}>
            <input
              name='password'
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete='new-password'
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

        <div className='form-group'>
          <label>Confirm Password</label>
          <div style={{ position: "relative" }}>
            <input
              name='password_confirmation'
              type={showConfirmPassword ? "text" : "password"}
              value={formData.password_confirmation}
              onChange={handleChange}
              required
              autoComplete='new-password'
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <span
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </span>
          </div>
        </div>

        <div className='terms-group'>
          <input name='terms' type='checkbox' id='terms' checked={formData.terms} onChange={handleChange} />
          <label htmlFor='terms'>I agree to the terms and conditions</label>
        </div>

        <button type='submit' className='register-button'>
          Register
        </button>

        <div className='lawyer-redirect' style={{ marginTop: "20px", textAlign: "center", fontSize: "15px" }}>
          <Link to='/register-lawyer' style={{ color: "#1C357E", fontWeight: "bold", textDecoration: "none" }}>
            Are you a lawyer? Register here
          </Link>
        </div>
      </form>
    </div>
  );
}
