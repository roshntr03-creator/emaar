import React, { useState, useMemo, useEffect } from 'react';
import type { Supplier } from '../types';
import { PlusCircle, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoading(true);
      try {
        const data = await api.getSuppliers();
        setSuppliers(data);
      } catch (error) {
        console.error("Failed to fetch suppliers", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuppliers();
  }, [usingFirebase]);
  
  const initialFormState: Omit<Supplier, 'id'> = { name: '', contactPerson: '', service: '', email: '', phone: '' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSave = async () => {
    try {
      if (editingSupplier) {
        await api.updateSupplier({ ...editingSupplier, ...formData });
      } else {
        await api.addSupplier(formData);
      }
      const updatedSuppliers = await api.getSuppliers();
      setSuppliers(updatedSuppliers);
      closeModal();
    } catch (error) {
      console.error("Failed to save supplier", error);
    }
  };

  const handleDelete = async (supplierId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا المورد؟')) {
      try {
        await api.deleteSupplier(supplierId);
        setSuppliers(suppliers.filter(s => s.id !== supplierId));
      } catch (error) {
        console.error("Failed to delete supplier", error);
      }
    }
  };

  const filteredSuppliers = useMemo(() => 
    suppliers.filter(supplier =>
      (supplier.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.service || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [suppliers, searchQuery]
  );

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الموردين</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
                <input
                    type="text"
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="بحث في الموردين"
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="w-5 h-5 text-gray-400" />
                </span>
            </div>
            {hasPermission('suppliers', 'create') && (
              <button 
                  onClick={openAddModal}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircle size={16} className="ml-2"/>
                إضافة مورد جديد
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">اسم المورد</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">التخصص / الخدمة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الشخص المسؤول</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">البريد الإلكتروني</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الهاتف</th>
                {(hasPermission('suppliers', 'edit') || hasPermission('suppliers', 'delete')) &&
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
                      <span className="mr-3 text-gray-500">جاري تحميل الموردين...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{supplier.name}</td>
                  <td className="py-3 px-4 border-b">{supplier.service}</td>
                  <td className="py-3 px-4 border-b">{supplier.contactPerson}</td>
                  <td className="py-3 px-4 border-b">{supplier.email}</td>
                  <td className="py-3 px-4 border-b">{supplier.phone}</td>
                  {(hasPermission('suppliers', 'edit') || hasPermission('suppliers', 'delete')) &&
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                          {hasPermission('suppliers', 'edit') && <button onClick={() => openEditModal(supplier)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`تعديل ${supplier.name}`}><Edit size={18}/></button>}
                          {hasPermission('suppliers', 'delete') && <button onClick={() => handleDelete(supplier.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`حذف ${supplier.name}`}><Trash2 size={18}/></button>}
                      </div>
                    </td>
                  }
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    لا يوجد موردون لعرضهم.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-100">
                <tr>
                    <td className="py-3 px-4 font-bold text-gray-700">الإجمالي</td>
                    <td colSpan={5} className="py-3 px-4 text-sm text-gray-600">{filteredSuppliers.length} موردين</td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">اسم المورد</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
             <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">التخصص / الخدمة</label>
              <input type="text" name="service" id="service" value={formData.service} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
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

export default Suppliers;