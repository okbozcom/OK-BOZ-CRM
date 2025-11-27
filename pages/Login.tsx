
import React, { useState } from 'react';
import { UserRole, CorporateAccount, Employee } from '../types';
import { Shield, User, Lock, Mail, ArrowRight, CheckCircle, ChevronLeft, Building2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { MOCK_EMPLOYEES } from '../constants'; // Import MOCK_EMPLOYEES

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { companyName, logoUrl, primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState<'admin' | 'corporate' | 'employee'>('admin');
  const [view, setView] = useState<'login' | 'forgot_password'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (activeTab === 'admin') {
        // Check for stored admin password or use default
        const storedAdminPass = localStorage.getItem('admin_password') || 'admin123';
        
        if (email.toLowerCase() === 'okboz.com@gmail.com' && password === storedAdminPass) {
          localStorage.setItem('app_session_id', 'admin'); // Identify as Super Admin
          localStorage.setItem('user_role', UserRole.ADMIN);
          onLogin(UserRole.ADMIN);
        } else {
          setError('Invalid Admin credentials.');
          setIsLoading(false);
        }
      } else if (activeTab === 'corporate') {
        // Validate against created corporate accounts
        const savedAccounts = localStorage.getItem('corporate_accounts');
        const accounts: CorporateAccount[] = savedAccounts ? JSON.parse(savedAccounts) : [];
        
        const account = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password && acc.status === 'Active');
        
        if (account) {
           localStorage.setItem('app_session_id', account.email); // Identify as Corporate User (using email as ID)
           localStorage.setItem('user_role', UserRole.CORPORATE);
           onLogin(UserRole.CORPORATE);
        } else {
           setError('Invalid Corporate credentials or inactive account.');
           setIsLoading(false);
        }
      } else { // Employee Login
        let allEmployees: Employee[] = [];

        // Aggregate employees from Admin's storage
        const adminStaff = localStorage.getItem('staff_data');
        if (adminStaff) {
            try { allEmployees = [...allEmployees, ...JSON.parse(adminStaff)]; } catch (e) {}
        } else {
            allEmployees = [...allEmployees, ...MOCK_EMPLOYEES];
        }

        // Aggregate employees from all Corporate accounts
        const corporateAccounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporateAccounts.forEach((corp: CorporateAccount) => {
            const corpStaffKey = `staff_data_${corp.email}`;
            const corpStaff = localStorage.getItem(corpStaffKey);
            if (corpStaff) {
                try { allEmployees = [...allEmployees, ...JSON.parse(corpStaff)]; } catch (e) {}
            }
        });

        const foundEmployee = allEmployees.find(emp => 
            emp.email?.toLowerCase() === email.toLowerCase() && emp.password === password
        );

        if (foundEmployee) {
            localStorage.setItem('app_session_id', foundEmployee.id); // Use employee's actual ID
            localStorage.setItem('user_role', UserRole.EMPLOYEE);
            onLogin(UserRole.EMPLOYEE);
        } else {
            setError('Invalid Employee credentials. Please check your email and password.');
            setIsLoading(false);
        }
      }
    }, 800);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        setError("Please enter your email address.");
        return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    
    // Simulate verification and sending
    setTimeout(() => {
        const emailInput = email.toLowerCase();
        let found = false;

        // 1. Check Admin
        if (emailInput === 'okboz.com@gmail.com') {
            found = true;
        }

        // 2. Check Corporate Accounts
        if (!found) {
            const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            if (accounts.some((acc: any) => acc.email.toLowerCase() === emailInput)) {
                found = true;
            }
        }

        // 3. Check Employees (Admin Staff + Mock + Corporate Staff)
        if (!found) {
            let allStaff: any[] = [];
            // Admin Staff
            try { allStaff = [...allStaff, ...JSON.parse(localStorage.getItem('staff_data') || '[]')]; } catch(e){}
            // Mock Staff
            allStaff = [...allStaff, ...MOCK_EMPLOYEES];

            // Corporate Staff
            const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            accounts.forEach((acc: any) => {
                try {
                    const s = JSON.parse(localStorage.getItem(`staff_data_${acc.email}`) || '[]');
                    allStaff = [...allStaff, ...s];
                } catch(e) {}
            });

            if (allStaff.some(emp => emp.email?.toLowerCase() === emailInput)) {
                found = true;
            }
        }

        setIsLoading(false);

        if (found) {
            setSuccessMsg(`Reset instructions sent to ${email}`);
            setTimeout(() => {
                setSuccessMsg('');
                setView('login'); // Go back to login after success
                setEmail(''); // Clear email when returning
            }, 3000);
        } else {
            setError("Email not found in our records.");
        }
    }, 1500);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{ background: `linear-gradient(135deg, ${primaryColor}, #111827)` }}
    >
      <Link to="/" className="absolute top-8 left-8 text-white/80 hover:text-white flex items-center gap-2 transition-colors z-20">
         <ChevronLeft className="w-5 h-5" /> Back to Home
      </Link>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden min-h-[600px] relative z-10">
        
        {/* Left Side - Graphic/Info */}
        <div className="hidden md:flex w-1/2 bg-gray-50 p-10 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {companyName.charAt(0)}
                </div>
              )}
              <span className="text-2xl font-bold text-gray-800 tracking-tight">{companyName}</span>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Smart Staff Management Solution
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Streamline your workforce management with AI-powered attendance, payroll automation, and seamless communication.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" style={{ color: primaryColor }} />
                <span className="text-gray-700">Real-time Attendance Tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" style={{ color: primaryColor }} />
                <span className="text-gray-700">Automated Payroll Processing</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" style={{ color: primaryColor }} />
                <span className="text-gray-700">Geofenced Field Tracking</span>
              </div>
            </div>
          </div>

          {/* Decorational Circle */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gray-200 rounded-full opacity-50 blur-3xl"></div>
          
          <div className="relative z-10 text-xs text-gray-400">
            © 2025 {companyName} Inc. All rights reserved.
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          
          {view === 'login' ? (
            <>
              <div className="mb-8 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h3>
                <p className="text-gray-500">Please sign in to continue</p>
              </div>

              {/* Tabs */}
              <div className="bg-gray-100 p-1 rounded-xl flex mb-8 overflow-x-auto">
                <button
                  onClick={() => { setActiveTab('admin'); setError(''); setShowPassword(false); }}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === 'admin' 
                      ? 'bg-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ color: activeTab === 'admin' ? primaryColor : undefined }}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
                <button
                  onClick={() => { setActiveTab('corporate'); setError(''); setShowPassword(false); }}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === 'corporate' 
                      ? 'bg-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ color: activeTab === 'corporate' ? primaryColor : undefined }}
                >
                  <Building2 className="w-4 h-4" />
                  Corporate
                </button>
                <button
                  onClick={() => { setActiveTab('employee'); setError(''); setShowPassword(false); }}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === 'employee' 
                      ? 'bg-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ color: activeTab === 'employee' ? primaryColor : undefined }}
                >
                  <User className="w-4 h-4" />
                  Employee
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                      placeholder={activeTab === 'admin' ? "okboz.com@gmail.com" : activeTab === 'corporate' ? "franchise@company.com" : "employee@okboz.com"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="button"
                    onClick={() => { setView('forgot_password'); setEmail(''); setError(''); setSuccessMsg(''); }}
                    className="text-sm font-medium text-gray-500 hover:text-gray-800 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Credentials Hint */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Demo Credentials</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors" 
                       onClick={() => {setActiveTab('admin'); setEmail('okboz.com@gmail.com'); setPassword('admin123');}}>
                    <p className="font-semibold mb-1" style={{ color: primaryColor }}>Admin</p>
                    <p className="text-gray-600 break-words">okboz.com@gmail.com</p>
                    <p className="text-gray-500 font-mono mt-1">admin123</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors"
                       onClick={() => {setActiveTab('employee'); setEmail('employee@okboz.com'); setPassword('user123');}}>
                    <p className="font-semibold text-blue-700 mb-1">Employee</p>
                    <p className="text-gray-600 break-words">employee@okboz.com</p>
                    <p className="text-gray-500 font-mono mt-1">user123</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Forgot Password View */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-8 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h3>
                  <p className="text-gray-500">Enter your email to receive reset instructions.</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {successMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !!successMsg}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Send Reset Link <KeyRound className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setEmail(''); setError(''); setSuccessMsg(''); }}
                    className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 mt-4 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Sign In
                  </button>
                </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
