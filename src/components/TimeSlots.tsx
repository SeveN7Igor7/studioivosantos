import React from 'react';
import { format, isSameDay, isAfter } from 'date-fns';
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

  const timeSlotMap: { [key: string]: string } = {
    '1': '09:00',
    '2': '10:00',
    '3': '11:00',
    '4': '12:00',
    '5': '13:00',
    '6': '14:00',
    '7': '15:00',
    '8': '16:00',
    '9': '17:00',
    '10': '18:00',
    '11': '19:00',
    '12': '20:00',
  };

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
    </div>
  );
};