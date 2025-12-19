import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { TripStoryCard } from '../components/TripStoryCard';
import { ArrowLeft, Share, Sparkles, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import type { CurrencyCode, ExpenseCategory } from '../types';

type StoryScene =
    | { type: 'intro'; title: string; subtitle: string; date: string; image: string }
    | { type: 'expense'; merchant: string; amount: number; currency: CurrencyCode; category: ExpenseCategory; image: string; date: string }
    | { type: 'summary'; image: string };

export function TripStoryPage() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();
    const { trips, getTripExpenses } = useStorage();

    const trip = trips.find(t => t.id === tripId);
    if (!trip) return <div>Trip not found</div>;

    const expenses = getTripExpenses(trip.id);

    // Create scenes for the story
    const scenes = useMemo<StoryScene[]>(() => {
        const result: StoryScene[] = [];

        // Scene 0: Introduction
        result.push({
            type: 'intro',
            title: trip.name,
            subtitle: trip.country || 'A Journey with Nori',
            date: `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`,
            image: trip.coverImage || '/assets/travel_hero.png'
        });

        // Scenes from expenses with images
        const expenseScenes = expenses
            .filter(e => e.images && e.images.length > 0)
            .map(e => ({
                type: 'expense' as const,
                merchant: e.merchant,
                amount: e.amount,
                currency: e.currency,
                category: e.category,
                image: e.images![0],
                date: format(e.date, 'MMM d, HH:mm')
            }));

        result.push(...expenseScenes);

        // Final Scene: Summary Card
        result.push({
            type: 'summary',
            image: trip.coverImage || (expenseScenes.length > 0 ? expenseScenes[0].image : '/assets/travel_hero.png')
        });

        return result;
    }, [trip, expenses]);

    const [currentScene, setCurrentScene] = useState(0);
    const [progress, setProgress] = useState(0);

    // Auto-advance
    useEffect(() => {
        const duration = 5000; // 5s per scene
        const interval = 50;
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    if (currentScene < scenes.length - 1) {
                        setCurrentScene(curr => curr + 1);
                        return 0;
                    } else {
                        return 100;
                    }
                }
                return prev + (100 / (duration / interval));
            });
        }, interval);

        return () => clearInterval(timer);
    }, [currentScene, scenes.length]);

    const handleNext = () => {
        if (currentScene < scenes.length - 1) {
            setCurrentScene(curr => curr + 1);
            setProgress(0);
        }
    };

    const handlePrev = () => {
        if (currentScene > 0) {
            setCurrentScene(curr => curr - 1);
            setProgress(0);
        }
    };

    const scene = scenes[currentScene];

    return (
        <div className="fixed inset-0 bg-black flex flex-col z-[100] overflow-hidden select-none">
            {/* Background Image with blur transition */}
            <div className="absolute inset-0 z-0">
                {scenes.map((s, idx) => (
                    <img
                        key={idx}
                        src={s.image}
                        className={cn(
                            "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
                            idx === currentScene ? "opacity-100 scale-105" : "opacity-0"
                        )}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                        alt="Background"
                    />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />
            </div>

            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 z-50 flex gap-1.5 h-1">
                {scenes.map((_, idx) => (
                    <div key={idx} className="flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full bg-white transition-all ease-linear",
                                idx < currentScene ? "w-full" : idx === currentScene ? "" : "w-0"
                            )}
                            style={{ width: idx === currentScene ? `${progress}%` : undefined }}
                        />
                    </div>
                ))}
            </div>

            {/* Header / Controls */}
            <div className="absolute top-8 left-4 right-4 z-50 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-black font-heading tracking-tight">{trip.name}</span>
                        <span className="text-[10px] text-white/60 font-medium">Memory Story</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2"><Share size={20} /></button>
                </div>
            </div>

            {/* Interaction Areas */}
            <div className="absolute inset-x-0 top-20 bottom-32 z-40 flex">
                <div className="flex-1" onClick={handlePrev} />
                <div className="flex-1" onClick={handleNext} />
            </div>

            {/* Content Area */}
            <div className="relative flex-1 z-10 flex flex-col justify-end p-8 pb-32">
                {scene.type === 'intro' && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            <Sparkles size={12} />
                            Let's Rewind
                        </div>
                        <h1 className="text-5xl font-black font-heading text-white leading-tight mb-4 drop-shadow-2xl">
                            {scene.title}
                        </h1>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-white/80 font-medium">
                                <MapPin size={16} className="text-primary" />
                                {scene.subtitle}
                            </div>
                            <div className="flex items-center gap-2 text-white/80 font-medium">
                                <Calendar size={16} className="text-primary" />
                                {scene.date}
                            </div>
                        </div>
                    </div>
                )}

                {scene.type === 'expense' && (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[32px] shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">{scene.date}</div>
                                    <h2 className="text-2xl font-black text-white">{scene.merchant}</h2>
                                </div>
                                <div className="p-2 bg-white rounded-2xl text-2xl">
                                    {scene.category === 'food' ? '🍜' :
                                        scene.category === 'transport' ? '🚌' :
                                            scene.category === 'accommodation' ? '🏨' :
                                                scene.category === 'shopping' ? '🛍️' : '🏷️'}
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-primary drop-shadow-md">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: scene.currency }).format(scene.amount)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {scene.type === 'summary' && (
                    <div className="w-full max-w-[320px] mx-auto animate-in zoom-in-90 duration-700">
                        <TripStoryCard trip={trip} expenses={expenses} />
                        <div className="mt-8 text-center space-y-4">
                            <p className="text-white font-black text-xl italic font-heading">"Memories are priceless."</p>
                            <div className="flex justify-center gap-2">
                                <button className="px-6 py-3 bg-white text-black font-black rounded-full text-sm active:scale-95 transition-transform">
                                    Share Memory
                                </button>
                                <button className="px-6 py-3 bg-white/10 text-white font-black rounded-full text-sm border border-white/20 active:scale-95 transition-transform">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto-play Toast Tip */}
            {currentScene === 0 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] z-50">
                    Tap edges to navigate
                </div>
            )}
        </div>
    );
}
