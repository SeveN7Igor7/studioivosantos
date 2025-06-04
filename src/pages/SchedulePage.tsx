import React, { useEffect, useState } from 'react';
import { addDays, format, parse, addMinutes, isAfter } from 'date-fns';
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

export const SchedulePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [disabledDays, setDisabledDays] = useState<{ [key: string]: boolean }>({});
  const { user } = useAuth();

  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

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

  // Generate all possible time slots for a day
  const generateTimeSlots = () => {
    const slots: string[] = [];
    let currentTime = parse('09:00', 'HH:mm', new Date());
    const endTime = parse('20:00', 'HH:mm', new Date());
    const now = new Date();
    const today = format(now, 'dd/MM/yyyy');
    const currentTimeStr = format(now, 'HH:mm');

    while (currentTime <= endTime) {
      const timeStr = format(currentTime, 'HH:mm');
      // If it's today, only show future times
      if (format(selectedDate, 'dd/MM/yyyy') !== today || timeStr > currentTimeStr) {
        slots.push(timeStr);
      }
      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  };

  // Check if a time slot should be disabled based on existing bookings
  const isTimeSlotDisabled = (timeSlot: string) => {
    const totalDuration = getTotalDuration();
    const timeSlotDate = parse(timeSlot, 'HH:mm', new Date());
    
    // For hour-long appointments, check both 30-minute slots
    const intervalsToCheck = Math.ceil(totalDuration / 30);
    
    // Check each 30-minute interval that would be occupied by this appointment
    for (let i = 0; i < intervalsToCheck; i++) {
      const checkTime = format(addMinutes(timeSlotDate, i * 30), 'HH:mm');
      if (bookedTimeSlots.includes(checkTime)) {
        return true;
      }
    }

    // Allow bookings after 19:30 regardless of duration
    const timeSlotHour = parseInt(timeSlot.split(':')[0]);
    const timeSlotMinutes = parseInt(timeSlot.split(':')[1]);

    // Only check end time if the appointment starts before 19:30
    if (timeSlotHour < 19 || (timeSlotHour === 19 && timeSlotMinutes < 30)) {
      const endTime = addMinutes(timeSlotDate, totalDuration);
      if (format(endTime, 'HH:mm') > '20:00') {
        return true;
      }
    }

    return false;
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
        
        const bookedSlots: string[] = [];
        
        if (appointmentsSnap.exists()) {
          Object.values(appointmentsSnap.val()).forEach((appointment: any) => {
            if (appointment.dia === formattedDate) {
              bookedSlots.push(appointment.horario);
              
              // If the appointment is an hour long, block the next slot too
              if (appointment.duration === 60) {
                const nextSlot = format(addMinutes(parse(appointment.horario, 'HH:mm', new Date()), 30), 'HH:mm');
                bookedSlots.push(nextSlot);
              }
            }
          });
        }

        setBookedTimeSlots(bookedSlots);

        if (diasDesativadosSnap.exists()) {
          setDisabledDays(diasDesativadosSnap.val());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    const formattedDate = format(date, 'dd/MM/yyyy');
    if (!disabledDays[formattedDate]) {
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
      
      // Reset time slot if services change
      setSelectedTimeSlot(null);
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
  };

  if (isBookingConfirmed) {
    const serviceNames = selectedServices.map(getServiceName).join(', ');
    const duration = getTotalDuration();
    const endTime = format(addMinutes(parse(selectedTimeSlot!, 'HH:mm', new Date()), duration), 'HH:mm');
    const needsEarlyArrival = selectedServices.some(service => 
      service === 'carbonoplastia' || service === 'taninoplastia'
    );
    
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
        <div className="max-w-xl mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-[#E3A872] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
          <p className="text-gray-600 mb-6">
            Seu agendamento de {serviceNames} foi marcado para {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} das {selectedTimeSlot} às {endTime}.
          </p>

          {needsEarlyArrival && (
            <div className="bg-[#FDF8F3] rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-center">
                <Clock className="h-5 w-5 text-[#E3A872] mr-2" />
                <span className="text-gray-700 font-medium">
                  Por favor, chegue 15 minutos antes do horário marcado
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="bg-[#FDF8F3] rounded-2xl p-4">
              <div className="flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-[#E3A872] mr-2" />
                <span className="text-gray-700">
                  Os detalhes do agendamento foram salvos
                </span>
              </div>
            </div>

            <div className="bg-[#FDF8F3] rounded-2xl p-4">
              <div className="flex items-center justify-center mb-2">
                <Phone className="h-5 w-5 text-[#E3A872] mr-2" />
                <span className="text-gray-700">
                  Contato do Barbeiro: (86) 99940-9360
                </span>
              </div>
            </div>

            <div className="bg-[#FDF8F3] rounded-2xl p-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 text-[#E3A872] mr-2" />
                  <span className="text-gray-700">
                    Rua Pirangi, 1548 - Teresina, Pi
                  </span>
                </div>
                <Button
                  onClick={() => window.open('https://maps.app.goo.gl/QmpM6serdf8M4Dr46')}
                  variant="outline"
                  className="mt-2 border-[#E3A872] text-[#E3A872] hover:bg-[#E3A872] hover:text-white"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver no Maps
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleBookAnother}
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

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Agendar um Horário</h1>
        
        <div className="space-y-6">
          <div>
            <ServiceSelection
              selectedServices={selectedServices}
              onSelectService={handleSelectService}
            />
          </div>

          {selectedServices.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Selecione uma data</h2>
              <Calendar
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                availableDates={availableDates}
              />
            </div>
          )}
          
          {selectedServices.length > 0 && selectedDate && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Horários disponíveis para {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {generateTimeSlots().map((time) => (
                  <button
                    key={time}
                    onClick={() => handleSelectTimeSlot(time)}
                    disabled={isTimeSlotDisabled(time)}
                    className={`
                      py-2 px-3 rounded-md text-sm font-medium 
                      ${selectedTimeSlot === time
                        ? 'bg-[#E3A872] text-white'
                        : isTimeSlotDisabled(time)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : 'bg-white border border-[#E8D5C4] text-gray-700 hover:bg-[#FDF8F3]'
                      }
                      transition-colors duration-150
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
              
              <div className="mt-2 space-y-2">
                {showHourDurationWarning() && (
                  <p className="text-sm text-gray-600">
                    * Este agendamento terá duração de 1 hora
                  </p>
                )}
                {needsEarlyArrival && (
                  <p className="text-sm font-medium text-[#E3A872]">
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
                className="bg-[#E3A872] hover:bg-[#D89860]"
              >
                Confirmar Agendamento
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
