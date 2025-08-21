

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Server, ShieldCheck, CheckCircle, XCircle, AlertCircle, BrainCircuit, Loader2, CircleDot, KeyRound, Activity, Database, Link2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { getFirebaseConfig } from '../firebase/config';

// --- Mock Data ---
const perfData: { time: string, ms: number }[] = [
    { time: '29 دقيقة', ms: 120 }, { time: '25 دقيقة', ms: 150 }, { time: '20 دقيقة', ms: 130 },
    { time: '15 دقيقة', ms: 180 }, { time: '10 دقائق', ms: 160 }, { time: '5 دقائق', ms: 170 },
    { time: 'الآن', ms: 140 },
];

type CheckStatus = 'pending' | 'running' | 'pass' | 'fail';
type CheckCategory = 'سلامة مالية' | 'اتساق البيانات' | 'روابط تشغيلية';

interface CheckResult {
    name: string;
    category: CheckCategory;
    status: CheckStatus;
    message: string;
    problematicItems?: string[];
}

interface Check {
    name: string;
    category: CheckCategory;
    check: () => Promise<{ pass: boolean; msg: string; problematicItems?: string[] }>;
}

const getChecksToRun = async (api: typeof localApi | typeof firebaseApi): Promise<Check[]> => {
    // Fetch all necessary data at once
    const [
        journalVouchers, projects, clients, supplierBills,
        custodies, purchaseOrders, payrollRuns, assets, suppliers
    ] = await Promise.all([
        api.getJournalVouchers(), api.getProjects(), api.getClients(),
        api.getSupplierBills(), api.getCustodies(), api.getPurchaseOrders(),
        api.getPayrollRuns(), api.getAssets(), api.getSuppliers()
    ]);

    return [
        // Category: سلامة مالية (Financial Integrity)
        {
            name: 'توازن القيود اليومية',
            category: 'سلامة مالية',
            check: async () => {
                const unbalanced = journalVouchers.filter(jv => {
                    const totals = (jv.lines || []).reduce((acc, line) => {
                        acc.debit += line.debit;
                        acc.credit += line.credit;
                        return acc;
                    }, { debit: 0, credit: 0 });
                    return Math.abs(totals.debit - totals.credit) > 0.01;
                });
                if (unbalanced.length > 0) {
                    return { pass: false, msg: `تم العثور على ${unbalanced.length} قيود غير متوازنة.`, problematicItems: unbalanced.map(jv => jv.id) };
                }
                return { pass: true, msg: 'كل القيود اليومية المسجلة متوازنة.' };
            }
        },
        {
            name: 'فحص تسوية العهد',
            category: 'سلامة مالية',
            check: async () => {
                const overSettled = custodies.filter(c => c.settledAmount > c.amount);
                 if (overSettled.length > 0) {
                    return { pass: false, msg: `تم العثور على ${overSettled.length} عهد تم تسوية مبلغ أكبر من قيمتها.`, problematicItems: overSettled.map(c => c.id) };
                }
                return { pass: true, msg: 'جميع مبالغ تسوية العهد صحيحة.' };
            }
        },
        // Category: اتساق البيانات (Data Consistency)
        {
            name: 'ربط المشاريع بالعملاء',
            category: 'اتساق البيانات',
            check: async () => {
                const clientNames = new Set(clients.map(c => c.name));
                const unlinked = projects.filter(p => !clientNames.has(p.client));
                if (unlinked.length > 0) {
                    return { pass: false, msg: `تم العثور على ${unlinked.length} مشاريع غير مرتبطة بعملاء صالحين.`, problematicItems: unlinked.map(p => p.name) };
                }
                return { pass: true, msg: 'كل المشاريع مرتبطة بعميل صالح.' };
            }
        },
        {
            name: 'فحص فواتير الموردين',
            category: 'اتساق البيانات',
            check: async () => {
                const supplierNames = new Set(suppliers.map(s => s.name));
                const projectNames = new Set(projects.map(p => p.name));
                const invalidBills = supplierBills.filter(bill => !supplierNames.has(bill.supplierName) || !projectNames.has(bill.projectName));
                if (invalidBills.length > 0) {
                    return { pass: false, msg: `تم العثور على ${invalidBills.length} فواتير موردين مرتبطة ببيانات غير موجودة.`, problematicItems: invalidBills.map(b => b.id) };
                }
                return { pass: true, msg: 'جميع فواتير الموردين مرتبطة ببيانات صحيحة.' };
            }
        },
        {
            name: 'فحص تعيين الأصول',
            category: 'اتساق البيانات',
            check: async () => {
                const projectNames = new Set(projects.map(p => p.name));
                const invalidAssets = assets.filter(asset => asset.status === 'in_use' && asset.assignedProjectName && !projectNames.has(asset.assignedProjectName));
                if (invalidAssets.length > 0) {
                    return { pass: false, msg: `تم العثور على ${invalidAssets.length} أصول معينة لمشاريع غير موجودة.`, problematicItems: invalidAssets.map(a => a.assetCode) };
                }
                return { pass: true, msg: 'جميع الأصول المعينة مرتبطة بمشاريع صحيحة.' };
            }
        },
        // Category: روابط تشغيلية (Operational Links)
        {
            name: 'ربط أوامر الشراء المكتملة بالقيود',
            category: 'روابط تشغيلية',
            check: async () => {
                const jvIds = new Set(journalVouchers.map(jv => jv.id));
                const unlinkedPOs = purchaseOrders.filter(po => po.status === 'completed' && (!po.journalVoucherId || !jvIds.has(po.journalVoucherId)));
                 if (unlinkedPOs.length > 0) {
                    return { pass: false, msg: `تم العثور على ${unlinkedPOs.length} أوامر شراء مكتملة بدون قيد محاسبي صحيح.`, problematicItems: unlinkedPOs.map(po => po.id) };
                }
                return { pass: true, msg: 'جميع أوامر الشراء المكتملة مرتبطة بقيود محاسبية.' };
            }
        },
        {
            name: 'ربط مسيرات الرواتب المعتمدة بالقيود',
            category: 'روابط تشغيلية',
            check: async () => {
                const jvIds = new Set(journalVouchers.map(jv => jv.id));
                const unlinkedPayrolls = payrollRuns.filter(pr => pr.status === 'approved' && (!pr.journalVoucherId || !jvIds.has(pr.journalVoucherId)));
                if (unlinkedPayrolls.length > 0) {
                    return { pass: false, msg: `تم العثور على ${unlinkedPayrolls.length} مسيرات رواتب معتمدة بدون قيد محاسبي صحيح.`, problematicItems: unlinkedPayrolls.map(pr => pr.id) };
                }
                return { pass: true, msg: 'جميع مسيرات الرواتب المعتمدة مرتبطة بقيود محاسبية.' };
            }
        },
    ];
};

const categoryIcons: Record<CheckCategory, React.ReactNode> = {
    'سلامة مالية': <Activity className="w-5 h-5 text-indigo-500" />,
    'اتساق البيانات': <Database className="w-5 h-5 text-blue-500" />,
    'روابط تشغيلية': <Link2 className="w-5 h-5 text-green-500" />,
};


const Diagnostics: React.FC = () => {
    const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'complete'>('idle');
    const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
    const [summary, setSummary] = useState({ pass: 0, fail: 0 });
    const isAiConfigured = !!process.env.API_KEY;
    
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;

    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [currentErrorToAnalyze, setCurrentErrorToAnalyze] = useState<CheckResult | null>(null);

    const handleRunCheck = async () => {
        setCheckStatus('checking');
        setSummary({ pass: 0, fail: 0 });

        const checksToRun = await getChecksToRun(api);
        setCheckResults(checksToRun.map(c => ({ name: c.name, category: c.category, status: 'pending', message: '' })));

        const finalResults: CheckResult[] = [];
        for (let i = 0; i < checksToRun.length; i++) {
            setCheckResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r));
            await new Promise(resolve => setTimeout(resolve, 500)); 

            const check = checksToRun[i];
            const result = await check.check();
            const newResult: CheckResult = {
                name: check.name,
                category: check.category,
                status: result.pass ? 'pass' : 'fail',
                message: result.msg,
                problematicItems: result.problematicItems,
            };
            finalResults.push(newResult);
            setCheckResults(prev => prev.map((r, idx) => idx === i ? newResult : r));
        }
        
        setCheckStatus('complete');
        setSummary({
            pass: finalResults.filter(r => r.status === 'pass').length,
            fail: finalResults.filter(r => r.status === 'fail').length,
        });
    };

    const handleAiAnalysis = async (check: CheckResult) => {
        setCurrentErrorToAnalyze(check);
        setIsAnalysisModalOpen(true);
        setIsAnalyzing(true);
        setAnalysisResult('');
        
        if (!isAiConfigured) {
            setAnalysisResult("ميزة التحليل الذكي غير متاحة. يرجى التأكد من تكوين مفتاح API.");
            setIsAnalyzing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                أنت خبير في تشخيص أنظمة المحاسبة لشركات المقاولات. 
                اشرح المشكلة التالية بأسلوب مبسط لمدير غير تقني.
                
                المشكلة: "${check.name}"
                تفاصيل الخطأ: "${check.message}"
                ${check.problematicItems && check.problematicItems.length > 0 ? `العناصر المتأثرة (أرقام تعريفية أو أسماء):\n- ${check.problematicItems.slice(0, 5).join('\n- ')}\n` : ''}

                قم بتنظيم إجابتك في ثلاثة أقسام واضحة باستخدام العناوين التالية بالضبط:
                ### شرح المشكلة
                ### الأسباب المحتملة
                ### خطوات الحل المقترحة
                
                استخدم اللغة العربية الفصحى والواضحة وقدم خطوات عملية وقابلة للتنفيذ. إذا كانت هناك عناصر متأثرة، اذكرها في شرحك لتكون الإجابة أكثر دقة.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setAnalysisResult(response.text);
        
        } catch (error) {
            console.error("Error generating analysis:", error);
            setAnalysisResult("عذراً، حدث خطأ أثناء تحليل المشكلة. يرجى المحاولة مرة أخرى لاحقاً.");
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

    const groupedResults = checkResults.reduce((acc, result) => {
        (acc[result.category] = acc[result.category] || []).push(result);
        return acc;
    }, {} as Record<string, CheckResult[]>);

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
                            <span className="flex items-center text-gray-700"><BrainCircuit size={16} className="ml-2 text-indigo-500" /> اتصال Google AI</span>
                            <span className={`flex items-center text-sm px-2 py-1 rounded-md ${isAiConfigured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {isAiConfigured ? <CheckCircle size={14} className="ml-1" /> : <AlertCircle size={14} className="ml-1" />}
                                {isAiConfigured ? 'نشط' : 'غير مكون'}
                            </span>
                        </div>
                    </div>
                </Card>
                <Card title="أداء واجهة برمجة التطبيقات (آخر 30 دقيقة)">
                    <ResponsiveContainer width="100%" height={100}>
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
                {checkStatus === 'complete' && (
                    <div className="mt-6 p-4 rounded-lg flex justify-around items-center bg-gray-50 border">
                        <div><p className="text-sm text-gray-500">الحالة الإجمالية</p><p className={`text-2xl font-bold ${summary.fail > 0 ? 'text-red-600' : 'text-green-600'}`}>{summary.fail > 0 ? 'تم العثور على مشاكل' : 'النظام سليم'}</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-green-600">{summary.pass}</p><p className="text-sm text-gray-500">فحوصات ناجحة</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-red-600">{summary.fail}</p><p className="text-sm text-gray-500">مشاكل مكتشفة</p></div>
                    </div>
                )}
                {checkStatus !== 'idle' && (
                    <div className="mt-6 space-y-4">
                        {Object.entries(groupedResults).map(([category, results]) => (
                            <div key={category}>
                                <h4 className="text-md font-semibold text-gray-700 mt-4 mb-2 flex items-center">{categoryIcons[category as CheckCategory]}<span className="mr-2">{category}</span></h4>
                                <div className="space-y-3">
                                {results.map((result, index) => (
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
                                        {result.status === 'fail' && (
                                            <button onClick={() => handleAiAnalysis(result)} className="flex items-center text-xs px-2 py-1 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
                                                <BrainCircuit size={14} className="ml-1" /> تحليل
                                            </button>
                                        )}
                                    </div>
                                ))}
                                </div>
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