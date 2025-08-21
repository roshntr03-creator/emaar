





import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BrainCircuit, Loader2, Send, User as UserIcon, Bot, KeyRound, BarChart2, AlertCircle, Printer, FileText, BarChart, PieChart } from 'lucide-react';
import { BarChart as ReBarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import type { AiFinancialResponse, AiDataTable, AiChartData, JournalVoucher, Account, SettingsData, ReportLine } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../contexts/ApiKeyContext';
import Tabs from '../components/ui/Tabs';

// --- Helper Functions for Report Generation ---

// Calculates balances for all accounts up to a certain date
const calculateAccountBalances = (accounts: Account[], vouchers: JournalVoucher[], endDate: string): Map<string, number> => {
    const balances = new Map<string, number>();
    accounts.forEach(acc => balances.set(acc.id, 0));

    const relevantVouchers = vouchers.filter(v => v.date <= endDate && v.status === 'posted');
    
    for (const voucher of relevantVouchers) {
        for (const line of voucher.lines) {
            const currentBalance = balances.get(line.accountId) || 0;
            balances.set(line.accountId, currentBalance + line.debit - line.credit);
        }
    }

    const finalBalances = new Map<string, number>();
    for (const acc of accounts) {
        const balance = balances.get(acc.id) || 0;
        // For assets and expenses, a positive balance is debit. For others, a positive balance is credit.
        // We'll return the raw debit/credit balance.
        finalBalances.set(acc.id, balance);
    }
    
    return finalBalances;
};

// --- Report Printing Component ---
interface ReportPrintWrapperProps {
    reportId: string;
    settings: SettingsData | null;
    title: string;
    period: string;
    children: React.ReactNode;
}
const ReportPrintWrapper: React.FC<ReportPrintWrapperProps> = ({ reportId, settings, title, period, children }) => (
    <div id={reportId}>
        <div className="hidden print:block mb-4 p-4 border-b">
            <h1 className="text-xl font-bold">{settings?.companyName || 'نظام محاسبة المقاولات'}</h1>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-gray-600">{period}</p>
        </div>
        {children}
    </div>
);


// --- AI Analyst Tab Component ---
const AiAnalystTab: React.FC = () => {
    const { user } = useAuth();
    const { apiKey } = useApiKey();
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    type Message = { id: string; sender: 'user' | 'ai'; content: string | AiFinancialResponse; };

    const [messages, setMessages] = useState<Message[]>([
        { id: 'initial-ai-message', sender: 'ai', content: "مرحباً! أنا محللك المالي الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تسألني عن ربحية المشاريع، الفواتير المستحقة، أو أي استفسار مالي آخر." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const sampleQuestions = ["ما هي المشاريع الأكثر ربحية هذا العام؟", "قارن بين إيرادات وتكاليف الربع الأخير.", "هل هناك أي عملاء متأخرين في السداد بشكل كبير؟", "أعطني ملخصاً عن حالة التدفق النقدي."];

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (prompt?: string) => {
        const query = prompt || userInput;
        if (!query || isLoading) {
            return;
        }
        
        if (!apiKey) {
            setError("يرجى إعداد مفتاح Google AI API في صفحة الإعدادات لتفعيل المحلل المالي.");
            return;
        }
        
        setError(''); setIsLoading(true); setUserInput('');
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', content: query }]);

        try {
            const financialData = await api.getFinancialOverviewData();
            const ai = new GoogleGenAI({ apiKey });
            
            const fullPrompt = `أنت محلل مالي خبير في شركة مقاولات سعودية. مهمتك هي تحليل البيانات المالية التالية والإجابة على سؤال المستخدم باللغة العربية.\n\nالبيانات المالية للشركة (بتنسيق JSON):\n${JSON.stringify(financialData, null, 2)}\n\nسؤال المستخدم: "${query}"\n\nالتعليمات:\n1. قدم إجابة نصية واضحة وموجزة في حقل 'insight'.\n2. إذا كانت الإجابة تحتوي على بيانات جدولية، قم بتعبئة حقل 'table' بالبيانات المطلوبة. يجب أن تكون جميع قيم الجدول كنصوص.\n3. إذا كانت البيانات مناسبة للعرض البياني (مثل مقارنات أو اتجاهات زمنية)، قم بتعبئة حقل 'chart' بالبيانات اللازمة.\n4. يجب أن يكون الناتج كاملاً بتنسيق JSON بناءً على المخطط المحدد. لا تضف أي نصوص خارج بنية JSON.`;
            
             const responseSchema = {
                type: Type.OBJECT, properties: { insight: { type: Type.STRING }, table: { type: Type.OBJECT, nullable: true, properties: { headers: { type: Type.ARRAY, items: { type: Type.STRING } }, rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } } } }, chart: { type: Type.OBJECT, nullable: true, properties: { type: { type: Type.STRING, enum: ['bar', 'line'] }, labels: { type: Type.ARRAY, items: { type: Type.STRING } }, datasets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, data: { type: Type.ARRAY, items: { type: Type.NUMBER } } }, required: ["label", "data"] }} } }}, required: ["insight"]
            };

            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt, config: { responseMimeType: "application/json", responseSchema: responseSchema } });

            const aiResponse = JSON.parse(response.text) as AiFinancialResponse;
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', content: aiResponse }]);

        } catch (err) {
            console.error("Error generating AI response:", err);
            setError("عذراً، حدث خطأ أثناء تحليل طلبك. تأكد من أن مفتاح API الخاص بك صحيح ونشط.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // UI components for AI response
    const AiChart: React.FC<{ chartData: AiChartData }> = ({ chartData }) => (
      <div className="h-64 w-full mt-4 bg-white p-2 rounded-md">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={chartData.labels.map((label, index) => ({ name: label, ...chartData.datasets.reduce((obj, ds) => ({...obj, [ds.label]: ds.data[index]}), {}) }))}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => `﷼${Number(v)/1000}k`} /><Tooltip formatter={(v: number) => `﷼${v.toLocaleString()}`} /><Legend />
            {chartData.datasets.map((ds, i) => <Bar key={ds.label} dataKey={ds.label} fill={['#3B82F6', '#10B981', '#F59E0B'][i % 3]} />)}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    );
    const AiTable: React.FC<{ tableData: AiDataTable }> = ({ tableData }) => (
        <div className="overflow-x-auto mt-4 border rounded-lg bg-white"><table className="min-w-full text-right text-sm text-gray-800"><thead className="bg-gray-200"><tr>{tableData.headers.map((h, i) => <th key={i} className="py-2 px-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y">{tableData.rows.map((r, i) => <tr key={i} className="hover:bg-gray-100">{r.map((c, j) => <td key={j} className="py-2 px-3">{c}</td>)}</tr>)}</tbody></table></div>
    );

    return (
      <div className="flex flex-col h-[75vh] bg-gray-50 rounded-lg border">
        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map(msg => <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}><div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.sender === 'ai' ? 'bg-blue-500' : 'bg-gray-600'}`}>{msg.sender === 'ai' ? <Bot className="text-white" /> : <UserIcon className="text-white" />}</div><div className={`p-4 rounded-lg max-w-2xl ${msg.sender === 'ai' ? 'bg-white border' : 'bg-blue-500 text-white'}`}>{typeof msg.content === 'string' ? <p>{msg.content}</p> : <div><p>{msg.content.insight}</p>{msg.content.table && <AiTable tableData={msg.content.table} />}{msg.content.chart && <AiChart chartData={msg.content.chart} />}</div>}</div></div>)}
          {isLoading && <div className="flex items-start gap-4"><div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center"><Bot className="text-white" /></div><div className="p-4 rounded-lg bg-white border flex items-center"><Loader2 className="w-5 h-5 animate-spin text-gray-600 ml-2" /><span className="text-gray-700">...يفكر المحلل</span></div></div>}
        </div>
        <div className="p-4 border-t bg-white"><div className="mb-3 flex flex-wrap gap-2">{sampleQuestions.map(q => <button key={q} onClick={() => handleSendMessage(q)} disabled={isLoading || !apiKey} className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50">{q}</button>)}</div><form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2"><input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="اسأل عن أي شيء يخص بياناتك المالية..." className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading || !apiKey} /><button type="submit" disabled={isLoading || !userInput.trim() || !apiKey} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex-shrink-0"><Send size={18} /></button></form>{error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}</div>
      </div>
    );
};

// --- Standard Reports Tabs ---
const StandardReportLayout: React.FC<{title: string, onPrint: () => void, children: React.ReactNode}> = ({ title, onPrint, children }) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <button onClick={onPrint} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 border">
                <Printer size={16} className="ml-2"/> طباعة
            </button>
        </div>
        {children}
    </div>
);

const IncomeStatementTab: React.FC<{ accounts: Account[], vouchers: JournalVoucher[], settings: SettingsData | null, onPrint: (id: string) => void }> = ({ accounts, vouchers, settings, onPrint }) => {
    const [dates, setDates] = useState({ from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().split('T')[0] });
    
    const data = useMemo(() => {
        const balances = calculateAccountBalances(accounts, vouchers, dates.to);
        const prevBalances = calculateAccountBalances(accounts, vouchers, new Date(new Date(dates.from).getTime() - 86400000).toISOString().split('T')[0]);
        
        const lines: ReportLine[] = [];
        const revenues = accounts.filter(a => a.type === 'revenue');
        const expenses = accounts.filter(a => a.type === 'expense');

        let totalRevenue = 0;
        lines.push({ code: '', name: 'الإيرادات', balance: 0, isTotal: true, level: 0 });
        revenues.forEach(acc => {
            const balance = (balances.get(acc.id) || 0) - (prevBalances.get(acc.id) || 0);
            if(balance !== 0) {
              lines.push({ code: acc.code, name: acc.name, balance: -balance, level: 1 });
              totalRevenue -= balance;
            }
        });
        lines.push({ code: '', name: 'إجمالي الإيرادات', balance: totalRevenue, isTotal: true, level: 0 });
        
        let totalExpense = 0;
        lines.push({ code: '', name: 'المصروفات', balance: 0, isTotal: true, level: 0 });
        expenses.forEach(acc => {
            const balance = (balances.get(acc.id) || 0) - (prevBalances.get(acc.id) || 0);
            if(balance !== 0) {
              lines.push({ code: acc.code, name: acc.name, balance: balance, level: 1 });
              totalExpense += balance;
            }
        });
        lines.push({ code: '', name: 'إجمالي المصروفات', balance: totalExpense, isTotal: true, level: 0 });

        lines.push({ code: '', name: 'صافي الربح / الخسارة', balance: totalRevenue - totalExpense, isTotal: true, level: 0 });

        return lines;
    }, [accounts, vouchers, dates]);

    return (
        <StandardReportLayout title="قائمة الدخل" onPrint={() => onPrint('income-statement-print')}>
            <div className="flex items-center space-x-4 space-x-reverse mb-4 p-3 bg-gray-50 rounded-md border">
                <label className="text-sm">من تاريخ: <input type="date" value={dates.from} onChange={e => setDates(d => ({...d, from: e.target.value}))} className="p-1 border rounded-md" /></label>
                <label className="text-sm">إلى تاريخ: <input type="date" value={dates.to} onChange={e => setDates(d => ({...d, to: e.target.value}))} className="p-1 border rounded-md" /></label>
            </div>
            <ReportPrintWrapper reportId="income-statement-print" settings={settings} title="قائمة الدخل" period={`من ${dates.from} إلى ${dates.to}`}>
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full text-right"><tbody className="divide-y">
                    {data.map((line, i) => {
                        const isProfitLoss = line.name.includes('صافي');
                        const isPositive = line.balance >= 0;
                        return (
                        <tr key={i} className={`${line.isTotal ? 'bg-gray-100 font-bold' : ''} ${isProfitLoss ? 'bg-blue-100 text-blue-800' : ''}`}>
                            <td className="p-2 w-32">{line.code}</td>
                            <td className="p-2" style={{paddingRight: `${(line.level || 0) * 20 + 8}px`}}>{line.name}</td>
                            <td className={`p-2 w-48 text-left font-mono ${isProfitLoss ? (isPositive ? 'text-green-600' : 'text-red-600') : ''}`}>{line.isTotal || line.balance !== 0 ? `﷼ ${line.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`: ''}</td>
                        </tr>
                    )})}
                    </tbody></table>
                </div>
            </ReportPrintWrapper>
        </StandardReportLayout>
    );
};

const BalanceSheetTab: React.FC<{ accounts: Account[], vouchers: JournalVoucher[], settings: SettingsData | null, onPrint: (id: string) => void }> = ({ accounts, vouchers, settings, onPrint }) => {
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    
    const data = useMemo(() => {
        const balances = calculateAccountBalances(accounts, vouchers, asOfDate);
        
        const buildLines = (type: Account['type']): ReportLine[] => {
            const lines: ReportLine[] = [];
            const parentAccounts = accounts.filter(a => a.type === type && !a.parentId);

            const addAccountAndChildren = (acc: Account, level: number) => {
                const balance = (balances.get(acc.id) || 0) * (type === 'asset' ? 1 : -1);
                const children = accounts.filter(child => child.parentId === acc.id);
                
                // Optimization: Don't show accounts with 0 balance and no children
                if (balance === 0 && children.length === 0) {
                    return;
                }
                
                lines.push({ code: acc.code, name: acc.name, balance, level });
                
                children.sort((a,b) => a.code.localeCompare(b.code)).forEach(child => {
                    addAccountAndChildren(child, level + 1);
                });
            };
            
            parentAccounts.sort((a,b) => a.code.localeCompare(b.code)).forEach(parent => addAccountAndChildren(parent, 0));

            const categoryTotal = accounts
                .filter(a => a.type === type)
                .reduce((sum, acc) => {
                    const balance = (balances.get(acc.id) || 0) * (type === 'asset' ? 1 : -1);
                    return sum + balance;
                }, 0);
            
            lines.push({ 
                code: '', 
                name: `إجمالي ${{'asset':'الأصول','liability':'الخصوم','equity':'حقوق الملكية'}[type]}`, 
                balance: categoryTotal, 
                isTotal: true 
            });
            return lines;
        };

        const assets = buildLines('asset');
        const liabilities = buildLines('liability');
        const equity = buildLines('equity');

        const totalAssets = assets.length > 0 ? assets[assets.length-1].balance : 0;
        const totalLiabilities = liabilities.length > 0 ? liabilities[liabilities.length-1].balance : 0;
        const totalEquity = equity.length > 0 ? equity[equity.length-1].balance : 0;

        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
        
        return { assets, liabilities, equity, totalAssets, totalLiabilitiesAndEquity };
    }, [accounts, vouchers, asOfDate]);

    return (
        <StandardReportLayout title="الميزانية العمومية" onPrint={() => onPrint('balance-sheet-print')}>
            <div className="flex items-center space-x-4 space-x-reverse mb-4 p-3 bg-gray-50 rounded-md border">
                <label className="text-sm">حتى تاريخ: <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="p-1 border rounded-md" /></label>
            </div>
             <ReportPrintWrapper reportId="balance-sheet-print" settings={settings} title="الميزانية العمومية" period={`كما في ${asOfDate}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div><h4 className="font-bold p-2 bg-gray-100 border-b">الأصول</h4><table className="w-full text-right"><tbody>{data.assets.map((line, i) => <tr key={i} className={line.isTotal ? 'font-bold bg-gray-200' : ''}><td className="p-2" style={{paddingRight: `${(line.level || 0) * 15 + 8}px`}}>{line.name}</td><td className="p-2 w-36 text-left font-mono">{`﷼ ${line.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</td></tr>)}</tbody></table></div>
                    <div>
                        <div><h4 className="font-bold p-2 bg-gray-100 border-b">الخصوم</h4><table className="w-full text-right"><tbody>{data.liabilities.map((line, i) => <tr key={i} className={line.isTotal ? 'font-bold bg-gray-200' : ''}><td className="p-2" style={{paddingRight: `${(line.level || 0) * 15 + 8}px`}}>{line.name}</td><td className="p-2 w-36 text-left font-mono">{`﷼ ${line.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</td></tr>)}</tbody></table></div>
                        <div className="mt-4"><h4 className="font-bold p-2 bg-gray-100 border-b">حقوق الملكية</h4><table className="w-full text-right"><tbody>{data.equity.map((line, i) => <tr key={i} className={line.isTotal ? 'font-bold bg-gray-200' : ''}><td className="p-2" style={{paddingRight: `${(line.level || 0) * 15 + 8}px`}}>{line.name}</td><td className="p-2 w-36 text-left font-mono">{`﷼ ${line.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</td></tr>)}</tbody></table></div>
                        <div className="mt-4 font-bold bg-gray-200 p-2 flex justify-between"><span>إجمالي الخصوم وحقوق الملكية</span><span className="font-mono">{`﷼ ${data.totalLiabilitiesAndEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</span></div>
                    </div>
                </div>
                <div className={`mt-4 p-2 text-center font-bold rounded ${Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01 ? 'الميزانية متوازنة' : 'الميزانية غير متوازنة'}
                </div>
            </ReportPrintWrapper>
        </StandardReportLayout>
    );
};

const TrialBalanceTab: React.FC<{ accounts: Account[], vouchers: JournalVoucher[], settings: SettingsData | null, onPrint: (id: string) => void }> = ({ accounts, vouchers, settings, onPrint }) => {
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

    const data = useMemo(() => {
        const balances = calculateAccountBalances(accounts, vouchers, asOfDate);
        let totalDebit = 0, totalCredit = 0;
        const lines = accounts.map(acc => {
            const balance = balances.get(acc.id) || 0;
            const isDebitNature = acc.type === 'asset' || acc.type === 'expense';
            const debit = (isDebitNature && balance > 0) || (!isDebitNature && balance < 0) ? Math.abs(balance) : 0;
            const credit = (!isDebitNature && balance > 0) || (isDebitNature && balance < 0) ? Math.abs(balance) : 0;
            totalDebit += debit;
            totalCredit += credit;
            return { code: acc.code, name: acc.name, debit, credit };
        }).filter(line => line.debit > 0 || line.credit > 0);
        return { lines, totalDebit, totalCredit };
    }, [accounts, vouchers, asOfDate]);
    
    return (
        <StandardReportLayout title="ميزان المراجعة" onPrint={() => onPrint('trial-balance-print')}>
            <div className="flex items-center space-x-4 space-x-reverse mb-4 p-3 bg-gray-50 rounded-md border">
                <label className="text-sm">حتى تاريخ: <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="p-1 border rounded-md" /></label>
            </div>
             <ReportPrintWrapper reportId="trial-balance-print" settings={settings} title="ميزان المراجعة" period={`كما في ${asOfDate}`}>
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full text-right"><thead className="bg-gray-100"><tr><th className="p-2">الرمز</th><th className="p-2">اسم الحساب</th><th className="p-2 text-left">مدين</th><th className="p-2 text-left">دائن</th></tr></thead><tbody className="divide-y">
                        {data.lines.map((line, i) => <tr key={i}><td className="p-2">{line.code}</td><td className="p-2">{line.name}</td><td className="p-2 text-left font-mono">{line.debit > 0 ? `﷼ ${line.debit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td><td className="p-2 text-left font-mono">{line.credit > 0 ? `﷼ ${line.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}`: '-'}</td></tr>)}
                        <tr className="bg-gray-200 font-bold"><td className="p-2" colSpan={2}>الإجمالي</td><td className="p-2 text-left font-mono">{`﷼ ${data.totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</td><td className="p-2 text-left font-mono">{`﷼ ${data.totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</td></tr>
                    </tbody></table>
                </div>
             </ReportPrintWrapper>
        </StandardReportLayout>
    );
};

// --- Main Reports Component ---
const Reports: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [accs, vcs, sets] = await Promise.all([api.getAccounts(), api.getJournalVouchers(), api.getSettings()]);
                setAccounts(accs);
                setVouchers(vcs);
                setSettings(sets);
            } catch (error) {
                console.error("Failed to load report data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [usingFirebase]);

    const handlePrint = (reportId: string) => {
        const printArea = document.getElementById(reportId);
        if (!printArea) return;
        const printableContent = printArea.innerHTML;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = `<div id="print-area" class="p-4">${printableContent}</div>`;
        window.print();
        document.body.innerHTML = originalContent;
        // Re-attach React to the root. A full reload is simpler and more robust.
        window.location.reload(); 
    };

    const tabs = [
        { id: 'ai', label: 'المحلل المالي الذكي', content: <AiAnalystTab /> },
        { id: 'income', label: 'قائمة الدخل', content: <IncomeStatementTab accounts={accounts} vouchers={vouchers} settings={settings} onPrint={handlePrint} /> },
        { id: 'balance', label: 'الميزانية العمومية', content: <BalanceSheetTab accounts={accounts} vouchers={vouchers} settings={settings} onPrint={handlePrint} /> },
        { id: 'trial', label: 'ميزان المراجعة', content: <TrialBalanceTab accounts={accounts} vouchers={vouchers} settings={settings} onPrint={handlePrint} /> },
    ];
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">التقارير المالية</h2>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                    <p className="mr-3">جاري تجهيز التقارير...</p>
                </div>
            ) : (
                <Tabs tabs={tabs} initialTabId="ai" />
            )}
             <style>{`
                @media print {
                    body > *:not(#print-area) {
                        display: none;
                    }
                    #print-area {
                        display: block;
                        font-family: 'Tajawal', sans-serif;
                    }
                }
            `}</style>
        </div>
    );
};

export default Reports;