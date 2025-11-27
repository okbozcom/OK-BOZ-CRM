import React from 'react';
import { DailyAttendance, AttendanceStatus } from '../types';

interface AttendanceCalendarProps {
  data: DailyAttendance[];
  stats: {
    present: number;
    absent: number;
    halfDay: number;
    paidLeave: number;
    weekOff: number;
  };
  onDateClick?: (day: DailyAttendance) => void;
}

interface DayCellProps {
  dayData: DailyAttendance | null | undefined;
  onClick?: (day: DailyAttendance) => void;
}

const DayCell: React.FC<DayCellProps> = ({ dayData, onClick }) => {
  if (!dayData) return <div className="h-14 bg-transparent"></div>;

  const dayNumber = parseInt(dayData.date.split('-')[2], 10);
  
  let bgClass = 'bg-gray-100';
  
  switch (dayData.status) {
    case AttendanceStatus.PRESENT:
      bgClass = 'bg-emerald-500 text-white';
      break;
    case AttendanceStatus.ABSENT:
      bgClass = 'bg-red-600 text-white';
      break;
    case AttendanceStatus.HALF_DAY:
      bgClass = 'bg-yellow-400 text-gray-900';
      break;
    case AttendanceStatus.PAID_LEAVE:
      bgClass = 'bg-pink-200 text-pink-800';
      break;
    case AttendanceStatus.WEEK_OFF:
      bgClass = 'bg-gray-200 text-gray-400';
      break;
    case AttendanceStatus.NOT_MARKED:
      bgClass = 'bg-white border-2 border-dashed border-gray-100 text-gray-300';
      break;
  }

  return (
    <div 
      onClick={() => onClick && onClick(dayData)}
      className={`relative h-14 rounded-md flex flex-col items-center justify-center ${bgClass} shadow-sm transition-transform hover:scale-105 cursor-pointer`}
      title={dayData.status.replace('_', ' ')}
    >
      <span className="text-lg font-semibold">{dayNumber}</span>
      {dayData.status === AttendanceStatus.PRESENT && dayData.isLate && (
        <span className="absolute bottom-1 text-[8px] font-bold uppercase tracking-wider opacity-80">LATE</span>
      )}
    </div>
  );
};

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ data, stats, onDateClick }) => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Safe date parsing to prevent timezone shifts (e.g. UTC to Local) affecting the day of week
  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    // Create date as YYYY, MM (0-indexed), DD in local time explicitly
    const date = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    return date.getDay();
  };

  // Pad start of month based on the weekday of the first date in data
  const startDayOfWeek = data.length > 0 ? getDayOfWeek(data[0].date) : 0;
  
  const paddedData = [
    ...Array(startDayOfWeek).fill(null),
    ...data
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-md mx-auto">
      {/* Header Stats */}
      <div className="p-4 grid grid-cols-5 gap-2 border-b border-gray-100 bg-gray-50">
        <div className="border-l-4 border-emerald-500 pl-2">
          <div className="text-xs text-gray-500">Present</div>
          <div className="font-bold text-lg">{stats.present}</div>
        </div>
        <div className="border-l-4 border-red-500 pl-2">
          <div className="text-xs text-gray-500">Absent</div>
          <div className="font-bold text-lg">{stats.absent}</div>
        </div>
        <div className="border-l-4 border-yellow-400 pl-2">
          <div className="text-xs text-gray-500">Half day</div>
          <div className="font-bold text-lg">{stats.halfDay}</div>
        </div>
        <div className="border-l-4 border-purple-400 pl-2">
          <div className="text-xs text-gray-500">Paid Leave</div>
          <div className="font-bold text-lg">{stats.paidLeave}</div>
        </div>
        <div className="border-l-4 border-gray-400 pl-2">
          <div className="text-xs text-gray-500">Week Off</div>
          <div className="font-bold text-lg">{stats.weekOff}</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {paddedData.map((day, idx) => (
            <DayCell key={idx} dayData={day} onClick={onDateClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;