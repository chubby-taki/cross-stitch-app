import { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Sun, Contrast, Palette } from 'lucide-react';

const ImageAdjuster = ({ imageSrc, onComplete, onCancel }) => {
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);

    useEffect(() => {
        if (imageSrc && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Set canvas size
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Apply transformations
                ctx.save();
                
                // Translate to center for rotation
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                
                // Apply flip
                const scaleX = flipHorizontal ? -1 : 1;
                const scaleY = flipVertical ? -1 : 1;
                ctx.scale(scaleX, scaleY);
                
                // Translate back
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                
                // Draw image
                ctx.drawImage(img, 0, 0);
                
                // Apply filters
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    // Brightness
                    data[i] = Math.min(255, Math.max(0, data[i] * (brightness / 100)));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * (brightness / 100)));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * (brightness / 100)));
                    
                    // Contrast
                    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
                    
                    // Saturation
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const satFactor = saturation / 100;
                    data[i] = Math.min(255, Math.max(0, gray + satFactor * (data[i] - gray)));
                    data[i + 1] = Math.min(255, Math.max(0, gray + satFactor * (data[i + 1] - gray)));
                    data[i + 2] = Math.min(255, Math.max(0, gray + satFactor * (data[i + 2] - gray)));
                }
                
                ctx.putImageData(imageData, 0, 0);
                ctx.restore();
            };
            
            img.src = imageSrc;
            imageRef.current = img;
        }
    }, [imageSrc, brightness, contrast, saturation, rotation, flipHorizontal, flipVertical]);

    const handleApply = () => {
        if (canvasRef.current) {
            const adjustedImage = canvasRef.current.toDataURL('image/png');
            onComplete(adjustedImage);
        }
    };

    const handleReset = () => {
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
    };

    if (!imageSrc) return <div className="text-red-500">画像がありません</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 bg-orange-50/50 rounded-[2rem] overflow-auto p-6 border border-orange-100/50 flex items-center justify-center min-h-[400px]">
                <div className="max-w-full max-h-full">
                    <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-[500px] object-contain shadow-2xl rounded-2xl border-4 border-white"
                        style={{ display: 'block' }}
                    />
                </div>
            </div>

            <div className="mt-6 space-y-4">
                {/* Brightness */}
                <div className="bg-white p-4 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4 text-[#ff8a65]" />
                        <label className="text-sm font-bold text-[#4e342e]">明るさ</label>
                        <span className="ml-auto text-xs text-orange-400 font-bold">{brightness}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-[#ff8a65]"
                    />
                </div>

                {/* Contrast */}
                <div className="bg-white p-4 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Contrast className="w-4 h-4 text-[#ff8a65]" />
                        <label className="text-sm font-bold text-[#4e342e]">コントラスト</label>
                        <span className="ml-auto text-xs text-orange-400 font-bold">{contrast}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-[#ff8a65]"
                    />
                </div>

                {/* Saturation */}
                <div className="bg-white p-4 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4 text-[#ff8a65]" />
                        <label className="text-sm font-bold text-[#4e342e]">彩度</label>
                        <span className="ml-auto text-xs text-orange-400 font-bold">{saturation}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-[#ff8a65]"
                    />
                </div>

                {/* Rotation and Flip */}
                <div className="bg-white p-4 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-[#4e342e]">回転・反転</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setRotation((prev) => (prev - 90) % 360)}
                            className="flex-1 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#ff8a65] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            左回転
                        </button>
                        <button
                            onClick={() => setRotation((prev) => (prev + 90) % 360)}
                            className="flex-1 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#ff8a65] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCw className="w-4 h-4" />
                            右回転
                        </button>
                        <button
                            onClick={() => setFlipHorizontal(!flipHorizontal)}
                            className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                                flipHorizontal
                                    ? 'bg-[#ff8a65] text-white'
                                    : 'bg-orange-50 hover:bg-orange-100 text-[#ff8a65]'
                            }`}
                        >
                            <FlipHorizontal className="w-4 h-4" />
                            左右反転
                        </button>
                        <button
                            onClick={() => setFlipVertical(!flipVertical)}
                            className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                                flipVertical
                                    ? 'bg-[#ff8a65] text-white'
                                    : 'bg-orange-50 hover:bg-orange-100 text-[#ff8a65]'
                            }`}
                        >
                            <FlipVertical className="w-4 h-4" />
                            上下反転
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-6 py-3 bg-orange-50 hover:bg-orange-100 text-orange-400 rounded-xl font-bold text-sm transition-colors"
                    >
                        リセット
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-white hover:bg-orange-50 text-orange-300 rounded-xl font-bold text-sm transition-colors border border-orange-100 flex items-center justify-center"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-6 py-3 bg-[#ff8a65] hover:bg-[#ff7043] text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        適用
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageAdjuster;
