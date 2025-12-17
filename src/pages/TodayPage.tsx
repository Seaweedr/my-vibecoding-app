import { Link } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { Camera, Plus } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useEffect, useState } from 'react';

import { convertCurrency, formatCurrency, getCurrencyForCountry } from '../lib/currency';
import type { CurrencyCode } from '../types';
import { removeBackground } from '../lib/imageUtils';

export function TodayPage() {
    const { expenses, trips, activeTripId } = useStorage();
    const today = new Date();
    const [heroImage, setHeroImage] = useState<string>('/assets/travel_hero.png');

    useEffect(() => {
        // Process the image on client-side
        removeBackground('/assets/travel_hero.png').then(setHeroImage);
    }, []);

    // Filter today's expenses
    const todaysExpenses = expenses.filter(e => isSameDay(new Date(e.date), today));

    // Determine the "Active Context" for display
    let activeTrip = trips.find(t => t.id === activeTripId);

    // If no manually active trip, try to find one by date
    if (!activeTrip) {
        activeTrip = trips.find(t => {
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            const current = new Date();
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            current.setHours(12, 0, 0, 0);
            return current >= start && current <= end;
        });
    }

    // Fallback: If no date-match, check valid expenses from today to guess trip
    if (!activeTrip && todaysExpenses.length > 0) {
        // Find the most frequent tripId in today's expenses
        const tripCounts = todaysExpenses.reduce((acc, curr) => {
            acc[curr.tripId] = (acc[curr.tripId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostLikelyTripId = Object.keys(tripCounts).reduce((a, b) => tripCounts[a] > tripCounts[b] ? a : b);
        activeTrip = trips.find(t => t.id === mostLikelyTripId);
    }

    // Determine Display Currency
    // 1. If activeTrip exists:
    //    - Priority: Trip's set currency
    //    - Secondary: Trip's country local currency (if different from set currency)
    // 2. If no trip, try to guess or default to Home

    let mainDisplayCurrency: CurrencyCode | undefined = activeTrip?.currency;
    const homeCurrency = 'TWD'; // Future: Get from settings
    let subDisplayCurrency = null; // What to show in small text

    if (!mainDisplayCurrency && todaysExpenses.length > 0) {
        // Guess from expenses
        const currencyCounts = todaysExpenses.reduce((acc, curr) => {
            acc[curr.currency] = (acc[curr.currency] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        mainDisplayCurrency = Object.keys(currencyCounts).reduce((a, b) => currencyCounts[a] > currencyCounts[b] ? a : b) as any;
    }

    if (!mainDisplayCurrency) mainDisplayCurrency = homeCurrency;

    // Logic for Sub Display
    if (activeTrip && activeTrip.country) {
        const countryLocalCurrency = getCurrencyForCountry(activeTrip.country);

        // Scenario A: Trip Currency is TWD (Home), but we are in Japan (JPY)
        // User wants to see TWD big (current behavior), but JPY small
        if (mainDisplayCurrency === homeCurrency && countryLocalCurrency && countryLocalCurrency !== homeCurrency) {
            subDisplayCurrency = countryLocalCurrency as CurrencyCode;
        }
        // Scenario B: Trip Currency is JPY (Local), we want to see TWD (Home) small
        else if (mainDisplayCurrency !== homeCurrency) {
            subDisplayCurrency = homeCurrency as CurrencyCode;
        }
    } else {
        // No trip, just show home equivalent if main is foreign
        if (mainDisplayCurrency !== homeCurrency) {
            subDisplayCurrency = homeCurrency as CurrencyCode;
        }
    }

    // Recent 3 expenses (from all time or active trip)
    const recentExpenses = [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    let totalInMain = 0;
    let totalInSub = 0;

    todaysExpenses.forEach(e => {
        totalInMain += convertCurrency(e.amount, e.currency, mainDisplayCurrency!);
        if (subDisplayCurrency) {
            totalInSub += convertCurrency(e.amount, e.currency, subDisplayCurrency);
        }
    });

    return (
        <div className="space-y-6 px-4 pt-6 pb-24">
            {/* Header - Logo Only, Centered */}
            <header className="flex items-center justify-center mb-6">
                <img src="/assets/nori_logo.png" alt="Nori" className="w-12 h-12 rounded-[16px] shadow-sm" />
            </header>

            {/* 1.1 今日總覽卡片 */}
            <div className="bg-primary text-white rounded-[24px] p-6 relative overflow-hidden shadow-xl shadow-primary/20 min-h-[200px]">
                {/* Decorative Background Image - Centered Right */}
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-48 h-48 rotate-0 pointer-events-none z-0">
                    <img src={heroImage} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                </div>
                {/* Existing blur for extra vibe */}
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl translate-x-10 -translate-y-10 pointer-events-none z-0" />

                {/* Content Container - Added padding-right to avoid image overlap */}
                <div className="relative z-10 space-y-6 pr-32">
                    {/* Merged Header Info */}
                    <div>
                        <h1 className="text-3xl font-bold font-heading tracking-tight mb-1 drop-shadow-md">今日總覽</h1>
                        <p className="text-white/90 font-medium text-sm drop-shadow-sm">
                            {activeTrip
                                ? activeTrip.name
                                : format(today, 'yyyy.MM.dd EEEE')}
                        </p>
                    </div>

                    <div>
                        <p className="text-primary-light font-bold text-xs mb-1 uppercase tracking-wide opacity-90">
                            今日總花費
                        </p>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black font-heading tracking-tight drop-shadow-md">
                                    {formatCurrency(totalInMain, mainDisplayCurrency!)}
                                </span>
                                <span className="text-lg font-bold text-white/80">{mainDisplayCurrency}</span>
                            </div>
                            {subDisplayCurrency && (
                                <div className="mt-1 text-primary-light/90 font-medium text-sm flex items-center gap-1">
                                    <span>≈ {formatCurrency(totalInSub, subDisplayCurrency)} {subDisplayCurrency}</span>
                                </div>
                            )}
                        </div>
                        <p className="mt-5 text-xs bg-white/20 inline-block px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 font-medium text-white shadow-sm">
                            今日已記錄 {todaysExpenses.length} 筆
                        </p>
                    </div>
                </div>
            </div>

            {/* 1.2 快速動作 */}
            <div className="grid grid-cols-2 gap-4">
                <Link
                    to="/capture"
                    className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-[20px] active:scale-95 transition-transform border border-gray-200"
                >
                    <div className="w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg shadow-accent/20 ring-4 ring-accent/10">
                        <Camera size={26} />
                    </div>
                    <span className="font-bold text-text mt-1">拍收據</span>
                </Link>

                <Link
                    to={activeTrip ? `/trips/${activeTrip.id}/add-expense` : "/trips"}
                    className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-[20px] active:scale-95 transition-transform border border-gray-200"
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
                    <Link to="/stats" className="text-sm text-primary font-medium hover:text-primary-dark transition-colors">查看更多</Link>
                </div>

                {recentExpenses.length > 0 ? (
                    <div className="space-y-3">
                        {recentExpenses.map(expense => (
                            <div key={expense.id} className="bg-white p-4 rounded-[20px] flex items-center justify-between border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-2xl border border-gray-100">
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
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-[20px] border border-dashed border-gray-200">
                        <div className="w-32 h-32 mb-4 animate-bounce-slow">
                            <img src="/assets/empty_expenses.png" alt="No expenses" className="w-full h-full object-contain opacity-90 mix-blend-multiply" />
                        </div>
                        <p className="text-text font-bold text-lg">尚無今日消費</p>
                        <p className="text-text-secondary text-sm mt-1">享受當下的美好時刻吧！</p>
                    </div>
                )}
            </div>
        </div>
    );
}
