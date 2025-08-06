import { Routes, Route, Navigate, useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Calendar, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

export const Layout = () => {
  const { isAuthenticated, logout, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if we're on login, register, or forgot-password pages
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  
  // Check if we're on admin page
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen-mobile flex flex-col">
      <header className="bg-[#E3A872] shadow-lg relative z-50 safe-top">
        <div className="container-responsive">
          <div className="flex h-14 sm:h-16 md:h-18 justify-between items-center">
            <Link to={isAuthenticated ? (isAdmin ? '/admin' : '/schedule') : '/login'} className="flex flex-col items-start">
              <div className="flex items-center">
                <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                <span className="ml-2 text-base sm:text-lg md:text-xl font-semibold text-white">Studio Ivo Santos</span>
              </div>
              <span className="text-xs sm:text-sm text-white/80 ml-8 sm:ml-9 md:ml-10">Agende aqui</span>
            </Link>
            
            {/* Only show hamburger menu if NOT on auth pages AND user is authenticated AND NOT on admin page */}
            {!isAuthPage && isAuthenticated && !isAdminPage && (
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white/80 hover:bg-[#D89860] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-200"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
              </div>
            )}
            
            {/* Show desktop menu if NOT on auth pages AND user is authenticated */}
            {!isAuthPage && isAuthenticated && (
              <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
                {!isAdminPage && (
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors duration-200"
                  >
                    <UserCircle className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-sm lg:text-base font-medium truncate max-w-32 lg:max-w-none">{user?.name}</span>
                  </Link>
                )}
                {isAdminPage && (
                  <span className="flex items-center space-x-2 text-white">
                    <UserCircle className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-sm lg:text-base font-medium truncate max-w-32 lg:max-w-none">{user?.name}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center text-sm lg:text-base font-medium text-white hover:text-white/80 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 lg:h-5 lg:w-5 mr-1" />
                  Logout
                </button>
              </div>
            )}
          </div>
          
          {/* Only show mobile menu dropdown if NOT on auth pages AND user is authenticated AND NOT on admin page */}
          {!isAuthPage && isAuthenticated && !isAdminPage && isMobileMenuOpen && (
            <div className="md:hidden py-2 border-t border-[#D89860] animate-fade-in">
              <Link
                to="/profile"
                className="block w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-[#D89860] transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <UserCircle className="h-5 w-5 mr-3" />
                  <span>{user?.name}</span>
                </div>
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-[#D89860] transition-colors duration-200"
              >
                <div className="flex items-center">
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow relative">
        <div className="absolute inset-0 admin-bg-mobile">
          <img
            src="/images/WhatsApp Image 2025-05-12 at 14.01.53.jpeg"
            alt="Background"
            className="w-full h-full object-cover"
            style={{
              objectPosition: 'center 10%'
            }}
          />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
        </div>
        <div className="relative z-10 container-responsive py-4 sm:py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      <footer className="bg-[#E3A872] py-3 sm:py-4 mt-auto relative z-50 safe-bottom">
        <div className="container-responsive">
          <p className="text-center text-xs sm:text-sm text-white">
            © {new Date().getFullYear()} Studio Ivo Santos. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
