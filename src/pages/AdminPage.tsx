import React, { useEffect, useState } from 'react';
import { format, parse, startOfMonth, endOfMonth, addDays, isSameDay, isWithinInterval } from 'date-fns';
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

  useEffect(() => {
    const appointmentsRef = ref(db, 'agendamentobarbeiro');
    const completedRef = ref(db, 'finalizados');
    const cancelledRef = ref(db, 'cancelados');
    const diasDesativadosRef = ref(db, 'diasdesativados');
    
    const fetchData = async () => {
      try {
        const [appointmentsSnap, completedSnap, cancelledSnap, diasDesativadosSnap] = await Promise.all([
          get(appointmentsRef),
          get(completedRef),
          get(cancelledRef),
          get(diasDesativadosRef)
        ]);

        const allAppointments: Appointment[] = [];
        
        // Active appointments
        if (appointmentsSnap.exists()) {
          Object.entries(appointmentsSnap.val()).forEach(([id, appointment]: [string, any]) => {
            allAppointments.push({
              ...appointment,
              id,
              status: 'active'
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

        // Calculate daily profit
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

        // Calculate monthly profit
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const completedThisMonth = allAppointments.filter(app => {
          const appDate = parse(app.dia, 'dd/MM/yyyy', new Date());
          return app.status === 'completed' && isWithinInterval(appDate, { start: monthStart, end: monthEnd });
        });

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
        
        const completedCount = completedSnap.exists() ? Object.keys(completedSnap.val()).length : 0;
        const cancelledCount = cancelledSnap.exists() ? Object.keys(cancelledSnap.val()).length : 0;
        
        setMonthlyStats({
          total: allAppointments.length,
          completed: completedCount,
          cancelled: cancelledCount
        });

        const bookedSlots = new Set<string>();

        if (appointmentsSnap.exists()) {
          Object.values(appointmentsSnap.val()).forEach((app: any) => {
            if (app.dia === selectedDateStr) {
              bookedSlots.add(app.horario);
            }
          });
        }

        if (diasDesativadosSnap.exists()) {
          setDisabledDays(Object.keys(diasDesativadosSnap.val()));
        }

        setBookedTimeSlots(Array.from(bookedSlots));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();

    const unsubscribe = onValue(appointmentsRef, fetchData);
    return () => unsubscribe();
  }, [selectedDate]);

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
    if (hours < 8 || hours > 22 || (hours === 22 && minutes > 0)) {
      alert('O horário deve estar entre 08:00 e 22:00');
      return;
    }

    try {
      const newId = Date.now().toString();
      const serviceNames = selectedServices.join(', ');
      const duration = getTotalDuration(selectedServices);
      
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-[#E3A872] to-[#D89860]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Painel Administrativo
              </h1>
              <p className="text-[#FDF8F3]">
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
              className="bg-white text-[#E3A872] px-4 py-2 rounded-lg hover:bg-[#FDF8F3] transition-colors duration-200 flex items-center whitespace-nowrap"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="font-medium">Novo Agendamento</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-[#FDF8F3] rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 text-[#E3A872] mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Total</h3>
                  <p className="text-lg font-semibold text-[#E3A872]">{monthlyStats.total}</p>
                </div>
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Finalizados</h3>
                  <p className="text-lg font-semibold text-green-600">{monthlyStats.completed}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Ban className="h-6 w-6 text-red-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Cancelados</h3>
                  <p className="text-lg font-semibold text-red-600">{monthlyStats.cancelled}</p>
                </div>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Lucro Diário</h3>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {dailyProfit.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Lucro Mensal</h3>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {monthlyProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Buscar por nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  className="pl-10"
                />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#E8D5C4]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Calendário</h3>
              </div>
              <Calendar
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                availableDates={availableDates}
                isAdmin
              />
            </div>
          </div>

          {(isAdding || isEditing) && (
            <div className="mb-6 bg-white p-6 rounded-lg border border-[#E8D5C4]">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isAdding ? 'Novo Agendamento' : 'Editar Agendamento'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Serviços (selecione quantos quiser)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {services.map((service) => (
                      <button
                        key={service}
                        onClick={() => handleSelectService(service)}
                        className={`
                          p-2 rounded-md text-sm font-medium transition-colors
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
                      <p className="text-sm text-gray-600">
                        Serviços selecionados: {selectedServices.join(', ')}
                      </p>
                      {showHourDurationWarning() && (
                        <p className="text-sm font-medium text-[#E3A872]">
                          * Este agendamento terá duração de 1 hora
                        </p>
                      )}
                      {needsEarlyArrival && (
                        <p className="text-sm font-medium text-[#E3A872]">
                          * Cliente deve chegar 15 minutos antes do horário marcado
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário (08:00 - 22:00)
                  </label>
                  <Input
                    value={editForm.horario}
                    onChange={handleTimeChange}
                    placeholder="HH:MM"
                    className="w-32"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(null);
                    setIsAdding(false);
                    setSelectedServices([]);
                  }}
                  className="w-full sm:w-auto border-[#E3A872] text-[#E3A872] hover:bg-[#FDF8F3]"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="w-full sm:w-auto bg-[#E3A872] hover:bg-[#D89860]"
                  disabled={selectedServices.length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className={`h-5 w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="font-medium text-gray-900">{appointment.dia}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className={`h-5 w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="font-medium text-gray-900">{appointment.horario}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className={`h-5 w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="text-gray-900">{appointment.userName}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Scissors className={`h-5 w-5 ${
                        appointment.status === 'completed' ? 'text-green-600' :
                        appointment.status === 'cancelled' ? 'text-red-600' :
                        'text-[#E3A872]'
                      }`} />
                      <span className="text-gray-900">{appointment.servico}</span>
                    </div>

                    {appointment.userPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className={`h-5 w-5 ${
                          appointment.status === 'completed' ? 'text-green-600' :
                          appointment.status === 'cancelled' ? 'text-red-600' :
                          'text-[#E3A872]'
                        }`} />
                        <span className="text-gray-900">
                          {appointment.userPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                        </span>
                      </div>
                    )}

                    {appointment.userEmail && (
                      <div className="flex items-center space-x-2">
                        <Mail className={`h-5 w-5 ${
                          appointment.status === 'completed' ? 'text-green-600' :
                          appointment.status === 'cancelled' ? 'text-red-600' :
                          'text-[#E3A872]'
                        }`} />
                        <span className="text-gray-900">{appointment.userEmail}</span>
                      </div>
                    )}

                    {appointment.status && (
                      <div className={`mt-2 text-sm font-medium ${
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
                    <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleComplete(appointment)}
                        className="w-full sm:w-auto text-green-600 hover:bg-green-50 border-green-600"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Finalizado
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(appointment)}
                        className="w-full sm:w-auto text-red-600 hover:bg-red-50 border-red-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(appointment)}
                        className="w-full sm:w-auto border-[#E3A872] text-[#E3A872] hover:bg-[#FDF8F3]"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-[#E3A872] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-gray-500">
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
