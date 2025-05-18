import React, { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '../components/Calendar/Calendar';
import { TimeSlots } from '../components/TimeSlots';
import { ServiceSelection } from '../components/ServiceSelection';
import { Button } from '../components/Button';
import { CheckCircle, Calendar as CalendarIcon, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, set, remove, get } from 'firebase/database';

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

export const SchedulePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [disabledDays, setDisabledDays] = useState<{ [key: string]: boolean }>({});
  const { user } = useAuth();

  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

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
        
        if (appointmentsSnap.exists()) {
          const appointments = appointmentsSnap.val();
          const booked = Object.values(appointments)
            .filter((appointment: any) => appointment.dia === formattedDate)
            .map((appointment: any) => {
              return Object.entries(timeSlotMap).find(
                ([_, time]) => time === appointment.horario
              )?.[0] || '';
            });
          setBookedSlots(booked);
        } else {
          setBookedSlots([]);
        }

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
      setSelectedServices([]);
    }
  };

  const handleSelectTimeSlot = (timeSlotId: string) => {
    setSelectedTimeSlot(timeSlotId);
  };

  const handleSelectService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
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

      const appointmentData = {
        dia: formattedDate,
        horario: timeSlotMap[selectedTimeSlot],
        servico: serviceNames,
        userName: user.name,
        userPhone: user.phone,
        userEmail: user.email
      };

      await set(ref(db, `user/number/${user.phone}/agendamento/${appointmentId}`), {
        dia: formattedDate,
        horario: timeSlotMap[selectedTimeSlot],
        servico: serviceNames
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
    
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
        <div className="max-w-xl mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-[#E3A872] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
          <p className="text-gray-600 mb-6">
            Seu agendamento de {serviceNames} foi marcado para {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} às {timeSlotMap[selectedTimeSlot!]}.
          </p>

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
                  Contato do Barbeiro: (11) 95234-3456
                </span>
              </div>
            </div>

            <div className="bg-[#FDF8F3] rounded-2xl p-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 text-[#E3A872] mr-2" />
                  <span className="text-gray-700">
                    Rua Exemplo, 123 - São Paulo, SP
                  </span>
                </div>
                <Button
                  onClick={() => window.open('https://maps.google.com/?q=Rua+Exemplo+123+São+Paulo+SP', '_blank')}
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

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Agendar um Horário</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Selecione uma data</h2>
            <Calendar
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              availableDates={availableDates}
            />
          </div>
          
          {selectedDate && (
            <div>
              <TimeSlots
                date={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                onSelectTimeSlot={handleSelectTimeSlot}
                bookedSlots={bookedSlots}
              />
            </div>
          )}
          
          {selectedTimeSlot && (
            <div>
              <ServiceSelection
                selectedServices={selectedServices}
                onSelectService={handleSelectService}
              />
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