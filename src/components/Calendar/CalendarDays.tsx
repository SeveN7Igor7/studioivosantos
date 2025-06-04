import React from 'react';
import { format, isSameMonth, isSameDay, isToday } from 'date-fns';

interface CalendarDaysProps {
  calendarDays: Date[];
  currentMonth: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  availableDates: Date[];
}

export const CalendarDays: React.FC<CalendarDaysProps> = ({
  calendarDays,
  currentMonth,
  selectedDate,
  onDateChange,
  availableDates,
}) => {
  return (
    <div className="grid grid-cols-7 gap-1">
      {calendarDays.map((day) => {
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isSelected = isSameDay(day, selectedDate);
        const isAvailable = availableDates.some((availableDate) =>
          isSameDay(availableDate, day)
        );

        return (
          <button
            key={day.toString()}
            type="button"
            onClick={() => onDateChange(day)}
            disabled={!isCurrentMonth || !isAvailable}
            className={`
              h-10 sm:h-12 flex items-center justify-center rounded-md text-sm
              ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              ${isSelected ? 'bg-[#E3A872] text-white hover:bg-[#D89860]' : ''}
              ${!isSelected && isCurrentMonth && isAvailable ? 'hover:bg-[#FDF8F3]' : ''}
              ${isToday(day) && !isSelected ? 'border border-[#E3A872]' : ''}
              ${!isCurrentMonth || !isAvailable ? 'cursor-not-allowed opacity-50' : ''}
              transition-all duration-150 ease-in-out
            `}
          >
            {format(day, 'd')}
          </button>
        );
      })}
    </div>
  );
};
