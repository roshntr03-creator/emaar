
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import type { Project, ProjectCostEstimate } from '../types';
import { PlusCircle, Filter, Edit, Trash2, Loader2, BrainCircuit } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../contexts/ApiKeyContext';

const getStatusChip = (status: 'active' | 'completed' | 'on_hold') => {
  switch (status) {
    case 'active':
      return <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">نشط</span>;
    case 'completed':
      return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">مكتمل</span>;
    case 'on_hold':
      return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">متوقف</span>;
  }
};

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Project['status']>('all');
  const { hasPermission } = useAuth();
  const { apiKey } = useApiKey();
  
  const [isEstimationModalOpen, setIsEstimationModalOpen] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationPrompt, setEstimationPrompt] = useState('');
  const [estimationResult, setEstimationResult] = useState<ProjectCostEstimate | null>(null);
  const [estimationError, setEstimationError] = useState('');

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const data = await api.getProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchProjects();
  }, [usingFirebase]);

  const initialFormState: Omit<Project, 'id' | 'spent' | 'status'> = {
    name: '',
    client: '',
    budget: 0,
    startDate: '',
    endDate: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') {
      return projects;
    }
    return projects.filter(p => p.status === statusFilter);
  }, [projects, statusFilter]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'budget' ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingProject(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client: project.client,
      budget: project.budget,
      startDate: project.startDate,
      endDate: project.endDate,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSave = async () => {
    try {
        if (editingProject) {
          const updatedProject = await api.updateProject({ ...editingProject, ...formData });
           if (updatedProject) {
            setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
          }
        } else {
          const newProjectData: Omit<Project, 'id'> = {
            ...formData,
            spent: 0,
            status: 'active'
          };
          const newProject = await api.addProject(newProjectData);
          setProjects(prevProjects => [...prevProjects, newProject]);
        }
        closeModal();
    } catch(error) {
        console.error("Failed to save project", error);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا المشروع؟')) {
        try {
            await api.deleteProject(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
        } catch(error) {
            console.error("Failed to delete project", error);
        }
    }
  };
  
  // --- AI Estimation Handlers ---
  const openEstimationModal = () => {
    if (!apiKey) {
      alert("يرجى إعداد مفتاح Google AI API في صفحة الإعدادات لتفعيل هذه الميزة.");
      return;
    }
    setEstimationPrompt('');
    setEstimationResult(null);
    setEstimationError('');
    setIsEstimationModalOpen(true);
  };

  const closeEstimationModal = () => setIsEstimationModalOpen(false);

  const handleGenerateEstimate = async () => {
    if (!estimationPrompt) {
      setEstimationError('الرجاء إدخال وصف للمشروع.');
      return;
    }
    if (!apiKey) {
        setEstimationError('مفتاح API غير موجود. يرجى إعداده في الإعدادات.');
        return;
    }

    setIsEstimating(true);
    setEstimationResult(null);
    setEstimationError('');

    try {
      const allProjects = await api.getProjects();
      const historicalProjects = allProjects
        .filter(p => p.status === 'completed' && p.budget > 0 && p.spent > 0)
        .slice(0, 3);

      const historicalDataForAI = historicalProjects.map(p => ({
        projectName: p.name,
        finalCost: p.spent,
        durationInDays: Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      }));

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        أنت خبير تقدير تكاليف في قطاع المقاولات بالمملكة العربية السعودية. مهمتك هي تحليل وصف المشروع التالي وتقديم تقدير تكلفة مفصل ومبني على البيانات التاريخية للمشاريع السابقة.

        وصف المشروع المطلوب تقديره: "${estimationPrompt}"

        بيانات تاريخية من مشاريع مكتملة للمقارنة:
        ${JSON.stringify(historicalDataForAI)}

        التعليمات:
        1.  قدّر التكلفة الإجمالية للمشروع بالريال السعودي.
        2.  قسّم التكلفة إلى فئات رئيسية (مثل: مواد، أجور، مقاولين باطن، معدات، مصاريف إدارية).
        3.  اذكر الافتراضات التي بنيت عليها تقديرك.
        4.  قدّر درجة ثقتك في هذا التقدير كنسبة مئوية (0-100).
        5.  اقترح اسمًا مختصرًا للمشروع بناءً على الوصف.
        6.  يجب أن يكون الناتج بصيغة JSON حصراً بناءً على المخطط المحدد.
      `;
      
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
            estimatedTotalBudget: { type: Type.NUMBER },
            costBreakdown: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                    }
                }
            },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidenceScore: { type: Type.NUMBER },
            suggestedProjectName: { type: Type.STRING },
        },
        required: ["estimatedTotalBudget", "costBreakdown", "assumptions", "confidenceScore", "suggestedProjectName"],
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      setEstimationResult(JSON.parse(response.text));

    } catch (e) {
      console.error("Error generating estimate:", e);
      setEstimationError("عذرًا، حدث خطأ أثناء إنشاء التقدير. تأكد من أن مفتاح API صحيح ونشط.");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleCreateProjectFromEstimate = () => {
    if (!estimationResult) return;
    
    closeEstimationModal();
    setEditingProject(null);
    setFormData({
      ...initialFormState,
      name: estimationResult.suggestedProjectName,
      budget: estimationResult.estimatedTotalBudget,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setIsModalOpen(true);
  };


  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة المشاريع</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
              {hasPermission('projects', 'create') && (
                <>
                <button 
                  onClick={openEstimationModal}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                  disabled={!apiKey}>
                    <BrainCircuit size={16} className="ml-2"/>
                    تقدير تكلفة (AI)
                </button>
                <button 
                  onClick={openAddModal}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    <PlusCircle size={16} className="ml-2"/>
                    إضافة مشروع جديد
                </button>
                </>
              )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
          <Filter size={16} className="text-gray-600"/>
          <span className="text-sm font-medium text-gray-700">تصفية حسب الحالة:</span>
          <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
          <button onClick={() => setStatusFilter('active')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>نشط</button>
          <button onClick={() => setStatusFilter('completed')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مكتمل</button>
          <button onClick={() => setStatusFilter('on_hold')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'on_hold' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>متوقف</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">اسم المشروع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">العميل</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الميزانية</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المصروفات</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">التقدم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ البدء</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ الانتهاء</th>
                {(hasPermission('projects', 'edit') || hasPermission('projects', 'delete')) &&
                  <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
                }
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل المشاريع...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length > 0 ? filteredProjects.map((project) => {
                const progress = project.budget > 0 ? Math.min(Math.round((project.spent / project.budget) * 100), 100) : 0;
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">
                       <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline font-semibold">
                        {project.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 border-b">{project.client}</td>
                    <td className="py-3 px-4 border-b">﷼{project.budget.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">﷼{project.spent.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className="text-xs">{progress}%</span>
                    </td>
                    <td className="py-3 px-4 border-b">{getStatusChip(project.status)}</td>
                    <td className="py-3 px-4 border-b">{project.startDate}</td>
                    <td className="py-3 px-4 border-b">{project.endDate}</td>
                    {(hasPermission('projects', 'edit') || hasPermission('projects', 'delete')) &&
                      <td className="py-3 px-4 border-b">
                        <div className="flex justify-center items-center space-x-2 space-x-reverse">
                            {hasPermission('projects', 'edit') && <button onClick={() => openEditModal(project)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`تعديل ${project.name}`}><Edit size={18}/></button>}
                            {hasPermission('projects', 'delete') && <button onClick={() => handleDelete(project.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`حذف ${project.name}`}><Trash2 size={18}/></button>}
                        </div>
                      </td>
                    }
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">
                    لا توجد مشاريع لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProject ? "تعديل بيانات المشروع" : "إضافة مشروع جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">اسم المشروع</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
              <input type="text" name="client" id="client" value={formData.client} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">الميزانية (﷼)</label>
              <input type="number" name="budget" id="budget" value={formData.budget} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
              <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء المتوقع</label>
              <input type="date" name="endDate" id="endDate" value={formData.endDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
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

      <Modal isOpen={isEstimationModalOpen} onClose={closeEstimationModal} title="تقدير تكلفة مشروع (AI)">
        {!estimationResult && (
          <div className="space-y-4">
            <div>
              <label htmlFor="estimationPrompt" className="block text-sm font-medium text-gray-700 mb-1">وصف المشروع</label>
              <textarea 
                id="estimationPrompt" 
                rows={4}
                value={estimationPrompt}
                onChange={(e) => setEstimationPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="مثال: بناء فيلا سكنية 400 متر مربع في الرياض، دورين وملحق، تشطيب فاخر مع مسبح."
              />
            </div>
            {estimationError && <p className="text-sm text-red-600">{estimationError}</p>}
            <button 
              onClick={handleGenerateEstimate} 
              disabled={isEstimating}
              className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
              {isEstimating ? <Loader2 className="animate-spin" /> : "بدء التقدير"}
            </button>
          </div>
        )}
        {isEstimating && !estimationResult && (
           <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-600">...جاري تحليل البيانات وإعداد التقدير</p>
            </div>
        )}
        {estimationResult && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">إجمالي الميزانية التقديرية</p>
              <p className="text-3xl font-bold text-indigo-600">﷼{(estimationResult.estimatedTotalBudget || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">درجة الثقة: {estimationResult.confidenceScore || 0}%</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">تفصيل التكاليف:</h4>
              <ul className="space-y-2 text-sm">
                {(estimationResult.costBreakdown || []).map((item, index) => (
                  <li key={index} className="p-2 bg-gray-100 rounded-md">
                    <div className="flex justify-between font-medium">
                      <span>{item.category}</span>
                      <span>﷼{(item.amount || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">الافتراضات:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {(estimationResult.assumptions || []).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
             <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button type="button" onClick={() => {setEstimationResult(null); setEstimationPrompt('')}} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                  تقدير جديد
                </button>
                <button type="button" onClick={handleCreateProjectFromEstimate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  إنشاء مشروع بهذا التقدير
                </button>
            </div>
          </div>
        )}
      </Modal>

    </>
  );
};

export default Projects;
