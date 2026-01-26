import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useLayoutEffect, lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from 'sonner';
import "./assets/styles/global.css";
const AdminLayout = lazy(() => import("./layouts/layout_admin/AdminLayout"));
const MainLayout = lazy(() => import("./layouts/layout_client/MainLayout"));
const LawyerLayout = lazy(() => import("./layouts/layout_client/LawyerLayout"));

const LoginAdmin = lazy(() => import("./pages/admin/LoginAdmin")); 
const Dashboard = lazy(() => import("./pages/admin/Dashboard")); 
const UserManagement = lazy(() => import("./pages/admin/UserManagement")); 
const UserDetail = lazy(() => import("./pages/admin/UserDetail")); 
const Verification = lazy(() => import("./pages/admin/Verification"));
const ContentCMS = lazy(() => import("./pages/admin/ContentCMS")); 
const QAManagement = lazy(() => import("./pages/admin/QAManagement")); 
const SystemLogs = lazy(() => import("./pages/admin/SystemLogs")); 
const RevenueManagement = lazy(() => import("./pages/admin/RevenueManagement")); 
const AdminAppointments = lazy(() => import("./pages/admin/AppointmentManager"));

const HomePage = lazy(() => import("./pages/public/HomePage"));
const LawyerDetail = lazy(() => import("./pages/public/LawyerDetail")); 
const WriteReview = lazy(() => import("./pages/public/WriteReview"));
const LawyerList = lazy(() => import("./pages/public/LawyerList")); 
const LoginClient = lazy(() => import("./pages/public/LoginClient")); 
const Register = lazy(() => import("./pages/public/Register")); 
const SupportCenter = lazy(() => import("./pages/public/SupportCenter")); 
const LawyerRegister = lazy(() => import("./pages/public/LawyerRegister")); 
const NewsDetail = lazy(() => import("./pages/public/NewsDetail")); 
const ContactSupport = lazy(() => import("./pages/public/ContactSupport"));
const AboutUs = lazy(() => import("./pages/public/AboutUs"));
const DynamicContentDetail = lazy(() => import("./pages/public/DynamicContentDetail"));
const SitemapPage = lazy(() => import("./pages/public/SitemapPage"));

const LawyerDashboard = lazy(() => import("./pages/Lawyer/LawyerDashboard")); 
const LawyerSchedule = lazy(() => import("./pages/Lawyer/LawyerSchedule")); 
const LawyerAppointments = lazy(() => import("./pages/Lawyer/LawyerAppointments")); 
const AppointmentDetail = lazy(() => import("./pages/Lawyer/AppointmentDetail")); 
const LawyerProfile = lazy(() => import("./pages/Lawyer/LawyerProfile")); 
const SubscriptionPlans = lazy(() => import("./pages/Lawyer/SubscriptionPlans")); 
const LawyerQA = lazy(() => import("./pages/Lawyer/LawyerQA")); 

const BookingPage = lazy(() => import("./pages/customer/BookingPage")); 
const PaymentGateway = lazy(() => import("./pages/customer/PaymentGateway")); 
const CustomerAppointments = lazy(() => import("./pages/customer/CustomerAppointments")); 
const MyAppointments = lazy(() => import("./pages/customer/MyAppointments")); 
const ProfileSetting = lazy(() => import("./pages/customer/ProfileSetting")); 

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem("ADMIN_ACCESS_TOKEN");
  if (!token) return <Navigate to='/admin/login' replace />;
  return children;
};

const PageLoader = () => <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>;

function App() {
  return (
    
    <AuthProvider>
      <Toaster 
        position="top-right" 
        duration={2000}
        richColors 
        expand={false} 
        closeButton 
      />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path='/' element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path='login' element={<LoginClient />} />
              <Route path='register' element={<Register />} />
              <Route path='register-lawyer' element={<LawyerRegister />} />
              <Route path='lawyers' element={<LawyerList />} />
              <Route path='lawyers/:id' element={<LawyerDetail />} />
              <Route path='/news/:id' element={<NewsDetail />} />
              <Route path='booking/:lawyerId' element={<BookingPage />} />
              <Route path='payment/checkout' element={<PaymentGateway />} />
              <Route path='customer/appointments' element={<CustomerAppointments />} />
              <Route path='customer/my-appointments/:id' element={<MyAppointments />} />
              <Route path='customer/profile' element={<ProfileSetting />} />
              <Route path='lawyers/:id/review' element={<WriteReview />} />
              <Route path='about' element={<AboutUs />} />
              <Route path='contact' element={<ContactSupport />} />
              <Route path='support' element={<SupportCenter />} />
              <Route path="/contents/:id" element={<DynamicContentDetail />} />
              <Route path='sitemap' element={<SitemapPage />} />
            </Route>

            <Route path='/lawyer' element={<LawyerLayout />}>
              <Route index element={<Navigate to='dashboard' />} />
              <Route path='dashboard' element={<LawyerDashboard />} />
              <Route path='schedule' element={<LawyerSchedule />} />
              <Route path='appointments' element={<LawyerAppointments />} />
              <Route path='appointments/:id' element={<AppointmentDetail />} />
              <Route path='qa' element={<LawyerQA />} />
              <Route path='profile' element={<LawyerProfile />} />
              <Route path='subscription' element={<SubscriptionPlans />} />
            </Route>
            <Route path='/admin/login' element={<LoginAdmin />} />
            <Route
              path='/admin'
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }>
              <Route index element={<Navigate to='dashboard' />} />
              <Route path='dashboard' element={<Dashboard />} />
              <Route path='users' element={<UserManagement />} />
              <Route path='users/:id' element={<UserDetail />} />
              <Route path='verifications' element={<Verification />} />
              <Route path='content' element={<ContentCMS />} />
              <Route path='qa' element={<QAManagement />} />
              <Route path='logs' element={<SystemLogs />} />
              <Route path='revenue' element={<RevenueManagement />} />
              <Route path='appointments' element={<AdminAppointments />} />
            </Route>
            <Route path='*' element={<Navigate to='/' />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
