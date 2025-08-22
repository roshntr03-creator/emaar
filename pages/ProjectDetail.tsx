
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Briefcase, Calendar, User, ArrowLeft, PlusCircle, Edit, Trash2, GanttChartSquare, Loader2, FileArchive, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Gantt, ViewMode, Task } from 'gantt-task-react';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import AttachmentsManager from '../components/AttachmentsManager';
import type { Project, BudgetLine, ProjectTask, ProjectFinancialTransaction } from '../types';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';


const getStatusChip = (status: 'active' | 'completed' | 'on_hold') => {
  switch (status) {
    case 'active': return <span className="px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">نشط</span>;
    case 'completed': return <span className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">مكتمل</span>;
    case 'on_hold': return <span className="px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full">متوقف</span>;
  }
};

// --- Financials Tab Component ---
const FinancialsTabContent: React.FC<{ transactions: ProjectFinancialTransaction[] }> = ({ transactions }) => {
    const { totals, sortedTransactions } = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totals = sorted.reduce((acc, t) => {
            acc.income += t.income;
            acc.expense += t.expense;
            return acc;
        }, { income: 0, expense: 0 });
        return { totals, sortedTransactions: sorted };
    }, [transactions]);
    
    const balance = totals.income - totals.expense;

    return (
        <div>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                    <p className="text-xl font-bold text-green-700">﷼{totals.income.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">إجمالي التكاليف</p>
                    <p className="text-xl font-bold text-red-700">﷼{totals.expense.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-lg ${balance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-gray-600">الربحية الحالية</p>
                    <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>﷼{balance.toLocaleString()}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white text-right text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 border-b">التاريخ</th>
                            <th className="p-3 border-b">النوع</th>
                            <th className="p-3 border-b">البيان</th>
                            <th className="p-3 border-b">إيراد</th>
                            <th className="p-3 border-b">تكلفة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.map(tx => (
                            <tr key={tx.id}>
                                <td className="p-3 border-b">{tx.date}</td>
                                <td className="p-3 border-b">{tx.type}</td>
                                <td className="p-3 border-b">{tx.description}</td>
                                <td className="p-3 border-b text-green-600">{tx.income > 0 ? `﷼${tx.income.toLocaleString()}` : '-'}</td>
                                <td className="p-3 border-b text-red-600">{tx.expense > 0 ? `﷼${tx.expense.toLocaleString()}` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
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
    const location = useLocation();
    const passedProject = location.state?.project as Project | undefined;
    const { hasPermission } = useAuth();
    
    // Data states
    const [project, setProject] = useState<Project | null>(passedProject || null);
    const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [financialTransactions, setFinancialTransactions] = useState<ProjectFinancialTransaction[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async (projectId: string) => {
            try {
                const [
                    projectData,
                    budgetLinesData,
                    tasksData,
                    financialsData,
                ] = await Promise.all([
                    api.getProjectById(projectId),
                    api.getBudgetLinesForProject(projectId),
                    api.getTasksForProject(projectId),
                    api.getProjectFinancialTransactions(projectId),
                ]);

                if (projectData) {
                    setProject(projectData);
                    setBudgetLines(budgetLinesData);
                    setTasks(tasksData);
                    setFinancialTransactions(financialsData);
                } else {
                    setProject(null);
                }
            } catch (error) {
                console.error("Failed to load project details:", error);
                setProject(null);
            } finally {
                setIsLoading(false);
            }
        };
        
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

    // Memoized financial calculations based on the single source of truth
    const financialSummary = useMemo(() => {
        const summary = financialTransactions.reduce((acc, tx) => {
            acc.totalIncome += tx.income;
            acc.totalExpense += tx.expense;
            return acc;
        }, { totalIncome: 0, totalExpense: 0 });
        
        const profitability = summary.totalIncome - summary.totalExpense;
        return { ...summary, profitability };
    }, [financialTransactions]);
    
    // The main project budget is now the sum of budget lines for accuracy
    const projectBudget = useMemo(() => budgetLines.reduce((sum, item) => sum + item.budgetAmount, 0), [budgetLines]);
    const projectSpent = financialSummary.totalExpense;
    const progress = projectBudget > 0 ? Math.min(Math.round((projectSpent / projectBudget) * 100), 100) : 0;
    const remainingBudget = Math.max(0, projectBudget - projectSpent);

    const financialBreakdownData = [
        { name: 'المصروفات', value: projectSpent },
        { name: 'المتبقي من الميزانية', value: remainingBudget },
    ];
    const COLORS = ['#EF4444', '#22C55E'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="mr-3 text-gray-600">جاري تحميل تفاصيل المشروع...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl font-bold text-red-600">المشروع غير موجود</h2>
                <Link to="/projects" className="text-blue-600 hover:underline mt-4 inline-block">العودة إلى قائمة المشاريع</Link>
            </div>
        );
    }
    
    const tabs = [
        { id: 'financials', label: `البيانات المالية (${financialTransactions.length})`, content: <FinancialsTabContent transactions={financialTransactions} /> },
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
             <AttachmentsManager relatedId={project.id} relatedType="project" />
        )},
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">
                    تفاصيل المشروع: <span className="text-blue-600">{project.name}</span>
                </h1>
                <Link to="/projects" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border rounded-md hover:bg-gray-200">
                    <ArrowLeft size={16} className="ml-2" />
                    العودة للمشاريع
                </Link>
            </div>

            <Card title="ملخص المشروع">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-700">
                    <div className="flex items-center"><User size={16} className="ml-2 text-gray-500" /> <strong>العميل:</strong> <span className="mr-2">{project.client}</span></div>
                    <div className="flex items-center"><Calendar size={16} className="ml-2 text-gray-500" /> <strong>تاريخ البدء:</strong> <span className="mr-2">{project.startDate}</span></div>
                    <div className="flex items-center"><Calendar size={16} className="ml-2 text-gray-500" /> <strong>تاريخ الانتهاء:</strong> <span className="mr-2">{project.endDate}</span></div>
                    <div className="flex items-center"><strong>الحالة:</strong> <span className="mr-2">{getStatusChip(project.status)}</span></div>
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
                        <div><p className="text-sm text-gray-500">الميزانية</p><p className="text-xl font-bold">﷼{projectBudget.toLocaleString()}</p></div>
                        <div><p className="text-sm text-gray-500">المصروفات</p><p className="text-xl font-bold text-red-600">﷼{projectSpent.toLocaleString()}</p></div>
                        <div><p className="text-sm text-gray-500">المتبقي</p><p className="text-xl font-bold text-green-600">﷼{remainingBudget.toLocaleString()}</p></div>
                        <div><p className="text-sm text-gray-500">الربحية</p><p className={`text-xl font-bold ${financialSummary.profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>﷼{financialSummary.profitability.toLocaleString()}</p></div>
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

            <Card title="تفاصيل وبيانات المشروع">
                <Tabs tabs={tabs} initialTabId="financials" />
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
