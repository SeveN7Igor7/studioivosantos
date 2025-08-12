import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Trash2, DollarSign, Clock, FileText } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { db } from '../lib/firebase';
import { ref, set, get, remove } from 'firebase/database';

interface Service {
  id: string;
  name: string;
  description?: string;
  duration?: number; // in minutes
  price?: number;
  sizes?: {
    p: number;
    m: number;
    g: number;
  };
}

const defaultServices: Service[] = [
  {
    id: 'haircut',
    name: 'Corte de Cabelo',
    description: 'Corte profissional com lavagem e finalização',
    duration: 30,
    price: 40
  },
  {
    id: 'beard',
    name: 'Barba',
    description: 'Modelagem e acabamento da barba',
    duration: 30,
    price: 40
  },
  {
    id: 'eyebrows',
    name: 'Sobrancelha',
    description: 'Design e acabamento das sobrancelhas',
    duration: 0, // Doesn't affect timing
    price: 15
  },
  {
    id: 'carbonoplastia',
    name: 'Carbonoplastia',
    description: 'Tratamento capilar com carbono ativado',
    duration: 60,
    sizes: {
      p: 120,
      m: 140,
      g: 160
    }
  },
  {
    id: 'pigmentation',
    name: 'Pigmentação',
    description: 'Pigmentação capilar profissional',
    duration: 30,
    price: 50
  },
  {
    id: 'facial-cleaning',
    name: 'Limpeza Facial',
    description: 'Limpeza e tratamento facial completo',
    duration: 30,
    price: 50
  },
  {
    id: 'taninoplastia',
    name: 'Taninoplastia',
    description: 'Tratamento capilar com tanino',
    duration: 60,
    sizes: {
      p: 120,
      m: 140,
      g: 160
    }
  },
  {
    id: 'visagismo',
    name: 'Visagismo',
    description: 'Para consultoria visagista entre contato',
    duration: 30
  }
];

export const ServicesManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    description: '',
    duration: undefined
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const servicesRef = ref(db, 'services');
      const snapshot = await get(servicesRef);
      
      if (snapshot.exists()) {
        const servicesData = snapshot.val();
        const servicesList = Object.entries(servicesData).map(([id, service]: [string, any]) => ({
          id,
          ...service
        }));
        setServices(servicesList);
      } else {
        // Initialize with default services if none exist
        await initializeDefaultServices();
      }
    } catch (error) {
      console.error('Error loading services:', error);
      // Fallback to default services
      setServices(defaultServices);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultServices = async () => {
    try {
      const servicesRef = ref(db, 'services');
      const servicesData: { [key: string]: Omit<Service, 'id'> } = {};
      
      defaultServices.forEach(service => {
        const { id, ...serviceData } = service;
        servicesData[id] = serviceData;
      });
      
      await set(servicesRef, servicesData);
      setServices(defaultServices);
    } catch (error) {
      console.error('Error initializing default services:', error);
      setServices(defaultServices);
    }
  };

  const handleSaveService = async (serviceId: string, updatedService: Partial<Service>) => {
    try {
      const serviceRef = ref(db, `services/${serviceId}`);
      const { id, ...serviceData } = updatedService as Service;
      
      // Filter out undefined values to prevent Firebase errors
      const cleanServiceData = Object.fromEntries(
        Object.entries(serviceData).filter(([_, value]) => value !== undefined)
      );
      
      await set(serviceRef, cleanServiceData);
      
      setServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, ...updatedService } : service
      ));
      
      setEditingService(null);
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Erro ao salvar o serviço');
    }
  };

  const handleAddNewService = async () => {
    if (!newService.name) {
      alert('Por favor, preencha o nome do serviço');
      return;
    }

    try {
      const serviceId = Date.now().toString();
      const serviceRef = ref(db, `services/${serviceId}`);
      
      const rawServiceData = {
        name: newService.name,
        ...(newService.description && { description: newService.description }),
        ...(newService.duration && { duration: newService.duration }),
        ...(newService.price && { price: newService.price }),
        ...(newService.sizes && { sizes: newService.sizes })
      };
      
      // Filter out undefined values to prevent Firebase errors
      const serviceData = Object.fromEntries(
        Object.entries(rawServiceData).filter(([_, value]) => value !== undefined)
      );
      
      await set(serviceRef, serviceData);
      
      setServices(prev => [...prev, { id: serviceId, ...serviceData } as Service]);
      setIsAddingNew(false);
      setNewService({
        name: '',
        description: '',
        duration: undefined
      });
    } catch (error) {
      console.error('Error adding new service:', error);
      alert('Erro ao adicionar o serviço');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        const serviceRef = ref(db, `services/${serviceId}`);
        await remove(serviceRef);
        
        setServices(prev => prev.filter(service => service.id !== serviceId));
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Erro ao excluir o serviço');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E3A872]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Serviços</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Configure os serviços oferecidos, preços e descrições
          </p>
        </div>
        <Button
          onClick={() => setIsAddingNew(true)}
          className="w-full sm:w-auto bg-[#E3A872] hover:bg-[#D89860]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      {/* Add New Service Form */}
      {isAddingNew && (
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-[#E8D5C4] shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Adicionar Novo Serviço</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Nome do Serviço"
              value={newService.name || ''}
              onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Corte de Cabelo"
              fullWidth
              required
            />
          </div>

          <div className="mb-4">
            <Input
              label="Descrição (Opcional)"
              value={newService.description || ''}
              onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o serviço oferecido"
              fullWidth
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Duração (minutos) - Opcional"
              type="number"
              value={newService.duration || ''}
              onChange={(e) => setNewService(prev => ({ ...prev, duration: e.target.value ? parseInt(e.target.value) : undefined }))}
              placeholder="Ex: 30"
              fullWidth
            />
            
            <Input
              label="Preço (R$) - Opcional"
              type="number"
              step="0.01"
              value={newService.price || ''}
              onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) || undefined }))}
              placeholder="Ex: 40.00"
              fullWidth
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingNew(false);
                setNewService({
                  name: '',
                  description: '',
                  duration: undefined
                });
              }}
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleAddNewService}
              className="w-full sm:w-auto bg-[#E3A872] hover:bg-[#D89860]"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Serviço
            </Button>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="grid gap-4 sm:gap-6">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isEditing={editingService === service.id}
            onEdit={() => setEditingService(service.id)}
            onSave={(updatedService) => handleSaveService(service.id, updatedService)}
            onCancel={() => setEditingService(null)}
            onDelete={() => handleDeleteService(service.id)}
          />
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum serviço encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Adicione serviços para começar a gerenciar seu negócio
          </p>
          <Button
            onClick={() => setIsAddingNew(true)}
            className="bg-[#E3A872] hover:bg-[#D89860]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Serviço
          </Button>
        </div>
      )}
    </div>
  );
};

interface ServiceCardProps {
  service: Service;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (service: Partial<Service>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  const [editedService, setEditedService] = useState<Service>(service);

  useEffect(() => {
    setEditedService(service);
  }, [service]);

  const handleSave = () => {
    if (!editedService.name) {
      alert('Por favor, preencha o nome do serviço');
      return;
    }
    onSave(editedService);
  };

  if (isEditing) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-[#E8D5C4] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Nome do Serviço"
            value={editedService.name}
            onChange={(e) => setEditedService(prev => ({ ...prev, name: e.target.value }))}
            fullWidth
            required
          />
        </div>

        <div className="mb-4">
          <Input
            label="Descrição (Opcional)"
            value={editedService.description || ''}
            onChange={(e) => setEditedService(prev => ({ ...prev, description: e.target.value }))}
            fullWidth
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Duração (minutos) - Opcional"
            type="number"
            value={editedService.duration || ''}
            onChange={(e) => setEditedService(prev => ({ ...prev, duration: e.target.value ? parseInt(e.target.value) : undefined }))}
            placeholder="Ex: 30"
            fullWidth
          />
          
          {!editedService.sizes && (
            <Input
              label="Preço (R$)"
              type="number"
              step="0.01"
              value={editedService.price || ''}
              onChange={(e) => setEditedService(prev => ({ ...prev, price: parseFloat(e.target.value) || undefined }))}
              fullWidth
            />
          )}
        </div>

        {editedService.sizes && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Preços por Tamanho</label>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Pequeno (R$)"
                type="number"
                step="0.01"
                value={editedService.sizes.p}
                onChange={(e) => setEditedService(prev => ({
                  ...prev,
                  sizes: { ...prev.sizes!, p: parseFloat(e.target.value) || 0 }
                }))}
                fullWidth
              />
              <Input
                label="Médio (R$)"
                type="number"
                step="0.01"
                value={editedService.sizes.m}
                onChange={(e) => setEditedService(prev => ({
                  ...prev,
                  sizes: { ...prev.sizes!, m: parseFloat(e.target.value) || 0 }
                }))}
                fullWidth
              />
              <Input
                label="Grande (R$)"
                type="number"
                step="0.01"
                value={editedService.sizes.g}
                onChange={(e) => setEditedService(prev => ({
                  ...prev,
                  sizes: { ...prev.sizes!, g: parseFloat(e.target.value) || 0 }
                }))}
                fullWidth
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-[#E3A872] hover:bg-[#D89860]"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg border border-[#E8D5C4] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          </div>
          
          {service.description && (
            <p className="text-gray-600 mb-3">{service.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {service.duration && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{service.duration} min</span>
              </div>
            )}
            
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              {service.sizes ? (
                <span>P: R${service.sizes.p} | M: R${service.sizes.m} | G: R${service.sizes.g}</span>
              ) : service.price ? (
                <span>R${service.price.toFixed(2)}</span>
              ) : (
                <span>Consultar</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={onEdit}
            size="sm"
            className="w-full sm:w-auto border-[#E3A872] text-[#E3A872] hover:bg-[#FDF8F3]"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            size="sm"
            className="w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
};
