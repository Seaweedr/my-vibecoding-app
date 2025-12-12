import { Link } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { Camera, Plus, Coffee, TrendingUp } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

import { convertCurrency, formatCurrency } from '../lib/currency';

export function TodayPage() {
    const { expenses, trips } = useStorage();
    const today = new Date();

    // Filter today's expenses
    const todaysExpenses = expenses.filter(e => isSameDay(new Date(e.date), today));
    // Get active trip logic:
    // 1. Priority: Trip that encompasses "now"
    // 2. Fallback: Trip that "todays expenses" belong to (if any)
    let activeTrip = trips.find(t => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        // Reset time parts for accurate date comparison
        const current = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        current.setHours(12, 0, 0, 0); // compare against mid-day just to be safe or use isInterval
        return current >= start && current <= end;
    });

    // Fallback: If no date-match, check valid expenses from today
    if (!activeTrip && todaysExpenses.length > 0) {
        // Find the most frequent tripId in today's expenses
        const tripCounts = todaysExpenses.reduce((acc, curr) => {
            acc[curr.tripId] = (acc[curr.tripId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Find tripId with max count
        const mostLikelyTripId = Object.keys(tripCounts).reduce((a, b) => tripCounts[a] > tripCounts[b] ? a : b);
        activeTrip = trips.find(t => t.id === mostLikelyTripId);
    }

    // Recent 3 expenses (from all time or active trip)
    const recentExpenses = [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    // Calculate totals with conversion AFTER activeTrip is determined
    const targetCurrency = activeTrip?.currency || 'TWD';
    const homeCurrency = 'TWD'; // Assuming Home is TWD for now, should come from settings

    let totalInTarget = 0;
    let totalInHome = 0;

    todaysExpenses.forEach(e => {
        // Convert expense amount to Home Currency (TWD) first
        const inHome = convertCurrency(e.amount, e.currency, homeCurrency);
        totalInHome += inHome;

        // Convert to Target Currency (Active Trip Currency)
        const inTarget = convertCurrency(e.amount, e.currency, targetCurrency);
        totalInTarget += inTarget;
    });

    const exchangeRate = activeTrip ? convertCurrency(1, activeTrip.currency, homeCurrency) : 1;

    return (
        <div className="space-y-6 px-4 pt-6 pb-24">
            <header>
                <h1 className="text-2xl font-heading font-bold text-text">今日總覽</h1>
                <p className="text-text-secondary">
                    {activeTrip
                        ? `正在旅行：${activeTrip.name}`
                        : format(today, 'yyyy年M月d日 EEEE')}
                </p>
            </header>

            {/* 1.1 今日總覽卡片 */}
            <div className="bg-primary text-white rounded-[24px] p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl translate-x-10 -translate-y-10" />

                <div className="relative z-10">
                    <p className="text-primary-light font-medium text-sm mb-1">
                        今日總花費
                    </p>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-heading font-bold">
                                {formatCurrency(totalInTarget, targetCurrency)}
                            </span>
                        </div>
                        {activeTrip && targetCurrency !== homeCurrency && (
                            <div className="mt-1 text-primary-light/80 font-medium text-sm flex items-center gap-1">
                                <span>≈ {formatCurrency(totalInHome, homeCurrency)}</span>
                            </div>
                        )}
                    </div>
                    <p className="mt-4 text-sm bg-white/10 inline-block px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                        今日已記錄 {todaysExpenses.length} 筆
                    </p>
                </div>
            </div>

            {/* 1.2 快速動作 */}
            <div className="grid grid-cols-2 gap-4">
                <Link
                    to="/capture"
                    className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-[24px] active:scale-95 transition-transform border border-gray-200"
                >
                    <div className="w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg shadow-accent/20 ring-4 ring-accent/10">
                        <Camera size={26} />
                    </div>
                    <span className="font-bold text-text mt-1">拍收據</span>
                </Link>

                <Link
                    to={activeTrip ? `/trips/${activeTrip.id}/add-expense` : "/trips"}
                    className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-[24px] active:scale-95 transition-transform border border-gray-200"
                >
                    <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                        <Plus size={26} />
                    </div>
                    <span className="font-bold text-text mt-1">手動記帳</span>
                </Link>
            </div>



            {/* 最近三筆消費 */}
            <div>
                <div className="flex justify-between items-end mb-4 px-1">
                    <h2 className="text-xl font-heading font-bold text-text">最近記錄</h2>
                    <Link to="/stats" className="text-sm text-primary font-medium">查看更多</Link>
                </div>

                {recentExpenses.length > 0 ? (
                    <div className="space-y-3">
                        {recentExpenses.map(expense => (
                            <div key={expense.id} className="bg-white p-4 rounded-[20px] flex items-center justify-between border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-2xl">
                                        {/* Simple mapping for icon/emoji based on category */}
                                        {expense.category === 'food' ? '🍜' :
                                            expense.category === 'transport' ? '🚌' :
                                                expense.category === 'accommodation' ? '🏨' :
                                                    expense.category === 'shopping' ? '🛍️' : '🏷️'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-text text-sm">{expense.merchant}</p>
                                        <p className="text-xs text-text-secondary">{format(new Date(expense.date), 'MM/dd HH:mm')}</p>
                                    </div>
                                </div>
                                <span className="font-heading font-bold text-text">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-secondary bg-white rounded-[20px] border border-dashed border-gray-200">
                        <p>尚無最近消費</p>
                    </div>
                )}
            </div>
        </div>
    );
}
