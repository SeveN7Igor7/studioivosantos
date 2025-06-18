import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarHeader } from './CalendarHeader';
import { db } from '../../lib/firebase';
import { ref, onValue, set, remove, get } from 'firebase/database';

interface CalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  availableDates?: Date[];
  isAdmin?: boolean;
}

interface DayStats {
  active: number;
  completed: number;
  cancelled: number;
}

interface DayAppointments {
  [key: string]: DayStats;
}

interface DisabledDay {
  blocked: boolean;
}

interface DisabledDays {
  [key: string]: DisabledDay;
}

export const Calendar = ({ selectedDate, onDateChange, availableDates = [], isAdmin = false }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [disabledDays, setDisabledDays] = useState<DisabledDays>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [dayAppointments, setDayAppointments] = useState<DayAppointments>({});

  const toggleDateOff = async (date: Date) => {
    try {
      const formattedDate = format(date, 'dd-MM-yyyy');
      const dateRef = ref(db, `diasdesativados/${formattedDate}`);
      
      if (disabledDays[formattedDate]?.blocked) {
        // If the date is currently blocked, remove it
        await remove(dateRef);
        setDisabledDays(prev => {
          const newDisabledDays = { ...prev };
          delete newDisabledDays[formattedDate];
          return newDisabledDays;
        });
      } else {
        // If the date is not blocked, block it
        await set(dateRef, { blocked: true });
        setDisabledDays(prev => ({
          ...prev,
          [formattedDate]: { blocked: true }
        }));
      }
    } catch (error) {
      console.error('Error toggling date:', error);
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const [activeSnap, completedSnap, cancelledSnap, disabledSnap] = await Promise.all([
          get(ref(db, 'agendamentobarbeiro')),
          get(ref(db, 'finalizados')),
          get(ref(db, 'cancelados')),
          get(ref(db, 'diasdesativados'))
        ]);

        const appointments: DayAppointments = {};

        if (activeSnap.exists()) {
          Object.values(activeSnap.val()).forEach((appointment: any) => {
            const date = appointment.dia;
            if (!appointments[date]) {
              appointments[date] = { active: 0, completed: 0, cancelled: 0 };
            }
            appointments[date].active++;
          });
        }

        if (completedSnap.exists()) {
          Object.values(completedSnap.val()).forEach((appointment: any) => {
            const date = appointment.dia;
            if (!appointments[date]) {
              appointments[date] = { active: 0, completed: 0, cancelled: 0 };
            }
            appointments[date].completed++;
          });
        }

        if (cancelledSnap.exists()) {
          Object.values(cancelledSnap.val()).forEach((appointment: any) => {
            const date = appointment.dia;
            if (!appointments[date]) {
              appointments[date] = { active: 0, completed: 0, cancelled: 0 };
            }
            appointments[date].cancelled++;
          });
        }

        setDayAppointments(appointments);

        if (disabledSnap.exists()) {
          setDisabledDays(disabledSnap.val());
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    const appointmentsRef = ref(db, 'agendamentobarbeiro');
    const completedRef = ref(db, 'finalizados');
    const cancelledRef = ref(db, 'cancelados');
    const disabledRef = ref(db, 'diasdesativados');

    fetchAppointments();

    const unsubscribeAppointments = onValue(appointmentsRef, fetchAppointments);
    const unsubscribeCompleted = onValue(completedRef, fetchAppointments);
    const unsubscribeCancelled = onValue(cancelledRef, fetchAppointments);
    const unsubscribeDisabled = onValue(disabledRef, fetchAppointments);

    return () => {
      unsubscribeAppointments();
      unsubscribeCompleted();
      unsubscribeCancelled();
      unsubscribeDisabled();
    };
  }, []);

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start on Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // End on Saturday

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const today = startOfDay(new Date());

  return (
    <div className="card-responsive w-full max-w-full overflow-hidden">
      <div className="flex flex-col space-y-3 sm:space-y-4">
        {isAdmin && (
          <div className="flex justify-end">
            <label className="inline-flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isEditMode}
                  onChange={() => setIsEditMode(!isEditMode)}
                />
                <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[#E3A872]"></div>
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium text-gray-700">
                {isEditMode ? 'Modo Edição' : 'Modo Visualização'}
              </span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <CalendarHeader />

        <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
          {calendarDays.map((day, index) => {
            const formattedDate = format(day, 'dd/MM/yyyy');
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isPastDay = isBefore(day, today) && !isAdmin;
            const isDisabled = disabledDays[format(day, 'dd-MM-yyyy')]?.blocked || isPastDay;
            const dayStats = dayAppointments[formattedDate] || { active: 0, completed: 0, cancelled: 0 };

            const shouldBeClickable = isAdmin || (!isDisabled && isCurrentMonth);
            const isClickableInViewMode = !isEditMode && shouldBeClickable;
            const isClickableInEditMode = isEditMode && isAdmin;

            return (
              <button
                key={`${day.toString()}-${index}`}
                onClick={() => {
                  if (isAdmin && isEditMode) {
                    toggleDateOff(day);
                  } else if (isClickableInViewMode || (isAdmin && !isEditMode)) {
                    onDateChange(day);
                  }
                }}
                disabled={!isClickableInViewMode && !isClickableInEditMode}
                className={`
                  ${isAdmin ? 'calendar-day-admin' : 'calendar-day'} relative
                  ${isSelected ? 'selected' : ''}
                  ${isCurrentMonth ? isDisabled ? 'text-red-700' : 'text-gray-900' : 'text-gray-400'}
                  ${isSelected ? 'bg-[#E3A872] text-white' : ''}
                  ${!isSelected && (isClickableInViewMode || isClickableInEditMode) ? 'hover:bg-[#E3A872] hover:bg-opacity-10' : ''}
                  ${isToday(day) ? 'border-2 border-[#E3A872]' : 'border border-transparent'}
                  ${isDisabled ? 'bg-red-100 hover:bg-red-200' : ''}
                  ${(!isCurrentMonth || (!shouldBeClickable && !isClickableInEditMode)) ? 'opacity-50' : ''}
                  ${isEditMode && isAdmin ? 'cursor-pointer' : (!shouldBeClickable ? 'cursor-not-allowed' : 'cursor-pointer')}
                `}
              >
                <div className="calendar-day-content">
                  <span className={`calendar-day-number text-sm sm:text-base md:text-lg ${isSelected ? 'text-white' : isDisabled ? 'text-red-700' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {!isEditMode && isAdmin && (
                    <div className="calendar-day-stats">
                      <span className={`${isSelected ? 'text-white' : isDisabled ? 'text-red-700' : 'text-[#E3A872]'}`}>
                        {dayStats.active || '-'}
                      </span>
                      <span className={`${isSelected ? 'text-white' : isDisabled ? 'text-red-700' : 'text-green-600'}`}>
                        {dayStats.completed || '-'}
                      </span>
                      <span className={`${isSelected ? 'text-white' : isDisabled ? 'text-red-700' : 'text-red-600'}`}>
                        {dayStats.cancelled || '-'}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
