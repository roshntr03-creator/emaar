import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Server, ShieldCheck, FileWarning, CheckCircle, XCircle, AlertCircle, BrainCircuit, Loader2, CircleDot, KeyRound } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApiKey } from '../contexts/ApiKeyContext';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

// --- Mock Data ---
const perfData: { time: string, ms: number }[] = [
    { time: '29 دقيقة', ms: 120 }, { time: '25 دقيقة', ms: 150 }, { time: '20 دقيقة', ms: 130 },
    { time: '15 دقيقة', ms: 180 }, { time: '10 دقائق', ms: 160 }, { time: '5 دقائق', ms: 170 },
    { time: 'الآن', ms: 140 },
];

const severityChip: Record<string, React.ReactNode> = {
    'ERROR': <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">خطأ</span>,
    'WARNING': <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">تحذير</span>,
    'INFO': <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">معلومات</span>,
};

type CheckStatus = 'pending' | 'running' | 'pass' | 'fail';
interface CheckResult {
    name: string;
    status: CheckStatus;
    message: string;
}

const getChecksToRun = async (api: typeof localApi | typeof firebaseApi) => {
    const [journalVouchers, projects, clients, invoices] = await Promise.all([
        api.getJournalVouchers(),
        api.getProjects(),
        api.getClients(),
        api.getInvoices()
    ]);

    return [
        {
            name: 'سلامة القيود اليومية',
            check: () => {
                const unbalanced = journalVouchers.filter(jv => {
                    const totals = jv.lines.reduce((acc, line) => {
                        acc.debit += line.debit;
                        acc.credit += line.credit;
                        return acc;
                    }, { debit: 0, credit: 0 });
                    return totals.debit !== totals.credit;
                });
                if (unbalanced.length > 0) {
                    return { pass: false, msg: `تم العثور على ${unbalanced.length} قيود غير متوازنة.` };
                }
                return { pass: true, msg: 'كل القيود اليومية المسجلة متوازنة.' };
            }
        },
        {
            name: 'ربط المشاريع بالعملاء',
            check: () => {
                const clientNames = new Set(clients.map(c => c.name));
                const unlinked = projects.filter(p => !clientNames.has(p.client));
                if (unlinked.length > 0) {
                    return { pass: false, msg: `تم العثور على ${unlinked.length} مشاريع غير مرتبطة بعملاء صالحين.` };
                }
                return { pass: true, msg: 'كل المشاريع مرتبطة بعميل صالح.' };
            }
        },
        {
            name: 'فحص الفواتير المكررة',
            check: () => {
                const invoiceIds = new Set();
                for (const invoice of invoices) {
                    if (invoiceIds.has(invoice.id)) {
                        return { pass: false, msg: `تم العثور على فواتير مكررة بالرقم ${invoice.id}.` };
                    }
                    invoiceIds.add(invoice.id);
                }
                return { pass: true, msg: 'لم يتم العثور على فواتير مكررة.' };
            }
        },
    ];
};


const Diagnostics: React.FC = () => {
    const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'complete'>('idle');
    const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
    const { apiKey } = useApiKey();
    const { hasPermission } = useAuth();
    
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;

    // State for AI Analysis Modal
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [currentErrorToAnalyze, setCurrentErrorToAnalyze] = useState<{name: string, message: string} | null>(null);

    const handleRunCheck = async () => {
        setCheckStatus('checking');
        
        // Initial pending state based on a static list of names for immediate UI feedback
        const initialChecks = ['سلامة القيود اليومية', 'ربط المشاريع بالعملاء', 'فحص الفواتير المكررة'];
        setCheckResults(initialChecks.map(name => ({ name, status: 'pending', message: '' })));
        
        const checksToRun = await getChecksToRun(api);

        for (let i = 0; i < checksToRun.length; i++) {
            setCheckResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r));
            await new Promise(resolve => setTimeout(resolve, 700)); // simulate check time

            const check = checksToRun[i];
            const result = check.check();
            setCheckResults(prev => prev.map((r, idx) => idx === i ? {
                ...r,
                status: result.pass ? 'pass' : 'fail',
                message: result.msg
            } : r));
        }
        setCheckStatus('complete');
    };

    const handleAiAnalysis = async (check: { name: string, message: string }) => {
        setCurrentErrorToAnalyze(check);
        setIsAnalysisModalOpen(true);
        setIsAnalyzing(true);
        setAnalysisResult('');
        
        if (!apiKey) {
            setAnalysisResult("عذراً، لا يمكن إجراء التحليل. الرجاء إدخال مفتاح Google AI API في صفحة الإعدادات أولاً.");
            setIsAnalyzing(false);
            return;
        }
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
                أنت خبير في تشخيص أنظمة المحاسبة لشركات المقاولات. 
                اشرح المشكلة التالية بأسلوب مبسط لمدير غير تقني.
                
                المشكلة: "${check.name}"
                تفاصيل الخطأ: "${check.message}"

                قم بتنظيم إجابتك في ثلاثة أقسام واضحة باستخدام العناوين التالية بالضبط:
                ### شرح المشكلة
                ### الأسباب المحتملة
                ### خطوات الحل المقترحة
                
                استخدم اللغة العربية الفصحى والواضحة وقدم خطوات عملية وقابلة للتنفيذ.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setAnalysisResult(response.text);
        
        } catch (error) {
            console.error("Error generating analysis:", error);
            setAnalysisResult("عذراً، حدث خطأ أثناء تحليل المشكلة. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const formatAnalysis = (text: string) => {
        return text
          .replace(/### (.*?)\n/g, '<h3 class="font-bold text-gray-800 mt-4 mb-2 text-md">$1</h3>')
          .replace(/\* (.*?)\n/g, '<div class="flex items-start mb-2"><span class="mr-2 mt-1">•</span><p class="text-gray-700">$1</p></div>')
          .replace(/\n/g, '<br />');
      };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="حالة النظام">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-gray-700"><Server size={16} className="ml-2 text-blue-500" /> اتصال قاعدة البيانات</span>
                            <span className="flex items-center text-sm px-2 py-1 bg-green-100 text-green-800 rounded-md"><CheckCircle size={14} className="ml-1" /> متصل</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-gray-700"><ShieldCheck size={16} className="ml-2 text-green-500" /> صلاحيات المستخدم</span>
                            <span className="flex items-center text-sm px-2 py-1 bg-green-100 text-green-800 rounded-md"><CheckCircle size={14} className="ml-1" /> نشطة</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-gray-700"><KeyRound size={16} className="ml-2 text-yellow-500" /> مفتاح Google AI API</span>
                            {apiKey ? (
                                <span className="flex items-center text-sm px-2 py-1 bg-green-100 text-green-800 rounded-md"><CheckCircle size={14} className="ml-1" /> موجود</span>
                            ) : (
                                <span className="flex items-center text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md"><AlertCircle size={14} className="ml-1" /> غير موجود</span>
                            )}
                        </div>
                    </div>
                </Card>
                <Card title="أداء واجهة برمجة التطبيقات (آخر 30 دقيقة)">
                    <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={perfData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" fontSize={12} />
                            <YAxis fontSize={12} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="ms" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            
            <Card title="تشخيص سلامة البيانات">
                <p className="text-sm text-gray-600 mb-4">
                    قم بإجراء فحص شامل على بيانات النظام للتأكد من عدم وجود أخطاء أو تناقضات.
                </p>
                <div className="flex justify-center">
                    <button onClick={handleRunCheck} disabled={checkStatus === 'checking'} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                        {checkStatus === 'checking' ? 'جاري الفحص...' : 'بدء الفحص الآن'}
                    </button>
                </div>
                {checkStatus !== 'idle' && (
                    <div className="mt-6 space-y-3">
                        {checkResults.map((result, index) => (
                            <div key={index} className="flex items-start p-3 border rounded-md bg-gray-50">
                                <div className="ml-3 mt-1">
                                    {result.status === 'pending' && <CircleDot className="w-5 h-5 text-gray-400" />}
                                    {result.status === 'running' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                                    {result.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                    {result.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">{result.name}</p>
                                    <p className="text-sm text-gray-600">{result.message}</p>
                                </div>
                                {result.status === 'fail' && hasPermission('diagnostics', 'view') && (
                                    <button onClick={() => handleAiAnalysis(result)} className="flex items-center text-xs px-2 py-1 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
                                        <BrainCircuit size={14} className="ml-1" /> تحليل
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} title={`تحليل الخطأ: ${currentErrorToAnalyze?.name || ''}`}>
                {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-600">...جاري تحليل المشكلة باستخدام الذكاء الاصطناعي</p>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none text-right" dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisResult) }} />
                )}
            </Modal>
        </div>
    );
};

export default Diagnostics;
