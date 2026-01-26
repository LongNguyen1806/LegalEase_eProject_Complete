import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TbBell } from "react-icons/tb";
import { formatDateTime } from "../../utils/dateUtils";
import { useNotificationStore } from "../../store/useNotificationStore";
import "./Notification.css";

export default function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pollingRef = useRef(null);
  const navigate = useNavigate();

  const { notifications, unreadCount, isLoading, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  const startPolling = () => {
    if (!pollingRef.current) {
      fetchUnreadCount();
      pollingRef.current = setInterval(() => {
        fetchUnreadCount();
      }, 15000);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleItemClick = (item) => {
    if (Number(item.isread) === 0) {
      markAsRead(item.notifid);
    }

    if (item.linkurl && item.linkurl.trim() !== "") {
      navigate(item.linkurl);
      setIsOpen(false);
    }
  };

  return (
    <div className='notif-wrapper' ref={dropdownRef}>
      <div className='notif-bell' onClick={toggleDropdown}>
        <TbBell size={30} className='bell-icon' />
        {unreadCount > 0 && <span className='notif-badge'>{unreadCount}</span>}
      </div>

      {isOpen && (
        <div className='notif-dropdown'>
          <div className='notif-header'>
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button
                className='mark-all-btn'
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}>
                Mark all as read
              </button>
            )}
          </div>

          <div className='notif-list'>
            {isLoading && notifications.length === 0 ? (
              <div className='notif-loading'>Loading...</div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.notifid}
                  className={`notif-item ${Number(item.isread) === 0 ? "unread" : ""} ${item.linkurl && item.linkurl.trim() !== "" ? "is-link" : ""}`}
                  onClick={() => handleItemClick(item)}>
                  <span className='notif-message'>{item.message}</span>
                  <span className='notif-time'>{formatDateTime(item.sentat)}</span>
                </div>
              ))
            ) : (
              <div className='notif-empty'>No new notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
