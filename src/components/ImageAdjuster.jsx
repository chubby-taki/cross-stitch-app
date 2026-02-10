import { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Sun, Contrast, Palette, Focus, Wand2 } from 'lucide-react';

// Sharpness filter using unsharp mask
const applySharpness = (imageData, amount) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new ImageData(width, height);
    const outputData = output.data;

    // Copy original data first
    outputData.set(data);

    // Simple sharpening kernel
    const weight = amount;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                const center = data[idx + c];
                const top = data[((y - 1) * width + x) * 4 + c];
                const bottom = data[((y + 1) * width + x) * 4 + c];
                const left = data[(y * width + (x - 1)) * 4 + c];
                const right = data[(y * width + (x + 1)) * 4 + c];

                const sharp = center * (1 + 4 * weight) - (top + bottom + left + right) * weight;
                outputData[idx + c] = Math.min(255, Math.max(0, sharp));
            }
        }
    }

    return output;
};

const ImageAdjuster = ({ imageSrc, onComplete, onCancel }) => {
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [sharpness, setSharpness] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const previewImgRef = useRef(null);

    // Load image
    useEffect(() => {
        if (imageSrc) {
            const img = new Image();
            img.onload = () => {
                imageRef.current = img;
            };
            img.src = imageSrc;
        }
    }, [imageSrc]);

    const handleApply = () => {
        if (!imageRef.current) {
            console.error('Image not loaded');
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;

        // Determine canvas size based on rotation
        const isRotated = rotation % 180 !== 0;
        canvas.width = isRotated ? img.height : img.width;
        canvas.height = isRotated ? img.width : img.height;

        // Step 1: Apply transformations (rotation, flip)
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        // Apply flip
        const scaleX = flipHorizontal ? -1 : 1;
        const scaleY = flipVertical ? -1 : 1;
        ctx.scale(scaleX, scaleY);

        // Draw image
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Step 2: Apply color adjustments using CSS filters
        if (brightness !== 100 || contrast !== 100 || saturation !== 100) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // Step 3: Apply sharpness if needed
        if (sharpness > 0) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const sharpened = applySharpness(imageData, sharpness / 100);
            ctx.putImageData(sharpened, 0, 0);
        }

        // Convert to data URL and complete
        const adjustedImage = canvas.toDataURL('image/png');
        onComplete(adjustedImage);
    };

    const handleReset = () => {
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setSharpness(0);
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
    };

    const handleAutoAdjust = () => {
        // 写真を鮮やかで明るく見せる推奨設定
        setBrightness(110);    // 少し明るく
        setContrast(115);      // コントラストを強調
        setSaturation(120);    // 彩度を上げて鮮やかに
        setSharpness(30);      // 少しシャープに
    };

    // Calculate transform style for preview
    const getTransformStyle = () => {
        const transforms = [];
        if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
        if (flipHorizontal) transforms.push('scaleX(-1)');
        if (flipVertical) transforms.push('scaleY(-1)');
        return transforms.join(' ');
    };

    if (!imageSrc) return <div className="text-red-500">画像がありません</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 bg-orange-50/50 rounded-[2rem] overflow-auto p-6 border border-orange-100/50 flex items-center justify-center min-h-[400px]">
                <div className="max-w-full max-h-full">
                    <img
                        ref={previewImgRef}
                        src={imageSrc}
                        alt="Preview"
                        className="max-w-full max-h-[500px] object-contain shadow-2xl rounded-2xl border-4 border-white"
                        style={{
                            filter: `brightness(${brightness}%) contrast(${contrast + sharpness * 0.3}%) saturate(${saturation}%)`,
                            transform: getTransformStyle(),
                            transition: 'filter 0.1s ease-out, transform 0.2s ease-out',
                        }}
                    />
                    {/* Hidden canvas for final output */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
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

                {/* Sharpness */}
                <div className="bg-white p-4 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Focus className="w-4 h-4 text-[#ff8a65]" />
                        <label className="text-sm font-bold text-[#4e342e]">シャープネス</label>
                        <span className="ml-auto text-xs text-orange-400 font-bold">{sharpness}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={sharpness}
                        onChange={(e) => setSharpness(Number(e.target.value))}
                        className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-[#ff8a65]"
                    />
                </div>

                {/* Auto Adjust Button */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
                    <button
                        onClick={handleAutoAdjust}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                    >
                        <Wand2 className="w-4 h-4" />
                        自動補正
                    </button>
                    <p className="text-xs text-purple-600 mt-2 text-center">写真を鮮やかで明るく自動調整</p>
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
