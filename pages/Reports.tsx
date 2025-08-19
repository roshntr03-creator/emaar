import React, { useState, useMemo } from 'react';
import { BarChart3, BookOpen, Briefcase, Printer, ArrowRight, Download, Users, Building, FileText, Loader2 } from 'lucide-react';
import type { Invoice, SupplierBill, Project, Account, Client } from '../types';
import * as api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Report Components ---
const ReportHeader = ({ title, dates }: { title: string, dates: { start?: string, end: string } }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold text-center">{title}</h2>
        <p className="text-center text-gray-500">
            {dates.start ? `للفترة من ${dates.start} إلى ${dates.end}` : `كما في تاريخ ${dates.end}`}
        </p>
    </div>
);

const AgingReport = ({ data, dates, title, groupByLabel }: { data: any, dates: { end: string }, title: string, groupByLabel: string }) => {
    const bucketLabels = ['الحالي', '1-30 يوم', '31-60 يوم', '61-90 يوم', '+91 يوم', 'الإجمالي'];
    const bucketKeys = ['current', 'd1_30', 'd31_60', 'd61_90', 'd91_plus', 'total'];
    return (
        <div className="bg-white p-6 sm:p-8 border rounded-lg">
            <ReportHeader title={title} dates={dates} />
            <table className="min-w-full bg-white text-right text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="py-3 px-2 border-b font-semibold text-gray-600">{groupByLabel}</th>
                        {bucketLabels.map(label => <th key={label} className="py-3 px-2 border-b font-semibold text-gray-600 text-center">{label}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {data.details.map((item: any) => (
                        <tr key={item.name} className="hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium">{item.name}</td>
                            {bucketKeys.map(key => <td key={key} className="py-2 px-2 text-center">﷼{item[key].toLocaleString()}</td>)}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td className="py-3 px-2">الإجمالي</td>
                        {bucketKeys.map(key => <td key={key} className="py-3 px-2 text-center">﷼{data.totals[key].toLocaleString()}</td>)}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

const PnLReport = ({ data, dates }: { data: any, dates: { start: string, end: string } }) => (
    <div className="bg-white p-6 sm:p-8 border rounded-lg">
        <ReportHeader title="قائمة الدخل" dates={dates} />
        <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
                <tbody>
                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-4" colSpan={2}>الإيرادات</td></tr>
                    {data.revenue.map((item: any) => <tr key={item.label}><td className="py-2 px-8">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-4 font-semibold">إجمالي الإيرادات</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.totalRevenue.toLocaleString()}</td></tr>
                    
                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-4 mt-4" colSpan={2}>تكلفة الإيرادات</td></tr>
                    {data.costOfRevenue.map((item: any) => <tr key={item.label}><td className="py-2 px-8">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-4 font-semibold">إجمالي تكلفة الإيرادات</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.totalCostOfRevenue.toLocaleString()}</td></tr>

                    <tr className="bg-blue-50 border-t-2 border-b-2 border-blue-200"><td className="py-3 px-4 font-bold text-blue-800 text-base">إجمالي الربح</td><td className="py-3 px-4 font-bold text-blue-800 font-mono text-base">﷼{data.grossProfit.toLocaleString()}</td></tr>

                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-4 mt-4" colSpan={2}>المصروفات التشغيلية</td></tr>
                    {data.operatingExpenses.map((item: any) => <tr key={item.label}><td className="py-2 px-8">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-4 font-semibold">إجمالي المصروفات التشغيلية</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.totalOperatingExpenses.toLocaleString()}</td></tr>

                    <tr className="bg-green-50 border-t-2 border-b-2 border-green-200"><td className="py-3 px-4 font-bold text-green-800 text-base">صافي الدخل</td><td className="py-3 px-4 font-bold text-green-800 font-mono text-base">﷼{data.netIncome.toLocaleString()}</td></tr>
                </tbody>
            </table>
        </div>
    </div>
);

const BalanceSheetReport = ({ data, dates }: { data: any, dates: { end: string } }) => (
    <div className="bg-white p-6 sm:p-8 border rounded-lg">
        <ReportHeader title="الميزانية العمومية" dates={dates} />
        <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
                <tbody>
                    <tr className="bg-gray-100 font-bold text-base"><td className="py-3 px-4" colSpan={2}>الأصول</td></tr>
                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-6" colSpan={2}>الأصول المتداولة</td></tr>
                    {data.assets.current.map((item: any) => <tr key={item.label}><td className="py-2 px-10">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-6 font-semibold">إجمالي الأصول المتداولة</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.assets.totalCurrent.toLocaleString()}</td></tr>
                    
                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-6 mt-4" colSpan={2}>الأصول غير المتداولة</td></tr>
                    {data.assets.nonCurrent.map((item: any) => <tr key={item.label}><td className="py-2 px-10">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-6 font-semibold">إجمالي الأصول غير المتداولة</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.assets.totalNonCurrent.toLocaleString()}</td></tr>
                    
                    <tr className="bg-blue-50 border-t-2 border-b-2 border-blue-200"><td className="py-3 px-4 font-bold text-blue-800 text-base">إجمالي الأصول</td><td className="py-3 px-4 font-bold text-blue-800 font-mono text-base">﷼{data.assets.total.toLocaleString()}</td></tr>

                    <tr className="bg-gray-100 font-bold text-base"><td className="py-3 px-4 mt-6" colSpan={2}>الخصوم وحقوق الملكية</td></tr>
                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-6" colSpan={2}>الخصوم المتداولة</td></tr>
                    {data.liabilitiesAndEquity.liabilities.current.map((item: any) => <tr key={item.label}><td className="py-2 px-10">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-6 font-semibold">إجمالي الخصوم المتداولة</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.liabilitiesAndEquity.liabilities.totalCurrent.toLocaleString()}</td></tr>

                    <tr className="bg-gray-50 font-semibold"><td className="py-2 px-6 mt-4" colSpan={2}>حقوق الملكية</td></tr>
                    {data.liabilitiesAndEquity.equity.items.map((item: any) => <tr key={item.label}><td className="py-2 px-10">{item.label}</td><td className="py-2 px-4 font-mono">﷼{item.amount.toLocaleString()}</td></tr>)}
                    <tr className="border-t"><td className="py-2 px-6 font-semibold">إجمالي حقوق الملكية</td><td className="py-2 px-4 font-semibold font-mono">﷼{data.liabilitiesAndEquity.equity.total.toLocaleString()}</td></tr>

                    <tr className="bg-blue-50 border-t-2 border-b-2 border-blue-200"><td className="py-3 px-4 font-bold text-blue-800 text-base">إجمالي الخصوم وحقوق الملكية</td><td className="py-3 px-4 font-bold text-blue-800 font-mono text-base">﷼{data.liabilitiesAndEquity.total.toLocaleString()}</td></tr>
                </tbody>
            </table>
        </div>
    </div>
);

const ProjectProfitabilityReport = ({ data, dates }: { data: any[], dates: { start: string, end: string } }) => (
    <div className="bg-white p-6 sm:p-8 border rounded-lg">
        <ReportHeader title="تقرير ربحية المشاريع" dates={dates} />
        <table className="min-w-full bg-white text-right text-sm">
            <thead className="bg-gray-50">
                <tr>
                    <th className="py-3 px-4 border-b font-semibold text-gray-600">اسم المشروع</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-600 text-center">الإيرادات</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-600 text-center">التكاليف</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-600 text-center">الربح / الخسارة</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {data.map(item => (
                    <tr key={item.name} className="hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{item.name}</td>
                        <td className="py-2 px-4 text-center">﷼{item.revenue.toLocaleString()}</td>
                        <td className="py-2 px-4 text-center">﷼{item.costs.toLocaleString()}</td>
                        <td className={`py-2 px-4 text-center font-bold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>﷼{item.profit.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


const Reports: React.FC = () => {
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({ start: firstDayOfYear, end: todayStr });

    const reportCards = useMemo(() => [
        { id: 'pnl', title: 'قائمة الدخل', description: 'عرض الإيرادات والمصروفات وصافي الربح خلال فترة محددة.', icon: BarChart3 },
        { id: 'balance-sheet', title: 'الميزانية العمومية', description: 'لقطة مالية لأصول الشركة وخصومها وحقوق الملكية في تاريخ معين.', icon: BookOpen },
        { id: 'project-profitability', title: 'ربحية المشاريع', description: 'تحليل أداء المشاريع من حيث الإيرادات والتكاليف والربحية.', icon: Briefcase },
        { id: 'ar-aging', title: 'أعمار الذمم المدينة', description: 'تصنيف مستحقات العملاء حسب فترة تأخرها للمساعدة في التحصيل.', icon: Users },
        { id: 'ap-aging', title: 'أعمار الذمم الدائنة', description: 'تصنيف التزامات الموردين حسب تاريخ استحقاقها لإدارة المدفوعات.', icon: Building },
    ], []);

    const generateReportData = async (reportType: string) => {
        const [
            allInvoices,
            allSupplierBills,
            allProjects,
            allAccounts,
            allClients
        ] = await Promise.all([
            api.getInvoices(),
            api.getSupplierBills(),
            api.getProjects(),
            api.getAccounts(),
            api.getClients()
        ]);
        
        switch(reportType) {
            case 'pnl': {
                const revenueAccounts = allAccounts.filter(a => a.type === 'revenue');
                const expenseAccounts = allAccounts.filter(a => a.type === 'expense');
                // This is a simplified calculation. A real P&L would use journal entries.
                const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
                const totalExpenses = allProjects.reduce((sum, p) => sum + p.spent, 0) / 2; // Mocking expenses
                
                return {
                    title: "قائمة الدخل",
                    data: {
                        revenue: [{ label: 'إيرادات المشاريع', amount: totalRevenue }],
                        totalRevenue: totalRevenue,
                        costOfRevenue: [{ label: 'تكاليف المشاريع', amount: totalExpenses }],
                        totalCostOfRevenue: totalExpenses,
                        grossProfit: totalRevenue - totalExpenses,
                        operatingExpenses: [{ label: 'مصاريف إدارية', amount: 120000 }], // Mock
                        totalOperatingExpenses: 120000,
                        netIncome: totalRevenue - totalExpenses - 120000
                    }
                };
            }
            case 'balance-sheet': {
                const totalReceivables = allInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);
                const totalPayables = allSupplierBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0);
                
                return {
                    title: "الميزانية العمومية",
                    data: {
                        assets: { current: [{ label: 'النقدية', amount: 150000 }, { label: 'الذمم المدينة (العملاء)', amount: totalReceivables }, { label: 'المخزون', amount: 95000 }], totalCurrent: 150000 + totalReceivables + 95000, nonCurrent: [{ label: 'المعدات والآلات', amount: 320000 }, { label: 'الأراضي والمباني', amount: 500000 }], totalNonCurrent: 820000, total: 150000 + totalReceivables + 95000 + 820000 },
                        liabilitiesAndEquity: { liabilities: { current: [{ label: 'الذمم الدائنة (الموردون)', amount: totalPayables }], totalCurrent: totalPayables }, equity: { items: [{ label: 'رأس المال', amount: 1000000 }, { label: 'الأرباح المحتجزة', amount: 95000 }], total: 1095000 }, total: totalPayables + 1095000 }
                    }
                };
            }
            case 'project-profitability': {
                 return {
                    title: "تقرير ربحية المشاريع",
                    data: allProjects.map(p => {
                        const revenue = allInvoices.filter(i => i.project === p.name).reduce((sum, i) => sum + i.amount, 0);
                        const costs = p.spent;
                        return { name: p.name, revenue, costs, profit: revenue - costs };
                    })
                 };
            }
            case 'ar-aging': {
                 const calculateAging = (items: Invoice[], endDateStr: string) => {
                    const endDate = new Date(endDateStr);
                    const bucketTemplate = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_plus: 0, total: 0 };
                    const details: { [key: string]: typeof bucketTemplate & { name: string } } = {};
                    
                    items.forEach(item => {
                        if (item.status === 'paid') return;
                        const clientName = item.clientName || allClients.find(c => c.name === item.project)?.name || item.project;
                        const dueDate = new Date(item.dueDate);
                        const daysOverdue = Math.floor((endDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                        let bucketKey: keyof typeof bucketTemplate = 'current';
                        if (daysOverdue > 90) bucketKey = 'd91_plus';
                        else if (daysOverdue > 60) bucketKey = 'd61_90';
                        else if (daysOverdue > 30) bucketKey = 'd31_60';
                        else if (daysOverdue > 0) bucketKey = 'd1_30';

                        if (!details[clientName]) details[clientName] = { ...bucketTemplate, name: clientName };
                        details[clientName][bucketKey] += item.amount;
                        details[clientName].total += item.amount;
                    });

                    const totals = Object.values(details).reduce((acc, current) => {
                        Object.keys(acc).forEach(key => { acc[key as keyof typeof bucketTemplate] += current[key as keyof typeof bucketTemplate]; });
                        return acc;
                    }, { ...bucketTemplate });
                    
                    return { details: Object.values(details).sort((a, b) => b.total - a.total), totals };
                }
                return {
                    title: "تقرير أعمار الذمم المدينة",
                    data: calculateAging(allInvoices, dateRange.end)
                };
            }
            case 'ap-aging': {
                const calculateAging = (items: SupplierBill[], endDateStr: string) => {
                    const endDate = new Date(endDateStr);
                    const bucketTemplate = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_plus: 0, total: 0 };
                    const details: { [key: string]: typeof bucketTemplate & { name: string } } = {};

                    items.forEach(item => {
                        if (item.status === 'paid') return;
                        const groupName = item.supplierName;
                        const dueDate = new Date(item.dueDate);
                        const daysOverdue = Math.floor((endDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                        let bucketKey: keyof typeof bucketTemplate = 'current';
                        if (daysOverdue > 90) bucketKey = 'd91_plus';
                        else if (daysOverdue > 60) bucketKey = 'd61_90';
                        else if (daysOverdue > 30) bucketKey = 'd31_60';
                        else if (daysOverdue > 0) bucketKey = 'd1_30';
                        
                        if (!details[groupName]) details[groupName] = { ...bucketTemplate, name: groupName };
                        details[groupName][bucketKey] += item.amount;
                        details[groupName].total += item.amount;
                    });

                    const totals = Object.values(details).reduce((acc, current) => {
                        Object.keys(acc).forEach(key => { acc[key as keyof typeof bucketTemplate] += current[key as keyof typeof bucketTemplate]; });
                        return acc;
                    }, { ...bucketTemplate });
                    
                    return { details: Object.values(details).sort((a, b) => b.total - a.total), totals };
                }
                return {
                    title: "تقرير أعمار الذمم الدائنة",
                    data: calculateAging(allSupplierBills, dateRange.end)
                };
            }
            default: return null;
        }
    }

    const handleGenerateReport = async (reportType: string) => {
        setIsGenerating(true);
        setSelectedReport(reportType);
        const data = await generateReportData(reportType);
        setReportData(data);
        setIsGenerating(false);
    };

    const handlePrint = () => window.print();

    const handleExportCSV = () => {
        if (!selectedReport || !reportData) return;
        // Logic for CSV export...
    };

    const handleDownloadPDF = async () => {
        if (!selectedReport || !reportData) return;

        const doc = new jsPDF();
        
        try {
            const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf';
            const response = await fetch(fontUrl);
            const fontBlob = await response.blob();
            const reader = new FileReader();
            
            reader.onloadend = () => {
                const base64data = (reader.result as string).split(',')[1];
                doc.addFileToVFS('Tajawal-Regular.ttf', base64data);
                doc.addFont('Tajawal-Regular.ttf', 'Tajawal', 'normal');
                doc.setFont('Tajawal');

                const pageWidth = doc.internal.pageSize.getWidth();
                
                doc.setFontSize(18);
                doc.text(reportData.title, pageWidth / 2, 20, { align: 'center' });

                doc.setFontSize(12);
                const dateText = dateRange.start ? `للفترة من ${dateRange.start} إلى ${dateRange.end}` : `كما في تاريخ ${dateRange.end}`;
                doc.text(dateText, pageWidth / 2, 30, { align: 'center' });

                let head: any[] = [];
                let body: any[] = [];
                let startY = 40;

                if (selectedReport === 'project-profitability') {
                    head = [['الربح / الخسارة', 'التكاليف', 'الإيرادات', 'اسم المشروع']];
                    body = reportData.data.map((p: any) => [`﷼${p.profit.toLocaleString()}`, `﷼${p.costs.toLocaleString()}`, `﷼${p.revenue.toLocaleString()}`, p.name]);
                } else if (['ar-aging', 'ap-aging'].includes(selectedReport)) {
                    const groupByLabel = selectedReport === 'ar-aging' ? 'العميل' : 'المورد';
                    head = [['الإجمالي', '+91 يوم', '61-90 يوم', '31-60 يوم', '1-30 يوم', 'الحالي', groupByLabel]];
                    body = reportData.data.details.map((item: any) => [
                        `﷼${item.total.toLocaleString()}`, `﷼${item.d91_plus.toLocaleString()}`, `﷼${item.d61_90.toLocaleString()}`, `﷼${item.d31_60.toLocaleString()}`, `﷼${item.d1_30.toLocaleString()}`, `﷼${item.current.toLocaleString()}`, item.name
                    ]);
                    body.push([
                        `﷼${reportData.data.totals.total.toLocaleString()}`, `﷼${reportData.data.totals.d91_plus.toLocaleString()}`, `﷼${reportData.data.totals.d61_90.toLocaleString()}`, `﷼${reportData.data.totals.d31_60.toLocaleString()}`, `﷼${reportData.data.totals.d1_30.toLocaleString()}`, `﷼${reportData.data.totals.current.toLocaleString()}`, 'الإجمالي'
                    ]);
                } else {
                    alert('PDF export for this report is not yet available.');
                    return;
                }

                autoTable(doc, {
                    head: head,
                    body: body,
                    startY: startY,
                    styles: { font: 'Tajawal', halign: 'center' },
                    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
                    footStyles: { fillColor: [236, 240, 241], textColor: [44, 62, 80], fontStyle: 'bold' },
                    theme: 'grid',
                    didParseCell: function (data) {
                        if (data.section === 'body') {
                           data.cell.styles.halign = 'right';
                        }
                    }
                });

                doc.save(`${selectedReport}_${dateRange.end}.pdf`);
            };

            reader.readAsDataURL(fontBlob);

        } catch (error) {
            console.error("Error loading font for PDF:", error);
            alert("Could not generate PDF. Failed to load required font.");
        }
    };
    
    const getReportComponent = () => {
        if (isGenerating) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-600">جاري إعداد التقرير...</p>
                </div>
            );
        }
        if (!selectedReport || !reportData) return null;

        switch(selectedReport) {
            case 'pnl': return <PnLReport data={reportData.data} dates={dateRange} />;
            case 'balance-sheet': return <BalanceSheetReport data={reportData.data} dates={{ end: dateRange.end }} />;
            case 'project-profitability': return <ProjectProfitabilityReport data={reportData.data} dates={dateRange} />;
            case 'ar-aging': return <AgingReport data={reportData.data} dates={{end: dateRange.end}} title="تقرير أعمار الذمم المدينة" groupByLabel="العميل" />;
            case 'ap-aging': return <AgingReport data={reportData.data} dates={{end: dateRange.end}} title="تقرير أعمار الذمم الدائنة" groupByLabel="المورد" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {!selectedReport ? (
                <>
                    <h1 className="text-2xl font-bold text-gray-800">التقارير المالية</h1>
                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex items-center gap-4 flex-wrap">
                        <label className="font-medium text-gray-700">تحديد الفترة:</label>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-md" aria-label="تاريخ البدء"/>
                        <span>إلى</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-md" aria-label="تاريخ الانتهاء"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reportCards.map(card => (
                            <div key={card.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col hover:shadow-lg transition-shadow duration-300">
                                <card.icon className="w-10 h-10 text-blue-600 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">{card.title}</h3>
                                <p className="text-sm text-gray-600 flex-grow">{card.description}</p>
                                <button onClick={() => handleGenerateReport(card.id)} className="mt-6 w-full flex items-center justify-center px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                    إعداد التقرير
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
                         <button onClick={() => setSelectedReport(null)} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                            <ArrowRight size={16} className="ml-2"/>
                            العودة إلى التقارير
                        </button>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                                <FileText size={16} className="ml-2"/>
                                تنزيل PDF
                            </button>
                            <button onClick={handleExportCSV} disabled={isGenerating} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300">
                                <Download size={16} className="ml-2"/>
                                تصدير CSV
                            </button>
                            <button onClick={handlePrint} disabled={isGenerating} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 disabled:bg-gray-400">
                                <Printer size={16} className="ml-2"/>
                                طباعة
                            </button>
                        </div>
                    </div>
                    <div id="print-area">
                        {getReportComponent()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
