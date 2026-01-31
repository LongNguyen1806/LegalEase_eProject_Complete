import { useState, useEffect, useContext } from "react";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import "../../assets/styles/client/StyleCustomer/ProfileSetting.css";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ProfileSetting() {
  const { user, login } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    fullname: "",
    phonenumber: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axiosClient.get("/customer/profile");
      if (res.data.success) {
        const profile = res.data.data;
        setFormData({
          fullname: profile.fullname || "",
          phonenumber: profile.phonenumber || "",
        });
        if (profile.profileimage) {
          setPreviewUrl(profile.profileimage);
        }
      }
    } catch (error) {
      console.error("Error loading profile information:", error);
      toast.error("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { current_password, new_password, new_password_confirmation } = passwordData;

    if (!(formData.fullname || "").trim()) {
      return toast.error("Full Name cannot be left blank.");
    }

    if (!(formData.phonenumber || "").trim()) {
      return toast.error("Phone Number cannot be left blank.");
    }

    if (new_password) {
      if (new_password.length < 8) {
        return toast.error("New password must be at least 8 characters long.");
      }
      if (new_password !== new_password_confirmation) {
        return toast.error("New password confirmation does not match.");
      }
      if (!current_password) {
        return toast.error("Please enter your current password to make changes.");
      }
    }

    setSaving(true);
    const data = new FormData();
    data.append("fullname", formData.fullname);
    data.append("phonenumber", formData.phonenumber || "");

    if (new_password) {
      data.append("current_password", current_password);
      data.append("new_password", new_password);
      data.append("new_password_confirmation", new_password_confirmation);
    }

    if (selectedFile) {
      data.append("profileimage", selectedFile);
    }

    data.append("_method", "PUT");

    try {
      const res = await axiosClient.post("/customer/profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully!",
          icon: "success",
          confirmButtonColor: "#1a2f6d",
        });

        setPasswordData({
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        });

        const updatedUser = {
          ...user,
          fullname: formData.fullname,
          avatar: res.data.data.profileimage,
        };

        login(updatedUser, localStorage.getItem("CLIENT_ACCESS_TOKEN"));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "An error occurred while saving.";
      toast.error("Error: " + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className='loading-msg'>⏳ Loading information...</div>;

  return (
    <div className='profile-setting-container'>
      <div className='profile-card'>
        <div className='profile-header'>
          <h2>Personal Profile Settings</h2>
        </div>

        <div className='profile-body'>
          <form onSubmit={handleSubmit}>
            <h3 className='section-title'>👤 Personal Information</h3>
            <div className='avatar-section'>
              <SafeImage src={previewUrl} type='customer' alt='Avatar Preview' className='avatar-preview' />
              <div className='upload-btn-wrapper'>
                <button type='button' className='btn-upload'>
                  Change Avatar
                </button>
                <input type='file' name='profileimage' accept='image/*' onChange={handleFileChange} />
              </div>
            </div>

            <div className='form-group'>
              <label>
                Full Name <span style={{ color: "red" }}>*</span>
              </label>
              <input type='text' name='fullname' className='form-control' value={formData.fullname} onChange={handleInputChange} required />
            </div>

            <div className='form-group'>
              <label>Phone Number</label>
              <input type='text' name='phonenumber' className='form-control' value={formData.phonenumber} onChange={handleInputChange} />
            </div>

            <div className='section-divider'></div>
            <h3 className='section-title'>🔒 Security & Password</h3>
            <small className='password-note'>Leave blank if you do not want to change your password.</small>

            <div className='form-group'>
              <label>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrent ? "text" : "password"}
                  name='current_password'
                  className='form-control'
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  placeholder='Enter old password'
                  autoComplete='current-password'
                />
                <span
                  className='password-toggle-icon'
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#666" }}>
                  {showCurrent ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            <div className='form-group'>
              <label>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNew ? "text" : "password"}
                  name='new_password'
                  className='form-control'
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  placeholder='Minimum 8 characters'
                  autoComplete='new-password'
                />
                <span
                  className='password-toggle-icon'
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#666" }}>
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            <div className='form-group'>
              <label>Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  name='new_password_confirmation'
                  className='form-control'
                  value={passwordData.new_password_confirmation}
                  onChange={handlePasswordChange}
                  placeholder='Re-enter new password'
                />
                <span
                  className='password-toggle-icon'
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#666" }}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            <button type='submit' className='save-btn' disabled={saving}>
              {saving ? "⏳ Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
