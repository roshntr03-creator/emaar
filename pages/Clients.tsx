import React, { useState, useMemo, useEffect } from 'react';
import type { Client } from '../types';
import { PlusCircle, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const data = await api.getClients();
        setClients(data);
      } catch (error) {
        console.error("Failed to fetch clients", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, [usingFirebase]);
  
  const initialFormState: Omit<Client, 'id' | 'activeProjects'> = { name: '', contactPerson: '', email: '', phone: '' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSave = async () => {
    try {
      if (editingClient) {
        await api.updateClient({ ...editingClient, ...formData });
      } else {
        await api.addClient({ ...formData, activeProjects: 0 });
      }
      const updatedClients = await api.getClients();
      setClients(updatedClients);
      closeModal();
    } catch (error) {
      console.error("Failed to save client", error);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا العميل؟')) {
      try {
        await api.deleteClient(clientId);
        setClients(clients.filter(c => c.id !== clientId));
      } catch (error) {
        console.error("Failed to delete client", error);
      }
    }
  };

  const filteredClients = useMemo(() => 
    clients.filter(client =>
      (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [clients, searchQuery]
  );
  
  const totals = useMemo(() => ({
    count: filteredClients.length,
    activeProjects: filteredClients.reduce((sum, client) => sum + client.activeProjects, 0)
  }), [filteredClients]);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">إدارة العملاء</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
                <input
                    type="text"
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="بحث في العملاء"
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="w-5 h-5 text-gray-400" />
                </span>
            </div>
            {hasPermission('clients', 'create') && (
              <button 
                  onClick={openAddModal}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircle size={16} className="ml-2"/>
                إضافة عميل جديد
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">اسم العميل</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الشخص المسؤول</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">البريد الإلكتروني</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الهاتف</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">مشاريع نشطة</th>
                {(hasPermission('clients', 'edit') || hasPermission('clients', 'delete')) &&
                  <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
                }
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل العملاء...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length > 0 ? filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{client.name}</td>
                  <td className="py-3 px-4 border-b">{client.contactPerson}</td>
                  <td className="py-3 px-4 border-b">{client.email}</td>
                  <td className="py-3 px-4 border-b">{client.phone}</td>
                  <td className="py-3 px-4 border-b text-center">{client.activeProjects}</td>
                  {(hasPermission('clients', 'edit') || hasPermission('clients', 'delete')) &&
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                          {hasPermission('clients', 'edit') && <button onClick={() => openEditModal(client)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`تعديل ${client.name}`}><Edit size={18}/></button>}
                          {hasPermission('clients', 'delete') && <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`حذف ${client.name}`}><Trash2 size={18}/></button>}
                      </div>
                    </td>
                  }
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    لا يوجد عملاء لعرضهم.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-100">
                <tr>
                    <td className="py-3 px-4 font-bold text-gray-700">الإجمالي</td>
                    <td colSpan={3} className="py-3 px-4 text-sm text-gray-600">{totals.count} عملاء</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-700">{totals.activeProjects}</td>
                    {(hasPermission('clients', 'edit') || hasPermission('clients', 'delete')) && <td className="py-3 px-4"></td>}
                </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClient ? "تعديل بيانات العميل" : "إضافة عميل جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">الشخص المسؤول</label>
              <input type="text" name="contactPerson" id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              إلغاء
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              حفظ
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Clients;