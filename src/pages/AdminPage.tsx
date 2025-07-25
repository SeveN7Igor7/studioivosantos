import React, { useEffect, useState } from 'react';
import { format, parse, startOfMonth, endOfMonth, addDays, isSameDay, isWithinInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, Scissors, Phone, Mail, Plus, Edit2, Check, X, Search, TrendingUp, CheckCircle2, Ban, DollarSign } from 'lucide-react';
import { db } from '../lib/firebase';
import { ref, onValue, set, remove, get } from 'firebase/database';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Calendar } from '../components/Calendar/Calendar';

interface Appointment {
  dia: string;
  horario: string;
  servico: string;
  userPhone: string;
  userName: string;
  userEmail: string;
  id?: string;
  status?: 'active' | 'completed' | 'cancelled';
  completedAt?: string;
  cancelledAt?: string;
  duration?: number;
}

const servicesPrices: { [key: string]: number | { p: number; m: number; g: number } } = {
  'Corte de Cabelo': 40,
  'Barba': 40,
  'Sobrancelha': 15,
  'Carbonoplastia P': 120,
  'Carbonoplastia M': 140,
  'Carbonoplastia G': 160,
  'Pigmentação': 50,
  'Limpeza Facial': 50,
  'Taninoplastia P': 120,
  'Taninoplastia M': 140,
  'Taninoplastia G': 160
};

const HOUR_LONG_SERVICES = ['Carbonoplastia P', 'Carbonoplastia M', 'Carbonoplastia G', 'Taninoplastia P', 'Taninoplastia M', 'Taninoplastia G'];
const THIRTY_MINUTE_SERVICES = ['Corte de Cabelo', 'Barba', 'Pigmentação', 'Limpeza Facial'];

export const AdminPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, completed: 0, cancelled: 0 });
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [disabledDays, setDisabledDays] = useState<string[]>([]);
  const [dailyProfit, setDailyProfit] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editForm, setEditForm] = useState<Appointment>({
    dia: format(new Date(), 'dd/MM/yyyy'),
    horario: '',
    servico: '',
    userName: '',
    userPhone: '',
    userEmail: '',
  });

  const availableDates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));

  // Calculate total duration based on selected services
  const getTotalDuration = (services: string[]) => {
    // If any selected service is an hour-long service
    if (services.some(service => HOUR_LONG_SERVICES.includes(service))) {
      return 60;
    }

    // Count how many 30-minute services are selected
    const thirtyMinuteServicesCount = services.filter(service => 
      THIRTY_MINUTE_SERVICES.includes(service)
    ).length;

    // If multiple 30-minute services are selected, return 60 minutes
    if (thirtyMinuteServicesCount > 1) {
      return 60;
    }

    // For single 30-minute service or only eyebrows
    return thirtyMinuteServicesCount === 1 ? 30 : 0;
  };

  // Convert time string to minutes for easier calculation
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if a time slot conflicts with existing appointments
  const isTimeSlotConflicting = (timeSlot: string, duration: number, excludeId?: string) => {
    const startMinutes = timeToMinutes(timeSlot);
    const endMinutes = startMinutes + duration;
    const appointmentDate = parse(editForm.dia, 'dd/MM/yyyy', new Date());
    const isSaturday = getDay(appointmentDate) === 6;
    
    // Check against existing appointments for the selected date
    const dateAppointments = existingAppointments.filter(app => 
      app.dia === editForm.dia && app.id !== excludeId
    );
    
    for (const appointment of dateAppointments) {
      const existingStartMinutes = timeToMinutes(appointment.horario);
      const existingDuration = appointment.duration || 30;
      const existingEndMinutes = existingStartMinutes + existingDuration;
      
      // Check for overlap: appointments overlap if:
      // (new start < existing end) AND (new end > existing start)
      if (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) {
        return true;
      }
    }

    // Check lunch hour conflict
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
      // Check if appointment would end after 20:00 (absolute latest end time for other days)
      const absoluteEndTime = 20 * 60; // 20:00
      if (endMinutes > absoluteEndTime) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    const appointmentsRef = ref(db, 'agendamentobarbeiro');
    const completedRef = ref(db, 'finalizados');
    const cancelledRef = ref(db, 'cancelados');
    const diasDesativadosRef = ref(db, 'diasdesativados');
    
    const fetchAndCalculateStats = async () => {
      try {
        const [appointmentsSnap, completedSnap, cancelledSnap, diasDesativadosSnap] = await Promise.all([
          get(appointmentsRef),
          get(completedRef),
          get(cancelledRef),
          get(diasDesativadosRef)
        ]);

        const allAppointments: Appointment[] = [];
        const existingApps: any[] = [];
        
        // Active appointments
        if (appointmentsSnap.exists()) {
          Object.entries(appointmentsSnap.val()).forEach(([id, appointment]: [string, any]) => {
            allAppointments.push({
              ...appointment,
              id,
              status: 'active'
            });
            existingApps.push({
              ...appointment,
              id,
              duration: appointment.duration || 30
            });
          });
        }

        // Completed appointments
        if (completedSnap.exists()) {
          Object.entries(completedSnap.val()).forEach(([id, appointment]: [string, any]) => {
            allAppointments.push({
              ...appointment,
              id,
              status: 'completed'
            });
          });
        }

        // Cancelled appointments
        if (cancelledSnap.exists()) {
          Object.entries(cancelledSnap.val()).forEach(([id, appointment]: [string, any]) => {
            allAppointments.push({
              ...appointment,
              id,
              status: 'cancelled'
            });
          });
        }
        
        allAppointments.sort((a, b) => {
          const dateA = new Date(a.dia.split('/').reverse().join('-') + 'T' + a.horario);
          const dateB = new Date(b.dia.split('/').reverse().join('-') + 'T' + b.horario);
          return dateA.getTime() - dateB.getTime();
        });
        
        setAppointments(allAppointments);
        setExistingAppointments(existingApps);

        // Calculate daily profit for selected date
        const selectedDateStr = format(selectedDate, 'dd/MM/yyyy');
        const completedToday = allAppointments.filter(
          app => app.status === 'completed' && app.dia === selectedDateStr
        );

        const dailyProfit = completedToday.reduce((total, app) => {
          const services = app.servico.split(', ');
          const serviceTotal = services.reduce((acc, service) => {
            const price = servicesPrices[service];
            if (typeof price === 'number') {
              return acc + price;
            }
            // For services with sizes, use the medium price as default
            if (typeof price === 'object') {
              return acc + price.m;
            }
            return acc;
          }, 0);
          return total + serviceTotal;
        }, 0);

        setDailyProfit(dailyProfit);

        // Calculate monthly stats and profit for the current month being viewed
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Filter all appointments for the current month being viewed
        const appointmentsThisMonth = allAppointments.filter(app => {
          const appDate = parse(app.dia, 'dd/MM/yyyy', new Date());
          return isWithinInterval(appDate, { start: monthStart, end: monthEnd });
        });

        // Separate by status for the current month
        const completedThisMonth = appointmentsThisMonth.filter(app => app.status === 'completed');
        const cancelledThisMonth = appointmentsThisMonth.filter(app => app.status === 'cancelled');
        const activeThisMonth = appointmentsThisMonth.filter(app => app.status === 'active');

        // Calculate monthly profit from completed appointments
        const monthlyProfit = completedThisMonth.reduce((total, app) => {
          const services = app.servico.split(', ');
          const serviceTotal = services.reduce((acc, service) => {
            const price = servicesPrices[service];
            if (typeof price === 'number') {
              return acc + price;
            }
            if (typeof price === 'object') {
              return acc + price.m;
            }
            return acc;
          }, 0);
          return total + serviceTotal;
        }, 0);

        setMonthlyProfit(monthlyProfit);

        // Update monthly stats based on the current month being viewed
        setMonthlyStats({
          total: appointmentsThisMonth.length,
          completed: completedThisMonth.length,
          cancelled: cancelledThisMonth.length
        });

        if (diasDesativadosSnap.exists()) {
          setDisabledDays(Object.keys(diasDesativadosSnap.val()));
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchAndCalculateStats();

    // Set up real-time listeners for all data sources
    const unsubscribeAppointments = onValue(appointmentsRef, fetchAndCalculateStats);
    const unsubscribeCompleted = onValue(completedRef, fetchAndCalculateStats);
    const unsubscribeCancelled = onValue(cancelledRef, fetchAndCalculateStats);
    const unsubscribeDisabled = onValue(diasDesativadosRef, fetchAndCalculateStats);
    
    return () => {
      unsubscribeAppointments();
      unsubscribeCompleted();
      unsubscribeCancelled();
      unsubscribeDisabled();
    };
  }, [selectedDate, currentMonth]);

  const handleComplete = async (appointment: Appointment) => {
    if (window.confirm('Confirmar que este agendamento foi finalizado?')) {
      try {
        const completedRef = ref(db, `finalizados/${appointment.id}`);
        await set(completedRef, {
          ...appointment,
          completedAt: new Date().toISOString(),
          status: 'completed'
        });
        
        if (appointment.userPhone) {
          await remove(ref(db, `user/number/${appointment.userPhone}/agendamento/${appointment.id}`));
        }
        
        await remove(ref(db, `agendamentobarbeiro/${appointment.id}`));
      } catch (error) {
        console.error('Erro ao finalizar agendamento:', error);
        alert('Erro ao finalizar o agendamento');
      }
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        const cancelledRef = ref(db, `cancelados/${appointment.id}`);
        await set(cancelledRef, {
          ...appointment,
          cancelledAt: new Date().toISOString(),
          status: 'cancelled'
        });
        
        if (appointment.userPhone) {
          await remove(ref(db, `user/number/${appointment.userPhone}/agendamento/${appointment.id}`));
        }
        
        await remove(ref(db, `agendamentobarbeiro/${appointment.id}`));
      } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        alert('Erro ao cancelar o agendamento');
      }
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setIsEditing(appointment.id);
    setEditForm(appointment);
    // Parse existing services for editing
    const services = appointment.servico.split(', ');
    setSelectedServices(services);
  };

  const handleSelectService = (service: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service];
      return newServices;
    });
  };

  const validateTimeFormat = (time: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Only allow numbers and colon
    value = value.replace(/[^\d:]/g, '');
    
    // Auto-add colon after 2 digits if not present
    if (value.length === 2 && !value.includes(':')) {
      value += ':';
    }
    
    // Limit to 5 characters (HH:MM)
    if (value.length <= 5) {
      setEditForm({...editForm, horario: value});
    }
  };

  const handleSave = async () => {
    if (!editForm.dia || !editForm.horario || !editForm.userName || selectedServices.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!validateTimeFormat(editForm.horario)) {
      alert('Por favor, insira um horário válido no formato HH:MM');
      return;
    }

    const [hours, minutes] = editForm.horario.split(':').map(Number);
    const appointmentDate = parse(editForm.dia, 'dd/MM/yyyy', new Date());
    const isTuesday = getDay(appointmentDate) === 2;
    const isSunday = getDay(appointmentDate) === 0;
    const isSaturday = getDay(appointmentDate) === 6;
    
    // Check if it's Tuesday or Sunday
    if (isTuesday) {
      alert('Não é possível agendar para terças-feiras');
      return;
    }

    if (isSunday) {
      alert('Não é possível agendar para domingos');
      return;
    }

    // Check time limits based on day
    if (isSaturday) {
      if (hours < 8 || hours > 17 || (hours === 17 && minutes > 0)) {
        alert('Aos sábados, o horário deve estar entre 08:00 e 17:00');
        return;
      }
    } else {
      if (hours < 8 || hours > 22 || (hours === 22 && minutes > 0)) {
        alert('O horário deve estar entre 08:00 e 19:00');
        return;
      }
    }

    const duration = getTotalDuration(selectedServices);
    
    // Check for conflicts with existing appointments
    if (isTimeSlotConflicting(editForm.horario, duration, isEditing || undefined)) {
      if (isSaturday) {
        alert('Este horário conflita com outro agendamento existente ou ultrapassa o horário de funcionamento de sábado (atendimento até 18:00)');
      } else {
        alert('Este horário conflita com outro agendamento existente ou ultrapassa o horário de funcionamento');
      }
      return;
    }

    try {
      const newId = Date.now().toString();
      const serviceNames = selectedServices.join(', ');
      
      const appointmentData = {
        dia: editForm.dia,
        horario: editForm.horario,
        servico: serviceNames,
        userName: editForm.userName,
        userPhone: editForm.userPhone || '',
        userEmail: editForm.userEmail || '',
        duration
      };

      if (isEditing) {
        await set(ref(db, `agendamentobarbeiro/${isEditing}`), appointmentData);
      } else {
        await set(ref(db, `agendamentobarbeiro/${newId}`), appointmentData);
      }
      
      setIsEditing(null);
      setIsAdding(false);
      setSelectedServices([]);
      setEditForm({
        dia: format(selectedDate, 'dd/MM/yyyy'),
        horario: '',
        servico: '',
        userName: '',
        userPhone: '',
        userEmail: '',
      });
    } catch (error) {
      alert('Erro ao salvar o agendamento');
      console.error(error);
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setEditForm(prev => ({
      ...prev,
      dia: format(date, 'dd/MM/yyyy')
    }));
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = app.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const appDate = parse(app.dia, 'dd/MM/yyyy', new Date());
    return matchesSearch && format(appDate, 'dd/MM/yyyy') === format(selectedDate, 'dd/MM/yyyy');
  }).sort((a, b) => {
    // Sort by time (horario) in ascending order
    const timeA = a.horario.split(':').map(Number);
    const timeB = b.horario.split(':').map(Number);
    
    // Convert to minutes for easy comparison
    const minutesA = timeA[0] * 60 + timeA[1];
    const minutesB = timeB[0] * 60 + timeB[1];
    
    return minutesA - minutesB;
  });

  const services = [
    'Corte de Cabelo',
    'Barba',
    'Sobrancelha',
    'Carbonoplastia P',
    'Carbonoplastia M',
    'Carbonoplastia G',
    'Pigmentação',
    'Limpeza Facial',
    'Taninoplastia P',
    'Taninoplastia M',
    'Taninoplastia G'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E3A872]"></div>
      </div>
    );
  }

  const needsEarlyArrival = selectedServices.some(service => 
    service.includes('Carbonoplastia') || service.includes('Taninoplastia')
  );

  const showHourDurationWarning = () => {
    const thirtyMinuteServicesCount = selectedServices.filter(service => 
      THIRTY_MINUTE_SERVICES.includes(service)
    ).length;
    return thirtyMinuteServicesCount > 1 || selectedServices.some(service => HOUR_LONG_SERVICES.includes(service));
  };

  const appointmentDate = parse(editForm.dia, 'dd/MM/yyyy', new Date());
  const isTuesday = getDay(appointmentDate) === 2;
  const isSunday = getDay(appointmentDate) === 0;
  const isSaturday = getDay(appointmentDate) === 6;

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 relative z-10">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-[#E3A872] to-[#D89860]">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-3 lg:space-y-0">
            <div className="w-full lg:w-auto">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                Painel Administrativo
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-[#FDF8F3]">
                Gerenciamento de agendamentos
              </p>
            </div>
            <button
              onClick={() => {
                setIsAdding(true);
                setSelectedServices([]);
                setEditForm({
                  dia: format(selectedDate, 'dd/MM/yyyy'),
                  horario: '',
                  servico: '',
                  userName: '',
                  userPhone: '',
                  userEmail: '',
                });
              }}
              className="w-full lg:w-auto bg-white text-[#E3A872] px-3 sm:px-4 py-2 rounded-lg hover:bg-[#FDF8F3] transition-colors duration-200 flex items-center justify-center"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="font-medium text-sm sm:text-base">Novo Agendamento</span>
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          <div className="mb-4 sm:mb-6 bg-[#FDF8F3] rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-[#E3A872] mb-1 sm:mb-0 sm:mr-2" />
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900">Total</h3>
                  <p className="text-sm sm:text-lg font-semibold text-[#E3A872]">{monthlyStats.total}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mb-1 sm:mb-0 sm:mr-2" />
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900">Finalizados</h3>
                  <p className="text-sm sm:text-lg font-semibold text-green-600">{monthlyStats.completed}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <Ban className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mb-1 sm:mb-0 sm:mr-2" />
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900">Cancelados</h3>
                  <p className="text-sm sm:text-lg font-semibold text-red-600">{monthlyStats.cancelled}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mb-1 sm:mb-0 sm:mr-2" />
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900">Lucro Diário</h3>
                  <p className="text-sm sm:text-lg font-semibold text-green-600">
                    R$ {dailyProfit.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left col-span-2 sm:col-span-1">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mb-1 sm:mb-0 sm:mr-2" />
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900">Lucro Mensal</h3>
                  <p className="text-sm sm:text-lg font-semibold text-green-600">
                    R$ {monthlyProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 sm:mb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Buscar por nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  className="pl-8 sm:pl-10"
                />
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-[#E8D5C4]">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Calendário</h3>
              </div>
              <Calendar
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                availableDates={availableDates}
                onMonthChange={setCurrentMonth}
                isAdmin
              />
            </div>
          </div>

          {(isAdding || isEditing) && (
            <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 lg:p-6 rounded-lg border border-[#E8D5C4]">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                {isAdding ? 'Novo Agendamento' : 'Editar Agendamento'}
              </h3>
              
              {(isTuesday || isSunday) && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ {isTuesday ? 'Terças-feiras' : 'Domingos'} não estão disponíveis para agendamentos. Por favor, selecione outro dia.
                  </p>
                </div>
              )}
              
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <Input
                    label="Nome do Cliente"
                    value={editForm.userName}
                    onChange={(e) => setEditForm({...editForm, userName: e.target.value})}
                    fullWidth
                    required
                  />
                  <Input
                    label="Telefone"
                    value={editForm.userPhone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                        setEditForm({...editForm, userPhone: value});
                      }
                    }}
                    placeholder="(99) 99999-9999"
                    fullWidth
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Serviços (selecione quantos quiser)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {services.map((service) => (
                      <button
                        key={service}
                        onClick={() => handleSelectService(service)}
                        className={`
                          p-2 rounded-md text-xs sm:text-sm font-medium transition-colors
                          ${selectedServices.includes(service)
                            ? 'bg-[#E3A872] text-white'
                            : 'bg-white border border-[#E8D5C4] text-gray-700 hover:bg-[#FDF8F3]'
                          }
                        `}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                  
                  {selectedServices.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs sm:text-sm text-gray-600">
                        Serviços selecionados: {selectedServices.join(', ')}
                      </p>
                      {showHourDurationWarning() && (
                        <p className="text-xs sm:text-sm font-medium text-[#E3A872]">
                          * Este agendamento terá duração de 1 hora
                        </p>
                      )}
                      {needsEarlyArrival && (
                        <p className="text-xs sm:text-sm font-medium text-[#E3A872]">
                          * Cliente deve chegar 15 minutos antes do horário marcado
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Horário {isSaturday ? '(08:00 - 17:00, exceto 12:00 - 13:00)' : '(08:00 - 19:00, exceto 12:00 - 13:00)'}
                    </label>
                    <Input
                      value={editForm.horario}
                      onChange={handleTimeChange}
                      placeholder="HH:MM"
                      className="w-full sm:w-32"
                      disabled={isTuesday || isSunday}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      * Horário de almoço: 12:00 - 13:00 (não disponível)
                      {isSaturday && (
                        <><br />* Sábado: agendamentos até às 17:00 (atendimento até às 18:00)</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(null);
                    setIsAdding(false);
                    setSelectedServices([]);
                  }}
                  className="w-full sm:w-auto border-[#E3A872] text-[#E3A872] hover:bg-[#FDF8F3]"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="w-full sm:w-auto bg-[#E3A872] hover:bg-[#D89860]"
                  disabled={selectedServices.length === 0 || isTuesday || isSunday}
                >
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`
                  bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-200
                  ${appointment.status === 'completed' ? 'border-green-200 bg-green-50' : 
                    appointment.status === 'cancelled' ? 'border-red-200 bg-red-50' :
                    'border-[#E8D5C4]'}
                `}
              >
                <div className="p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">{appointment.dia}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">{appointment.horario}</span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="text-gray-900 text-xs sm:text-sm truncate">{appointment.userName}</span>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Scissors className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="text-gray-900 text-xs sm:text-sm break-words">{appointment.servico}</span>
                    </div>

                    {appointment.userPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          appointment.status === 'completed' ? 'text-green-600' :
                          appointment.status === 'cancelled' ? 'text-red-600' :
                          'text-[#E3A872]'
                        }`} />
                        <span className="text-gray-900 text-xs sm:text-sm">
                          {appointment.userPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                        </span>
                      </div>
                    )}

                    {appointment.userEmail && (
                      <div className="flex items-start space-x-2">
                        <Mail className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${
                          appointment.status === 'completed' ? 'text-green-600' :
                          appointment.status === 'cancelled' ? 'text-red-600' :
                          'text-[#E3A872]'
                        }`} />
                        <span className="text-gray-900 text-xs sm:text-sm break-all">{appointment.userEmail}</span>
                      </div>
                    )}

                    {appointment.status && (
                      <div className={`mt-2 text-xs sm:text-sm font-medium ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`}>
                        Status: {
                          appointment.status === 'completed' ? 'Finalizado' :
                          appointment.status === 'cancelled' ? 'Cancelado' :
                          'Ativo'
                        }
                        {appointment.duration && (
                          <span className="ml-2">
                            • Duração: {appointment.duration === 60 ? '1 hora' : '30 min'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {appointment.status === 'active' && (
                    <div className="mt-3 sm:mt-4 flex flex-col space-y-2">
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleComplete(appointment)}
                          className="w-full text-green-600 hover:bg-green-50 border-green-600 text-xs sm:text-sm"
                          size="sm"
                        >
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Finalizado
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(appointment)}
                          className="w-full text-red-600 hover:bg-red-50 border-red-600 text-xs sm:text-sm"
                          size="sm"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Cancelar
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(appointment)}
                        className="w-full border-[#E3A872] text-[#E3A872] hover:bg-[#FDF8F3] text-xs sm:text-sm"
                        size="sm"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <CalendarIcon className="h-8 w-8 sm:h-12 sm:w-12 text-[#E3A872] mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-sm sm:text-base text-gray-500">
                Não há agendamentos para o período selecionado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
