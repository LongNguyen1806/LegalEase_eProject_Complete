import { useEffect, useState } from "react";
import axiosClient from "../../api/apiAxios";
import "../../assets/styles/admin/SystemLogs.css";

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/admin/logs");
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (actionContent) => {
    if (!actionContent) return "";
    if (actionContent.includes("Deleted")) return "danger";
    if (actionContent.includes("Approved") || actionContent.includes("Created")) return "success";
    if (actionContent.includes("Rejected") || actionContent.includes("Deactivated")) return "warning";
    return "";
  };

  return (
    <div className='system-logs'>
      <div className='logs-header'>
        <h1>📜 System Logs (Audit Logs)</h1>
        <button className='btn-refresh' onClick={fetchLogs}>
          Refresh
        </button>
      </div>

      <p className='logs-desc'>Displaying the 50 most recent actions performed by administrators.</p>

      {loading ? (
        <p className='logs-loading'>Loading data...</p>
      ) : (
        <div className='logs-table-card'>
          <div className='logs-table-wrapper'>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Performed By (Admin)</th>
                  <th>Action</th>
                  <th className='center'>Log ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <tr key={log.logid} className={index % 2 === 0 ? "even" : "odd"}>
                      <td>{new Date(log.timestamp).toLocaleString("EN-US")}</td>
                      <td className='admin-email'>{log.admin ? log.admin.email : `Admin ID: ${log.adminid}`}</td>
                      <td className={`log-action ${getActionColor(log.action)}`}>{log.action}</td>
                      <td className='center muted'>#{log.logid}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='4' className='empty'>
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
