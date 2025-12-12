import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../types';
import { format } from 'date-fns';
import { formatCurrency, convertCurrency, getCurrencyForCountry } from '../lib/currency';
import type { CurrencyCode } from '../types';
import { PieChart } from 'lucide-react';

interface TripCardProps {
    trip: Trip;
    expenseCount: number;
    totalSpend: number;
}

// Simple hashCode function for string
function stringHashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

const COVER_EMOJIS = ['✈️', '🌍', '🗺️', '🏞️', '🏖️', '🏙️', '🚢', '🚂', '🚗', '🏕️', '🗼', '🗽', '⛩️', '🕌', '🏰', '🌉', '🏔️', '🌅', '🌌', '🌿'];


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
            <div className="bg-white rounded-[20px] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] active:shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)] transition-all duration-200 overflow-hidden border border-gray-100 active:scale-[0.98]">
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                    {trip.coverImage ? (
                        <img
                            src={trip.coverImage}
                            alt={trip.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200/50 flex items-center justify-center relative overflow-hidden">
                            <span className="text-5xl opacity-80 scale-110">
                                {COVER_EMOJIS[Math.abs(stringHashCode(trip.name)) % COVER_EMOJIS.length] || '🌿'}
                            </span>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        {!isPast ? (
                            <div className="bg-primary text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm tracking-wide">
                                ONGOING
                            </div>
                        ) : (
                            <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm tracking-wide">
                                ENDED
                            </div>
                        )}
                    </div>

                    {/* Stats Button */}
                    <button
                        onClick={handleStatsClick}
                        className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-2 rounded-full transition-colors active:scale-95 shadow-sm border border-white/20"
                        title="統計分析"
                    >
                        <PieChart size={18} />
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-5">
                    <div className="mb-1">
                        <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">
                            {trip.country || "GLOBAL"}
                        </div>
                        <h3 className="font-heading font-bold text-xl text-text leading-tight line-clamp-1">
                            {trip.name}
                        </h3>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                        <div>
                            <p className="text-xs text-text-secondary font-medium mb-0.5">Total Spent</p>

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
                                        {/* Main Amount (Always TWD) */}
                                        <p className="font-heading font-black text-lg text-text">
                                            {formatCurrency(mainAmount, mainCurrency)}
                                        </p>

                                        {/* Secondary Amount & Rate */}
                                        {secondaryCurrency && secondaryAmount !== null && (
                                            <div className="flex flex-col mt-1">
                                                <p className="text-xs font-bold text-primary">
                                                    ≈ {formatCurrency(secondaryAmount, secondaryCurrency)}
                                                </p>
                                                <p className="text-[10px] text-text-secondary opacity-80">
                                                    匯率 {convertCurrency(1, secondaryCurrency, HOME_CURRENCY).toFixed(3)}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                        <div className="text-xs font-bold text-text-secondary px-2 py-1 bg-gray-100 rounded-lg">
                            {expenseCount} items
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
