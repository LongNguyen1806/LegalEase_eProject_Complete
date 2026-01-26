import React from "react";
import styles from "../../assets/styles/client/StylePublic/Sitemap.module.css";

export default function SitemapPage() {
  const sitemapSections = [
    {
      title: "Public & General Access",
      links: [
        { name: "Home", url: "/", description: "Main landing page and quick lawyer search" },
        { name: "Lawyer Directory", url: "/lawyers", description: "Search for lawyers by specialization and location" },
        { name: "Lawyer Details", url: "/lawyers/2", description: "View professional profiles, credentials, and reviews" },
        { name: "Customer Registration", url: "/register", description: "Create a new account for clients seeking legal advice" },
        { name: "Lawyer Registration", url: "/register-lawyer", description: "Dedicated registration for legal professionals" },
        { name: "Client Login", url: "/login", description: "Secure access for customers and lawyers" },
      ],
    },
    {
      title: "For Customers (Need Login)",
      links: [
        { name: "Book an Appointment", url: "/booking/:lawyerId", description: "Select date and time for legal consultation" },
        { name: "Payment Gateway", url: "/payment/checkout", description: "Secure portal for booking service fees" },
        { name: "My Appointments", url: "/customer/appointments", description: "Manage and track all scheduled consultations" },
        { name: "Appointment Details", url: "/customer/my-appointments/:id", description: "View specific status and meeting information" },
        { name: "Profile Settings", url: "/customer/profile", description: "Manage personal details and account preferences" },
        { name: "Write a Review", url: "/lawyers/1/review", description: "Provide feedback on lawyer services and expertise" },
      ],
    },
    {
      title: "Lawyer Portal",
      links: [
        { name: "Dashboard", url: "/lawyer/dashboard", description: "Overview of work activities and personal analytics" },
        { name: "Schedule Management", url: "/lawyer/schedule", description: "Define and manage availability time slots" },
        { name: "Appointment Management", url: "/lawyer/appointments", description: "View and confirm incoming client requests" },
        { name: "Q&A Knowledge Base", url: "/lawyer/qa", description: "Respond to legal inquiries from the community" },
        { name: "Professional Profile", url: "/lawyer/profile", description: "Update professional experience and location details" },
        { name: "Subscription Plans", url: "/lawyer/subscription", description: "Manage membership levels and Pro account status" },
      ],
    },
    {
      title: "System Administration (Admin)",
      links: [
        { name: "Admin Login", url: "/admin/login", description: "Secure access for system administrators" },
        { name: "Admin Dashboard", url: "/admin/dashboard", description: "High-level statistics of system-wide activity" },
        { name: "User Management", url: "/admin/users", description: "Monitor and update lawyer and customer records" },
        { name: "Lawyer Verification", url: "/admin/verifications", description: "Approve or reject new lawyer registrations" },
        { name: "Content Management (CMS)", url: "/admin/content", description: "Edit news, FAQs, and homepage notifications" },
        { name: "Appointment Oversight", url: "/admin/appointments", description: "Monitor all bookings, cancellations, and reschedules" },
        { name: "Revenue & Analytics", url: "/admin/revenue", description: "Track system cash flow and commission reports" },
        { name: "System Logs", url: "/admin/logs", description: "Audit security logs and administrative actions" },
      ],
    },
    {
      title: "Information & Support",
      links: [
        { name: "About LegalEase", url: "/about", description: "Company mission and team background" },
        { name: "Support Center", url: "/support", description: "FAQs and platform usage guides" },
        { name: "Contact Us", url: "/contact", description: "Direct support requests for technical assistance" },
        { name: "Legal News & Insights", url: "/news/3", description: "Updates on the latest legal regulations and community news" },
      ],
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleGroup}>
            <h1 className={styles.mainTitle}>LegalEase Sitemap</h1>
            <span className={styles.subTitle}>Application Flow Structure </span>
          </div>
          <p className={styles.description}>
            This diagram illustrates all functions for Administrators, Lawyers, and Customers to ensure transparency and easy navigation within the LegalEase system.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {sitemapSections.map((section, index) => (
            <section key={index} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              </div>

              <div className={styles.linkList}>
                {section.links.map((link, linkIndex) => (
                  <div key={linkIndex} className={styles.linkItem}>
                    <div className={styles.linkRow}>
                      <div className={styles.linkInfo}>
                        <a href={link.url} className={styles.anchor}>
                          {link.name}
                        </a>
                        <p className={styles.linkDesc}>{link.description}</p>
                      </div>
                      <code className={styles.urlTag}>{link.url}</code>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className={styles.statsBox}>
          <div className={styles.statsContent}>
            <div className={styles.statsText}>
              <h3>System Status</h3>
              <p>Data is structured according to LegalEase's business orientation.</p>
            </div>
            <div className={styles.statsNumbers}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{sitemapSections.length}</div>
                <div className={styles.statLabel}>Modules</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{sitemapSections.reduce((acc, s) => acc + s.links.length, 0)}</div>
                <div className={styles.statLabel}>Links</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
