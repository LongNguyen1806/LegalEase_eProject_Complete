import { useState, useContext } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import "../../assets/styles/client/StylePublic/Register.css";

import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LawyerRegister() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: masterData } = useQuery({
    queryKey: ["master-data"],
    queryFn: async () => {
      const res = await axiosClient.get("/master-data");
      return res.data.data;
    },
    staleTime: Infinity,
    enabled: !user,
  });

  const locations = masterData?.locations || [];
  const specializations = masterData?.specializations || [];

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirmation: "",
    fullname: "",
    phonenumber: "",
    roleid: 2,
    experienceyears: "",
    licensenumber: "",
    idcardnumber: "",
    locid: "",
    addressdetail: "",
    profileimage: null,
    specids: [],
    documentimages: [],
    achievements: [""],
    terms: false,
  });

  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" && name === "terms" ? checked : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  const handleSpecChange = (e) => {
    const specId = parseInt(e.target.value);
    const { checked } = e.target;
    setFormData((prev) => {
      let newSpecs = [...prev.specids];
      if (checked) newSpecs.push(specId);
      else newSpecs = newSpecs.filter((id) => id !== specId);
      return { ...prev, specids: newSpecs };
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === "documentimages") {
      setFormData({ ...formData, [name]: Array.from(files) });
    } else {
      setFormData({ ...formData, [name]: files[0] });
    }
  };

  const handleAchievementChange = (index, value) => {
    const newAchievements = [...formData.achievements];
    newAchievements[index] = value;
    setFormData({ ...formData, achievements: newAchievements });
  };

  const addAchievementField = () => {
    setFormData({ ...formData, achievements: [...formData.achievements, ""] });
  };

  const removeAchievementField = (index) => {
    const newAchievements = formData.achievements.filter((_, i) => i !== index);
    setFormData({ ...formData, achievements: newAchievements });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.password_confirmation) {
      toast.error("Password confirmation does not match.");
      return;
    }
    if (!formData.terms) {
      toast.warning("You must agree to the Lawyer Partner Terms.");
      return;
    }

    const years = Number(formData.experienceyears);
    if (formData.experienceyears === "" || years < 0 || years > 50) {
      toast.error("Experience years must be a number between 0 and 50.");
      return;
    }

    if (formData.specids.length === 0) {
      toast.warning("Please select at least one specialization.");
      return;
    }
    if (formData.documentimages.length < 1) {
      toast.warning("Please upload at least 2 verification images.");
      return;
    }

    const dataPayload = new FormData();
    dataPayload.append("email", formData.email);
    dataPayload.append("password", formData.password);
    dataPayload.append("password_confirmation", formData.password_confirmation);
    dataPayload.append("fullname", formData.fullname);
    dataPayload.append("phonenumber", formData.phonenumber);
    dataPayload.append("roleid", formData.roleid);
    dataPayload.append("experienceyears", formData.experienceyears);
    dataPayload.append("licensenumber", formData.licensenumber);
    dataPayload.append("idcardnumber", formData.idcardnumber);
    dataPayload.append("locid", formData.locid);
    dataPayload.append("addressdetail", formData.addressdetail);
    dataPayload.append("terms", formData.terms ? "1" : "0");

    if (formData.profileimage) {
      dataPayload.append("profileimage", formData.profileimage);
    }

    formData.documentimages.forEach((file) => {
      dataPayload.append("documentimages[]", file);
    });

    formData.specids.forEach((id) => {
      dataPayload.append("specids[]", id);
    });

    formData.achievements.forEach((text) => {
      if (text.trim() !== "") {
        dataPayload.append("achievements[]", text);
      }
    });

    try {
      await axiosClient.post("/register", dataPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        title: "Registration Submitted!",
        html: `
        <p>Your application has been received and is currently under review.</p>
        <p>The result will be notified once the process is completed.</p>
        <br/>
        <p>
            For assistance, please contact us at:<br/>
            📞 <strong>+84 28 1234 5678</strong><br/>
            ✉️ <strong>support@legalease.vn</strong>
        </p>
    `,
        icon: "success",
        confirmButtonColor: "#1C357E",
        confirmButtonText: "Go to Homepage",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/");
        }
      });
    } catch (err) {
      if (err.response && err.response.data.errors) {
        const serverError = Object.values(err.response.data.errors)[0][0];
        toast.error(serverError);
      } else {
        toast.error("Registration failed. Please check your inputs.");
      }
    }
  };

  if (user) return <Navigate to='/' replace />;

  return (
    <div className='register-container'>
      <h2 className='register-title'>Join as a Lawyer</h2>
      <p style={{ textAlign: "center", color: "#666" }}>Create your professional profile</p>

      {error && <p className='register-error'>{error}</p>}

      <form onSubmit={handleSubmit} className='register-form'>
        <h4 className='section-title'>Account Information</h4>
        <div className='form-group'>
          <label>
            Email <span className='required'>*</span>
          </label>
          <input name='email' type='email' value={formData.email} onChange={handleChange} required />
        </div>

        <div className='form-row'>
          <div className='form-group'>
            <label>
              Password <span className='required'>*</span>
            </label>
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
            <label>
              Confirm Password <span className='required'>*</span>
            </label>
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
        </div>

        <h4 className='section-title'>Professional Profile</h4>
        <div className='form-group'>
          <label>
            Full Name <span className='required'>*</span>
          </label>
          <input name='fullname' type='text' value={formData.fullname} onChange={handleChange} required placeholder='e.g. Atty. Nguyen Van A' />
        </div>

        <div className='form-group'>
          <label>Profile Picture (Optional)</label>
          <input name='profileimage' type='file' accept='image/*' onChange={handleFileChange} className='file-input' />
          <small className='help-text'>Default avatar will be used if skipped.</small>
        </div>

        <div className='form-row'>
          <div className='form-group'>
            <label>
              Phone Number <span className='required'>*</span>
            </label>
            <input name='phonenumber' type='text' value={formData.phonenumber} onChange={handleChange} required />
          </div>
          <div className='form-group'>
            <label>
              Experience (Years) <span className='required'>*</span>
            </label>
            <input name='experienceyears' type='number' min='0' max='50' value={formData.experienceyears} onChange={handleChange} required />
          </div>
        </div>

        <h4 className='section-title'>Verification Documents</h4>
        <div className='form-row'>
          <div className='form-group'>
            <label>
              Bar License Number <span className='required'>*</span>
            </label>
            <input name='licensenumber' type='text' value={formData.licensenumber} onChange={handleChange} required />
          </div>
          <div className='form-group'>
            <label>
              National ID / CCCD <span className='required'>*</span>
            </label>
            <input name='idcardnumber' type='text' value={formData.idcardnumber} onChange={handleChange} required />
          </div>
        </div>

        <div className='form-group'>
          <label>
            Upload Documents (Multiple) <span className='required'>*</span>
          </label>
          <input name='documentimages' type='file' accept='image/*,application/pdf' onChange={handleFileChange} required multiple className='file-input' />
          <small className='help-text'>Please select ALL files: ID Card (Front & Back) + Lawyer License.</small>
        </div>

        <h4 className='section-title'>Specializations & Office</h4>
        <div className='form-group'>
          <label>
            Select Specializations <span className='required'>*</span>
          </label>
          <div className='checkbox-group-container'>
            {specializations.map((spec) => (
              <div key={spec.specid} className='checkbox-item'>
                <input type='checkbox' id={`spec-${spec.specid}`} value={spec.specid} checked={formData.specids.includes(spec.specid)} onChange={handleSpecChange} />
                <label htmlFor={`spec-${spec.specid}`}>{spec.specname}</label>
              </div>
            ))}
          </div>
        </div>

        <div className='form-row'>
          <div className='form-group'>
            <label>
              Office City <span className='required'>*</span>
            </label>
            <select name='locid' value={formData.locid} onChange={handleChange} required className='form-select'>
              <option value=''>Select city...</option>
              {locations.map((loc) => (
                <option key={loc.locid} value={loc.locid}>
                  {loc.cityname}
                </option>
              ))}
            </select>
          </div>
          <div className='form-group'>
            <label>
              Office Address Detail <span className='required'>*</span>
            </label>
            <input name='addressdetail' type='text' value={formData.addressdetail} onChange={handleChange} required placeholder='Full Address...' />
          </div>
        </div>

        <h4 className='section-title'>Awards & Achievements (Optional)</h4>
        <div className='form-group'>
          <label>List your major awards</label>
          {formData.achievements.map((ach, index) => (
            <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input type='text' value={ach} onChange={(e) => handleAchievementChange(index, e.target.value)} placeholder='e.g. Best Lawyer 2023...' />
              {formData.achievements.length > 1 && (
                <button
                  type='button'
                  onClick={() => removeAchievementField(index)}
                  style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "4px", padding: "0 15px", cursor: "pointer" }}>
                  -
                </button>
              )}
            </div>
          ))}
          <button
            type='button'
            onClick={addAchievementField}
            style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "8px 15px", cursor: "pointer", fontSize: "14px" }}>
            + Add Another Award
          </button>
        </div>

        <div className='terms-group'>
          <input name='terms' type='checkbox' id='terms' checked={formData.terms} onChange={handleChange} />
          <label htmlFor='terms'>I agree to the Lawyer Partner Terms</label>
        </div>

        <button type='submit' className='register-button'>
          Submit Application
        </button>

        <div className='lawyer-redirect'>
          <Link to='/register' style={{ color: "#666", textDecoration: "none" }}>
            Are you a Client? <span style={{ color: "#1C357E", fontWeight: "bold" }}>Register here</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
