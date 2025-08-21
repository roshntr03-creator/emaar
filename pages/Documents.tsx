
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Document, Project, Client, Supplier, LinkedEntity, LinkedEntityType } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, Loader2, Paperclip, File, Download, Link as LinkIcon, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const entityTypeMap: Record<LinkedEntityType, string> = {
    project: 'مشروع',
    client: 'عميل',
    supplier: 'مورد',
    invoice: 'فاتورة',
    purchaseOrder: 'أمر شراء',
    subcontract: 'عقد باطن',
    asset: 'أصل',
    employee: 'موظف',
};

const Documents: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { hasPermission } = useAuth();
    
    // Data for linking
    const [linkableData, setLinkableData] = useState<Record<string, {id: string, name: string}[]>>({});

    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [docs, projects, clients, suppliers] = await Promise.all([
                    api.getDocuments(),
                    api.getProjects(),
                    api.getClients(),
                    api.getSuppliers(),
                ]);
                setDocuments(docs);
                setLinkableData({
                    project: projects.map(p => ({ id: p.id, name: p.name })),
                    client: clients.map(c => ({ id: c.id, name: c.name })),
                    supplier: suppliers.map(s => ({ id: s.id, name: s.name })),
                });
            } catch (error) {
                console.error("Failed to fetch documents data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [usingFirebase]);
    
    type FormData = Omit<Document, 'id' | 'fileName' | 'fileType' | 'fileSize' | 'url' | 'uploadedAt' | 'storagePath'>;
    const initialFormState: FormData = { title: '', description: '', category: 'آخر', tags: [], linkedEntities: [] };
    const [formData, setFormData] = useState(initialFormState);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
        setFormData({ ...formData, tags });
    };

    const addLinkedEntity = (entity: LinkedEntity) => {
        if (!formData.linkedEntities.some(e => e.id === entity.id && e.type === entity.type)) {
            setFormData(prev => ({ ...prev, linkedEntities: [...prev.linkedEntities, entity] }));
        }
    };
    
    const removeLinkedEntity = (entityToRemove: LinkedEntity) => {
        setFormData(prev => ({
            ...prev,
            linkedEntities: prev.linkedEntities.filter(e => !(e.id === entityToRemove.id && e.type === entityToRemove.type))
        }));
    };

    const openAddModal = () => {
        setEditingDoc(null);
        setFormData(initialFormState);
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const openEditModal = (doc: Document) => {
        setEditingDoc(doc);
        setFormData({
            title: doc.title,
            description: doc.description,
            category: doc.category,
            tags: doc.tags,
            linkedEntities: doc.linkedEntities
        });
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleSave = async () => {
        if (!editingDoc && !selectedFile) {
            alert('الرجاء اختيار ملف لرفعه.');
            return;
        }

        try {
            if (editingDoc) {
                await api.updateDocument({ ...editingDoc, ...formData });
            } else if(selectedFile) {
                await api.addDocument(selectedFile, formData);
            }
            const updatedDocs = await api.getDocuments();
            setDocuments(updatedDocs);
            closeModal();
        } catch (error) {
            console.error("Failed to save document", error);
        }
    };

    const handleDelete = async (docId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
            try {
                await api.deleteDocument(docId);
                setDocuments(documents.filter(d => d.id !== docId));
            } catch (error) {
                console.error("Failed to delete document", error);
            }
        }
    };

    const filteredDocs = useMemo(() =>
        documents.filter(doc =>
            (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.tags || []).some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase()))
        ), [documents, searchQuery]);
    
    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">مستودع المستندات</h2>
                    <div className="flex items-center space-x-2 space-x-reverse">
                         <div className="relative">
                            <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></span>
                        </div>
                        {hasPermission('documents', 'create') && (
                            <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                <PlusCircle size={16} className="ml-2" />
                                رفع مستند جديد
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-right">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 border-b">عنوان المستند</th>
                                <th className="py-3 px-4 border-b">الفئة</th>
                                <th className="py-3 px-4 border-b">الكيانات المرتبطة</th>
                                <th className="py-3 px-4 border-b">اسم الملف</th>
                                <th className="py-3 px-4 border-b">تاريخ الرفع</th>
                                <th className="py-3 px-4 border-b">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="mx-auto animate-spin" /></td></tr>
                            ) : filteredDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 border-b font-semibold">{doc.title}</td>
                                    <td className="py-3 px-4 border-b"><span className="px-2 py-1 text-xs bg-gray-100 rounded-full">{doc.category}</span></td>
                                    <td className="py-3 px-4 border-b">
                                        <div className="flex flex-wrap gap-1">
                                            {doc.linkedEntities.map(e => <span key={`${e.type}-${e.id}`} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{entityTypeMap[e.type]}: {e.name}</span>)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 border-b text-sm">{doc.fileName} ({formatFileSize(doc.fileSize)})</td>
                                    <td className="py-3 px-4 border-b text-sm">{new Date(doc.uploadedAt).toLocaleDateString('ar-SA')}</td>
                                    <td className="py-3 px-4 border-b">
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <a href={doc.url} download={doc.fileName} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:text-blue-700"><Download size={18} /></a>
                                            {hasPermission('documents', 'edit') && <button onClick={() => openEditModal(doc)} className="p-1 text-gray-500 hover:text-gray-700"><Edit size={18} /></button>}
                                            {hasPermission('documents', 'delete') && <button onClick={() => handleDelete(doc.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={18} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDoc ? "تعديل مستند" : "رفع مستند جديد"}>
                <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
                    <div className="space-y-4">
                        {!editingDoc && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الملف</label>
                                <input type="file" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            </div>
                        )}
                        <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="عنوان المستند" required className="w-full px-3 py-2 border rounded-md" />
                        <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="وصف موجز للمستند" rows={3} className="w-full px-3 py-2 border rounded-md" />
                        <div className="grid grid-cols-2 gap-4">
                             <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 border bg-white rounded-md">
                                <option>عقد</option><option>فاتورة</option><option>مخطط هندسي</option><option>خطاب رسمي</option><option>صورة</option><option>آخر</option>
                            </select>
                             <input type="text" name="tags" value={formData.tags.join(', ')} onChange={handleTagsChange} placeholder="وسوم (مفصولة بفاصلة)" className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        
                        <div className="border-t pt-4">
                            <h4 className="text-md font-semibold mb-2 flex items-center"><LinkIcon size={16} className="ml-2"/>ربط بكيانات أخرى</h4>
                            <div className="flex gap-2">
                                {Object.entries(linkableData).map(([type, items]) => (
                                    <select key={type} onChange={e => {
                                        const [id, name] = e.target.value.split('|');
                                        if (id) addLinkedEntity({ type: type as LinkedEntityType, id, name });
                                    }} className="w-full px-2 py-1 border bg-white rounded-md text-sm">
                                        <option value="">ربط بـ {entityTypeMap[type as LinkedEntityType]}...</option>
                                        {items.map(item => <option key={item.id} value={`${item.id}|${item.name}`}>{item.name}</option>)}
                                    </select>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.linkedEntities.map(e => (
                                    <span key={`${e.type}-${e.id}`} className="flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {entityTypeMap[e.type]}: {e.name}
                                        <button type="button" onClick={() => removeLinkedEntity(e)} className="mr-2 text-blue-600 hover:text-blue-800"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                    <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default Documents;
