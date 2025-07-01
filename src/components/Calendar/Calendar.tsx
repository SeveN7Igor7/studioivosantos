import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay, getDay } from 'date-fns';
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
  active: number
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
        // If the date is currently blocked, remove it (enable it)
        await remove(dateRef);
        setDisabledDays(prev => {
          const newDisabledDays = { ...prev };
          delete newDisabledDays[formattedDate];
          return newDisabledDays;
        });
      } else {
        // If the date is not blocked, block it (disable it)
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

  const handleDayClick = (day: Date) => {
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isTuesday = getDay(day) === 2;
    const isSunday = getDay(day) === 0; // Sunday = 0
    
    if (isAdmin && isEditMode) {
      // In edit mode, only allow toggling non-Tuesday and non-Sunday days that are in current month
      if (isCurrentMonth && !isTuesday && !isSunday) {
        toggleDateOff(day);
      }
    } else {
      // In view mode, handle normal date selection
      const isPastDay = isBefore(day, today) && !isAdmin;
      const isManuallyDisabled = disabledDays[format(day, 'dd-MM-yyyy')]?.blocked;
      const isDisabled = isManuallyDisabled || isPastDay || isTuesday || isSunday;
      
      if (isCurrentMonth && !isDisabled) {
        onDateChange(day);
      }
    }
  };

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
                {isEditMode ? 'Modo Edição Ativo' : 'Modo Visualização'}
              </span>
            </label>
          </div>
        )}

        {isAdmin && isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 font-medium">
              🔧 Modo Edição: Clique em qualquer dia para bloquear/desbloquear agendamentos
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Dias bloqueados ficarão indisponíveis para novos agendamentos
            </p>
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
            const isPastDay = isBefore(day, today);
            const isTuesday = getDay(day) === 2; // Tuesday = 2 (0=Sunday, 1=Monday, 2=Tuesday...)
            const isSunday = getDay(day) === 0; // Sunday = 0
            const isManuallyDisabled = disabledDays[format(day, 'dd-MM-yyyy')]?.blocked;
            const isDisabled = isManuallyDisabled || (isPastDay && !isAdmin) || isTuesday || isSunday;
            const dayStats = dayAppointments[formattedDate] || { active: 0, completed: 0, cancelled: 0 };

            // Determine if the day should be clickable
            const isClickableInEditMode = isAdmin && isEditMode && isCurrentMonth && !isTuesday && !isSunday;
            const isClickableInViewMode = !isEditMode && isCurrentMonth && !isDisabled;
            const isClickable = isClickableInEditMode || isClickableInViewMode;

            // Determine visual state
            let dayColorClass = '';
            let bgColorClass = '';
            let borderClass = 'border border-transparent';
            
            if (isSelected && !isEditMode) {
              bgColorClass = 'bg-[#E3A872]';
              dayColorClass = 'text-white';
            } else if (isCurrentMonth) {
              if (isTuesday || isSunday) {
                // Style Tuesdays and Sundays like manually disabled days (red)
                bgColorClass = isEditMode ? 'bg-red-200' : 'bg-red-100';
                dayColorClass = 'text-red-700';
              } else if (isManuallyDisabled) {
                bgColorClass = isEditMode ? 'bg-red-200' : 'bg-red-100';
                dayColorClass = 'text-red-700';
              } else if (isPastDay && !isAdmin) {
                // Past days for non-admin users - show in red
                bgColorClass = 'bg-red-100';
                dayColorClass = 'text-red-700';
              } else {
                dayColorClass = 'text-gray-900';
                bgColorClass = '';
              }
            } else {
              dayColorClass = 'text-gray-400';
              bgColorClass = 'opacity-50';
            }

            if (isToday(day)) {
              borderClass = 'border-2 border-[#E3A872]';
            }

            // Hover effects
            let hoverClass = '';
            if (isClickable) {
              if (isEditMode && isManuallyDisabled) {
                hoverClass = 'hover:bg-red-300';
              } else if (isEditMode) {
                hoverClass = 'hover:bg-red-200';
              } else {
                hoverClass = 'hover:bg-[#E3A872] hover:bg-opacity-10';
              }
            }

            return (
              <button
                key={`${day.toString()}-${index}`}
                onClick={() => handleDayClick(day)}
                disabled={!isClickable}
                className={`
                  ${isAdmin ? 'calendar-day-admin' : 'calendar-day'} relative
                  ${bgColorClass}
                  ${borderClass}
                  ${hoverClass}
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  transition-all duration-200
                `}
                title={
                  isTuesday 
                    ? 'Terça-feira - Dia não disponível para agendamentos' 
                    : isSunday
                      ? 'Domingo - Dia não disponível para agendamentos'
                    : isPastDay && !isAdmin
                      ? 'Data já passou - não disponível para agendamentos'
                    : isEditMode && isAdmin 
                      ? (isManuallyDisabled ? 'Clique para desbloquear este dia' : 'Clique para bloquear este dia')
                      : undefined
                }
              >
                <div className="calendar-day-content">
                  <span className={`calendar-day-number text-sm sm:text-base md:text-lg ${dayColorClass}`}>
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
                  {isEditMode && isAdmin && (isManuallyDisabled || isTuesday || isSunday) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✕</span>
                      </div>
                    </div>
                  )}
                  {!isAdmin && isPastDay && isCurrentMonth && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✕</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {!isAdmin && (
          <div className="mt-2 space-y-1">
            <p className="text-xs sm:text-sm text-gray-500">
              * Domingos e terças-feiras não estão disponíveis para agendamentos
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              * Sábados: agendamentos até às 18:00 (atendimento até às 19:00)
            </p>
            <p className="text-xs sm:text-sm text-red-600">
              * Dias em vermelho não estão disponíveis para agendamentos
            </p>
          </div>
        )}

        {isAdmin && !isEditMode && (
          <div className="mt-2 space-y-1">
            <p className="text-xs sm:text-sm text-gray-500">
              * Números mostram: Agendados / Finalizados / Cancelados
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              * Domingos e terças-feiras não estão disponíveis para agendamentos
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              * Sábados: agendamentos até às 18:00 (atendimento até às 19:00)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
