import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Briefcase, Calendar, User, ArrowLeft, PlusCircle, Edit, Trash2, GanttChartSquare, Loader2, FileArchive } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Gantt, ViewMode, Task } from 'gantt-task-react';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import AttachmentsManager from '../components/AttachmentsManager';
import type { Project, Invoice, PurchaseOrder, ChangeOrder, Custody, BudgetLine, ProjectTask } from '../types';
import * as api from '../api';


const getStatusChip = (status: 'active' | 'completed' | 'on_hold') => {
  switch (status) {
    case 'active': return <span className="px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">نشط</span>;
    case 'completed': return <span className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">مكتمل</span>;
    case 'on_hold': return <span className="px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full">متوقف</span>;
  }
};

// --- Timeline Tab Component ---
interface TimelineTabContentProps {
    tasks: ProjectTask[];
    onSave: (task: Omit<ProjectTask, 'id' | 'projectId'>, editingTaskId: string | null) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
}

const TimelineTabContent: React.FC<TimelineTabContentProps> = ({ tasks, onSave, onDelete }) => {
    const [viewMode, setViewMode] = useState(ViewMode.Week);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
    
    const initialFormState: Omit<ProjectTask, 'id' | 'projectId' | 'type'> = { name: '', start: '', end: '', progress: 0 };
    const [formData, setFormData] = useState(initialFormState);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'progress' ? Number(value) : value }));
    };

    const openAddModal = () => {
        setEditingTask(null);
        const today = new Date().toISOString().split('T')[0];
        setFormData({ name: '', start: today, end: today, progress: 0 });
        setIsModalOpen(true);
    };

    const openEditModal = (task: ProjectTask) => {
        setEditingTask(task);
        setFormData({ name: task.name, start: task.start, end: task.end, progress: task.progress });
        setIsModalOpen(true);
    };
    
    const closeModal = () => setIsModalOpen(false);

    const handleSave = async () => {
        if (new Date(formData.end) < new Date(formData.start)) {
            alert('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.');
            return;
        }
        
        await onSave({ ...formData, type: 'task' }, editingTask ? editingTask.id : null);
        closeModal();
    };

    const handleDelete = async (taskId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
            await onDelete(taskId);
        }
    };
    
    // Gantt needs dates to be Date objects
    const tasksForGantt = tasks.map(t => ({
        ...t,
        start: new Date(t.start),
        end: new Date(t.end)
    }));

    const handleGanttClick = (task: Task) => {
        const originalTask = tasks.find(t => t.id === task.id);
        if (originalTask) {
            openEditModal(originalTask);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-sm font-medium">عرض:</span>
                    <button onClick={() => setViewMode(ViewMode.Day)} className={`px-2 py-1 text-xs rounded ${viewMode === ViewMode.Day ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>يوم</button>
                    <button onClick={() => setViewMode(ViewMode.Week)} className={`px-2 py-1 text-xs rounded ${viewMode === ViewMode.Week ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>أسبوع</button>
                    <button onClick={() => setViewMode(ViewMode.Month)} className={`px-2 py-1 text-xs rounded ${viewMode === ViewMode.Month ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>شهر</button>
                </div>
                 <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    <PlusCircle size={16} className="ml-2" /> إضافة مهمة جديدة
                </button>
            </div>
            {tasksForGantt.length > 0 ? (
                 <div className="gantt-container" dir="ltr">
                    <Gantt 
                        tasks={tasksForGantt} 
                        viewMode={viewMode} 
                        rtl={false}
                        listCellWidth=""
                        barProgressColor="#2563eb"
                        barProgressSelectedColor="#1d4ed8"
                        barBackgroundColor="#93c5fd"
                        barBackgroundSelectedColor="#60a5fa"
                        onClick={handleGanttClick}
                    />
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <GanttChartSquare size={40} className="mx-auto mb-2" />
                    <p>لا توجد مهام في الجدول الزمني بعد. ابدأ بإضافة مهمة جديدة.</p>
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTask ? "تعديل المهمة" : "إضافة مهمة جديدة"}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">اسم المهمة</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                                <input type="date" name="start" id="start" value={formData.start} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                                <input type="date" name="end" id="end" value={formData.end} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="progress" className="block text-sm font-medium text-gray-700 mb-1">نسبة الإنجاز: {formData.progress}%</label>
                            <input type="range" name="progress" id="progress" min="0" max="100" value={formData.progress} onChange={handleInputChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                     <div className="mt-6 flex justify-between items-center">
                        <div>
                        {editingTask && (
                             <button type="button" onClick={() => handleDelete(editingTask.id)} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm">
                                حذف المهمة
                            </button>
                        )}
                        </div>
                        <div className="flex space-x-2 space-x-reverse">
                            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};


// --- Budget Tab Component ---
interface BudgetTabContentProps {
  lines: BudgetLine[];
  onAdd: (data: Omit<BudgetLine, 'id' | 'projectId'>) => Promise<void>;
  onUpdate: (line: BudgetLine) => Promise<void>;
  onDelete: (lineId: string) => Promise<void>;
}

const BudgetTabContent: React.FC<BudgetTabContentProps> = ({ lines, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);

    const initialFormState: Omit<BudgetLine, 'id' | 'projectId'> = { category: 'مواد بناء', budgetItem: '', budgetAmount: 0, actualAmount: 0 };
    const [formData, setFormData] = useState(initialFormState);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: ['budgetAmount', 'actualAmount'].includes(name) ? Number(value) : value }));
    };

    const openAddModal = () => {
        setEditingLine(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const openEditModal = (line: BudgetLine) => {
        setEditingLine(line);
        setFormData({ category: line.category, budgetItem: line.budgetItem, budgetAmount: line.budgetAmount, actualAmount: line.actualAmount });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleSave = async () => {
        if (editingLine) {
            await onUpdate({ ...editingLine, ...formData });
        } else {
            await onAdd(formData);
        }
        closeModal();
    };

    const handleDelete = async (lineId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا البند؟')) {
            await onDelete(lineId);
        }
    };

    const { totals, chartData } = useMemo(() => {
        const totals = lines.reduce((acc, line) => {
            acc.budget += line.budgetAmount;
            acc.actual += line.actualAmount;
            return acc;
        }, { budget: 0, actual: 0 });

        const groupedByCategory = lines.reduce<{[key: string]: { budgetAmount: number, actualAmount: number }}>((acc, line) => {
            if (!acc[line.category]) {
                acc[line.category] = { budgetAmount: 0, actualAmount: 0 };
            }
            acc[line.category].budgetAmount += line.budgetAmount;
            acc[line.category].actualAmount += line.actualAmount;
            return acc;
        }, {});

        const chartData = Object.entries(groupedByCategory).map(([name, values]) => ({ name, ...values }));

        return { totals, chartData };
    }, [lines]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    <PlusCircle size={16} className="ml-2" /> إضافة بند جديد
                </button>
            </div>

            {chartData.length > 0 && <div className="mb-8 h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => `﷼${(value as number / 1000)}k`}/>
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value: number) => `﷼${value.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="budgetAmount" fill="#8884d8" name="الميزانية" />
                        <Bar dataKey="actualAmount" fill="#82ca9d" name="الفعلي" />
                    </BarChart>
                </ResponsiveContainer>
            </div>}
            
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white text-right text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 border-b">الفئة</th>
                            <th className="p-3 border-b">البند</th>
                            <th className="p-3 border-b">الميزانية المعتمدة</th>
                            <th className="p-3 border-b">المصروفات الفعلية</th>
                            <th className="p-3 border-b">المتبقي</th>
                            <th className="p-3 border-b">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map(line => {
                            const remaining = line.budgetAmount - line.actualAmount;
                            return (
                                <tr key={line.id}>
                                    <td className="p-3 border-b">{line.category}</td>
                                    <td className="p-3 border-b">{line.budgetItem}</td>
                                    <td className="p-3 border-b">﷼{line.budgetAmount.toLocaleString()}</td>
                                    <td className="p-3 border-b">﷼{line.actualAmount.toLocaleString()}</td>
                                    <td className={`p-3 border-b font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>﷼{remaining.toLocaleString()}</td>
                                    <td className="p-3 border-b">
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <button onClick={() => openEditModal(line)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(line.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                        <tr>
                            <td className="p-3" colSpan={2}>الإجمالي</td>
                            <td className="p-3">﷼{totals.budget.toLocaleString()}</td>
                            <td className="p-3">﷼{totals.actual.toLocaleString()}</td>
                            <td className={`p-3 ${totals.budget - totals.actual >= 0 ? 'text-green-700' : 'text-red-700'}`}>﷼{(totals.budget - totals.actual).toLocaleString()}</td>
                            <td className="p-3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
             <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLine ? "تعديل بند الميزانية" : "إضافة بند جديد للميزانية"}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                            <select name="category" id="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                                <option>مواد بناء</option>
                                <option>أجور العمال</option>
                                <option>مقاولين بالباطن</option>
                                <option>معدات</option>
                                <option>مصاريف إدارية</option>
                                <option>أخرى</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="budgetItem" className="block text-sm font-medium text-gray-700 mb-1">وصف البند</label>
                            <input type="text" name="budgetItem" id="budgetItem" value={formData.budgetItem} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ المعتمد</label>
                                <input type="number" name="budgetAmount" id="budgetAmount" value={formData.budgetAmount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="actualAmount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ الفعلي</label>
                                <input type="number" name="actualAmount" id="actualAmount" value={formData.actualAmount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};


const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = useState(true);

    const [project, setProject] = useState<Project | null>(null);
    const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
    const [custodies, setCustodies] = useState<Custody[]>([]);

    const fetchData = async (projectId: string) => {
        setIsLoading(true);
        try {
            const [
                projectData,
                budgetLinesData,
                tasksData,
                allInvoices,
                allPOs,
                allCOs,
                allCustodies
            ] = await Promise.all([
                api.getProjectById(projectId),
                api.getBudgetLinesForProject(projectId),
                api.getTasksForProject(projectId),
                api.getInvoices(),
                api.getPurchaseOrders(),
                api.getChangeOrders(),
                api.getCustodies(),
            ]);

            if (projectData) {
                setProject(projectData);
                setBudgetLines(budgetLinesData);
                setTasks(tasksData);
                setInvoices(allInvoices.filter(i => i.project === projectData.name));
                setPurchaseOrders(allPOs.filter(po => po.projectName === projectData.name));
                setChangeOrders(allCOs.filter(co => co.projectName === projectData.name));
                setCustodies(allCustodies.filter(c => c.projectId === projectData.id));
            } else {
                setProject(null); // Project not found
            }
        } catch (error) {
            console.error("Failed to load project details:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (id) {
            fetchData(id);
        } else {
            setIsLoading(false);
            setProject(null);
        }
    }, [id]);

    // --- Budget Line Handlers ---
    const handleAddBudgetLine = async (data: Omit<BudgetLine, 'id' | 'projectId'>) => {
        if (!id) return;
        await api.addBudgetLine({ ...data, projectId: id });
        const updatedLines = await api.getBudgetLinesForProject(id);
        setBudgetLines(updatedLines);
    };
    const handleUpdateBudgetLine = async (line: BudgetLine) => {
        if (!id) return;
        await api.updateBudgetLine(line);
        const updatedLines = await api.getBudgetLinesForProject(id);
        setBudgetLines(updatedLines);
    };
    const handleDeleteBudgetLine = async (lineId: string) => {
        if (!id) return;
        await api.deleteBudgetLine(lineId);
        const updatedLines = await api.getBudgetLinesForProject(id);
        setBudgetLines(updatedLines);
    };

    // --- Task Handlers ---
    const handleSaveTask = async (taskData: Omit<ProjectTask, 'id' | 'projectId'>, editingTaskId: string | null) => {
        if (!id) return;
        if (editingTaskId) {
            await api.updateTask({ ...taskData, id: editingTaskId, projectId: id });
        } else {
            await api.addTask({ ...taskData, projectId: id });
        }
        const updatedTasks = await api.getTasksForProject(id);
        setTasks(updatedTasks);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!id) return;
        await api.deleteTask(taskId);
        const updatedTasks = await api.getTasksForProject(id);
        setTasks(updatedTasks);
    };

    const detailedProject = useMemo(() => {
        if (!project) return null;
        if (budgetLines.length > 0) {
            const totalBudget = budgetLines.reduce((sum, item) => sum + item.budgetAmount, 0);
            const totalSpent = budgetLines.reduce((sum, item) => sum + item.actualAmount, 0);
            return { ...project, budget: totalBudget, spent: totalSpent };
        }
        return project;
    }, [project, budgetLines]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="mr-3 text-gray-600">جاري تحميل تفاصيل المشروع...</p>
            </div>
        );
    }

    if (!detailedProject) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl font-bold text-red-600">المشروع غير موجود</h2>
                <Link to="/projects" className="text-blue-600 hover:underline mt-4 inline-block">العودة إلى قائمة المشاريع</Link>
            </div>
        );
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const profitability = totalInvoiced - detailedProject.spent;
    const progress = detailedProject.budget > 0 ? Math.min(Math.round((detailedProject.spent / detailedProject.budget) * 100), 100) : 0;
    const remainingBudget = Math.max(0, detailedProject.budget - detailedProject.spent);

    const financialBreakdownData = [
        { name: 'المصروفات', value: detailedProject.spent },
        { name: 'المتبقي من الميزانية', value: remainingBudget },
    ];
    const COLORS = ['#EF4444', '#22C55E'];

    const tabs = [
        { id: 'timeline', label: `الجدول الزمني (${tasks.length})`, content: (
            <TimelineTabContent tasks={tasks} onSave={handleSaveTask} onDelete={handleDeleteTask} />
        )},
        { id: 'budget', label: `الميزانية التفصيلية (${budgetLines.length})`, content: (
            <BudgetTabContent 
                lines={budgetLines}
                onAdd={handleAddBudgetLine}
                onUpdate={handleUpdateBudgetLine}
                onDelete={handleDeleteBudgetLine}
            />
        )},
        { id: 'documents', label: `المستندات`, content: (
             <AttachmentsManager relatedId={detailedProject.id} relatedType="project" />
        )},
        { id: 'invoices', label: `الفواتير (${invoices.length})`, content: (
            <table className="min-w-full bg-white text-right text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 border-b">الرقم</th><th className="p-2 border-b">المبلغ</th><th className="p-2 border-b">تاريخ الإصدار</th><th className="p-2 border-b">الحالة</th></tr></thead>
                <tbody>{invoices.length > 0 ? invoices.map(i => <tr key={i.id}><td className="p-2 border-b">{i.id}</td><td className="p-2 border-b">﷼{i.amount.toLocaleString()}</td><td className="p-2 border-b">{i.issueDate}</td><td className="p-2 border-b">{i.status}</td></tr>) : <tr><td colSpan={4} className="text-center p-4 text-gray-500">لا توجد فواتير لهذا المشروع.</td></tr>}</tbody>
            </table>
        )},
        { id: 'pos', label: `أوامر الشراء (${purchaseOrders.length})`, content: (
             <table className="min-w-full bg-white text-right text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 border-b">الرقم</th><th className="p-2 border-b">المورد</th><th className="p-2 border-b">التاريخ</th><th className="p-2 border-b">الحالة</th></tr></thead>
                <tbody>{purchaseOrders.length > 0 ? purchaseOrders.map(po => <tr key={po.id}><td className="p-2 border-b">{po.id}</td><td className="p-2 border-b">{po.supplierName}</td><td className="p-2 border-b">{po.date}</td><td className="p-2 border-b">{po.status}</td></tr>) : <tr><td colSpan={4} className="text-center p-4 text-gray-500">لا توجد أوامر شراء لهذا المشروع.</td></tr>}</tbody>
            </table>
        )},
        { id: 'cos', label: `أوامر التغيير (${changeOrders.length})`, content: (
            <table className="min-w-full bg-white text-right text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 border-b">الرقم</th><th className="p-2 border-b">الوصف</th><th className="p-2 border-b">المبلغ</th><th className="p-2 border-b">الحالة</th></tr></thead>
                <tbody>{changeOrders.length > 0 ? changeOrders.map(co => <tr key={co.id}><td className="p-2 border-b">{co.id}</td><td className="p-2 border-b">{co.description}</td><td className="p-2 border-b">﷼{co.amount.toLocaleString()}</td><td className="p-2 border-b">{co.status}</td></tr>) : <tr><td colSpan={4} className="text-center p-4 text-gray-500">لا توجد أوامر تغيير لهذا المشروع.</td></tr>}</tbody>
            </table>
        )},
        { id: 'custodies', label: `العهد (${custodies.length})`, content: (
            <table className="min-w-full bg-white text-right text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 border-b">الرقم</th><th className="p-2 border-b">الموظف</th><th className="p-2 border-b">المبلغ</th><th className="p-2 border-b">المتبقي</th><th className="p-2 border-b">الحالة</th></tr></thead>
                <tbody>{custodies.length > 0 ? custodies.map(c => <tr key={c.id}><td className="p-2 border-b">{c.id}</td><td className="p-2 border-b">{c.employeeName}</td><td className="p-2 border-b">﷼{c.amount.toLocaleString()}</td><td className="p-2 border-b">﷼{(c.amount - c.settledAmount).toLocaleString()}</td><td className="p-2 border-b">{c.status}</td></tr>) : <tr><td colSpan={5} className="text-center p-4 text-gray-500">لا توجد عهد لهذا المشروع.</td></tr>}</tbody>
            </table>
        )},
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">
                    تفاصيل المشروع: <span className="text-blue-600">{detailedProject.name}</span>
                </h1>
                <Link to="/projects" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border rounded-md hover:bg-gray-200">
                    <ArrowLeft size={16} className="ml-2" />
                    العودة للمشاريع
                </Link>
            </div>

            <Card title="ملخص المشروع">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-700">
                    <div className="flex items-center"><User size={16} className="ml-2 text-gray-500" /> <strong>العميل:</strong> <span className="mr-2">{detailedProject.client}</span></div>
                    <div className="flex items-center"><Calendar size={16} className="ml-2 text-gray-500" /> <strong>تاريخ البدء:</strong> <span className="mr-2">{detailedProject.startDate}</span></div>
                    <div className="flex items-center"><Calendar size={16} className="ml-2 text-gray-500" /> <strong>تاريخ الانتهاء:</strong> <span className="mr-2">{detailedProject.endDate}</span></div>
                    <div className="flex items-center"><strong>الحالة:</strong> <span className="mr-2">{getStatusChip(detailedProject.status)}</span></div>
                </div>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="التقدم المالي" className="lg:col-span-2">
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-blue-700">تقدم المشروع</span>
                            <span className="text-sm font-medium text-blue-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><p className="text-sm text-gray-500">الميزانية</p><p className="text-xl font-bold">﷼{detailedProject.budget.toLocaleString()}</p></div>
                        <div><p className="text-sm text-gray-500">المصروفات</p><p className="text-xl font-bold text-red-600">﷼{detailedProject.spent.toLocaleString()}</p></div>
                        <div><p className="text-sm text-gray-500">المتبقي</p><p className="text-xl font-bold text-green-600">﷼{remainingBudget.toLocaleString()}</p></div>
                        <div><p className="text-sm text-gray-500">الربحية</p><p className={`text-xl font-bold ${profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>﷼{profitability.toLocaleString()}</p></div>
                    </div>
                </Card>

                <Card title="توزيع الميزانية">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={financialBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                {financialBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `﷼${value.toLocaleString()}`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card title="البيانات المرتبطة بالمشروع">
                <Tabs tabs={tabs} initialTabId="timeline" />
            </Card>
            <style>{`
                .gantt-container .bar-wrapper {
                font-family: 'Tajawal', sans-serif;
                }
                .gantt-container .grid-row {
                fill: #f9fafb;
                }
                .gantt-container .grid-row:nth-child(odd) {
                fill: #ffffff;
                }
                .gantt-container .calendar-header {
                    font-size: 12px;
                }
            `}</style>
        </div>
    );
};

export default ProjectDetail;