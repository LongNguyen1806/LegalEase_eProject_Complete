import React from "react";
import styles from "../../assets/styles/client/StylePublic/AboutUs.module.css";
import { Users, Briefcase, Newspaper, ShieldCheck, Zap, Lock, Clock, CheckCircle, Calendar } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import heroOffice from "../../assets/images/aboutus1.png";
import gavelImg from "../../assets/images/aboutus2.png";
import laptopImg from "../../assets/images/aboutus3.png";

export default function AboutUs() {
  const handleExploreClick = () => {
    window.scrollTo({ top: 800, behavior: "smooth" });
  };

  return (
    <div className={styles.aboutContainer}>
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1>LegalEase — Elevating the Digital Legal Service Experience.</h1>
            <p>A centralized platform helping you find the right legal experts, view verified profiles, and book appointments in seconds.</p>
            <button className={styles.btnWhite} onClick={handleExploreClick}>
              Explore Now
            </button>
          </div>
          <div className={styles.heroImageWrapper}>
            <img src={heroOffice} alt='LegalEase Office' className={styles.heroImage} />
          </div>
        </div>
      </section>

      <section className={styles.introSection}>
        <div className={styles.centeredContent}>
          <h2>Why was LegalEase born?</h2>
          <p>
            In the digital age, finding a lawyer who matches your needs and schedule still faces many obstacles. Traditional methods are often time-consuming and
            inefficient. LegalEase was built as a comprehensive technology solution to connect clients and legal professionals with maximum transparency.
          </p>
        </div>
      </section>

      <section className={styles.sectionPadding}>
        <h2 className={styles.sectionTitle}>Key Features</h2>
        <div className={styles.cardGrid}>
          <div className={styles.featureCard}>
            <div className={styles.iconCircle}>
              <Users size={32} />
            </div>
            <h3>For Clients</h3>
            <ul className={styles.featureList}>
              <li>
                <CheckCircle size={16} /> Search by location and expertise
              </li>
              <li>
                <Calendar size={16} /> 24/7 Online booking
              </li>
            </ul>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconCircle}>
              <Briefcase size={32} />
            </div>
            <h3>For Lawyers</h3>
            <ul className={styles.featureList}>
              <li>
                <CheckCircle size={16} /> Smart schedule management
              </li>
              <li>
                <CheckCircle size={16} /> Profile verification and client reach
              </li>
            </ul>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconCircle}>
              <Newspaper size={32} />
            </div>
            <h3>System</h3>
            <ul className={styles.featureList}>
              <li>
                <CheckCircle size={16} /> Legal news updates and community alerts
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CORE VALUES - Ensuring Trust and Security */}
      <section className={styles.sectionPadding}>
        <h2 className={styles.sectionTitle}>Core Values</h2>
        <div className={styles.cardGrid}>
          <div className={styles.valueCard}>
            <div className={styles.valueIconBg}>
              <ShieldCheck size={30} />
            </div>
            <h3>Verified & Trusted</h3>
            <p>Lawyer profiles are strictly moderated by administrators to ensure integrity.</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIconBg}>
              <Zap size={30} />
            </div>
            <h3>Superior Performance</h3>
            <p>Powerful system operation with fast loading speeds and smooth workflows.</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIconBg}>
              <Lock size={30} />
            </div>
            <h3>Absolute Security</h3>
            <p>Applying secure authentication measures to protect data privacy.</p>
          </div>
        </div>
      </section>

      <section className={styles.statsBar}>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <strong>100+</strong>
            <span>Verified Professional Lawyers</span>
          </div>
          <div className={styles.statBox}>
            <strong>1000+</strong>
            <span>Successful Appointments</span>
          </div>
          <div className={styles.statBox}>
            <strong>20+</strong>
            <span>Legal Specializations Supported</span>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statFlex}>
              <Clock size={32} /> <strong>24/7</strong>
            </div>
            <span>System Always Available</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionPadding}>
        <div className={styles.imagePairGrid}>
          <img src={gavelImg} alt='Justice Gavel' className={styles.sideImage} />
          <img src={laptopImg} alt='Legal Technology' className={styles.sideImage} />
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2>Ready to experience it?</h2>
        <p>Let LegalEase help you connect with the right lawyer today.</p>
        <Link to='/'>
          <button className={styles.btnBlue}>Get Started Now</button>
        </Link>
      </section>
    </div>
  );
}
