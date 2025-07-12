import React, { useEffect, useState } from 'react';
import { addDays, format, parse, addMinutes, isAfter, getDay, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '../components/Calendar/Calendar';
import { TimeSlots } from '../components/TimeSlots';
import { ServiceSelection } from '../components/ServiceSelection';
import { Button } from '../components/Button';
import { CheckCircle, Calendar as CalendarIcon, MapPin, Phone, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, set, remove, get } from 'firebase/database';

interface ServiceDuration {
  [key: string]: number; // Duration in minutes
}

const HOUR_LONG_SERVICES = ['carbonoplastia', 'taninoplastia'];
const THIRTY_MINUTE_SERVICES = ['haircut', 'beard', 'pigmentation', 'facial-cleaning'];

const SERVICE_DURATIONS: ServiceDuration = {
  'haircut': 30,
  'beard': 30,
  'eyebrows': 0, // Doesn't affect timing
  'carbonoplastia': 60,
  'pigmentation': 30,
  'facial-cleaning': 30,
  'taninoplastia': 60,
  'visagismo': 30
};

// Function to find the next valid date for appointments
const getNextValidDate = () => {
  const today = startOfDay(new Date());
  let nextDate = addDays(today, 1); // Start from tomorrow
  
  // Keep looking for a valid date (not Tuesday, not Sunday, and not in the past)
  while (getDay(nextDate) === 2 || getDay(nextDate) === 0) { // Skip Tuesdays (2) and Sundays (0)
    nextDate = addDays(nextDate, 1);
  }
  
  return nextDate;
};

export const SchedulePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getNextValidDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [disabledDays, setDisabledDays] = useState<{ [key: string]: boolean }>({});
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const { user } = useAuth();

  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    // Filter out Tuesdays (getDay() === 2) and Sundays (getDay() === 0)
    return getDay(date) !== 2 && getDay(date) !== 0 ? date : null;
  }).filter(Boolean) as Date[];

  // Calculate total duration of selected services
  const getTotalDuration = () => {
    // If any selected service is an hour-long service
    if (selectedServices.some(service => HOUR_LONG_SERVICES.includes(service))) {
      return 60;
    }

    // Count how many 30-minute services are selected
    const thirtyMinuteServicesCount = selectedServices.filter(service => 
      THIRTY_MINUTE_SERVICES.includes(service)
    ).length;

    // If multiple 30-minute services are selected, return 60 minutes
    if (thirtyMinuteServicesCount > 1) {
      return 60;
    }

    // For single 30-minute service or only eyebrows
    return thirtyMinuteServicesCount === 1 ? 30 : 0;
  };

  // Generate all possible time slots for a day (excluding lunch hour 12:00-13:00)
  const generateTimeSlots = () => {
    const slots: string[] = [];
    let currentTime = parse('09:00', 'HH:mm', new Date());
    const now = new Date();
    const today = format(now, 'dd/MM/yyyy');
    const currentTimeStr = format(now, 'HH:mm');
    const isSaturday = getDay(selectedDate) === 6; // Saturday = 6
    
    // Set end time based on day of week - Saturday allows booking until 17:00
    const endTimeStr = isSaturday ? '17:00' : '20:00';
    const endTime = parse(endTimeStr, 'HH:mm', new Date());

    while (currentTime <= endTime) {
      const timeStr = format(currentTime, 'HH:mm');
      
      // Skip lunch hour (12:00-13:00)
      if (timeStr !== '12:00' && timeStr !== '12:30') {
        // If it's today, only show future times
        if (format(selectedDate, 'dd/MM/yyyy') !== today || timeStr > currentTimeStr) {
          slots.push(timeStr);
        }
      }
      
      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  };

  // Convert time string to minutes for easier calculation
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes back to time string
  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Check if a time slot should be disabled based on existing bookings
  const isTimeSlotDisabled = (timeSlot: string) => {
    const totalDuration = getTotalDuration();
    if (totalDuration === 0) return false; // No duration means no conflict possible
    
    const startMinutes = timeToMinutes(timeSlot);
    const endMinutes = startMinutes + totalDuration;
    const isSaturday = getDay(selectedDate) === 6;
    
    // Check if this appointment would conflict with existing appointments
    for (const appointment of existingAppointments) {
      const existingStartMinutes = timeToMinutes(appointment.horario);
      const existingDuration = appointment.duration || 30; // Default to 30 minutes if not specified
      const existingEndMinutes = existingStartMinutes + existingDuration;
      
      // Check for overlap: appointments overlap if:
      // (new start < existing end) AND (new end > existing start)
      if (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) {
        return true;
      }
    }

    // Prevent appointments that would extend into lunch hour (12:00-13:00)
    const lunchStartMinutes = 12 * 60; // 12:00
    const lunchEndMinutes = 13 * 60;   // 13:00
    
    if (startMinutes < lunchEndMinutes && endMinutes > lunchStartMinutes) {
      return true;
    }

    // Check Saturday-specific restrictions
    if (isSaturday) {
      // On Saturday, allow booking until 17:00 even if service ends at 18:00
      // The barber works until 18:00, so 17:00 appointment with 1-hour service is fine
      const saturdayWorkEndTime = 18 * 60; // 18:00 (when barber stops working)
      if (endMinutes > saturdayWorkEndTime) {
        return true;
      }
    } else {
      // Check if appointment would end after 21:00 (absolute latest end time for other days)
      const absoluteEndTime = 21 * 60; // 21:00
      if (endMinutes > absoluteEndTime) {
        return true;
      }
    }

    return false;
  };

  // Generate available time slots considering conflicts
  const getAvailableTimeSlots = () => {
    const allSlots = generateTimeSlots();
    const totalDuration = getTotalDuration();
    
    if (totalDuration === 0) return allSlots;
    
    return allSlots.filter(slot => !isTimeSlotDisabled(slot));
  };

  useEffect(() => {
    const fetchData = async () => {
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      const appointmentsRef = ref(db, 'agendamentobarbeiro');
      const diasDesativadosRef = ref(db, 'diasdesativados');
      
      try {
        const [appointmentsSnap, diasDesativadosSnap] = await Promise.all([
          get(appointmentsRef),
          get(diasDesativadosRef)
        ]);
        
        const appointments: any[] = [];
        
        if (appointmentsSnap.exists()) {
          Object.values(appointmentsSnap.val()).forEach((appointment: any) => {
            if (appointment.dia === formattedDate) {
              appointments.push({
                horario: appointment.horario,
                duration: appointment.duration || 30, // Default to 30 minutes if not specified
                servico: appointment.servico
              });
            }
          });
        }

        setExistingAppointments(appointments);

        if (diasDesativadosSnap.exists()) {
          const disabledDaysData = diasDesativadosSnap.val();
          setDisabledDays(disabledDaysData);
          
          // Check if the currently selected date is disabled
          const currentSelectedDateStr = format(selectedDate, 'dd-MM-yyyy');
          if (disabledDaysData[currentSelectedDateStr]?.blocked) {
            // Find the next valid date
            setSelectedDate(getNextValidDate());
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedDate]);

  // Reset selected time slot when services change
  useEffect(() => {
    setSelectedTimeSlot(null);
  }, [selectedServices]);

  const handleDateChange = (date: Date) => {
    const formattedDate = format(date, 'dd/MM/yyyy');
    const isTuesday = getDay(date) === 2;
    const isSunday = getDay(date) === 0;
    const isPastDate = isBefore(date, startOfDay(new Date()));
    
    // Don't allow selecting Tuesdays, Sundays, past dates, or manually disabled days
    if (!disabledDays[format(date, 'dd-MM-yyyy')]?.blocked && !isTuesday && !isSunday && !isPastDate) {
      setSelectedDate(date);
      setSelectedTimeSlot(null);
    }
  };

  const handleSelectTimeSlot = (time: string) => {
    setSelectedTimeSlot(time);
  };

  const handleSelectService = (serviceId: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      return newServices;
    });
  };

  const getServiceName = (serviceId: string) => {
    const serviceMap: { [key: string]: string } = {
      'haircut': 'Corte de Cabelo',
      'beard': 'Barba',
      'eyebrows': 'Sobrancelha',
      'carbonoplastia': 'Carbonoplastia',
      'pigmentation': 'Pigmentação',
      'facial-cleaning': 'Limpeza Facial',
      'taninoplastia': 'Taninoplastia',
      'visagismo': 'Visagismo'
    };
    return serviceMap[serviceId] || serviceId;
  };

  const handleBookAppointment = async () => {
    if (!selectedTimeSlot || selectedServices.length === 0 || !user) return;
    
    setIsLoading(true);
    
    try {
      const appointmentId = Date.now().toString();
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      
      const serviceNames = selectedServices.map(getServiceName).join(', ');
      const duration = getTotalDuration();

      const appointmentData = {
        dia: formattedDate,
        horario: selectedTimeSlot,
        servico: serviceNames,
        userName: user.name,
        userPhone: user.phone,
        userEmail: user.email,
        duration
      };

      await set(ref(db, `user/number/${user.phone}/agendamento/${appointmentId}`), {
        dia: formattedDate,
        horario: selectedTimeSlot,
        servico: serviceNames,
        duration
      });

      await set(ref(db, `agendamentobarbeiro/${appointmentId}`), appointmentData);

      setCurrentAppointmentId(appointmentId);
      setIsBookingConfirmed(true);
    } catch (error) {
      console.error('Erro ao agendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAnother = async () => {
    if (currentAppointmentId && user) {
      try {
        await remove(ref(db, `agendamentobarbeiro/${currentAppointmentId}`));
        await remove(ref(db, `user/number/${user.phone}/agendamento/${currentAppointmentId}`));
      } catch (error) {
        console.error('Erro ao cancelar agendamento anterior:', error);
      }
    }
    
    setIsBookingConfirmed(false);
    setSelectedTimeSlot(null);
    setSelectedServices([]);
    setCurrentAppointmentId(null);
    // Reset to next valid date
    setSelectedDate(getNextValidDate());
  };

  if (isBookingConfirmed) {
    const serviceNames = selectedServices.map(getServiceName).join(', ');
    const duration = getTotalDuration();
    const endTime = format(addMinutes(parse(selectedTimeSlot!, 'HH:mm', new Date()), duration), 'HH:mm');
    const needsEarlyArrival = selectedServices.some(service => 
      service === 'carbonoplastia' || service === 'taninoplastia'
    );
    
    return (
      <div className="card-responsive max-w-2xl mx-auto">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-[#E3A872] mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Seu agendamento de {serviceNames} foi marcado para {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} das {selectedTimeSlot} às {endTime}.
          </p>

          {needsEarlyArrival && (
            <div className="bg-[#FDF8F3] rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-6">
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#E3A872] mr-2" />
                <span className="text-xs sm:text-sm text-gray-700 font-medium">
                  Por favor, chegue 15 minutos antes do horário marcado
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4 mb-6">
            <div className="bg-[#FDF8F3] rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#E3A872] mr-2" />
                <span className="text-xs sm:text-sm text-gray-700">
                  Os detalhes do agendamento foram salvos
                </span>
              </div>
            </div>

            <div className="bg-[#FDF8F3] rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-center mb-2">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-[#E3A872] mr-2" />
                <span className="text-xs sm:text-sm text-gray-700">
                  Contato do Barbeiro: (86) 99940-9360
                </span>
              </div>
            </div>

            <div className="bg-[#FDF8F3] rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center mb-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[#E3A872] mr-2" />
                  <span className="text-xs sm:text-sm text-gray-700">
                    Rua Pirangi, 1548 - Teresina, Pi
                  </span>
                </div>
                <Button
                  onClick={() => window.open('https://maps.app.goo.gl/QmpM6serdf8M4Dr46')}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-[#E3A872] text-[#E3A872] hover:bg-[#E3A872] hover:text-white"
                >
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Ver no Maps
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleBookAnother}
            size="md"
            className="bg-[#E3A872] hover:bg-[#D89860]"
          >
            Agendar outro horário
          </Button>
        </div>
      </div>
    );
  }

  // Calculate if we need to show the hour duration warning
  const showHourDurationWarning = () => {
    const thirtyMinuteServicesCount = selectedServices.filter(service => 
      THIRTY_MINUTE_SERVICES.includes(service)
    ).length;
    return thirtyMinuteServicesCount > 1 || selectedServices.some(service => HOUR_LONG_SERVICES.includes(service));
  };

  const needsEarlyArrival = selectedServices.some(service => 
    service === 'carbonoplastia' || service === 'taninoplastia'
  );

  const availableTimeSlots = getAvailableTimeSlots();
  const isSaturday = getDay(selectedDate) === 6;

  return (
    <div className="card-responsive max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Agendar um Horário</h1>
      
      <div className="space-y-4 sm:space-y-6">
        <div>
          <ServiceSelection
            selectedServices={selectedServices}
            onSelectService={handleSelectService}
          />
        </div>

        {selectedServices.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Selecione uma data</h2>
            <Calendar
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              availableDates={availableDates}
            />
          </div>
        )}
        
        {selectedServices.length > 0 && selectedDate && (
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
              Horários disponíveis para {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h3>
            
            {availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {availableTimeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleSelectTimeSlot(time)}
                    className={`
                      py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium 
                      ${selectedTimeSlot === time
                        ? 'bg-[#E3A872] text-white'
                        : 'bg-white border border-[#E8D5C4] text-gray-700 hover:bg-[#FDF8F3]'
                      }
                      transition-colors duration-150
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Não há horários disponíveis para os serviços selecionados nesta data.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Tente selecionar outra data ou diferentes serviços.
                </p>
              </div>
            )}
            
            <div className="mt-2 space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm text-gray-500">
                * Horário de almoço: 12:00 - 13:00 (não disponível para agendamentos)
              </p>
              {isSaturday && (
                <p className="text-xs sm:text-sm text-purple-600 font-medium">
                  * Sábado: agendamentos até às 17:00
                </p>
              )}
              {showHourDurationWarning() && (
                <p className="text-xs sm:text-sm text-gray-600">
                  * Este agendamento terá duração de 1 hora
                </p>
              )}
              {needsEarlyArrival && (
                <p className="text-xs sm:text-sm font-medium text-[#E3A872]">
                  * Por favor, chegue 15 minutos antes do horário marcado
                </p>
              )}
            </div>
          </div>
        )}
        
        {selectedTimeSlot && selectedServices.length > 0 && (
          <div>
            <Button
              onClick={handleBookAppointment}
              isLoading={isLoading}
              variant="primary"
              fullWidth
              size="md"
              className="bg-[#E3A872] hover:bg-[#D89860]"
            >
              Confirmar Agendamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
