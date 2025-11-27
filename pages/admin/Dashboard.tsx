
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Users, UserCheck, UserX, MapPin, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee } from '../../types';
import { useTheme } from '../../context/ThemeContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const approvalsRef = useRef<HTMLHeadingElement>(null);
  const { theme } = useTheme();

  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'staff_data' : `staff_data_${sessionId}`;
  };
  
  // Key for pending approvals (namespaced by session)
  const getApprovalsKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return `pending_approvals_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // Load employees from namespaced storage
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION LOGIC ---
        let allEmployees: Employee[] = [];

        // 1. Get Admin's own staff
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { allEmployees = [...allEmployees, ...JSON.parse(adminData)]; } catch (e) {}
        } else {
            allEmployees = [...allEmployees, ...MOCK_EMPLOYEES];
        }

        // 2. Get All Corporate Staff
        const corporateAccounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporateAccounts.forEach((corp: any) => {
            const corpKey = `staff_data_${corp.email}`;
            const corpData = localStorage.getItem(corpKey);
            if (corpData) {
                try {
                    allEmployees = [...allEmployees, ...JSON.parse(corpData)];
                } catch (e) {}
            }
        });

        setEmployees(allEmployees);
    } else {
        // --- CORPORATE / STANDARD LOGIC ---
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        
        if (saved) {
          try {
            setEmployees(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse staff data", e);
            setEmployees([]);
          }
        } else {
            setEmployees([]);
        }
    }
  }, []);

  // Mock Pending Approvals State (now persistent)
  const [pendingApprovals, setPendingApprovals] = useState(() => {
    const savedApprovals = localStorage.getItem(getApprovalsKey());
    if (savedApprovals) {
        try {
            return JSON.parse(savedApprovals);
        } catch (e) {
            console.error("Failed to parse pending approvals from localStorage", e);
        }
    }
    // Initial mock data if nothing saved or parsing failed
    return [
      { id: 1, name: 'Sarah Smith', type: 'Sick Leave', date: 'Today', avatar: 'https://picsum.photos/id/1011/40/40' },
      { id: 2, name: 'Mike Ross', type: 'Casual Leave', date: 'Tomorrow', avatar: 'https://picsum.photos/id/1012/40/40' }
    ];
  });

  // Persist pendingApprovals to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(getApprovalsKey(), JSON.stringify(pendingApprovals));
  }, [pendingApprovals]);

  const handleApprove = (id: number) => {
      // Direct approval without confirmation for better UX
      setPendingApprovals(prev => prev.filter(req => req.id !== id));
  };
  
  // Calculate dynamic stats based on current employees list
  const { stats, attendanceData } = useMemo(() => {
    // If no employees (e.g. new Franchise account), show zeros
    if (employees.length === 0) {
        return {
            stats: [
                { label: 'Total Staff', value: 0, icon: Users, color: 'bg-blue-500' },
                { label: 'Present Today', value: 0, icon: UserCheck, color: 'bg-emerald-500' },
                { label: 'Absent', value: 0, icon: UserX, color: 'bg-red-500' },
                { label: 'On Field', value: 0, icon: MapPin, color: 'bg-purple-500' },
            ],
            attendanceData: []
        }
    }

    // Simulate "Today" as Nov 15, 2025 for consistency with mock data logic
    const todayDate = '2025-11-15';
    const currentMonth = 10; // Nov
    const currentYear = 2025;

    let present = 0;
    let absent = 0;
    let onField = 0;

    // 1. Calculate Today's Stats
    employees.forEach(emp => {
      // Get attendance for the month
      // FIX: Pass the full employee object, not just ID
      const monthlyData = getEmployeeAttendance(emp, currentYear, currentMonth);
      const todayRecord = monthlyData.find(d => d.date === todayDate);

      if (todayRecord) {
        if (todayRecord.status === AttendanceStatus.PRESENT || todayRecord.status === AttendanceStatus.HALF_DAY) {
          present++;
          // Heuristic for "On Field": Sales dept or Support lead
          if (emp.department === 'Sales' || emp.role.includes('Lead')) {
            onField++;
          }
        } else if (todayRecord.status === AttendanceStatus.ABSENT || todayRecord.status === AttendanceStatus.PAID_LEAVE) {
            // Here we count explicit Absent or Paid Leave as 'Absent' from work context
            absent++;
        }
      }
    });

    // 2. Calculate Weekly Trend (Last 6 days ending Nov 15)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, 15);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      let p = 0;
      let a = 0;

      employees.forEach(emp => {
         // FIX: Pass the full employee object, not just ID
         const record = getEmployeeAttendance(emp, currentYear, currentMonth).find(r => r.date === dateStr);
         if (record) {
             if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.HALF_DAY) p++;
             else if (record.status === AttendanceStatus.ABSENT || record.status === AttendanceStatus.PAID_LEAVE) a++;
         }
      });

      chartData.push({ name: dayName, present: p, absent: a });
    }

    return {
      stats: [
        { label: 'Total Staff', value: employees.length, icon: Users, color: 'bg-blue-500' },
        { label: 'Present Today', value: present, icon: UserCheck, color: 'bg-emerald-500' },
        { label: 'Absent', value: absent, icon: UserX, color: 'bg-red-500' },
        { label: 'On Field', value: onField, icon: MapPin, color: 'bg-purple-500' },
      ],
      attendanceData: chartData
    };
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h2>
            <p className="text-gray-500 dark:text-gray-400">
                {isSuperAdmin 
                    ? "Overview of all Franchise and Corporate operations." 
                    : "Welcome back! Here's what's happening today."}
            </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between transition-colors duration-200">
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{stat.label}</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-white">{stat.value}</div>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white shadow-lg shadow-gray-200 dark:shadow-none`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6">Weekly Attendance Trend</h3>
          <div className="h-64 w-full">
            {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} 
                    />
                    <Tooltip 
                        cursor={{ fill: theme === 'dark' ? '#374151' : '#f3f4f6' }}
                        contentStyle={{ 
                            borderRadius: '8px', 
                            border: theme === 'dark' ? '1px solid #374151' : 'none', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                            color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                        }}
                    />
                    <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                    No data available. Add staff to see trends.
                </div>
            )}
          </div>
        </div>

        {/* Recent Activity / Quick Actions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col transition-colors duration-200">
           <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
           <div className="space-y-3">
             <button 
               onClick={() => navigate('/admin/staff')}
               className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
             >
               <span className="text-gray-700 dark:text-gray-200 font-medium">Add New Staff</span>
               <span className="text-gray-400 dark:text-gray-500">→</span>
             </button>
             <button 
               onClick={() => navigate('/admin/payroll')}
               className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
             >
               <span className="text-gray-700 dark:text-gray-200 font-medium">Process Payroll</span>
               <span className="text-gray-400 dark:text-gray-500">→</span>
             </button>
             <button 
                onClick={() => approvalsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
             >
               <span className="text-gray-700 dark:text-gray-200 font-medium">Approve Leaves</span>
               <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${pendingApprovals.length > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                   {pendingApprovals.length}
               </span>
             </button>
           </div>
           
           <h3 ref={approvalsRef} className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4">Pending Approvals</h3>
           <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
              {pendingApprovals.map(req => (
                  <div key={req.id} className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <img src={req.avatar} alt="" className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{req.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{req.type} • {req.date}</div>
                    </div>
                    <button 
                        onClick={() => handleApprove(req.id)}
                        className="text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline px-2 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                    >
                        Approve
                    </button>
                </div>
              ))}
              {pendingApprovals.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">No pending requests.</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
