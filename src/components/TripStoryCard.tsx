import { useMemo, useState } from 'react';
import type { Trip, Expense, ExpenseCategory } from '../types';
import { format } from 'date-fns';
import { Share, Coffee, Bus, Bed, ShoppingBag, Music, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

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

    // Image Carousel State
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const hasImages = images.length > 0;
    const currentImage = hasImages ? images[currentImageIndex] : '/assets/travel_hero.png'; // Fallback to hero

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    return (
        <div id="story-card" className="relative w-full aspect-[9/16] bg-surface rounded-[24px] shadow-xl overflow-hidden border border-gray-100 flex flex-col">
            {/* Visual Header (Expanded to take more space for photo focus) */}
            <div className="flex-1 relative overflow-hidden group bg-gray-100">
                {/* Single Hero Image */}
                <div className="absolute inset-0">
                    <img
                        src={currentImage}
                        className={`w-full h-full ${hasImages ? 'object-cover' : 'object-contain p-12 bg-primary/5'}`}
                        alt="Memory"
                    />
                </div>

                {/* Carousel Controls (Only if visible images > 1) */}
                {hasImages && images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100 z-20"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100 z-20"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Dots Indicator */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                            {images.slice(0, 5).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${idx === currentImageIndex % 5 ? 'bg-white w-3' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none"></div>

                <div className="absolute bottom-6 left-6 right-6 z-10 text-white pointer-events-none">
                    {trip.country && (
                        <div className="text-white/80 text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                            {trip.country}
                        </div>
                    )}
                    <h2 className="text-3xl font-heading font-bold mb-1 leading-tight drop-shadow-md">{trip.name}</h2>
                    <p className="font-medium text-white/90 text-sm opacity-90">
                        {format(trip.startDate, 'MMM d')} — {format(trip.endDate, 'MMM d, yyyy')}
                    </p>
                </div>
            </div>

            {/* Stats Body (Compressed) */}
            <div className="h-[40%] p-6 flex flex-col justify-between bg-white relative z-10">
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Total Spent</p>
                        <p className="text-4xl font-heading font-bold text-accent">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.currency, maximumSignificantDigits: 3 }).format(totalSpend)}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                            {insight}
                        </p>

                        {/* Top Categories Icons */}
                        <div className="flex gap-2 mt-3">
                            {topCategories.map(cat => {
                                const Icon = ICONS[cat];
                                return (
                                    <div key={cat} className="p-1.5 bg-gray-50 rounded-lg text-accent" title={cat}>
                                        <Icon size={16} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white font-bold text-[10px]">N</div>
                        <span className="font-heading font-semibold text-xs text-text">Nori Travel</span>
                    </div>
                    {/* QR Code Placeholder */}
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-[8px] text-gray-400 border border-gray-100">QR</div>
                </div>
            </div>

            {/* Actions Overlay (Hidden on export) */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button className="p-3 bg-white/20 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-white/30 active:scale-95 transition-all border border-white/20">
                    <Share size={20} />
                </button>
            </div>
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
