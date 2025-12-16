import { Home, Map, Camera, PieChart, User } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useStorage } from '../context/StorageContext';

export function BottomNav() {
    const { activeTripId, trips } = useStorage();
    const navigate = useNavigate();

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Determine target trip
                const targetTripId = activeTripId || (trips.length > 0 ? trips[0].id : null);

                if (targetTripId) {
                    navigate(`/trips/${targetTripId}/add-expense?mode=scan`, {
                        state: { scannedImage: result }
                    });
                } else {
                    navigate('/trips');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const tabs = [
        { name: '首頁', path: '/', icon: Home },
        { name: '旅程', path: '/trips', icon: Map },
        { name: '記錄', path: '/capture', icon: Camera, isPrimary: true, isAction: true },
        { name: '統計', path: '/stats', icon: PieChart },
        { name: '個人', path: '/settings', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-surface/90 backdrop-blur-md border-t border-black/5 pb-safe pt-2 px-2 shadow-lg transition-all">
            <div className="flex justify-between items-center max-w-lg mx-auto">
                {tabs.map((tab) => {
                    if (tab.isAction) {
                        return (
                            <label key={tab.path} className="relative -top-5 flex flex-col items-center justify-center w-full h-[60px] cursor-pointer active:scale-95 transition-transform">
                                <div className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-primary text-white scale-100 ring-4 ring-bg shadow-primary/40">
                                    <tab.icon size={28} className="text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleCameraCapture}
                                />
                            </label>
                        );
                    }

                    return (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex flex-col items-center justify-center w-full h-[60px] transition-all duration-200 active:scale-95",
                                    isActive ? "text-primary" : "text-text-secondary hover:text-primary/70"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[11px] font-medium mt-1">{tab.name}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
