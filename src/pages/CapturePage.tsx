import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';

export function CapturePage() {
    const navigate = useNavigate();
    const { trips, activeTripId } = useStorage();
    const [isScanning, setIsScanning] = useState(false);

    // In a real app, this would show camera feed.
    // Here we just have an overlay.

    const handleCapture = () => {
        setIsScanning(true);
        // Simulate OCR processing
        setTimeout(() => {
            // Find best trip (active, or first upcoming, or just first)
            const targetTripId = activeTripId || (trips.length > 0 ? trips[0].id : null);

            if (targetTripId) {
                navigate(`/trips/${targetTripId}/add-expense?mode=scan`);
            } else {
                // No trips, direct to create trip? Or just manual add for generic?
                // For now, go to trips to create one.
                navigate('/trips');
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between pb-safe">
            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-center text-white z-10">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                    <X size={24} />
                </button>
                <div className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-xs font-medium">
                    正在辨識商品明細...
                </div>
                <button className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                    <Zap size={24} />
                </button>
            </div>

            {/* Viewfinder/Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Simulated feed text */}
                <div className="text-white/20 text-9xl font-bold opacity-10 select-none">
                    CAMERA
                </div>

                {/* Frame */}
                <div className="w-64 h-96 border-2 border-white/50 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>

                    {isScanning && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_#5C9DF2] animate-[scan_1.5s_infinite_linear]"></div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="w-full p-8 flex justify-center items-center gap-8 z-10 bg-gradient-to-t from-black/50 to-transparent">
                <div className="w-12 h-12 bg-gray-200/20 rounded-full" /> {/* Gallery placeholder */}

                <button
                    onClick={handleCapture}
                    className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg active:scale-95 transition-transform flex items-center justify-center relative"
                >
                    <div className="w-16 h-16 bg-white rounded-full border-2 border-black" />
                </button>

                <div className="w-12 h-12" /> {/* Spacer */}
            </div>
        </div>
    );
}
