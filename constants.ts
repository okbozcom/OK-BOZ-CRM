
import { AttendanceStatus, DailyAttendance, Employee } from './types';

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'E001',
    name: 'Alice Johnson',
    role: 'Sales Manager',
    department: 'Sales',
    avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=10b981&color=fff',
    joiningDate: '2023-01-15',
    salary: '85000',
    weekOff: 'Sunday',
    password: 'user123' // Added password
  },
  {
    id: 'E002',
    name: 'Bob Smith',
    role: 'Sales Executive',
    department: 'Sales',
    avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=3b82f6&color=fff',
    joiningDate: '2023-03-10',
    salary: '45000',
    weekOff: 'Sunday',
    password: 'user123' // Added password
  },
  {
    id: 'E003',
    name: 'Rahul Kumar', // Changed from Charlie Brown to Rahul Kumar
    role: 'Support Lead',
    department: 'Support',
    avatar: 'https://ui-avatars.com/api/?name=Rahul+Kumar&background=f59e0b&color=fff', // Updated avatar
    joiningDate: '2022-11-01',
    salary: '65000',
    email: 'employee@mybuddy.com', // Keep for consistency if other modules use it
    phone: '+91 98765 43210',
    branch: 'Hexon Office, Sector 62', // Updated to match UI image location
    status: 'Active',
    workingHours: 'General Shift', // Updated
    weekOff: 'Sunday',
    aadhar: 'XXXX-XXXX-1234',
    pan: 'ABCDE1234F',
    accountNumber: '987654321012',
    ifsc: 'HDFC0001234',
    paymentCycle: 'Monthly',
    password: 'user123' // Added password
  },
  {
    id: 'E004',
    name: 'Diana Prince',
    role: 'Marketing Head',
    department: 'Marketing',
    avatar: 'https://ui-avatars.com/api/?name=Diana+Prince&background=ec4899&color=fff',
    joiningDate: '2023-06-20',
    salary: '92000',
    weekOff: 'Saturday',
    password: 'user123' // Added password
  },
  {
    id: 'E005',
    name: 'Evan Wright',
    role: 'Developer',
    department: 'Tech',
    avatar: 'https://ui-avatars.com/api/?name=Evan+Wright&background=6366f1&color=fff',
    joiningDate: '2022-08-15',
    salary: '75000',
    weekOff: 'Saturday',
    password: 'user123' // Added password
  },
];

// Generate some mock attendance
export const generateMockAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const attendance: DailyAttendance[] = [];

  // Determine the current day for the generated month.
  const today = new Date();
  let simulatedCurrentDay = 32; // Default to fill all (past months)

  if (year === today.getFullYear() && month === today.getMonth()) {
    simulatedCurrentDay = today.getDate(); // For current real month, fill up to today
  } else if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
    simulatedCurrentDay = 0; // Future months should be empty
  } else {
    simulatedCurrentDay = daysInMonth; // Past months should be full
  }

  const employeeJoiningDate = new Date(employee.joiningDate);
  employeeJoiningDate.setHours(0,0,0,0); // Normalize to start of day

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const currentDayDate = new Date(year, month, i);
    currentDayDate.setHours(0,0,0,0); // Normalize

    // 1. Pre-Joining check
    if (currentDayDate < employeeJoiningDate) {
      attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED });
      continue;
    }
    
    // 2. Future check
    if (i > simulatedCurrentDay) {
        attendance.push({
            date: dateStr,
            status: AttendanceStatus.NOT_MARKED,
            isLate: false,
        });
        continue;
    }

    // 3. Current Day (Today) check - Force NOT_MARKED initially so user must punch in
    const isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate());
    if (isToday) {
        attendance.push({
            date: dateStr,
            status: AttendanceStatus.NOT_MARKED,
            isLate: false,
        });
        continue;
    }

    const dayOfWeek = new Date(year, month, i).getDay();
    let status = AttendanceStatus.PRESENT;
    let isLate = false;

    if (dayOfWeek === 0 || employee.weekOff === new Date(year, month, i).toLocaleDateString('en-US', { weekday: 'long' })) { 
      status = AttendanceStatus.WEEK_OFF;
    } else if (i === 1 || i === 14) { // Mock some specific days as absent
      status = AttendanceStatus.ABSENT;
    } else if (i === 19) {
      status = AttendanceStatus.ABSENT; 
    } else {
      // Randomize slightly
      const rand = Math.random();
      if (rand > 0.9) status = AttendanceStatus.HALF_DAY;
      else if (rand > 0.95) status = AttendanceStatus.PAID_LEAVE;
      
      if (status === AttendanceStatus.PRESENT && Math.random() > 0.6) {
        isLate = true;
      }
    }

    attendance.push({
      date: dateStr,
      status,
      isLate,
      checkIn: status === AttendanceStatus.PRESENT ? '09:30 AM' : undefined,
      checkOut: status === AttendanceStatus.PRESENT ? '06:30 PM' : undefined,
    });
  }
  return attendance;
};

// Helper to get consistent "random" attendance for a specific employee
export const getEmployeeAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  // Ensure employee and employee.id are valid before using charCodeAt
  const seed = (employee && employee.id && employee.id.length > 0) 
    ? employee.id.charCodeAt(employee.id.length - 1) 
    : 0; // Fallback to 0 if id is missing/empty
  
  const baseData = generateMockAttendance(employee, year, month);
  
  return baseData.map((d, i) => {
    // Skip randomizing if the day is not marked (future date, pre-joining, or today)
    if (d.status === AttendanceStatus.NOT_MARKED) return d;

    // Deterministic modification based on ID to make employees different but consistent
    // Ensure we don't accidentally mark a week-off or holiday as absent/half-day
    if (d.status === AttendanceStatus.PRESENT && (i + seed) % 15 === 0) {
       return { ...d, status: AttendanceStatus.ABSENT, checkIn: undefined, checkOut: undefined };
    }
    if (d.status === AttendanceStatus.PRESENT && (i + seed) % 7 === 0) {
       return { ...d, status: AttendanceStatus.HALF_DAY };
    }
    return d;
  });
};

export const MOCK_ATTENDANCE_NOV_2025 = generateMockAttendance(MOCK_EMPLOYEES[0], 2025, 10);
