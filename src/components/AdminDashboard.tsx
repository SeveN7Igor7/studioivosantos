import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Settings, LogOut, User, BarChart3 } from 'lucide-react';
import { AdminCalendarView } from './AdminCalendarView';
import { ServicesManagement } from './ServicesManagement';

type AdminView = 'calendar' | 'services';

export const AdminDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('calendar');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      id: 'calendar' as AdminView,
      label: 'Agendamentos',
      icon: Calendar,
      description: 'Gerenciar agendamentos'
    },
    {
      id: 'services' as AdminView,
      label: 'Serviços',
      icon: Settings,
      description: 'Configurar serviços'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 relative z-10">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-[#E3A872] to-[#D89860]">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-3 lg:space-y-0">
            <div className="w-full lg:w-auto">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                Painel Administrativo
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-[#FDF8F3]">
                Bem-vindo, {user?.name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full lg:w-auto bg-white text-[#E3A872] px-3 sm:px-4 py-2 rounded-lg hover:bg-[#FDF8F3] transition-colors duration-200 flex items-center justify-center"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="font-medium text-sm sm:text-base">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`
                    flex-1 px-3 sm:px-4 py-3 sm:py-4 text-center border-b-2 transition-colors duration-200
                    ${currentView === item.id
                      ? 'border-[#E3A872] text-[#E3A872] bg-[#FDF8F3]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-6">
          {currentView === 'calendar' && <AdminCalendarView />}
          {currentView === 'services' && <ServicesManagement />}
        </div>
      </div>
    </div>
  );
};
