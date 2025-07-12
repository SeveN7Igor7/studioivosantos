import React from 'react';
import { format, isSameDay, isAfter, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface TimeSlotsProps {
  date: Date;
  selectedTimeSlot: string | null;
  onSelectTimeSlot: (timeSlotId: string) => void;
  bookedSlots: string[];
}

export const TimeSlots: React.FC<TimeSlotsProps> = ({
  date,
  selectedTimeSlot,
  onSelectTimeSlot,
  bookedSlots,
}) => {
  const [completedSlots, setCompletedSlots] = React.useState<string[]>([]);

  React.useEffect(() => {
    const fetchCompletedSlots = async () => {
      const formattedDate = format(date, 'dd/MM/yyyy');
      const completedRef = ref(db, 'finalizados');
      
      try {
        const snapshot = await get(completedRef);
        if (snapshot.exists()) {
          const completedAppointments = Object.values(snapshot.val()) as any[];
          const slots = completedAppointments
            .filter(app => app.dia === formattedDate)
            .map(app => {
              const timeSlotId = Object.entries(timeSlotMap).find(([_, time]) => time === app.horario)?.[0];
              return timeSlotId;
            })
            .filter(Boolean) as string[];
          
          setCompletedSlots(slots);
        }
      } catch (error) {
        console.error('Error fetching completed slots:', error);
      }
    };

    fetchCompletedSlots();
  }, [date]);

  const isSaturday = getDay(date) === 6;

  // Different time slot maps for Saturday vs other days
  const regularTimeSlotMap: { [key: string]: string } = {
    '1': '09:00',
    '2': '09:30',
    '3': '10:00',
    '4': '10:30',
    '5': '11:00',
    '6': '11:30',
    // Skip 12:00 and 12:30 (lunch hour)
    '7': '13:00',
    '8': '13:30',
    '9': '14:00',
    '10': '14:30',
    '11': '15:00',
    '12': '15:30',
    '13': '16:00',
    '14': '16:30',
    '15': '17:00',
    '16': '17:30',
    '17': '18:00',
    '18': '18:30',
    '19': '19:00',
    '20': '19:30',
    '21': '20:00',
  };

  // Saturday: only allow booking until 17:00
  const saturdayTimeSlotMap: { [key: string]: string } = {
    '1': '09:00',
    '2': '09:30',
    '3': '10:00',
    '4': '10:30',
    '5': '11:00',
    '6': '11:30',
    // Skip 12:00 and 12:30 (lunch hour)
    '7': '13:00',
    '8': '13:30',
    '9': '14:00',
    '10': '14:30',
    '11': '15:00',
    '12': '15:30',
    '13': '16:00',
    '14': '16:30',
    '15': '17:00',
    // Last slot on Saturday is now 17:00
  };

  const timeSlotMap = isSaturday ? saturdayTimeSlotMap : regularTimeSlotMap;

  const now = new Date();
  const isToday = isSameDay(date, now);

  const timeSlots: TimeSlot[] = Object.entries(timeSlotMap).map(([id, time]) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hours, minutes);

    const isPastTime = isToday && !isAfter(slotTime, now);
    
    return {
      id,
      time,
      available: !bookedSlots.includes(id) && !completedSlots.includes(id) && !isPastTime
    };
  });

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Horários disponíveis para {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </h3>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {timeSlots.map((slot) => (
          <button
            key={slot.id}
            onClick={() => slot.available && onSelectTimeSlot(slot.id)}
            disabled={!slot.available}
            className={`
              py-2 px-3 rounded-md text-sm font-medium 
              ${selectedTimeSlot === slot.id
                ? 'bg-[#E3A872] text-white'
                : slot.available
                ? 'bg-white border border-[#E8D5C4] text-gray-700 hover:bg-[#FDF8F3]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }
              transition-colors duration-150
            `}
          >
            {slot.time}
          </button>
        ))}
      </div>
      
      <div className="mt-2 space-y-1">
        <p className="text-sm text-gray-500">
          * Horário de almoço: 12:00 - 13:00 (não disponível para agendamentos)
        </p>
        {isSaturday && (
          <p className="text-sm text-purple-600 font-medium">
            * Sábado: agendamentos até às 17:00 
          </p>
        )}
      </div>
    </div>
  );
};
