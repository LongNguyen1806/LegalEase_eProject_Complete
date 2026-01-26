import { useContext, useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient, { DOMAIN } from "../../api/apiAxios";
import { AuthContext } from "../../context/AuthContext";
import Notification from "../Notification/Notification";
import "../../assets/styles/client/StylePublic/Header.css";
import SafeImage from "../../components/common/SafeImage";

import { useProfileStore } from "../../store/useProfileStore";

import { FaTachometerAlt, FaGem, FaUserCog, FaCalendarCheck, FaQuestionCircle, FaSignOutAlt, FaChevronDown, FaChevronUp, FaBars } from "react-icons/fa";
import { Scale } from "lucide-react";


export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useContext(AuthContext);

  const syncProfile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user && !syncProfile.fullname) {
      const isLawyer = user.roleid === 2;
      const profileData = isLawyer ? user.lawyer_profile : user.customer_profile;
      const defaultPath = isLawyer ? LAWYER_DEFAULT : CUSTOMER_DEFAULT;
      setProfile({
        fullname: profileData?.fullname || user.fullname || "User",
        avatar: profileData?.profileimage || null, 
      });
    }
  }, [user, syncProfile.fullname, setProfile]);

  const displayName = syncProfile.fullname || 
    (user?.roleid === 2 ? user?.lawyer_profile?.fullname : user?.customer_profile?.fullname) || 
    user?.fullname || "User";

  const rawAvatar = syncProfile.avatar || 
    (user?.roleid === 2 ? user?.lawyer_profile?.profileimage : user?.customer_profile?.profileimage);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await axiosClient.post("/logout");
    },
    onSettled: async () => {
      setIsDropdownOpen(false);
      setIsMobileMenuOpen(false);
      queryClient.removeQueries();
      queryClient.clear();
      localStorage.removeItem("CLIENT_ACCESS_TOKEN");
      localStorage.removeItem("USER_INFO");
      localStorage.removeItem("CLIENT_ROLEID");
      if (axiosClient.defaults.headers.common) {
        delete axiosClient.defaults.headers.common["Authorization"];
      }
      await logout?.();
      navigate("/login", { replace: true });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className='header'>
      <div className='header-container'>
        <button className='mobile-menu-btn' onClick={() => setIsMobileMenuOpen((prev) => !prev)}>
          <FaBars size={24} />
        </button>

        <Link to='/' className='logo'>
          <Scale style={{ marginRight: "8px" }} /> LegalEase
        </Link>

        <nav className='nav desktop-nav'>
          <Link to='/' className='nav-link'>
            Home
          </Link>
          <Link to='/lawyers' className='nav-link'>
            Find Lawyers
          </Link>
          <Link to='/support' className='nav-link'>
            Q&A Knowledge
          </Link>
          <Link to='/about' className='nav-link'>
            About Us
          </Link>
        </nav>

        <div className='auth-area'>
          {user?.userid ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Notification />

              <div className='user-dropdown' ref={dropdownRef}>
                <button className='user-trigger' onClick={() => setIsDropdownOpen((prev) => !prev)}>
                  <div className='avatar'>
                    <SafeImage
                      src={rawAvatar}
                      type={user.roleid === 2 ? "lawyer" : "customer"}
                      className="avatar-img"
                      alt="Avatar"
                    />
                  </div>
                  <span className='username'>{displayName}</span>
                  <span className='caret'>{isDropdownOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}</span>
                </button>

                {isDropdownOpen && (
                  <div className='dropdown-menu'>
                    {user.roleid === 2 && (
                      <>
                        <Link to='/lawyer/dashboard' className='dropdown-item'>
                          <FaTachometerAlt className='menu-icon' /> Lawyer Dashboard
                        </Link>
                        {user.lawyer_profile?.ispro !== 1 && (
                          <Link to='/lawyer/subscription' className='dropdown-item' style={{ color: "#d97706", fontWeight: "bold" }}>
                            <FaGem className='menu-icon' /> Upgrade to Pro
                          </Link>
                        )}
                      </>
                    )}

                    {user.roleid === 3 && (
                      <>
                        <Link to='/customer/profile' className='dropdown-item'>
                          <FaUserCog className='menu-icon' /> Profile Settings
                        </Link>
                        <Link to='/customer/appointments' className='dropdown-item'>
                          <FaCalendarCheck className='menu-icon' /> My Appointments
                        </Link>
                        <Link to='/support' className='dropdown-item'>
                          <FaQuestionCircle className='menu-icon' /> Asked questions
                        </Link>
                      </>
                    )}

                    <div className='divider' />
                    <button className='logout-btn' onClick={handleLogout} disabled={logoutMutation.isPending}>
                      <FaSignOutAlt className='menu-icon' />
                      {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='guest-actions'>
              <Link to='/login' className='login-link'>
                Login
              </Link>
              <Link to='/register' className='signup-btn'>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* --- MENU MOBILE --- */}
      {isMobileMenuOpen && (
        <nav className='mobile-nav'>
          <Link to='/' onClick={() => setIsMobileMenuOpen(false)}>
            Home
          </Link>
          <Link to='/lawyers' onClick={() => setIsMobileMenuOpen(false)}>
            Find Lawyers
          </Link>
          <Link to='/support' onClick={() => setIsMobileMenuOpen(false)}>
            Q&A Knowledge
          </Link>

          {user?.userid ? (
            <>
              <div className='mobile-divider' />
              <div className='mobile-user'>
                <div className='mobile-avatar'>
                  <SafeImage
                    src={rawAvatar}
                    type={user.roleid === 2 ? "lawyer" : "customer"}
                    className="avatar-img-mobile"
                    alt="Avatar"
                  />
                </div>
                <div className='mobile-name'>{displayName}</div>
              </div>

              {user.roleid === 3 && (
                <>
                  <Link to='/customer/profile' onClick={() => setIsMobileMenuOpen(false)}>
                    Profile Settings
                  </Link>
                  <Link to='/customer/appointments' onClick={() => setIsMobileMenuOpen(false)}>
                    My Appointments
                  </Link>
                  <Link to='/support' onClick={() => setIsMobileMenuOpen(false)}>
                    Asked questions
                  </Link>
                </>
              )}

              {user.roleid === 2 && (
                <Link to='/lawyer/dashboard' onClick={() => setIsMobileMenuOpen(false)}>
                  Lawyer Dashboard
                </Link>
              )}

              <button className='mobile-logout' onClick={handleLogout} disabled={logoutMutation.isPending}>
                <FaSignOutAlt style={{ marginRight: "8px" }} />
                {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
              </button>
            </>
          ) : (
            <>
              <div className='mobile-divider' />
              <Link to='/login' onClick={() => setIsMobileMenuOpen(false)}>
                Login
              </Link>
              <Link to='/register' className='mobile-signup' onClick={() => setIsMobileMenuOpen(false)}>
                Sign Up Free
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
