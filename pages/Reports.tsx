import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BrainCircuit, Loader2, Send, User as UserIcon, Bot, KeyRound, BarChart2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useApiKey } from '../contexts/ApiKeyContext';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import type { AiFinancialResponse, AiDataTable, AiChartData } from '../types';
import { useAuth } from '../contexts/AuthContext';

type Message = {
  id: string;
  sender: 'user' | 'ai';
  content: string | AiFinancialResponse;
};

const AiChart: React.FC<{ chartData: AiChartData }> = ({ chartData }) => {
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    
    if (chartData.type === 'bar') {
        return (
            <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.labels.map((label, index) => ({
                        name: label,
                        ...chartData.datasets.reduce((obj, ds) => ({...obj, [ds.label]: ds.data[index]}), {})
                    }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(value) => `﷼${Number(value) / 1000}k`} />
                        <Tooltip formatter={(value: number) => `﷼${value.toLocaleString()}`} />
                        <Legend />
                        {chartData.datasets.map((ds, index) => (
                            <Bar key={ds.label} dataKey={ds.label} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
    // Add LineChart support if needed
    return <p>نوع المخطط البياني ({chartData.type}) غير مدعوم حاليًا.</p>;
};

const AiTable: React.FC<{ tableData: AiDataTable }> = ({ tableData }) => (
    <div className="overflow-x-auto mt-4 border rounded-lg">
        <table className="min-w-full text-right text-sm">
            <thead className="bg-gray-100">
                <tr>
                    {tableData.headers.map((header, i) => (
                        <th key={i} className="py-2 px-3 font-semibold text-gray-700">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y">
                {tableData.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => (
                            <td key={j} className="py-2 px-3">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Reports: React.FC = () => {
    const { user } = useAuth();
    const { apiKey } = useApiKey();
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const [messages, setMessages] = useState<Message[]>([
        { id: 'initial-ai-message', sender: 'ai', content: "مرحباً! أنا محللك المالي الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تسألني عن ربحية المشاريع، الفواتير المستحقة، أو أي استفسار مالي آخر." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const sampleQuestions = [
        "ما هي المشاريع الأكثر ربحية هذا العام؟",
        "قارن بين إيرادات وتكاليف الربع الأخير.",
        "هل هناك أي عملاء متأخرين في السداد بشكل كبير؟",
        "أعطني ملخصاً عن حالة التدفق النقدي.",
    ];

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (prompt?: string) => {
        const query = prompt || userInput;
        if (!query || isLoading) return;

        if (!apiKey) {
            setError("الرجاء إضافة مفتاح Google AI API في الإعدادات لتفعيل هذه الميزة.");
            return;
        }
        
        setError('');
        setIsLoading(true);
        setUserInput('');
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', content: query }]);

        try {
            const financialData = await api.getFinancialOverviewData();
            
            const ai = new GoogleGenAI({ apiKey });
            
            const fullPrompt = `
                أنت محلل مالي خبير في شركة مقاولات سعودية. مهمتك هي تحليل البيانات المالية التالية والإجابة على سؤال المستخدم باللغة العربية.

                البيانات المالية للشركة (بتنسيق JSON):
                ${JSON.stringify(financialData, null, 2)}
                
                سؤال المستخدم: "${query}"

                التعليمات:
                1. قدم إجابة نصية واضحة وموجزة في حقل 'insight'.
                2. إذا كانت الإجابة تحتوي على بيانات جدولية، قم بتعبئة حقل 'table' بالبيانات المطلوبة. يجب أن تكون جميع قيم الجدول كنصوص.
                3. إذا كانت البيانات مناسبة للعرض البياني (مثل مقارنات أو اتجاهات زمنية)، قم بتعبئة حقل 'chart' بالبيانات اللازمة.
                4. يجب أن يكون الناتج كاملاً بتنسيق JSON بناءً على المخطط المحدد. لا تضف أي نصوص خارج بنية JSON.
            `;
            
             const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    insight: { type: Type.STRING, description: "A natural language summary and insight answering the user's question, in Arabic." },
                    table: {
                        type: Type.OBJECT, nullable: true,
                        properties: {
                            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                            rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                        }
                    },
                    chart: {
                        type: Type.OBJECT, nullable: true,
                        properties: {
                            type: { type: Type.STRING, enum: ['bar', 'line'] },
                            labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                            datasets: { type: Type.ARRAY, items: {
                                type: Type.OBJECT, properties: {
                                    label: { type: Type.STRING },
                                    data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                                }, required: ["label", "data"]
                            }}
                        }
                    }
                },
                required: ["insight"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: { responseMimeType: "application/json", responseSchema: responseSchema }
            });

            const aiResponse = JSON.parse(response.text) as AiFinancialResponse;
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', content: aiResponse }]);

        } catch (err) {
            console.error("Error generating AI response:", err);
            const errorMessage = "عذراً، حدث خطأ أثناء تحليل طلبك. قد يكون الطلب معقداً جداً أو حدثت مشكلة في الاتصال. يرجى المحاولة مرة أخرى.";
            setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, sender: 'ai', content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow-md border border-gray-200">
        <header className="p-4 border-b flex items-center">
            <BrainCircuit className="w-6 h-6 text-blue-600 ml-3" />
            <h1 className="text-xl font-bold text-gray-800">المحلل المالي الذكي</h1>
        </header>

        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.sender === 'ai' ? 'bg-blue-500' : 'bg-gray-600'}`}>
                {msg.sender === 'ai' ? <Bot className="text-white" /> : <UserIcon className="text-white" />}
              </div>
              <div className={`p-4 rounded-lg max-w-2xl ${msg.sender === 'ai' ? 'bg-gray-100' : 'bg-blue-500 text-white'}`}>
                {typeof msg.content === 'string' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div>
                    <p>{msg.content.insight}</p>
                    {msg.content.table && <AiTable tableData={msg.content.table} />}
                    {msg.content.chart && <AiChart chartData={msg.content.chart} />}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
                <Bot className="text-white" />
              </div>
              <div className="p-4 rounded-lg bg-gray-100 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600 ml-2" />
                <span className="text-gray-700">...يفكر المحلل</span>
              </div>
            </div>
          )}
        </div>

        {!apiKey && (
            <div className="m-4 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex items-center">
                <AlertCircle size={20} className="ml-3" />
                <div>
                    <p className="font-semibold">ميزة التحليل الذكي معطلة</p>
                    <p className="text-xs">الرجاء الذهاب إلى <a href="#/settings" className="underline font-bold">الإعدادات</a> لإضافة مفتاح Google AI API.</p>
                </div>
            </div>
        )}
        
        <div className="p-4 border-t bg-gray-50">
           <div className="mb-3 flex flex-wrap gap-2">
                {sampleQuestions.map(q => (
                    <button key={q} onClick={() => handleSendMessage(q)} disabled={isLoading || !apiKey}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50">
                        {q}
                    </button>
                ))}
            </div>
          <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="اسأل عن أي شيء يخص بياناتك المالية..."
              className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !apiKey}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim() || !apiKey}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="إرسال"
            >
              <Send size={18} />
            </button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
        </div>
      </div>
    );
};

export default Reports;
