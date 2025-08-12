import React from 'react';
import { useState, useEffect } from 'react';
import { Scissors, ScissorsLineDashed, Sparkles, Brush, SprayCan as Spray, Droplet, UserCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

interface Service {
  id: string;
  name: string;
  description: string;
  duration?: string;
  price?: number;
  icon: React.ReactNode;
  sizes?: {
    p: number;
    m: number;
    g: number;
  };
}

interface ServiceSelectionProps {
  selectedServices: string[];
  onSelectService: (serviceId: string) => void;
}

// Default icon mapping for services
const getServiceIcon = (serviceId: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'haircut': <Scissors className="h-5 w-5 sm:h-6 sm:w-6" />,
    'beard': <ScissorsLineDashed className="h-5 w-5 sm:h-6 sm:w-6" />,
    'eyebrows': <Brush className="h-5 w-5 sm:h-6 sm:w-6" />,
    'carbonoplastia': <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />,
    'pigmentation': <Spray className="h-5 w-5 sm:h-6 sm:w-6" />,
    'facial-cleaning': <Droplet className="h-5 w-5 sm:h-6 sm:w-6" />,
    'taninoplastia': <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />,
    'visagismo': <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />,
  };
  
  return iconMap[serviceId] || <Scissors className="h-5 w-5 sm:h-6 sm:w-6" />;
};
export const ServiceSelection: React.FC<ServiceSelectionProps> = ({
  selectedServices,
  onSelectService,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const servicesRef = ref(db, 'services');
    
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const servicesData = snapshot.val();
          const servicesList: Service[] = Object.entries(servicesData).map(([id, service]: [string, any]) => ({
            id,
            name: service.name,
            description: service.description || '',
            duration: service.duration ? `${service.duration} min` : undefined,
            price: service.price,
            sizes: service.sizes,
            icon: getServiceIcon(id)
          }));
          setServices(servicesList);
        } else {
          // If no services exist, set empty array
          setServices([]);
        }
      } catch (error) {
        console.error('Error loading services:', error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="mt-4 sm:mt-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Selecione os Serviços</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E3A872]"></div>
          <span className="ml-2 text-sm text-gray-500">Carregando serviços...</span>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="mt-4 sm:mt-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Selecione os Serviços</h3>
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">Nenhum serviço disponível no momento.</p>
          <p className="text-xs text-gray-400 mt-1">Entre em contato com o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 sm:mt-6">
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Selecione os Serviços</h3>
      <div className="grid gap-2 sm:gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelectService(service.id)}
            className={`
              flex items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 w-full text-left
              ${selectedServices.includes(service.id)
                ? 'border-[#E3A872] bg-[#FDF8F3] ring-2 ring-[#E3A872] ring-opacity-50'
                : 'border-[#E8D5C4] hover:border-[#E3A872] hover:bg-[#FDF8F3]'
              }
            `}
          >
            <div className={`
              flex-shrink-0 p-2 rounded-xl sm:rounded-2xl mr-3 sm:mr-4
              ${selectedServices.includes(service.id) ? 'text-[#E3A872] bg-[#FDF8F3]' : 'text-gray-500 bg-gray-100'}
            `}>
              {service.icon}
            </div>
            <div className="flex-grow min-w-0">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 truncate">{service.name}</h4>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
              <div className="flex items-center mt-2 text-xs sm:text-sm text-gray-500">
                {service.sizes ? (
                  <div className="flex gap-2 sm:gap-4 flex-wrap">
                    <span>P: R${service.sizes.p}</span>
                    <span>M: R${service.sizes.m}</span>
                    <span>G: R${service.sizes.g}</span>
                  </div>
                ) : service.price ? (
                  <span className="font-medium text-gray-900">R${service.price}</span>
                ) : null}
                {service.duration && (
                  <>
                    <span className="mx-1 sm:mx-2">•</span>
                    <span>{service.duration}</span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
