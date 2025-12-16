import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../types';

import { formatCurrency, convertCurrency, getCurrencyForCountry } from '../lib/currency';
import type { CurrencyCode } from '../types';
import { PieChart } from 'lucide-react';

interface TripCardProps {
    trip: Trip;
    expenseCount: number;
    totalSpend: number;
}

// stringHashCode and COVER_EMOJIS removed


export function TripCard({ trip, expenseCount, totalSpend }: TripCardProps) {
    const isPast = new Date() > trip.endDate;

    const navigate = useNavigate();

    const handleStatsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/stats?tripId=${trip.id}`);
    };

    return (
        <Link to={`/trips/${trip.id}`} className="block group relative">
            <div className="bg-white rounded-[20px] border border-gray-200 active:scale-[0.98] transition-all duration-200 overflow-hidden">
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                    {trip.coverImage ? (
                        <img
                            src={trip.coverImage}
                            alt={trip.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/20 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 pattern-dots" />
                            <img
                                src="/assets/travel_hero.png"
                                alt="Default Cover"
                                className="w-32 h-32 object-contain opacity-90 drop-shadow-sm transform group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        {!isPast ? (
                            <div className="bg-primary text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm tracking-wide">
                                旅行中
                            </div>
                        ) : (
                            <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm tracking-wide">
                                已結束
                            </div>
                        )}
                    </div>

                    {/* Stats Button - Enhanced Visibility */}
                    <button
                        onClick={handleStatsClick}
                        className="absolute top-4 right-4 bg-white/90 hover:bg-white text-primary p-2 rounded-full transition-colors active:scale-95 shadow-md border border-white/50"
                        title="統計分析"
                    >
                        <PieChart size={18} />
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-5">
                    <div className="mb-3">
                        <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-0.5">
                            {trip.country || "全球"}
                        </div>
                        <h3 className="font-heading font-bold text-xl text-text leading-tight line-clamp-1">
                            {trip.name}
                        </h3>
                    </div>

                    {/* Footer Info - Split Layout */}
                    <div>
                        <div className="flex justify-between items-center mb-0.5">
                            <p className="text-xs text-text-secondary font-medium">總花費</p>
                            <div className="text-xs font-bold text-text-secondary px-2 py-0.5 bg-gray-50 rounded-md">
                                {expenseCount} 筆
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            {(() => {
                                const HOME_CURRENCY = 'TWD';
                                let mainAmount = 0;
                                let mainCurrency: CurrencyCode = HOME_CURRENCY;

                                let secondaryAmount: number | null = null;
                                let secondaryCurrency: CurrencyCode | null = null;

                                // Determine currencies and amounts
                                if (trip.currency === HOME_CURRENCY) {
                                    // Case A: Trip is set to TWD
                                    mainAmount = totalSpend;

                                    // Try to find a foreign currency to show as secondary
                                    const localCurrency = getCurrencyForCountry(trip.country || '');
                                    if (localCurrency && localCurrency !== HOME_CURRENCY) {
                                        secondaryCurrency = localCurrency;
                                        secondaryAmount = convertCurrency(totalSpend, HOME_CURRENCY, localCurrency);
                                    }
                                } else {
                                    // Case B: Trip is set to Foreign Currency (e.g. KRW)
                                    // Main display should still be TWD (for consistency)
                                    mainAmount = convertCurrency(totalSpend, trip.currency, HOME_CURRENCY);

                                    // Secondary display is the Foreign Currency (Trip Currency)
                                    secondaryCurrency = trip.currency;
                                    secondaryAmount = totalSpend;
                                }

                                return (
                                    <>
                                        {/* Main Amount (Left) */}
                                        <p className="font-heading font-black text-xl text-text">
                                            {formatCurrency(mainAmount, mainCurrency)}
                                        </p>

                                        {/* Secondary Amount & Rate (Right) */}
                                        {secondaryCurrency && secondaryAmount !== null && (
                                            <div className="flex flex-col items-end">
                                                <p className="text-sm font-bold text-primary">
                                                    ≈ {formatCurrency(secondaryAmount, secondaryCurrency)}
                                                </p>
                                                <p className="text-[10px] text-text-secondary opacity-60">
                                                    匯率 {convertCurrency(1, secondaryCurrency, HOME_CURRENCY).toFixed(3)}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
