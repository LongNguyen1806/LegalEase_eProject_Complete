import { createContext, useState, useEffect } from "react";
import axiosClient, { DOMAIN } from "../api/apiAxios";
import { useProfileStore } from "../store/useProfileStore";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setProfile = useProfileStore((state) => state.setProfile);
  const clearProfile = useProfileStore((state) => state.clearProfile);

  const formatAvatarUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${DOMAIN}/storage/${path}`;
  };

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem("CLIENT_ACCESS_TOKEN");
      const userInfo = localStorage.getItem("USER_INFO");

      if (token && userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);

          setProfile({
            fullname: parsedUser.fullname || "",
            avatar: formatAvatarUrl(parsedUser.avatar),
          });

          axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.error("Authentication data error:", error);
          localStorage.clear();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [setProfile]);

  const login = (userData, token) => {
    localStorage.setItem("CLIENT_ACCESS_TOKEN", token);
    localStorage.setItem("USER_INFO", JSON.stringify(userData));

    axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(userData);

    setProfile({
      fullname: userData.fullname || "",
      avatar: formatAvatarUrl(userData.avatar),
    });
  };

  const logout = () => {
    localStorage.removeItem("CLIENT_ACCESS_TOKEN");
    localStorage.removeItem("USER_INFO");

    delete axiosClient.defaults.headers.common["Authorization"];

    setUser(null);
    clearProfile();
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{!loading && children}</AuthContext.Provider>;
};
