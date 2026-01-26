import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/apiAxios";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaYoutube } from "react-icons/fa";

export default function Footer() {
  const [locations, setLocations] = useState([]);
  const [specializations, setSpecializations] = useState([]);

  useEffect(() => {
    axiosClient
      .get("/master-data")
      .then((res) => {
        if (res.data.success) {
          setLocations(res.data.data.locations.slice(0, 5));
          setSpecializations(res.data.data.specializations.slice(0, 6));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <footer
      style={{
        backgroundColor: "#1f2937",
        color: "#d1d5db",
        padding: "60px 0 0",
        fontSize: "14px",
      }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "40px",
            marginBottom: "40px",
          }}>
          <div>
            <h3 style={{ color: "white", fontSize: "16px", fontWeight: "bold", marginBottom: "20px" }}>Quick Access</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/lawyers' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  Find Top Lawyers
                </Link>
              </li>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/support' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  Legal Q&A & Consultation
                </Link>
              </li>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/login' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  Client Login
                </Link>
              </li>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/register-lawyer' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  For Lawyers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: "white", fontSize: "16px", fontWeight: "bold", marginBottom: "20px" }}>Supported Locations</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {locations.length > 0 ? (
                locations.map((loc) => (
                  <li key={loc.locid} style={{ marginBottom: "10px" }}>
                    {" "}
                    <Link to={`/lawyers?location=${loc.locid}`} style={{ textDecoration: "none", color: "#9ca3af" }}>
                      Lawyers in {loc.cityname}
                    </Link>
                  </li>
                ))
              ) : (
                <li style={{ color: "#6b7280" }}>Loading locations...</li>
              )}
            </ul>
          </div>

          <div>
            <h3 style={{ color: "white", fontSize: "16px", fontWeight: "bold", marginBottom: "20px" }}>Practice Areas</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {specializations.length > 0 ? (
                specializations.map((spec) => (
                  <li key={spec.specid} style={{ marginBottom: "10px" }}>
                    {" "}
                    <Link to={`/lawyers?spec=${spec.specid}`} style={{ textDecoration: "none", color: "#9ca3af" }}>
                      {spec.specname} Lawyers
                    </Link>
                  </li>
                ))
              ) : (
                <li style={{ color: "#6b7280" }}>Loading areas...</li>
              )}
            </ul>
          </div>

          <div>
            <h3 style={{ color: "white", fontSize: "16px", fontWeight: "bold", marginBottom: "20px" }}>About LegalEase</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/about' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  About LegalEase
                </Link>
              </li>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/careers' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  Careers
                </Link>
              </li>
              <li style={{ marginBottom: "10px" }}>
                <Link to='/contact' style={{ textDecoration: "none", color: "#9ca3af" }}>
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
          <Link
            to='/sitemap'
            style={{
              textDecoration: "none",
              color: "#9ca3af",
              border: "1px solid #4b5563",
              padding: "8px 24px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "1px",
              transition: "all 0.3s ease",
              backgroundColor: "transparent",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "white";
              e.target.style.borderColor = "white";
              e.target.style.backgroundColor = "#374151";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#9ca3af";
              e.target.style.borderColor = "#4b5563";
              e.target.style.backgroundColor = "transparent";
            }}>
            View Sitemap
          </Link>
        </div>
        <div
          style={{
            borderTop: "1px solid #374151",
            padding: "30px 0",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <Link to='/contents/4' style={{ textDecoration: "none", color: "#9ca3af", fontSize: "13px" }}>
              Terms of Service
            </Link>
            <Link to='/contents/5' style={{ textDecoration: "none", color: "#9ca3af", fontSize: "13px" }}>
              Privacy Policy
            </Link>
            <Link to='/contents/6' style={{ textDecoration: "none", color: "#9ca3af", fontSize: "13px" }}>
              Cookie Policy
            </Link>
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <a href='#' style={{ color: "#9ca3af", fontSize: "18px" }}>
              <FaFacebookF />
            </a>
            <a href='#' style={{ color: "#9ca3af", fontSize: "18px" }}>
              <FaTwitter />
            </a>
            <a href='#' style={{ color: "#9ca3af", fontSize: "18px" }}>
              <FaLinkedinIn />
            </a>
            <a href='#' style={{ color: "#9ca3af", fontSize: "18px" }}>
              <FaYoutube />
            </a>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            paddingBottom: "30px",
            color: "#6b7280",
            fontSize: "12px",
          }}>
          © 2026 LegalEase Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
