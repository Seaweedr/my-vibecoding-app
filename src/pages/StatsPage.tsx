import { useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Download, FileText, ArrowLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { convertCurrency } from '../lib/currency';

const COLORS = ['#5C9DF2', '#FF9F76', '#10B981', '#F59E0B', '#8B5CF6', '#6B7280'];

const CATEGORY_LABELS: Record<string, string> = {
    food: '餐飲',
    transport: '交通',
    accommodation: '住宿',
    shopping: '購物',
    entertainment: '娛樂',
    other: '其他'
};

export function StatsPage() {
    const { trips, expenses } = useStorage();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const tripId = searchParams.get('tripId');
    const filteredTrip = tripId ? trips.find(t => t.id === tripId) : null;

    // Filter expenses if tripId is present
    const displayedExpenses = useMemo(() => {
        if (tripId) {
            return expenses.filter(e => e.tripId === tripId);
        }
        return expenses;
    }, [expenses, tripId]);

    // Aggregate data by category
    const categoryData = useMemo(() => {
        const total: Record<string, number> = {};
        displayedExpenses.forEach(e => {
            total[e.category] = (total[e.category] || 0) + e.amount;
        });
        return Object.entries(total).map(([key, value]) => ({
            name: CATEGORY_LABELS[key] || key,
            value,
            originalKey: key
        }));
    }, [displayedExpenses]);

    // Aggregate data by day (Time Series)
    const timeData = useMemo(() => {
        const daily: Record<string, number> = {};
        displayedExpenses.forEach(e => {
            const dateKey = format(e.date, 'MMM d');
            daily[dateKey] = (daily[dateKey] || 0) + e.amount;
        });
        return Object.entries(daily).map(([date, amount]) => ({ date, amount }));
    }, [displayedExpenses]);

    const totalSpend = categoryData.reduce((acc, curr) => acc + curr.value, 0);

    const handleExportCSV = () => {
        const headers = ['Date', 'Merchant', 'Category', 'Amount', 'Currency', 'Note'];
        const csvContent = [
            headers.join(','),
            ...displayedExpenses.map(e => [
                format(e.date, 'yyyy-MM-dd HH:mm'),
                `"${e.merchant}"`,
                CATEGORY_LABELS[e.category] || e.category,
                e.amount,
                e.currency,
                `"${e.note || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', tripId ? `nori_expenses_${tripId}.csv` : 'nori_expenses_all.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-24">
            <header className="px-4 pt-6">
                {tripId ? (
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
                            <ArrowLeft size={24} className="text-text" />
                        </button>
                    </div>
                ) : null}
                <h1 className="text-2xl font-heading font-bold text-text">
                    {filteredTrip ? `${filteredTrip.name} 統計` : '統計分析'}
                </h1>
                <p className="text-text-secondary">
                    {filteredTrip
                        ? `這趟旅程的總消費分析。`
                        : `跨越 ${trips.length} 次旅程的總消費。`}
                </p>
            </header>

            {expenses.length === 0 ? (
                <div className="mx-4 p-8 text-center text-text-secondary border-2 border-dashed border-gray-200 rounded-[24px]">
                    尚無消費記錄。
                </div>
            ) : (
                <div className="space-y-6 px-4">
                    {/* Pie Chart */}
                    <div className="bg-white p-6 rounded-[24px] shadow-sm flex flex-col items-center">
                        <h3 className="text-lg font-heading font-semibold mb-4 w-full">消費類別分析</h3>
                        {displayedExpenses.length > 0 ? (
                            <>
                                <div className="w-full h-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categoryData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xs text-text-secondary font-medium">總計</span>
                                        <span className="text-xl font-bold text-text">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', notation: 'compact', maximumFractionDigits: 0 }).format(totalSpend)}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full">
                                    {categoryData.map((entry, index) => (
                                        <div key={entry.name} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="capitalize text-text-secondary">{entry.name}</span>
                                            </div>
                                            <span className="font-medium">
                                                {Math.round((entry.value / totalSpend) * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-400 py-10">此區間尚無消費</div>
                        )}
                    </div>

                    {/* Show Trip List if Global View */}
                    {!tripId && trips.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-heading font-semibold px-2">個別旅程統計</h3>
                            <div className="grid gap-4">
                                {trips.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(trip => {
                                    // Calculate simple total for preview
                                    // Calculate total in TWD (Home Currency)
                                    const tripTotal = expenses
                                        .filter(e => e.tripId === trip.id)
                                        .reduce((acc, curr) => acc + convertCurrency(curr.amount, curr.currency, 'TWD'), 0);

                                    return (
                                        <Link
                                            key={trip.id}
                                            to={`/stats?tripId=${trip.id}`}
                                            className="bg-white p-4 rounded-[20px] shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all border border-transparent hover:border-primary/20"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {trip.coverImage ? (
                                                        <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xl">✈️</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-text">{trip.name}</h4>
                                                    <p className="text-xs text-text-secondary">{format(new Date(trip.startDate), 'yyyy/MM/dd')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-text">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(tripTotal)}
                                                </span>
                                                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Line Chart */}
                    {timeData.length > 1 && (
                        <div className="bg-white p-6 rounded-[24px] shadow-sm">
                            <h3 className="text-lg font-heading font-semibold mb-4">每日消費趨勢</h3>
                            <div className="w-full h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timeData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                            tickLine={false}
                                            axisLine={false}
                                            padding={{ left: 10, right: 10 }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value)}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#1A4D3B"
                                            strokeWidth={3}
                                            dot={{ fill: '#1A4D3B', r: 4, strokeWidth: 0 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Export Actions */}
                    <div className="bg-white p-6 rounded-[24px] shadow-sm space-y-4">
                        <h3 className="text-lg font-heading font-semibold">資料管理</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center justify-center gap-2 w-full py-4 bg-gray-50 text-text font-bold rounded-[20px] active:scale-95 transition-transform"
                            >
                                <FileText size={20} className="text-primary" />
                                匯出 CSV
                            </button>
                            <Link
                                to="/trips"
                                className="flex items-center justify-center gap-2 w-full py-4 bg-gray-50 text-text font-bold rounded-[20px] active:scale-95 transition-transform"
                            >
                                <Download size={20} className="text-orange-500" />
                                查看旅行故事卡
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

