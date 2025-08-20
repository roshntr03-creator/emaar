import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { DollarSign, Briefcase, Users, FileText, ShoppingCart, Book, BrainCircuit, Loader2, KeyRound } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import type { Project, Invoice, Client } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const usingFirebase = isFirebaseConfigured();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      
      const api = usingFirebase ? firebaseApi : localApi;

      try {
        const [projectsData, invoicesData, clientsData] = await Promise.all([
          api.getProjects(),
          api.getInvoices(),
          api.getClients()
        ]);
        setProjects(projectsData);
        setInvoices(invoicesData);
        setClients(clientsData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [usingFirebase]);
  
  // Calculate dashboard stats
  const dashboardData = useMemo(() => {
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const activeProjects = projects.filter(p => p.status === 'active').length;
    const newClients = clients.length;

    const dueInvoicesAmount = invoices
      .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const revenueByMonth = invoices.reduce((acc, inv) => {
      if (inv.status === 'paid') {
        const month = new Date(inv.issueDate).toLocaleString('ar', { month: 'short' });
        acc[month] = (acc[month] || 0) + inv.amount;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const revenueData = Object.entries(revenueByMonth)
      .map(([name, revenue]) => ({ name, revenue }))
      .slice(-6); // Last 6 months

    const projectStatusData = projects.reduce((acc, p) => {
      if (p.status === 'active') acc[0].value++;
      else if (p.status === 'completed') acc[1].value++;
      else if (p.status === 'on_hold') acc[2].value++;
      return acc;
    }, [
      { name: 'نشط', value: 0 },
      { name: 'مكتمل', value: 0 },
      { name: 'متوقف', value: 0 },
    ]);
    
    const recentActivities = [
      ...invoices.slice(-2).map(i => ({ type: 'invoice', description: `تم إنشاء فاتورة ${i.id} لمشروع ${i.project}`, time: i.issueDate, icon: <FileText className="text-red-500" /> })),
      ...projects.slice(-2).map(p => ({ type: 'project', description: `تم إضافة مشروع جديد: ${p.name}`, time: p.startDate, icon: <Briefcase className="text-green-500" /> })),
    ].sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);


    return {
      totalRevenue,
      activeProjects,
      newClients,
      dueInvoicesAmount,
      revenueData,
      projectStatusData,
      recentActivities
    };
  }, [projects, invoices, clients]);

  const handleGenerateSummary = async () => {
      setIsLoadingSummary(true);
      setSummaryError('');
      setSummary('');

      const dataForAI = {
          totalRevenue: dashboardData.totalRevenue,
          activeProjects: dashboardData.activeProjects,
          newClients: dashboardData.newClients,
          dueInvoicesAmount: dashboardData.dueInvoicesAmount,
          monthlyRevenue: dashboardData.revenueData,
          projectStatusBreakdown: dashboardData.projectStatusData,
      };

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
          أنت مستشار مالي استراتيجي (CFO) لشركة مقاولات في المملكة العربية السعودية. مهمتك هي تحليل البيانات المالية التالية وكتابة ملخص تنفيذي موجز ومؤثر لمدير الشركة.

          يجب أن يكون الملخص منظمًا في ثلاثة أقسام باستخدام هذه العناوين الدقيقة:
          ### أهم الإنجازات
          ### نقاط تتطلب الانتباه
          ### توصيات استراتيجية

          تحت كل عنوان، قدم 2-3 نقاط رئيسية على شكل قائمة تبدأ بـ *. يجب أن تكون لغة الخطاب احترافية، ثاقبة، وموجهة نحو اتخاذ إجراءات. استخدم عملة "ريال سعودي" أو "﷼".

          إليك البيانات لتحليلها:
          ${JSON.stringify(dataForAI, null, 2)}
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
          });

          setSummary(response.text);

      } catch (error) {
          console.error("Error generating summary:", error);
          setSummaryError("عذراً، حدث خطأ أثناء إنشاء الملخص. يرجى المحاولة مرة أخرى.");
      } finally {
          setIsLoadingSummary(false);
      }
  };
  
  const formatSummary = (text: string) => {
    return text
      .replace(/### (.*?)\n/g, '<h3 class="font-bold text-gray-800 mt-4 mb-2 text-md">$1</h3>')
      .replace(/\* (.*?)\n/g, '<div class="flex items-start mb-2"><span class="mr-2 mt-1">•</span><p class="text-gray-700">$1</p></div>')
      .replace(/\n/g, '<br />');
  };

  if (isLoadingData) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mr-3 text-gray-600">جاري تحميل لوحة التحكم...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<DollarSign className="text-blue-500" />} 
          title="إجمالي الإيرادات" 
          value={`﷼ ${dashboardData.totalRevenue.toLocaleString()}`}
        />
        <StatCard 
          icon={<Briefcase className="text-green-500" />} 
          title="المشاريع النشطة" 
          value={dashboardData.activeProjects.toString()} 
        />
        <StatCard 
          icon={<Users className="text-indigo-500" />} 
          title="إجمالي العملاء" 
          value={dashboardData.newClients.toString()} 
        />
        <StatCard 
          icon={<FileText className="text-red-500" />} 
          title="فواتير مستحقة" 
          value={`﷼ ${dashboardData.dueInvoicesAmount.toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="نظرة عامة على الإيرادات (آخر 6 أشهر)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `﷼${value / 1000}k`} />
              <Tooltip formatter={(value: number) => `﷼${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" name="الإيرادات" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        <Card title="حالة المشاريع">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.projectStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {dashboardData.projectStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="الملخص التنفيذي الذكي" className="lg:col-span-2">
          {isLoadingSummary && (
              <div className="flex flex-col items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-600">...جاري تحليل البيانات وإعداد الملخص</p>
              </div>
          )}
          {summaryError && <div className="text-center text-red-600 p-4 bg-red-50 rounded-md">{summaryError}</div>}
          {summary && <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatSummary(summary) }} />}
          {!summary && !isLoadingSummary && !summaryError && (
              <div className="text-center p-8 flex flex-col items-center">
                  <BrainCircuit className="w-12 h-12 text-gray-400 mb-4" />
                  <h4 className="font-semibold text-lg text-gray-700">تحليلات ذكية لأدائك</h4>
                  <p className="text-gray-500 my-2 max-w-md">احصل على ملخص تنفيذي فوري لأهم مؤشرات الأداء، مع توصيات استراتيجية لتحسين أعمالك، مقدمة من Gemini AI.</p>
                  <button onClick={handleGenerateSummary} className="mt-4 inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-all">
                      <BrainCircuit size={16} className="ml-2" />
                      توليد الملخص الآن
                  </button>
              </div>
          )}
        </Card>

        <Card title="الأنشطة الأخيرة">
          <div className="space-y-4">
            {dashboardData.recentActivities.length > 0 ? dashboardData.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between pb-2 border-b last:border-b-0">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-full ml-3">
                      {activity.icon}
                  </div>
                  <p className="text-sm text-gray-700">{activity.description}</p>
                </div>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            )) : (
              <p className="text-center text-gray-500 py-4">لا توجد أنشطة حديثة.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
