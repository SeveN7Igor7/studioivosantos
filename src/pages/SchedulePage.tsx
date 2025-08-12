import React, { useState, useEffect } from 'react';
import { format, parse, startOfDay, isBefore, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, CheckCircle } from 'lucide-react';
import { ServiceSelection } from '../components/ServiceSelection';
import { TimeSlots } from '../components/TimeSlots';
import { Calendar } from '../components/Calendar/Calendar';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, set, get } from 'firebase/database';

export const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load booked slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadBookedSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadBookedSlots = async (date: Date) => {
    try {
      const formattedDate = format(date, 'dd/MM/yyyy');
      const appointmentsRef = ref(db, 'agendamentobarbeiro');
      const snapshot = await get(appointmentsRef);
      
      if (snapshot.exists()) {
        const appointments = Object.values(snapshot.val()) as any[];
        const slots = appointments
          .filter(app => app.dia === formattedDate)
          .map(app => {
            // Map time to slot ID
            const timeSlotMap: { [key: string]: string } = {
              '09:00': '1', '09:30': '2', '10:00': '3', '10:30': '4', '11:00': '5', '11:30': '6',
              '13:00': '7', '13:30': '8', '14:00': '9', '14:30': '10', '15:00': '11', '15:30': '12',
              '16:00': '13', '16:30': '14', '17:00': '15', '17:30': '16', '18:00': '17', '18:30': '18', '19:00': '19'
            };
            return timeSlotMap[app.horario];
          })
          .filter(Boolean);
        
        setBookedSlots(slots);
      } else {
        setBookedSlots([]);
      }
    } catch (error) {
      console.error('Error loading booked slots:', error);
      setBookedSlots([]);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(''); // Reset time selection when date changes
  };

  const handleTimeSlotSelect = (timeSlotId: string) => {
    setSelectedTimeSlot(timeSlotId);
  };

  const handleBooking = async () => {
    if (!selectedServices.length || !selectedDate || !selectedTimeSlot || !user) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Get service names from IDs
    const serviceNames = selectedServices.join(', ');
    
    // Map time slot ID to actual time
    const timeSlotMap: { [key: string]: string } = {
      '1': '09:00', '2': '09:30', '3': '10:00', '4': '10:30', '5': '11:00', '6': '11:30',
      '7': '13:00', '8': '13:30', '9': '14:00', '10': '14:30', '11': '15:00', '12': '15:30',
      '13': '16:00', '14': '16:30', '15': '17:00', '16': '17:30', '17': '18:00', '18': '18:30', '19': '19:00'
    };

    const appointmentTime = timeSlotMap[selectedTimeSlot];
    if (!appointmentTime) {
      alert('Horário inválido selecionado');
      return;
    }

    try {
      setIsLoading(true);
      
      const appointmentId = Date.now().toString();
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      
      const appointmentData = {
        dia: formattedDate,
        horario: appointmentTime,
        servico: serviceNames,
        userName: user.name,
        userPhone: user.phone,
        userEmail: user.email,
        duration: 30 // Default duration
      };

      // Save to main appointments
      await set(ref(db, `agendamentobarbeiro/${appointmentId}`), appointmentData);
      
      // Save to user's appointments
      await set(ref(db, `user/number/${user.phone}/agendamento/${appointmentId}`), appointmentData);

      setShowSuccess(true);
      
      // Reset form
      setSelectedServices([]);
      setSelectedDate(null);
      setSelectedTimeSlot('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Erro ao agendar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const isBookingComplete = selectedServices.length > 0 && selectedDate && selectedTimeSlot;

  if (showSuccess) {
    return (
      <div className="container-responsive max-w-2xl mx-auto">
        <div className="card-responsive text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-gray-600">
              Seu agendamento foi realizado com sucesso.
            </p>
          </div>
          
          <div className="bg-[#FDF8F3] rounded-xl p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Data:</span>
                <span>{selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Horário:</span>
                <span>{selectedTimeSlot && (() => {
                  const timeSlotMap: { [key: string]: string } = {
                    '1': '09:00', '2': '09:30', '3': '10:00', '4': '10:30', '5': '11:00', '6': '11:30',
                    '7': '13:00', '8': '13:30', '9': '14:00', '10': '14:30', '11': '15:00', '12': '15:30',
                    '13': '16:00', '14': '16:30', '15': '17:00', '16': '17:30', '17': '18:00', '18': '18:30', '19': '19:00'
                  };
                  return timeSlotMap[selectedTimeSlot];
                })()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Serviços:</span>
                <span>{selectedServices.join(', ')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-center">
              <Phone className="h-4 w-4 mr-2 text-[#E3A872]" />
              <span>Contato: (86) 99940-9360</span>
            </div>
            <div className="flex items-center justify-center">
              <MapPin className="h-4 w-4 mr-2 text-[#E3A872]" />
              <span>Rua Pirangi, 1548 - Teresina, Pi</span>
            </div>
          </div>

          <Button
            onClick={() => setShowSuccess(false)}
            className="mt-6 bg-[#E3A872] hover:bg-[#D89860]"
          >
            Fazer Novo Agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Service Selection and Calendar */}
        <div className="space-y-6">
          {/* Step 1: Service Selection */}
          <div className="card-responsive">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-[#E3A872] text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Selecionar Serviços</h2>
            </div>
            <ServiceSelection
              selectedServices={selectedServices}
              onSelectService={handleServiceSelect}
            />
          </div>

          {/* Step 2: Date Selection */}
          <div className="card-responsive">
            <div className="flex items-center mb-4">
              <div className={`w-8 h-8 ${selectedServices.length > 0 ? 'bg-[#E3A872]' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3`}>
                2
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Selecionar Data</h2>
            </div>
            {selectedServices.length > 0 ? (
              <Calendar
                selectedDate={selectedDate || new Date()}
                onDateChange={handleDateSelect}
                availableDates={Array.from({ length: 30 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  return date;
                })}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                Selecione pelo menos um serviço primeiro
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Time Selection and Summary */}
        <div className="space-y-6">
          {/* Step 3: Time Selection */}
          <div className="card-responsive">
            <div className="flex items-center mb-4">
              <div className={`w-8 h-8 ${selectedDate ? 'bg-[#E3A872]' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3`}>
                3
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Selecionar Horário</h2>
            </div>
            {selectedDate ? (
              <TimeSlots
                date={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                onSelectTimeSlot={handleTimeSlotSelect}
                bookedSlots={bookedSlots}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                Selecione uma data primeiro
              </p>
            )}
          </div>

          {/* Booking Summary */}
          <div className="card-responsive">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Agendamento</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-700">
                <User className="w-5 h-5 mr-3 text-[#E3A872]" />
                <span>{user?.name}</span>
              </div>
              
              {selectedServices.length > 0 && (
                <div className="flex items-start text-gray-700">
                  <User className="w-5 h-5 mr-3 mt-0.5 text-[#E3A872]" />
                  <div>
                    <span className="font-medium">Serviços:</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedServices.join(', ')}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedDate && (
                <div className="flex items-center text-gray-700">
                  <CalendarIcon className="w-5 h-5 mr-3 text-[#E3A872]" />
                  <span>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              )}
              
              {selectedTimeSlot && (
                <div className="flex items-center text-gray-700">
                  <Clock className="w-5 h-5 mr-3 text-[#E3A872]" />
                  <span>{(() => {
                    const timeSlotMap: { [key: string]: string } = {
                      '1': '09:00', '2': '09:30', '3': '10:00', '4': '10:30', '5': '11:00', '6': '11:30',
                      '7': '13:00', '8': '13:30', '9': '14:00', '10': '14:30', '11': '15:00', '12': '15:30',
                      '13': '16:00', '14': '16:30', '15': '17:00', '16': '17:30', '17': '18:00', '18': '18:30', '19': '19:00'
                    };
                    return timeSlotMap[selectedTimeSlot];
                  })()}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-[#E3A872]" />
                  <span>Contato: (86) 99940-9360</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-[#E3A872]" />
                  <span>Rua Pirangi, 1548 - Teresina, Pi</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleBooking}
              disabled={!isBookingComplete || isLoading}
              isLoading={isLoading}
              fullWidth
              className="bg-[#E3A872] hover:bg-[#D89860]"
            >
              Confirmar Agendamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
