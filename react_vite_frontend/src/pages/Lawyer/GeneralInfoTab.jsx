import { useState, useRef, useEffect, useContext } from "react"; 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import styles from "../../assets/styles/client/StyleLawyer/GeneralInfoTab.module.css";
import SafeImage from "../../components/common/SafeImage";
import { toast } from "sonner";
import { FaUserEdit, FaCamera, FaBuilding, FaMapMarkerAlt, FaSave, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { MdEdit, MdClose, MdLocationCity } from "react-icons/md";
import { useProfileStore } from "../../store/useProfileStore";
import { AuthContext } from "../../context/AuthContext"; 

export default function GeneralInfoTab({ data, locsMaster, reload }) {
  const queryClient = useQueryClient();
  const { user: authUser, login } = useContext(AuthContext); 
  const profile = data.lawyer_profile || {};
  const setProfile = useProfileStore((state) => state.setProfile);

  const [infoForm, setInfoForm] = useState({
    fullname: profile.fullname || "",
    phonenumber: profile.phonenumber || "",
    bio: profile.bio || "",
    profileimage: null,
  });

  const [preview, setPreview] = useState(profile.profileimage || null);

  const fileInputRef = useRef();

  const currentOffice = data.offices?.[0] || data.office || null;
  const [officeForm, setOfficeForm] = useState({
    locid: currentOffice?.locid || "",
    street: currentOffice?.addressdetail || "",
  });

  const [isEditingOffice, setIsEditingOffice] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    if (currentOffice) {
      setOfficeForm({
        locid: currentOffice.locid || "",
        street: currentOffice.addressdetail || "",
      });
    }
  }, [data]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload) =>
      axiosClient.post("/lawyer/profile", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: (res) => {
      const updatedData = res.data.data;

      const updatedUser = {
        ...authUser,
        fullname: updatedData.fullname || infoForm.fullname,
        avatar: updatedData.profileimage, 
      };

      login(updatedUser, localStorage.getItem("CLIENT_ACCESS_TOKEN"));

      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Profile updated successfully! 🎉");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    },
  });

  const updateOfficeMutation = useMutation({
    mutationFn: (payload) => axiosClient.post("/lawyer/offices", payload),
    onSuccess: () => {
      setIsEditingOffice(false);
      queryClient.invalidateQueries(["lawyer-profile"]);
      reload();
      toast.success("Office address updated successfully! 🏢");
    },
    onError: () => {
      toast.error("System error while updating address.");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload) => axiosClient.post("/lawyer/change-password", payload),
    onSuccess: () => {
      setPasswordForm({ current_password: "", new_password: "", new_password_confirmation: "" });
      toast.success("Password updated successfully! 🔐");
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to update password.";
      toast.error(msg);
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInfoForm((prev) => ({ ...prev, profileimage: file }));
      setPreview(URL.createObjectURL(file));
      toast.info("Image selected. Don't forget to save.");
    }
  };

  const handleSaveInfo = (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append("fullname", infoForm.fullname);
    payload.append("phonenumber", infoForm.phonenumber);
    payload.append("bio", infoForm.bio);
    payload.append("_method", "PUT");
    payload.append("experienceyears", profile.experienceyears || 0);
    if (infoForm.profileimage) payload.append("profileimage", infoForm.profileimage);
    updateProfileMutation.mutate(payload);
  };

  const handleUpdateOffice = () => {
    if (!officeForm.locid || !officeForm.street) {
      return toast.warning("Please fill in all address information.");
    }
    updateOfficeMutation.mutate({ locid: officeForm.locid, addressdetail: officeForm.street });
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      return toast.error("Confirm password does not match!");
    }
    if (passwordForm.new_password.length < 8) {
      return toast.error("New password must be at least 8 characters.");
    }
    changePasswordMutation.mutate(passwordForm);
  };

  return (
    <div className={styles.tabGrid}>
      <div className={styles.colLeft}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper} onClick={() => fileInputRef.current.click()} title='Click to change avatar'>
            <SafeImage
              src={preview}
              type="lawyer"
              className={styles.avatarImage}
              alt="Avatar"
            />
            <div className={styles.avatarOverlay}>
              <FaCamera aria-hidden='true' />
            </div>
          </div>
          <input type='file' id='avatar-upload' ref={fileInputRef} hidden accept='image/*' onChange={handleFileChange} />
          <p>
            <button type='button' className={styles.btnText} onClick={() => fileInputRef.current.click()}>
              <FaCamera style={{ marginRight: "5px" }} /> Change avatar
            </button>
          </p>
        </div>

        <h3 className={styles.sectionHeader}>
          <FaUserEdit style={{ marginRight: "10px" }} /> Personal Information
        </h3>
        <form onSubmit={handleSaveInfo}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Full name</label>
            <input className={styles.formInput} value={infoForm.fullname} onChange={(e) => setInfoForm({ ...infoForm, fullname: e.target.value })} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Phone number</label>
            <input className={styles.formInput} value={infoForm.phonenumber} onChange={(e) => setInfoForm({ ...infoForm, phonenumber: e.target.value })} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Bio</label>
            <textarea className={styles.formTextarea} rows={4} value={infoForm.bio} onChange={(e) => setInfoForm({ ...infoForm, bio: e.target.value })} />
          </div>
          <button type='submit' className={styles.btnPrimary} disabled={updateProfileMutation.isPending}>
            <FaSave style={{ marginRight: "8px" }} />
            {updateProfileMutation.isPending ? "Saving..." : "Save Information"}
          </button>
        </form>

        <div className={styles.divider} />

        <div className={styles.flexBetween}>
          <h3 className={styles.sectionHeaderNoBorder}>
            <FaBuilding style={{ marginRight: "10px" }} /> Office Address
          </h3>
          <button className={styles.btnText} onClick={() => setIsEditingOffice(!isEditingOffice)}>
            {isEditingOffice ? (
              <>
                <MdClose /> Cancel
              </>
            ) : (
              <>
                <MdEdit /> Edit address
              </>
            )}
          </button>
        </div>
        {!isEditingOffice && currentOffice && (
          <div className={styles.officeDisplay}>
            <div className={styles.officeCity}>
              <FaMapMarkerAlt style={{ color: "#e74c3c", marginRight: "8px" }} />
              {currentOffice.location?.cityname || locsMaster.find((l) => l.locid == currentOffice.locid)?.cityname}
            </div>
            <div className={styles.officeStreet}>{currentOffice.addressdetail}</div>
          </div>
        )}
        {(isEditingOffice || !currentOffice) && (
          <div className={styles.officeForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <MdLocationCity /> City / Province
              </label>
              <select className={styles.formSelect} value={officeForm.locid} onChange={(e) => setOfficeForm({ ...officeForm, locid: e.target.value })}>
                <option value=''>-- Select location --</option>
                {locsMaster.map((loc) => (
                  <option key={loc.locid} value={loc.locid}>
                    {loc.cityname}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Street address</label>
              <input
                className={styles.formInput}
                placeholder='e.g. 123 Nguyen Hue Street'
                value={officeForm.street}
                onChange={(e) => setOfficeForm({ ...officeForm, street: e.target.value })}
              />
            </div>
            <button onClick={handleUpdateOffice} className={styles.btnSecondary} disabled={updateOfficeMutation.isPending}>
              {updateOfficeMutation.isPending ? "Updating..." : "Confirm update"}
            </button>
          </div>
        )}

        <div className={styles.divider} />

        <h3 className={styles.sectionHeaderNoBorder}>
          <FaLock style={{ marginRight: "10px" }} /> Change Password
        </h3>
        <form onSubmit={handleSavePassword} className={styles.passwordForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Current Password</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPass.current ? "text" : "password"}
                className={styles.formInput}
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                required
              />
              <span className={styles.eyeIcon} onClick={() => setShowPass({ ...showPass, current: !showPass.current })}>
                {showPass.current ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>New Password</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPass.new ? "text" : "password"}
                className={styles.formInput}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
              />
              <span className={styles.eyeIcon} onClick={() => setShowPass({ ...showPass, new: !showPass.new })}>
                {showPass.new ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Confirm New Password</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPass.confirm ? "text" : "password"}
                className={styles.formInput}
                value={passwordForm.new_password_confirmation}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                required
              />
              <span className={styles.eyeIcon} onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}>
                {showPass.confirm ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button type='submit' className={styles.btnPrimary} disabled={changePasswordMutation.isPending}>
            <FaSave style={{ marginRight: "8px" }} />
            {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
