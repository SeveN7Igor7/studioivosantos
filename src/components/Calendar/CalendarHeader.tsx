import React from 'react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Dom, Seg, Ter, Qua, Qui, Sex, Sáb

export const CalendarHeader = () => {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 mb-1 sm:mb-2">
      {WEEKDAYS.map((day, index) => (
        <div
          key={`${day}-${index}`}
          className="h-6 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-medium text-gray-500"
        >
          {day}
        </div>
      ))}
    </div>
  );
};
