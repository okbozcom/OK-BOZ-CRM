
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/admin/Dashboard';
import BranchForm from './components/BranchForm';
import StaffList from './pages/admin/StaffList';
import Payroll from './pages/admin/Payroll';
import Settings from './pages/admin/Settings';
import Subscription from './pages/admin/Subscription';
import Expenses from './pages/admin/Expenses';
import LiveTracking from './pages/admin/LiveTracking';
import VendorAttachment from './pages/admin/VendorAttachment';
import Corporate from './pages/admin/Corporate';
import Documents from './pages/Documents';
import Leads from './pages/admin/Leads';
import Reception from './pages/admin/Reception';
import Transport from './pages/admin/Transport'; // Added Transport Import
import GenAITools from './pages/admin/GenAITools'; 
import UserAttendance from './pages/user/UserAttendance';
import UserSalary from './pages/user/UserSalary';
import ApplyLeave from './pages/user/ApplyLeave';
import UserProfile from './pages/user/UserProfile'; // Import UserProfile
import TaskManagement from './pages/TaskManagement';
import AiAssistant from './components/AiAssistant';
import EmailMarketing from './pages/admin/EmailMarketing'; // New Import
import { UserRole } from './types';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';

const App: React.FC = () => {
  // Initialize state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('app_session_id') && !!localStorage.getItem('user_role');
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('user_role');
    if (savedRole && Object.values(UserRole).includes(savedRole as UserRole)) {
      return savedRole as UserRole;
    }
    return UserRole.ADMIN; // Default if not found or invalid
  });

  // Handle Login - this function is called by Login.tsx AFTER it sets local storage
  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(UserRole.ADMIN); // Reset default
    localStorage.removeItem('app_session_id'); // Clear session ID
    localStorage.removeItem('user_role'); // Clear user role
  };

  // Determine home path based on role
  const homePath = userRole === UserRole.EMPLOYEE ? '/user' : '/admin';

  // AI Assistant for HR context (global floating assistant)
  const hrAssistantSystemInstruction = `You are an expert HR assistant for a small business staff management platform called OK BOZ. 
  Your goal is to help the admin or employee with questions about labor laws in India, leave policies, or drafting announcements.
  Keep answers concise, professional, and helpful.`;
  const hrAssistantInitialMessage = 'Hi! I am your OK BOZ HR Assistant. Ask me about leave policies, labor laws, or how to manage your staff.';


  return (
    <ThemeProvider>
      <BrandingProvider>
        <HashRouter>
          {!isAuthenticated ? (
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <Layout role={userRole} onLogout={handleLogout}>
              <Routes>
                {/* Redirect root to appropriate home */}
                <Route path="/" element={<Navigate to={homePath} replace />} />

                {/* Admin Routes (Shared with Corporate) */}
                {(userRole === UserRole.ADMIN || userRole === UserRole.CORPORATE) && (
                  <>
                    <Route path="/admin" element={<Dashboard />} />
                    <Route path="/admin/marketing" element={<EmailMarketing />} />
                    <Route path="/admin/reception" element={<Reception />} />
                    <Route path="/admin/transport" element={<Transport />} /> {/* Added Transport Route */}
                    <Route path="/admin/tracking" element={<LiveTracking />} />
                    <Route path="/admin/leads" element={<Leads />} />
                    <Route path="/admin/gen-ai-tools" element={<GenAITools />} /> 
                    <Route path="/admin/tasks" element={<TaskManagement role={userRole} />} />
                    <Route path="/admin/attendance" element={<UserAttendance isAdmin={true} />} />
                    <Route path="/admin/branches" element={<BranchForm />} />
                    <Route path="/admin/staff" element={<StaffList />} />
                    <Route path="/admin/documents" element={<Documents role={userRole} />} />
                    <Route path="/admin/vendors" element={<VendorAttachment />} />
                    <Route path="/admin/payroll" element={<Payroll />} />
                    <Route path="/admin/expenses" element={<Expenses />} />
                    <Route path="/admin/subscription" element={<Subscription />} />
                    <Route path="/admin/settings" element={<Settings />} />
                    {/* Corporate Management - Only Super Admin */}
                    {userRole === UserRole.ADMIN && (
                       <Route path="/admin/corporate" element={<Corporate />} />
                    )}
                    <Route path="/admin/*" element={<div className="p-8 text-center text-gray-500">Page under construction</div>} />
                  </>
                )}

                {/* User Routes */}
                {userRole === UserRole.EMPLOYEE && (
                  <>
                    <Route path="/user" element={<UserAttendance />} />
                    <Route path="/user/tasks" element={<TaskManagement role={UserRole.EMPLOYEE} />} />
                    <Route path="/user/transport" element={<Transport />} />
                    <Route path="/user/reception" element={<Reception />} />
                    <Route path="/user/vendors" element={<VendorAttachment />} />
                    {/* GenAI Tools removed for employees */}
                    <Route path="/user/salary" element={<UserSalary />} />
                    <Route path="/user/documents" element={<Documents role={UserRole.EMPLOYEE} />} />
                    <Route path="/user/apply-leave" element={<ApplyLeave />} />
                    <Route path="/user/profile" element={<UserProfile />} />
                    <Route path="/user/*" element={<div className="p-8 text-center text-gray-500">Page under construction</div>} />
                  </>
                )}

                {/* Catch all redirect */}
                <Route path="*" element={<Navigate to={homePath} replace />} />
              </Routes>
            </Layout>
          )}
          
          {/* AI Assistant is available for both roles when authenticated */}
          {isAuthenticated && 
            <AiAssistant 
              systemInstruction={hrAssistantSystemInstruction} 
              initialMessage={hrAssistantInitialMessage} 
              triggerButtonLabel="Ask HR AI" 
            />
          }
        </HashRouter>
      </BrandingProvider>
    </ThemeProvider>
  );
};

export default App;
