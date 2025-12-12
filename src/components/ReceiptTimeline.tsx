import { useMemo } from 'react';
import type { Expense } from '../types';
import { format } from 'date-fns';
import { Coffee, Bus, Bed, ShoppingBag, Music, MoreHorizontal } from 'lucide-react';

interface ReceiptTimelineProps {
    expenses: Expense[];
}

const ICONS = {
    food: Coffee,
    transport: Bus,
    accommodation: Bed,
    shopping: ShoppingBag,
    entertainment: Music,
    other: MoreHorizontal,
};

export function ReceiptTimeline({ expenses }: ReceiptTimelineProps) {
    const grouped = useMemo(() => {
        const groups: Record<string, Expense[]> = {};
        expenses.forEach(e => {
            const dateKey = format(e.date, 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(e);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // Newest first
    }, [expenses]);

    return (
        <div className="space-y-8 p-4 relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200" />

            {grouped.map(([dateKey, items]) => (
                <div key={dateKey} className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 flex justify-center">
                            <div className="w-3 h-3 bg-primary rounded-full ring-4 ring-bg" />
                        </div>
                        <h3 className="font-heading font-bold text-lg text-text">
                            {format(new Date(dateKey), 'MMMM d, yyyy')}
                        </h3>
                    </div>

                    <div className="space-y-6">
                        {items.map((expense) => {
                            const Icon = ICONS[expense.category];
                            return (
                                <div key={expense.id} className="relative pl-12">
                                    {/* Node on line */}
                                    <div className="absolute left-[-16px] top-3 w-8 flex justify-center">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full" />
                                    </div>

                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="p-2 bg-gray-50 rounded-lg h-fit text-primary">
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-text">{expense.merchant}</p>
                                                <p className="text-xs text-text-secondary">{format(expense.date, 'h:mm a')} • {expense.category}</p>
                                                {expense.splits.length > 0 && (
                                                    <p className="text-xs text-accent mt-1">
                                                        Split with {expense.splits.length} people
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-heading font-bold text-text">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Simulated Context Photo Insertion (Random logic for demo) */}
                                    {expense.category === 'food' && expense.amount > 2000 && (
                                        <div className="mt-4 rounded-xl overflow-hidden shadow-sm">
                                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                                                Context Photo (Simulated)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
