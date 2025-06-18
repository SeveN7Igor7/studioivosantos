import React from 'react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarHeader = () => {
  return (
    <div className="calendar-grid mb-1 sm:mb-2">
      {WEEKDAYS.map((day) => (
        <div
          key={day}
          className="h-6 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-medium text-gray-500"
        >
          {day}
        </div>
      ))}
    </div>
  );
};
