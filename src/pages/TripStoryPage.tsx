import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { TripStoryCard } from '../components/TripStoryCard';
import { ArrowLeft, Share, Download, Sparkles } from 'lucide-react';

export function TripStoryPage() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();
    const { trips, getTripExpenses } = useStorage();

    const trip = trips.find(t => t.id === tripId);

    if (!trip) return <div>Trip not found</div>;

    const expenses = getTripExpenses(trip.id);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-dark via-black to-black opacity-80" />
            <div className="absolute top-0 right-0 p-64 bg-primary rounded-full blur-[150px] opacity-20 animate-pulse" />
            <div className="absolute bottom-0 left-0 p-48 bg-accent rounded-full blur-[120px] opacity-10" />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="text-white/80 font-heading text-sm uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-accent" />
                    Trip Story
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Main Card Container - Reduced width to prevent overlap */}
            <div className="w-full max-w-[320px] z-10 animate-in zoom-in-95 duration-700 fade-in slide-in-from-bottom-10">
                <div className="relative group">
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-[32px] blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

                    <div className="relative">
                        <TripStoryCard trip={trip} expenses={expenses} />
                    </div>
                </div>

                <p className="text-center text-white/40 text-sm mt-8 font-medium animate-pulse mb-8">
                    Nori 旅程回憶卡
                </p>
            </div>

            {/* Action Bar */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 z-20 px-8">
                <button className="flex-1 max-w-[160px] py-4 bg-white text-black font-bold rounded-[24px] shadow-lg shadow-white/10 active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-gray-50">
                    <Share size={20} />
                    <span>分享</span>
                </button>
                <button className="flex-1 max-w-[160px] py-4 bg-white/10 backdrop-blur-md text-white font-bold rounded-[24px] border border-white/20 active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-white/20">
                    <Download size={20} />
                    <span>儲存圖片</span>
                </button>
            </div>
        </div>
    );
}
