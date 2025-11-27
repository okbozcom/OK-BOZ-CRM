
import React, { useState, useEffect } from 'react';
import { DollarSign, Save, Download, Filter, Search, Calculator, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee } from '../../types';

interface PayrollEntry {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  payableDays: number;
  totalDays: number;
  status: 'Paid' | 'Pending';
}

const Payroll: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'staff_data' : `staff_data_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // Load employees from namespaced localStorage (Aggregated if Super Admin)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isSuperAdmin) {
        let allEmployees: Employee[] = [];
        
        // Admin Data
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { allEmployees = [...allEmployees, ...JSON.parse(adminData)]; } catch (e) {}
        } else {
            allEmployees = [...allEmployees, ...MOCK_EMPLOYEES];
        }

        // Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`staff_data_${corp.email}`);
            if (cData) {
                try { allEmployees = [...allEmployees, ...JSON.parse(cData)]; } catch (e) {}
            }
        });
        return allEmployees;
    } else {
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [];
    }
  });

  // Auto-calculate on mount
  useEffect(() => {
    handleAutoCalculate();
  }, [employees]);

  const handleAutoCalculate = () => {
    setIsCalculating(true);
    const newPayrollData: Record<string, PayrollEntry> = {};
    const daysInMonth = 30; // Nov 2025

    employees.forEach(emp => {
        // 1. Get Base Salary
        const monthlyCtc = parseFloat(emp.salary || '50000');
        
        // 2. Get Attendance
        // FIX: Pass the full employee object, not just ID
        const attendance = getEmployeeAttendance(emp, 2025, 10);
        
        // 3. Calculate Payable Days
        let payableDays = 0;
        attendance.forEach(day => {
            if (day.status === AttendanceStatus.PRESENT || 
                day.status === AttendanceStatus.WEEK_OFF || 
                day.status === AttendanceStatus.PAID_LEAVE) {
                payableDays += 1;
            } else if (day.status === AttendanceStatus.HALF_DAY) {
                payableDays += 0.5;
            }
        });

        // 4. Calculate Pro-rated Salary
        const perDaySalary = monthlyCtc / daysInMonth;
        const grossEarned = Math.round(perDaySalary * payableDays);

        // 5. Breakdown (Standard Indian Salary Structure Approximation)
        // Basic is ~50%, HRA ~30%, Special ~20% of Gross Earned
        const basicSalary = Math.round(grossEarned * 0.5);
        const hra = Math.round(grossEarned * 0.3);
        const allowances = Math.round(grossEarned * 0.2);
        
        // 6. Deductions (Manual Entry - defaulted to 0 as per requirement)
        const totalDeductions = 0;

        // Preserve existing status if re-calculating
        const existingEntry = payrollData[emp.id];

        newPayrollData[emp.id] = {
            employeeId: emp.id,
            basicSalary: basicSalary,
            allowances: hra + allowances,
            bonus: 0,
            deductions: totalDeductions,
            payableDays,
            totalDays: daysInMonth,
            status: existingEntry ? existingEntry.status : 'Pending'
        };
    });

    // Simulate processing delay for effect
    setTimeout(() => {
        setPayrollData(newPayrollData);
        setIsCalculating(false);
    }, 800);
  };

  const handleInputChange = (empId: string, field: keyof PayrollEntry, value: string) => {
    const cleanValue = value.replace(/^0+/, '') || '0';
    const numValue = parseFloat(cleanValue);
    
    setPayrollData(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId] || { 
            employeeId: empId, 
            basicSalary: 0, 
            allowances: 0, 
            bonus: 0, 
            deductions: 0,
            payableDays: 30,
            totalDays: 30,
            status: 'Pending'
        },
        [field]: isNaN(numValue) ? 0 : numValue
      }
    }));
  };

  const handleStatusChange = (empId: string, newStatus: 'Paid' | 'Pending') => {
    setPayrollData(prev => ({
        ...prev,
        [empId]: {
            ...prev[empId],
            status: newStatus
        }
    }));
  };

  const calculateNetPay = (entry: PayrollEntry | undefined) => {
    if (!entry) return 0;
    return (entry.basicSalary || 0) + (entry.allowances || 0) + (entry.bonus || 0) - (entry.deductions || 0);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPayroll = (Object.values(payrollData) as PayrollEntry[]).reduce((sum, entry) => sum + calculateNetPay(entry), 0);
  const pendingPayroll = (Object.values(payrollData) as PayrollEntry[])
    .filter(entry => entry.status === 'Pending')
    .reduce((sum, entry) => sum + calculateNetPay(entry), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
          <p className="text-gray-500">
             {isSuperAdmin ? "Consolidated payroll for all branches" : "Auto-calculated salaries for Nov 2025 based on attendance"}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                    <Clock className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Pending</p>
                    <p className="text-lg font-bold text-gray-900">₹{pendingPayroll.toLocaleString()}</p>
                </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                    <Calculator className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Total Payout</p>
                    <p className="text-lg font-bold text-gray-900">₹{totalPayroll.toLocaleString()}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
             <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search by name or role..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleAutoCalculate}
                  disabled={isCalculating}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> 
                    {isCalculating ? 'Calculating...' : 'Recalculate'}
                </button>
                <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-sm transition-colors">
                    <Save className="w-4 h-4" /> Save Records
                </button>
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 w-64">Employee</th>
                        <th className="px-4 py-4 text-center">Days</th>
                        <th className="px-4 py-4">Basic Salary</th>
                        <th className="px-4 py-4">Allowances</th>
                        <th className="px-4 py-4">Bonus</th>
                        <th className="px-4 py-4">Deductions</th>
                        <th className="px-6 py-4 bg-gray-50">Net Pay</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map(emp => {
                        const data = payrollData[emp.id] || { 
                          employeeId: emp.id,
                          basicSalary: 0, 
                          allowances: 0, 
                          bonus: 0, 
                          deductions: 0,
                          payableDays: 0,
                          totalDays: 30,
                          status: 'Pending'
                        };
                        const netPay = calculateNetPay(data);

                        return (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full border border-gray-200" />
                                        <div>
                                            <div className="font-semibold text-gray-900">{emp.name}</div>
                                            <div className="text-xs text-emerald-600 font-medium">{emp.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-full inline-block">
                                        {data.payableDays}/{data.totalDays}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">₹</span>
                                        <input 
                                            type="number" 
                                            className="w-28 pl-7 pr-2 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            value={data.basicSalary || ''}
                                            onChange={(e) => handleInputChange(emp.id, 'basicSalary', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">₹</span>
                                        <input 
                                            type="number" 
                                            className="w-24 pl-7 pr-2 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            value={data.allowances || ''}
                                            onChange={(e) => handleInputChange(emp.id, 'allowances', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">₹</span>
                                        <input 
                                            type="number" 
                                            className="w-24 pl-7 pr-2 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            value={data.bonus || ''}
                                            onChange={(e) => handleInputChange(emp.id, 'bonus', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">₹</span>
                                        <input 
                                            type="number" 
                                            className="w-24 pl-7 pr-2 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-red-600 transition-all"
                                            value={data.deductions || ''}
                                            onChange={(e) => handleInputChange(emp.id, 'deductions', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 bg-gray-50 font-bold text-gray-900">
                                    ₹{netPay.toLocaleString()}
                                </td>
                                <td className="px-4 py-4">
                                    <select 
                                        value={data.status} 
                                        onChange={(e) => handleStatusChange(emp.id, e.target.value as 'Paid' | 'Pending')}
                                        className={`px-2 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer ${
                                            data.status === 'Paid' 
                                            ? 'bg-green-50 text-green-700 border-green-200 focus:ring-2 focus:ring-green-500' 
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-2 focus:ring-yellow-500'
                                        }`}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Paid">Paid</option>
                                    </select>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button 
                                        className="text-gray-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-full transition-colors" 
                                        title="Download Payslip"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        
        {filteredEmployees.length === 0 && (
            <div className="p-8 text-center text-gray-500">
                {isSuperAdmin ? "No employees found matching your search." : "No employees added yet. Add staff to calculate payroll."}
            </div>
        )}
      </div>
    </div>
  );
};

export default Payroll;
