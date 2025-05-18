import React, { useEffect, useState } from 'react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { User, Calendar, Clock, Scissors } from 'lucide-react';

interface Appointment {
  dia: string;
  horario: string;
  servico: string;
  status?: 'active' | 'completed' | 'cancelled';
  completedAt?: string;
  cancelledAt?: string;
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
            Object.values(snapshot.val()).forEach((appointment: any) => {
              if (appointment.userPhone === user.phone) {
                activeAppointments.push({
                  ...appointment,
                  status: 'active'
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
          
          // Sort appointments by date and time
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
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-[#E3A872]" />
                          <span className="font-medium">{appointment.dia}</span>
                          <Clock className="h-5 w-5 ml-4 text-[#E3A872]" />
                          <span className="font-medium">{appointment.horario}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Scissors className="h-5 w-5 text-[#E3A872]" />
                          <span>{appointment.servico}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
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
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-[#E3A872]" />
                          <span className="font-medium">{appointment.dia}</span>
                          <Clock className="h-5 w-5 ml-4 text-[#E3A872]" />
                          <span className="font-medium">{appointment.horario}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Scissors className="h-5 w-5 text-[#E3A872]" />
                          <span>{appointment.servico}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
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