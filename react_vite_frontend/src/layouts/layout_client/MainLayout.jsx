import { Outlet } from "react-router-dom";
import ChatWidget from "../../components/Chatbot/ChatWidget";

import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
export default function MainLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
