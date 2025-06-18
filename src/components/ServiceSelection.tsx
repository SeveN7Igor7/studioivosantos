import React from 'react';
import { Scissors, ScissorsLineDashed, Sparkles, Brush, SprayCan as Spray, Droplet, UserCheck } from 'lucide-react';

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

export const ServiceSelection: React.FC<ServiceSelectionProps> = ({
  selectedServices,
  onSelectService,
}) => {
  const services: Service[] = [
    {
      id: 'haircut',
      name: 'Corte de Cabelo',
      description: 'Corte profissional com lavagem e finalização',
      duration: '30 min',
      price: 40,
      icon: <Scissors className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'beard',
      name: 'Barba',
      description: 'Modelagem e acabamento da barba',
      duration: '30 min',
      price: 40,
      icon: <ScissorsLineDashed className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'eyebrows',
      name: 'Sobrancelha',
      description: 'Design e acabamento das sobrancelhas',
      duration: '15 min',
      price: 15,
      icon: <Brush className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'carbonoplastia',
      name: 'Carbonoplastia',
      description: 'Tratamento capilar com carbono ativado',
      duration: '1h 30min',
      sizes: {
        p: 120,
        m: 140,
        g: 160,
      },
      icon: <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'pigmentation',
      name: 'Pigmentação',
      description: 'Pigmentação capilar profissional',
      duration: '1h',
      price: 50,
      icon: <Spray className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'facial-cleaning',
      name: 'Limpeza Facial',
      description: 'Limpeza e tratamento facial completo',
      duration: '45 min',
      price: 50,
      icon: <Droplet className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'taninoplastia',
      name: 'Taninoplastia',
      description: 'Tratamento capilar com tanino',
      duration: '1h 30min',
      sizes: {
        p: 120,
        m: 140,
        g: 160,
      },
      icon: <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
    {
      id: 'visagismo',
      name: 'Visagismo',
      description: 'Para consultoria visagista entre contato',
      icon: <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />,
    },
  ];

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
