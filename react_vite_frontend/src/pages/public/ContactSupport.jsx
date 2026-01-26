import React from 'react';
import styles from '../../assets/styles/client/StylePublic/ContactSupport.module.css';
import { FiPhone, FiMail, FiMapPin, FiSend } from 'react-icons/fi';

export default function ContactSupport() {
  return (
    <div className={styles.contactPage}>
      <div className={styles.topHeader}>
        <h1>Get In Touch</h1>
        <p>
          We're here to help you with any legal technology needs. 
          Reach out to us and we'll respond as soon as possible.
        </p>
      </div>

      <div className={styles.contactCard}>
        <div className={styles.infoSide}>
          <div className={styles.infoContent}>
            <h2>Contact Information</h2>
            <p className={styles.infoSubtitle}>
              LegalEase support team is available to assist you with account and booking issues.
            </p>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <FiPhone className={styles.icon} />
                <div>
                  <span>+84 123 456 789</span>
                  <span>+84 987 654 321</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <FiMail className={styles.icon} />
                <span>support@legalease.vn</span>
              </div>

              <div className={styles.infoItem}>
                <FiMapPin className={styles.icon} />
                <span>Ho Chi Minh City, Vietnam</span>
              </div>
            </div>
          </div>
          <div className={styles.circleDecor}></div>
        </div>
        <div className={styles.formSide}>
          <form className={styles.supportForm} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Your Name</label>
                <input type="text" placeholder="LegalEase User" />
              </div>
              <div className={styles.formGroup}>
                <label>Your Email</label>
                <input type="email" placeholder="hello@legalease.com" />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Your Subject</label>
              <input type="text" placeholder="How can we help you?" />
            </div>

            <div className={styles.formGroup}>
              <label>Message</label>
              <textarea rows="4" placeholder="Write here your message..."></textarea>
            </div>

            <button type="submit" className={styles.sendBtn}>
              Send Message <FiSend style={{ marginLeft: '8px' }} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}