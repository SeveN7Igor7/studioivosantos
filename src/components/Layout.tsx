import { Routes, Route, Navigate, useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Calendar, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

export const Layout = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#E3A872] shadow-lg relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <Link to={isAuthenticated ? '/schedule' : '/login'} className="flex flex-col items-start">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-white" />
                <span className="ml-2 text-xl font-semibold text-white">Studio Ivo Santos</span>
              </div>
              <span className="text-sm text-white/80 ml-10">Agende aqui</span>
            </Link>
            
            <div className="sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white/80 hover:bg-[#D89860] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
            
            <div className="hidden sm:flex items-center space-x-4">
              {isAuthenticated && (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors"
                  >
                    <UserCircle className="h-6 w-6" />
                    <span className="text-sm font-medium">{user?.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center text-sm font-medium text-white hover:text-white/80 transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-1" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isMobileMenuOpen && (
            <div className="sm:hidden py-2 border-t border-[#D89860]">
              {isAuthenticated && (
                <>
                  <Link
                    to="/profile"
                    className="block w-full text-left px-4 py-2 text-sm font-medium text-white hover:bg-[#D89860] transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <UserCircle className="h-6 w-6 mr-2" />
                      <span>{user?.name}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm font-medium text-white hover:bg-[#D89860] transition-colors"
                  >
                    <div className="flex items-center">
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow relative">
        <div className="absolute inset-0">
          <img
            src="/images/WhatsApp Image 2025-05-12 at 14.01.53.jpeg"
            alt="Background"
            className="w-full h-full object-cover object-[center_15%]"
          />
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="bg-[#E3A872] py-4 mt-auto relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-white">
            © {new Date().getFullYear()} Studio Ivo Santos. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
