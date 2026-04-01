import { Home, Map, Camera, PieChart, User } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useStorage } from '../context/StorageContext';
import { compressImage } from '../lib/imageUtils';
import { saveImageToDB } from '../lib/db';

export function BottomNav() {
    const { activeTripId, trips } = useStorage();
    const navigate = useNavigate();

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const result = reader.result as string;
                try {
                    const compressed = await compressImage(result);
                    // Save to DB immediately to avoid passing large state
                    const id = await saveImageToDB(compressed);

                    // Determine target trip
                    const targetTripId = activeTripId || (trips.length > 0 ? trips[0].id : null);

                    if (targetTripId) {
                        navigate(`/trips/${targetTripId}/add-expense?mode=scan`, {
                            state: { scannedImageId: id }  // Pass ID only
                        });
                    } else {
                        navigate('/trips');
                    }
                } catch (error) {
                    console.error("Capture failed", error);
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-xl border-t border-black/5 pb-safe px-2 transition-all">
            <div className="flex justify-around items-center max-w-md mx-auto py-2 pb-2">
                {tabs.map((tab) => {
                    if (tab.isAction) {
                        return (
                            <label key={tab.path} className="relative -top-5 flex flex-col items-center justify-center w-full h-[60px] cursor-pointer active:scale-95 transition-transform">
                                <div className="flex items-center justify-center w-14 h-14 rounded-full shadow-deep bg-accent text-white ring-4 ring-white">
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
                                    isActive ? "text-accent" : "text-text-secondary hover:text-accent/70"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <tab.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                                    <span className="text-[11px] font-bold mt-1">{tab.name}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
