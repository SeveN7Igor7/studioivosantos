import React, { useEffect, useState } from 'react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { User, Calendar, Clock, Scissors, Phone, X, MapPin } from 'lucide-react';
import { Button } from '../components/Button';

interface Appointment {
  dia: string;
  horario: string;
  servico: string;
  status?: 'active' | 'completed' | 'cancelled';
  completedAt?: string;
  cancelledAt?: string;
  id?: string;
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.phone) return;

    const fetchAppointments = async () => {
      setIsLoading(true);
      const appointmentsRef = ref(db, `user/number/${user.phone}/agendamento`);
      const completedRef = ref(db, 'finalizados');
      const cancelledRef = ref(db, 'cancelados');

      const unsubscribe = onValue(ref(db, 'agendamentobarbeiro'), async (snapshot) => {
        try {
          const [completedSnap, cancelledSnap] = await Promise.all([
            new Promise((resolve) => onValue(completedRef, resolve, { onlyOnce: true })),
            new Promise((resolve) => onValue(cancelledRef, resolve, { onlyOnce: true }))
          ]);

          const activeAppointments: Appointment[] = [];
          const completedAppointments: Appointment[] = [];
          const cancelledAppointments: Appointment[] = [];

          // Active appointments
          if (snapshot.exists()) {
            Object.entries(snapshot.val()).forEach(([id, appointment]: [string, any]) => {
              if (appointment.userPhone === user.phone) {
                activeAppointments.push({
                  ...appointment,
                  status: 'active',
                  id
                });
              }
            });
          }

          // Completed appointments
          if (completedSnap.exists()) {
            Object.values(completedSnap.val()).forEach((appointment: any) => {
              if (appointment.userPhone === user.phone) {
                completedAppointments.push({
                  ...appointment,
                  status: 'completed'
                });
              }
            });
          }

          // Cancelled appointments
          if (cancelledSnap.exists()) {
            Object.values(cancelledSnap.val()).forEach((appointment: any) => {
              if (appointment.userPhone === user.phone) {
                cancelledAppointments.push({
                  ...appointment,
                  status: 'cancelled'
                });
              }
            });
          }

          const allAppointments = [...activeAppointments, ...completedAppointments, ...cancelledAppointments];
          
          allAppointments.sort((a, b) => {
            const dateA = new Date(`${a.dia.split('/').reverse().join('-')}T${a.horario}`);
            const dateB = new Date(`${b.dia.split('/').reverse().join('-')}T${b.horario}`);
            return dateB.getTime() - dateA.getTime();
          });

          setAppointments(allAppointments);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching appointments:', error);
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    fetchAppointments();
  }, [user?.phone]);

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!appointment.id || !user?.phone) return;

    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        await remove(ref(db, `agendamentobarbeiro/${appointment.id}`));
        await remove(ref(db, `user/number/${user.phone}/agendamento/${appointment.id}`));
      } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        alert('Erro ao cancelar o agendamento');
      }
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-[#E3A872]';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Agendado';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E3A872]"></div>
      </div>
    );
  }

  const pendingAppointments = appointments.filter(app => app.status === 'active');
  const pastAppointments = appointments.filter(app => app.status === 'completed' || app.status === 'cancelled');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-[#E3A872] to-[#D89860]">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 rounded-full">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
              <p className="text-white/90">{user?.email}</p>
              <p className="text-white/90">
                {user?.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#FDF8F3] rounded-2xl p-4">
              <div className="flex items-center mb-2">
                <Phone className="h-5 w-5 text-[#E3A872] mr-2" />
                <span className="text-gray-700 font-medium">
                  Contato do Barbeiro: (86) 99940-9360
                </span>
              </div>
            </div>

            <div className="bg-[#FDF8F3] rounded-2xl p-4">
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 text-[#E3A872] mr-2" />
                  <span className="text-gray-700 font-medium">
                    Rua Pirangi, 1548 - Teresina, Pi
                  </span>
                </div>
                <Button
                  onClick={() => window.open('https://maps.app.goo.gl/QmpM6serdf8M4Dr46')}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-[#E3A872] text-[#E3A872] hover:bg-[#E3A872] hover:text-white"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver no Maps
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Agendamentos Pendentes
            </h2>
            
            {pendingAppointments.length > 0 ? (
              <div className="space-y-4">
                {pendingAppointments.map((appointment, index) => (
                  <div
                    key={index}
                    className="bg-white border border-[#E8D5C4] rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-[#E3A872]" />
                          <span className="font-medium">{appointment.dia}</span>
                          <Clock className="h-5 w-5 ml-2 text-[#E3A872]" />
                          <span className="font-medium">{appointment.horario}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Scissors className="h-5 w-5 text-[#E3A872]" />
                        <span>{appointment.servico}</span>
                      </div>
                      
                      <div className="flex items-center justify-between border-t pt-3 mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)} bg-[#FDF8F3]`}>
                          {getStatusText(appointment.status)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelAppointment(appointment)}
                          className="text-red-600 hover:bg-red-50 border-red-600"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum agendamento pendente
              </p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Histórico de Agendamentos
            </h2>
            {pastAppointments.length > 0 ? (
              <div className="space-y-4">
                {pastAppointments.map((appointment, index) => (
                  <div
                    key={index}
                    className="bg-white border border-[#E8D5C4] rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-[#E3A872]" />
                          <span className="font-medium">{appointment.dia}</span>
                          <Clock className="h-5 w-5 ml-2 text-[#E3A872]" />
                          <span className="font-medium">{appointment.horario}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Scissors className="h-5 w-5 text-[#E3A872]" />
                        <span>{appointment.servico}</span>
                      </div>
                      
                      <div className="flex items-center justify-between border-t pt-3 mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)} bg-[#FDF8F3]`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum agendamento no histórico
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};