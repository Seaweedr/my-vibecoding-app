import { useState, useRef, useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';

export function CapturePage() {
    const navigate = useNavigate();
    const { trips, activeTripId } = useStorage();
    const [isScanning, setIsScanning] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Initialize Camera
    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                if (mounted) {
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                if (mounted) {
                    setError("無法存取相機，請檢查權限或使用相簿上傳");
                }
            }
        };

        startCamera();

        return () => {
            mounted = false;
            // Cleanup stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        setIsScanning(true);

        // Optional: Flash effect or freeze video
        if (videoRef.current) {
            videoRef.current.pause();
        }

        // Simulate OCR processing
        setTimeout(() => {
            const targetTripId = activeTripId || (trips.length > 0 ? trips[0].id : null);

            // Clean up camera before navigating
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            if (targetTripId) {
                navigate(`/trips/${targetTripId}/add-expense?mode=scan`);
            } else {
                navigate('/trips');
            }
        }, 1000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Logic to handle file upload
            handleCapture(); // Re-use the nav logic for now, in real app pass the file
        }
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between pb-safe">
            {/* Camera Feed */}
            {stream && (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-center text-white z-10">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                    <X size={24} />
                </button>
                <div className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-xs font-medium backdrop-brightness-75">
                    {error ? '相機無法使用' : '正在辨識商品明細...'}
                </div>
                <button className="p-2 rounded-full bg-black/20 backdrop-blur-md opacity-50">
                    <Zap size={24} />
                </button>
            </div>

            {/* Viewfinder/Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!stream && !error && (
                    <div className="text-white/20 text-9xl font-bold opacity-10 select-none">
                        LOADING
                    </div>
                )}

                {error && (
                    <div className="text-white text-center p-8 bg-black/50 rounded-xl backdrop-blur-md">
                        <p>{error}</p>
                    </div>
                )}

                {/* Frame */}
                {stream && (
                    <div className="w-64 h-96 border-2 border-white/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>

                        {isScanning && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_#5C9DF2] animate-[scan_1.5s_infinite_linear]"></div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="w-full p-8 flex justify-center items-center gap-8 z-10 bg-gradient-to-t from-black/80 to-transparent">
                {/* Gallery Button - Now Functional */}
                <label className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                    <div className="w-10 h-10 bg-gray-200/20 rounded-full overflow-hidden" />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>

                <button
                    onClick={handleCapture}
                    disabled={!!error}
                    className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg active:scale-95 transition-transform flex items-center justify-center relative disabled:opacity-50"
                >
                    <div className="w-16 h-16 bg-white rounded-full border-2 border-black" />
                </button>

                <div className="w-12 h-12" /> {/* Spacer */}
            </div>
        </div>
    );
}
