import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!name.trim()) {
        throw new Error('Nome é obrigatório');
      }
      
      if (!email.trim()) {
        throw new Error('E-mail é obrigatório');
      }

      if (!phone.trim()) {
        throw new Error('Número de telefone é obrigatório');
      }

      const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
      if (!phoneRegex.test(phone)) {
        throw new Error('Telefone deve estar no formato (99) 99999-9999');
      }
      
      if (!password.trim()) {
        throw new Error('Senha é obrigatória');
      }
      
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }
      
      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }
      
      setIsLoading(true);
      const success = await register(name, email, password, phone);
      
      if (success) {
        navigate('/schedule');
      } else {
        setError('Falha no registro. Por favor, tente novamente.');
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
                Criar sua conta
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
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  fullWidth
                  label="Nome Completo"
                />
              </div>

              <div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Endereço de e-mail"
                  fullWidth
                  label="E-mail"
                />
              </div>

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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  fullWidth
                  label="Senha"
                />
              </div>

              <div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua senha"
                  fullWidth
                  label="Confirmar Senha"
                />
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
                  Criar conta
                </Button>
              </div>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <span className="text-xs sm:text-sm text-gray-900">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="font-medium text-[#E3A872] hover:text-[#D89860] transition-colors duration-200"
                >
                  Entrar
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
