import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { ArrowLeft, Mail, Send } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    try {
      if (!phone.trim()) {
        throw new Error('Telefone é obrigatório');
      }
      
      setIsLoading(true);
      const cleanPhone = phone.replace(/\D/g, '');
      const userRef = ref(db, `user/number/${cleanPhone}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setSuccess(true);
        setPhone('');
      } else {
        setError('Não encontramos uma conta com este número de telefone');
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
      <img
        src="/images/WhatsApp Image 2025-05-12 at 14.01.53 (1).jpeg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="relative z-10 min-h-screen-mobile flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="bg-white/90 backdrop-blur-md py-6 sm:py-8 px-4 sm:px-6 md:px-10 shadow-2xl rounded-2xl sm:rounded-3xl">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-center text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900">
                Recuperar senha
              </h2>
              <p className="mt-2 text-center text-xs sm:text-sm text-gray-600">
                Digite seu número de telefone para receber as instruções de recuperação
              </p>
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

            {success ? (
              <div className="text-center">
                <div className="rounded-full bg-[#FDF8F3] p-3 mx-auto w-fit mb-4">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-[#E3A872]" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Instruções enviadas!
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-6">
                  Se existe uma conta associada a este número, você receberá as instruções para redefinir sua senha.
                </p>
                <Link to="/login">
                  <Button 
                    variant="outline" 
                    fullWidth
                    size="md"
                    className="border-[#E3A872] text-[#E3A872] hover:bg-[#E3A872] hover:text-white"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            ) : (
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
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                    size="md"
                    className="bg-[#E3A872] hover:bg-[#D89860]"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Enviar instruções
                  </Button>
                </div>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-xs sm:text-sm font-medium text-[#E3A872] hover:text-[#D89860] transition-colors duration-200"
                  >
                    Voltar para o login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
