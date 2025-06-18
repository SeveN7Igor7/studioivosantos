import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!phone.trim()) {
        throw new Error('Telefone é obrigatório');
      }
      
      if (!password.trim()) {
        throw new Error('Senha é obrigatória');
      }
      
      setIsLoading(true);
      const { success, isAdmin } = await login(phone, password);
      
      if (success) {
        navigate(isAdmin ? '/admin' : '/schedule');
      } else {
        setError('Telefone ou senha inválidos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
      setPhone(value);
    }
  };

  return (
    <div className="min-h-screen-mobile w-full relative">
      <div className="relative z-10 min-h-screen-mobile flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="bg-white/30 backdrop-blur-md py-6 sm:py-8 px-4 sm:px-6 md:px-10 shadow-2xl rounded-2xl sm:rounded-3xl">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-center text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900">
                Entre na sua conta
              </h2>
            </div>
            
            {error && (
              <div className="rounded-xl sm:rounded-2xl bg-red-50 p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-xs sm:text-sm font-medium text-red-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}
            
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
              <div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(99) 99999-9999"
                  fullWidth
                  label="Telefone"
                />
              </div>

              <div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  fullWidth
                  label="Senha"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-3 w-3 sm:h-4 sm:w-4 text-[#E3A872] focus:ring-[#E3A872] border-[#E8D5C4] rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-900">
                    Lembrar-me
                  </label>
                </div>

                <div className="text-xs sm:text-sm">
                  <Link to="/forgot-password" className="font-medium text-[#E3A872] hover:text-[#D89860] transition-colors duration-200">
                    Esqueceu sua senha?
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isLoading}
                  size="md"
                  className="bg-[#E3A872] hover:bg-[#D89860]"
                >
                  Entrar
                </Button>
              </div>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <span className="text-xs sm:text-sm text-gray-900">
                Não tem uma conta?{' '}
                <Link
                  to="/register"
                  className="font-medium text-[#E3A872] hover:text-[#D89860] transition-colors duration-200"
                >
                  Criar uma conta
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
