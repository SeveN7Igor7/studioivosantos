import React from 'react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarHeader = () => {
  return (
    <div className="grid grid-cols-7 gap-1 mb-2">
      {WEEKDAYS.map((day) => (
        <div
          key={day}
          className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
        >
          {day}
        </div>
      ))}
    </div>
  );
};
