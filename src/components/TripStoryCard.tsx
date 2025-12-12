import { useMemo } from 'react';
import type { Trip, Expense, ExpenseCategory } from '../types';
import { format } from 'date-fns';
import { Share, Coffee, Bus, Bed, ShoppingBag, Music, MoreHorizontal } from 'lucide-react';

interface TripStoryCardProps {
    trip: Trip;
    expenses: Expense[];
}

const ICONS: Record<ExpenseCategory, any> = {
    food: Coffee,
    transport: Bus,
    accommodation: Bed,
    shopping: ShoppingBag,
    entertainment: Music,
    other: MoreHorizontal,
};

export function TripStoryCard({ trip, expenses }: TripStoryCardProps) {
    const { totalSpend, topCategories, insight } = useMemo(() => {
        const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        const catTotals: Record<string, number> = {};
        expenses.forEach(e => {
            catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
        });

        const sortedCats = Object.entries(catTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat]) => cat as ExpenseCategory)
            .slice(0, 3);

        const topCat = sortedCats[0];
        let insightText = `You collected ${expenses.length} memories across ${trip.country || "the world"}.`;
        if (topCat) {
            const percent = Math.round((catTotals[topCat] / total) * 100);
            insightText += ` A huge ${percent}% of your budget went to ${topCat}!`;
        }

        return { totalSpend: total, topCategories: sortedCats, insight: insightText };
    }, [expenses, trip.country]);

    const images = useMemo(() => {
        return expenses.flatMap(e => e.images || []).filter(Boolean);
    }, [expenses]);

    return (
        <div id="story-card" className="relative w-full aspect-[9/16] bg-surface rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
            {/* Visual Header */}
            <div className="h-1/2 bg-blue-100 relative overflow-hidden group">
                {/* Image Grid / Collage */}
                {images.length > 0 ? (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                        {images.slice(0, 4).map((img, i) => (
                            <div key={i} className={images.length === 1 ? "col-span-2 row-span-2" : (images.length === 3 && i === 0 ? "row-span-2" : "")}>
                                <img src={img} className="w-full h-full object-cover" alt="Memory" />
                            </div>
                        ))}
                        {/* Overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </div>
                ) : (
                    <>
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-8xl opacity-10 font-black tracking-tighter">NORI</span>
                        </div>
                    </>
                )}

                <div className="absolute bottom-6 left-6 right-6 z-10">
                    <h2 className={`text-4xl font-heading font-bold mb-2 leading-tight ${images.length > 0 ? 'text-white' : 'text-text'}`}>{trip.name}</h2>
                    <p className={`font-medium ${images.length > 0 ? 'text-white/80' : 'text-text-secondary'}`}>
                        {format(trip.startDate, 'MMM d')} — {format(trip.endDate, 'MMM d, yyyy')}
                    </p>
                </div>
            </div>

            {/* Stats Body */}
            <div className="h-1/2 p-8 flex flex-col justify-between bg-white relative">
                <div className="space-y-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">Total Spent</p>
                        <p className="text-5xl font-heading font-bold text-primary">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.currency, maximumSignificantDigits: 3 }).format(totalSpend)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            {insight}
                        </p>

                        {/* Top Categories Icons */}
                        <div className="flex gap-3 mt-4">
                            {topCategories.map(cat => {
                                const Icon = ICONS[cat];
                                return (
                                    <div key={cat} className="p-2 bg-gray-50 rounded-lg text-primary" title={cat}>
                                        <Icon size={20} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs">N</div>
                        <span className="font-heading font-semibold text-sm">Nori Travel</span>
                    </div>
                    {/* QR Code Placeholder */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-400">QR</div>
                </div>
            </div>

            {/* Actions Overlay (Hidden on export) */}
            <button className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur rounded-full shadow-sm text-text hover:bg-white active:scale-95 transition-all">
                <Share size={20} />
            </button>
        </div>
    );
}

export function TripStoryBanner({ trip }: { trip: Trip }) {
    return (
        <div className="relative rounded-[24px] overflow-hidden aspect-[21/9] shadow-sm active:scale-98 transition-transform group cursor-pointer bg-primary">
            {trip.coverImage ? (
                <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                    <span className="text-4xl">✈️</span>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                <div className="w-full flex justify-between items-end">
                    <div>
                        {trip.country && (
                            <div className="text-white/80 text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                                📍 {trip.country}
                            </div>
                        )}
                        <h2 className="text-white font-heading font-bold text-xl drop-shadow-md">
                            旅行回憶
                        </h2>
                    </div>
                </div>
            </div>
        </div>
    );
}
