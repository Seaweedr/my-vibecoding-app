import { useState, useRef, useEffect } from 'react';
import { X, Zap, Loader2, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { scanReceipt, type ScanResult } from '../lib/ocr';

export function CapturePage() {
    const navigate = useNavigate();
    const { trips, activeTripId } = useStorage();
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize Camera
    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
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

    // Capture image from video and process with OCR
    const captureAndScan = async (imageSource: string) => {
        setIsScanning(true);
        setScanProgress('正在辨識收據...');

        try {
            // Run OCR
            const result: ScanResult = await scanReceipt(imageSource);

            console.log('OCR Result:', result);
            setScanProgress('辨識完成!');

            // Clean up camera before navigating
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const targetTripId = activeTripId || (trips.length > 0 ? trips[0].id : null);

            if (targetTripId) {
                // Pass OCR result via navigation state
                navigate(`/trips/${targetTripId}/add-expense`, {
                    state: {
                        mode: 'scan',
                        scanResult: result,
                        receiptImage: imageSource
                    }
                });
            } else {
                navigate('/trips');
            }
        } catch (err) {
            console.error('OCR Error:', err);
            setError('辨識失敗，請重試或手動輸入');
            setIsScanning(false);
            setScanProgress('');

            // Resume video if it was paused
            if (videoRef.current) {
                videoRef.current.play();
            }
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

        // Pause video for visual feedback
        video.pause();

        // Process with OCR
        captureAndScan(imageDataUrl);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                if (event.target?.result) {
                    captureAndScan(event.target.result as string);
                }
            };

            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between pb-safe">
            {/* Hidden canvas for capturing image */}
            <canvas ref={canvasRef} className="hidden" />

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
                <button
                    onClick={() => {
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                        }
                        navigate(-1);
                    }}
                    className="p-2 rounded-full bg-black/20 backdrop-blur-md"
                    disabled={isScanning}
                >
                    <X size={24} />
                </button>
                <div className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-xs font-medium backdrop-brightness-75 flex items-center gap-2">
                    {isScanning && <Loader2 size={14} className="animate-spin" />}
                    {error ? '相機無法使用' : isScanning ? scanProgress : '對準收據拍攝'}
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
                        <button
                            onClick={() => setError(null)}
                            className="mt-4 px-5 py-2.5 bg-accent text-white rounded-full pointer-events-auto font-bold"
                        >
                            重試
                        </button>
                    </div>
                )}

                {/* Frame */}
                {stream && !error && (
                    <div className="w-64 h-96 border-2 border-white/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>

                        {isScanning && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-accent shadow-[0_0_15px_#ff6900] animate-[scan_1.5s_infinite_linear]"></div>
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
                        disabled={isScanning}
                    />
                </label>

                <button
                    onClick={handleCapture}
                    disabled={!!error || isScanning}
                    className="relative active:scale-95 transition-transform disabled:opacity-50 group"
                >
                    <div className="w-20 h-20 bg-accent text-white rounded-full flex items-center justify-center shadow-deep ring-4 ring-white/20 transition-all group-hover:scale-105 group-active:scale-90">
                        {isScanning ? (
                            <Loader2 size={36} className="text-white animate-spin" />
                        ) : (
                            <Camera size={36} className="text-white" />
                        )}
                    </div>
                </button>

                <div className="w-12 h-12" /> {/* Spacer */}
            </div>
        </div>
    );
}
