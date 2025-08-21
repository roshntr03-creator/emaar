import React, { useState, useMemo, useEffect } from 'react';
import type { InventoryItem } from '../types';
import { PlusCircle, Search, Edit, Trash2, Archive, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const data = await api.getInventory();
            setInventory(data);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchInventory();
  }, [usingFirebase]);

  const initialFormState: Omit<InventoryItem, 'id'> = { name: '', category: '', quantity: 0, unit: '', averageCost: 0 };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['quantity', 'averageCost'].includes(name);
    setFormData({ ...formData, [name]: isNumberField ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
        if (editingItem) {
            await api.updateInventoryItem({ ...editingItem, ...formData });
        } else {
            await api.addInventoryItem(formData);
        }
        const updatedInventory = await api.getInventory();
        setInventory(updatedInventory);
        closeModal();
    } catch (error) {
        console.error("Failed to save inventory item", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا الصنف من المخزون؟')) {
      try {
        await api.deleteInventoryItem(itemId);
        setInventory(inventory.filter(item => item.id !== itemId));
      } catch (error) {
        console.error("Failed to delete inventory item", error);
      }
    }
  };

  const filteredInventory = useMemo(() =>
    inventory.filter(item =>
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [inventory, searchQuery]
  );
  
  const totalInventoryValue = useMemo(() => 
    inventory.reduce((total, item) => total + ((item.quantity ?? 0) * (item.averageCost ?? 0)), 0),
  [inventory]);

  const canEdit = hasPermission('inventory', 'edit');
  const canDelete = hasPermission('inventory', 'delete');
  const showActionsColumn = canEdit || canDelete;

  return (
    <>
      <div className="mb-6">
        <StatCard 
            icon={<Archive className="text-blue-500" />}
            title="القيمة الإجمالية للمخزون"
            value={`﷼ ${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">إدارة المخزون</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="بحث في المخزون"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-5 h-5 text-gray-400" />
              </span>
            </div>
            {hasPermission('inventory', 'create') && (
              <button
                onClick={openAddModal}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircle size={16} className="ml-2" />
                إضافة صنف جديد
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">رمز الصنف</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">اسم الصنف</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الفئة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الكمية المتاحة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الوحدة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">متوسط التكلفة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجمالي القيمة</th>
                {showActionsColumn && <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                 <tr>
                  <td colSpan={showActionsColumn ? 8 : 7} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل المخزون...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.length > 0 ? filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b font-mono text-blue-600">{item.id}</td>
                  <td className="py-3 px-4 border-b">{item.name}</td>
                  <td className="py-3 px-4 border-b">{item.category}</td>
                  <td className="py-3 px-4 border-b font-medium text-center">{(item.quantity ?? 0).toLocaleString()}</td>
                  <td className="py-3 px-4 border-b text-center">{item.unit}</td>
                  <td className="py-3 px-4 border-b">﷼{(item.averageCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 border-b font-semibold">﷼{((item.quantity ?? 0) * (item.averageCost ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  {showActionsColumn &&
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                        {canEdit && <button onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`تعديل ${item.name}`}><Edit size={18} /></button>}
                        {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`حذف ${item.name}`}><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  }
                </tr>
              )) : (
                <tr>
                  <td colSpan={showActionsColumn ? 8 : 7} className="text-center py-10 text-gray-500">
                    لا توجد أصناف في المخزون.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "تعديل بيانات الصنف" : "إضافة صنف جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
              <input type="text" name="category" id="category" value={formData.category} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                <input type="number" name="quantity" id="quantity" value={formData.quantity} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                <input type="text" name="unit" id="unit" value={formData.unit} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="مثال: كيس، قطعة، متر" />
              </div>
            </div>
            <div>
              <label htmlFor="averageCost" className="block text-sm font-medium text-gray-700 mb-1">متوسط التكلفة (لل وحدة)</label>
              <input type="number" step="0.01" name="averageCost" id="averageCost" value={formData.averageCost} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
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

export default Inventory;
