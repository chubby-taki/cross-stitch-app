import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Settings, ArrowRight, Scissors, Ruler, CheckCircle, FileJson, RotateCcw } from 'lucide-react';
import { processImage } from '../utils/imageProcessing';
import { generatePDF } from '../utils/pdfGenerator';
import ImageCropper from './ImageCropper';
import SizeSettings from './SizeSettings';
import ErrorBoundary from './ErrorBoundary';
import ImageAdjuster from './ImageAdjuster';

// Step definitions
const STEPS = [
    { id: 1, name: 'アップロード', icon: Upload },
    { id: 2, name: '画像調整', icon: ImageIcon },
    { id: 3, name: 'サイズ設定', icon: Ruler },
    { id: 4, name: '切り取り', icon: Scissors },
    { id: 5, name: '図案作成', icon: CheckCircle },
];

const CreatorDashboard = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [originalImage, setOriginalImage] = useState(null); // The raw upload
    const [croppedImage, setCroppedImage] = useState(null);   // The cropped version
    const [processedData, setProcessedData] = useState(null); // Pattern data
    const [previewMode, setPreviewMode] = useState('color'); // 'color' | 'symbol'

    // Settings State
    const [settings, setSettings] = useState({
        count: 14,
        widthCm: 15.0,
        heightCm: 15.0,
        lockRatio: false,
        maxColors: 40
    });

    // Session Persistence: Load on Mount
    useEffect(() => {
        const savedSession = localStorage.getItem('creator_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.originalImage) setOriginalImage(session.originalImage);
                if (session.croppedImage) setCroppedImage(session.croppedImage);
                if (session.processedData) setProcessedData(session.processedData);
                if (session.settings) setSettings(session.settings);
                if (session.previewMode) setPreviewMode(session.previewMode);
                if (session.currentStep) setCurrentStep(session.currentStep);
            } catch (e) {
                console.error("Failed to restore session", e);
                localStorage.removeItem('creator_session');
            }
        }
    }, []);

    // Session Persistence: Save on Change
    useEffect(() => {
        if (currentStep === 1 && !originalImage) return;

        const session = {
            currentStep,
            originalImage,
            croppedImage,
            processedData,
            settings,
            previewMode
        };

        try {
            localStorage.setItem('creator_session', JSON.stringify(session));
        } catch (e) {
            console.error("Failed to save session (likely too large)", e);
        }
    }, [currentStep, originalImage, croppedImage, processedData, settings, previewMode]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                localStorage.removeItem('creator_session');
                setCroppedImage(null);
                setProcessedData(null);
                setOriginalImage(event.target.result);
                setCurrentStep(2); // Go to Adjust step
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReset = () => {
        if (confirm('現在の作業をリセットして新しい画像をアップロードしますか？')) {
            localStorage.removeItem('creator_session');
            setOriginalImage(null);
            setCroppedImage(null);
            setProcessedData(null);
            setCurrentStep(1);
            setSettings({
                count: 14,
                widthCm: 15.0,
                heightCm: 15.0,
                lockRatio: false,
                maxColors: 40
            });
        }
    };

    const handleSettingsConfirm = () => {
        setCurrentStep(4); // Move to Crop step
    };

    const handleCropComplete = (croppedImgObj) => {
        setCroppedImage(croppedImgObj);
        setTimeout(() => triggerProcess(croppedImgObj), 100);
    };

    const handleExport = () => {
        if (!processedData) return;

        const exportData = {
            metadata: {
                widthCm: settings.widthCm,
                heightCm: settings.heightCm,
                count: settings.count,
                colors: processedData.palette.length,
                created: new Date().toISOString(),
            },
            pattern: {
                width: processedData.width,
                height: processedData.height,
                grid: processedData.grid,
                palette: processedData.palette
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cross-stitch-pattern.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = async () => {
        if (!processedData) return;

        const canvas = document.createElement('canvas');
        canvas.width = processedData.width;
        canvas.height = processedData.height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        processedData.grid.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            });
        });

        const previewImage = canvas.toDataURL('image/png');

        const exportData = {
            metadata: {
                widthCm: settings.widthCm,
                heightCm: settings.heightCm,
                count: settings.count,
                colors: processedData.palette.length,
                created: new Date().toISOString(),
            },
            pattern: {
                width: processedData.width,
                height: processedData.height,
                grid: processedData.grid,
                palette: processedData.palette
            },
            previewImage: previewImage
        };
        try {
            await generatePDF(exportData, 'creator');
        } catch (error) {
            console.error(error);
            alert("PDF generation failed: " + error.message);
        }
    };

    const triggerProcess = (imgToProcess) => {
        if (!imgToProcess) return;

        const stitchesW = Math.round((settings.widthCm / 2.54) * settings.count);
        const stitchesH = Math.round((settings.heightCm / 2.54) * settings.count);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = stitchesW;
        tempCanvas.height = stitchesH;
        const ctx = tempCanvas.getContext('2d');

        ctx.drawImage(imgToProcess, 0, 0, stitchesW, stitchesH);
        const result = processImage(ctx, stitchesW, stitchesH, settings.maxColors);

        setProcessedData(result);
        setCurrentStep(5); // Move to Preview step
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Reset Button */}
            {originalImage && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-orange-50 text-orange-500 rounded-xl font-bold text-sm transition-colors border border-orange-200 shadow-sm"
                    >
                        <RotateCcw className="w-4 h-4" />
                        新しい画像をアップロード
                    </button>
                </div>
            )}

            {/* Progress Stepper */}
            <div className="mb-12">
                <div className="flex items-center justify-between relative max-w-4xl mx-auto">
                    <div className="absolute left-0 top-6 -translate-y-1/2 w-full h-0.5 bg-orange-100 -z-10" />
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = currentStep >= step.id;
                        const isCurrent = currentStep === step.id;
                        const canNavigate = (step.id === 1) || (step.id === 2 && originalImage) ||
                                          (step.id === 3 && originalImage) ||
                                          (step.id === 4 && originalImage) ||
                                          (step.id === 5 && processedData);

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center flex-1"
                                onClick={() => canNavigate && setCurrentStep(step.id)}
                                style={{ cursor: canNavigate ? 'pointer' : 'default' }}
                            >
                                <div className={`step-indicator ${isActive ? 'step-indicator-active' : 'step-indicator-inactive'} mb-3 transition-transform ${canNavigate ? 'hover:scale-110' : ''}`}>
                                    <Icon className={`w-5 h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#ff8a65]' : 'text-orange-200'}`}>
                                    {step.name}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-[#4e342e]">

                {/* Left Panel: Content dependent on step */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-orange-100/50 border border-orange-50 p-6 min-h-[550px] flex flex-col">

                        {currentStep === 1 && (
                            <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-orange-50 rounded-[2rem] hover:bg-orange-50/50 cursor-pointer relative transition-all group overflow-hidden">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="bg-orange-100 p-8 rounded-[2.5rem] mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-orange-100">
                                    <Upload className="w-12 h-12 text-[#ff8a65]" />
                                </div>
                                <h3 className="text-2xl font-black">写真をアップロード</h3>
                                <p className="text-orange-300 font-bold mt-2 uppercase tracking-widest text-xs">Pet, Flower, House Photography</p>

                                <div className="mt-8 flex gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-orange-400 bg-white px-3 py-1.5 rounded-full border border-orange-50 shadow-sm">
                                        <CheckCircle className="w-3 h-3 text-orange-400" /> JPG / PNG
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-orange-400 bg-white px-3 py-1.5 rounded-full border border-orange-50 shadow-sm">
                                        <CheckCircle className="w-3 h-3 text-orange-400" /> Max 10MB
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && originalImage && (
                            <ImageAdjuster
                                imageSrc={originalImage}
                                onComplete={(adjustedImg) => {
                                    setOriginalImage(adjustedImg);
                                    setCurrentStep(3);
                                }}
                                onCancel={() => setCurrentStep(1)}
                            />
                        )}

                        {currentStep === 3 && originalImage && (
                            <div className="flex flex-col items-center justify-center h-full bg-orange-50/30 rounded-[2rem] p-8 border border-orange-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <ImageIcon className="w-64 h-64 text-orange-300" />
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-orange-200/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <img
                                        src={originalImage}
                                        alt="Original"
                                        className="relative max-w-full max-h-[400px] object-contain shadow-2xl rounded-2xl border-4 border-white"
                                    />
                                </div>
                                <p className="text-orange-400 font-bold mt-8 text-sm flex items-center gap-2">
                                    <Settings className="w-4 h-4 animate-spin-slow" /> 右側のパネルで、完成時のサイズと布のカウント数を設定しましょう
                                </p>
                            </div>
                        )}

                        {currentStep === 4 && originalImage && (
                            <ErrorBoundary>
                                <ImageCropper
                                    imageSrc={originalImage}
                                    aspect={(settings.widthCm && settings.heightCm) ? settings.widthCm / settings.heightCm : 1}
                                    onCropComplete={handleCropComplete}
                                    onCancel={() => setCurrentStep(3)}
                                />
                            </ErrorBoundary>
                        )}

                        {currentStep === 5 && processedData && (
                            <div className="flex flex-col h-full">
                                <div className="flex justify-center p-3 bg-orange-50/30 border-b border-orange-100/50">
                                    <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-orange-100/50">
                                        <button
                                            onClick={() => setPreviewMode('color')}
                                            className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${previewMode === 'color' ? 'bg-[#ff8a65] text-white shadow-lg shadow-orange-200' : 'text-orange-300 hover:text-[#ff8a65]'}`}
                                        >
                                            カラー表示
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('symbol')}
                                            className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${previewMode === 'symbol' ? 'bg-[#ff8a65] text-white shadow-lg shadow-orange-200' : 'text-orange-300 hover:text-[#ff8a65]'}`}
                                        >
                                            記号表示
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto bg-orange-50/20 flex items-center justify-center p-8">
                                    <canvas
                                        ref={(el) => {
                                            if (el && processedData) {
                                                const ctx = el.getContext('2d');
                                                if (previewMode === 'color') {
                                                    el.width = processedData.width;
                                                    el.height = processedData.height;
                                                    el.style.width = '100%';
                                                    el.style.height = 'auto';
                                                    el.style.maxWidth = '600px';
                                                    el.style.imageRendering = 'pixelated';
                                                    processedData.grid.forEach((row, y) => {
                                                        row.forEach((color, x) => {
                                                            if (color) {
                                                                ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                                                                ctx.fillRect(x, y, 1, 1);
                                                            } else {
                                                                ctx.clearRect(x, y, 1, 1);
                                                            }
                                                        });
                                                    });
                                                } else {
                                                    const cellSize = 15;
                                                    const rulerSize = 25;
                                                    el.width = processedData.width * cellSize + rulerSize;
                                                    el.height = processedData.height * cellSize + rulerSize;
                                                    el.style.width = 'auto';
                                                    el.style.height = 'auto';
                                                    el.style.maxWidth = 'none';
                                                    el.style.imageRendering = 'auto';
                                                    ctx.fillStyle = '#ffffff';
                                                    ctx.fillRect(0, 0, el.width, el.height);
                                                    ctx.fillStyle = '#fff7ed';
                                                    ctx.fillRect(0, 0, el.width, rulerSize);
                                                    ctx.fillRect(0, 0, rulerSize, el.height);
                                                    ctx.font = 'bold 9px sans-serif';
                                                    ctx.textAlign = 'center';
                                                    ctx.textBaseline = 'middle';
                                                    processedData.grid.forEach((row, y) => {
                                                        row.forEach((color, x) => {
                                                            const px = x * cellSize + rulerSize;
                                                            const py = y * cellSize + rulerSize;
                                                            ctx.strokeStyle = '#ffedd5';
                                                            ctx.lineWidth = 0.5;
                                                            ctx.strokeRect(px, py, cellSize, cellSize);
                                                            if (color) {
                                                                ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                                                                ctx.fillText(color.symbol || '?', px + cellSize / 2, py + cellSize / 2);
                                                            }
                                                        });
                                                    });
                                                    ctx.strokeStyle = '#fdba74';
                                                    ctx.lineWidth = 1;
                                                    for (let x = 0; x <= processedData.width; x++) {
                                                        const px = x * cellSize + rulerSize;
                                                        if (x > 0 && x % 10 === 0) {
                                                            ctx.beginPath();
                                                            ctx.moveTo(px, 0);
                                                            ctx.lineTo(px, el.height);
                                                            ctx.stroke();
                                                            ctx.fillStyle = '#c2410c';
                                                            ctx.fillText(x, px, rulerSize / 2);
                                                        }
                                                    }
                                                    for (let y = 0; y <= processedData.height; y++) {
                                                        const py = y * cellSize + rulerSize;
                                                        if (y > 0 && y % 10 === 0) {
                                                            ctx.beginPath();
                                                            ctx.moveTo(0, py);
                                                            ctx.lineTo(el.width, py);
                                                            ctx.stroke();
                                                            ctx.fillStyle = '#c2410c';
                                                            ctx.fillText(y, rulerSize / 2, py);
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        className="shadow-2xl bg-white rounded-lg"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Settings & Info */}
                <div className="lg:col-span-1 space-y-6">

                    {currentStep === 3 && (
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-orange-50">
                            <div className="mb-6 pb-6 border-b border-orange-50">
                                <h3 className="text-lg font-black text-[#4e342e]">1. 図案の設定</h3>
                                <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mt-1">Pattern Configuration</p>
                            </div>

                            <SizeSettings
                                image={null}
                                settings={settings}
                                onChange={setSettings}
                            />

                            <button
                                onClick={handleSettingsConfirm}
                                className="w-full mt-8 btn-primary"
                            >
                                次へ：範囲を決める <Scissors className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setCurrentStep(2)}
                                className="w-full mt-3 text-orange-300 hover:text-[#ff8a65] text-sm font-bold transition-colors"
                            >
                                画像調整に戻る
                            </button>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-orange-50">
                            <h3 className="text-lg font-black text-[#4e342e] mb-2">2. 画像の切り取り</h3>
                            <p className="text-sm text-orange-400 mb-6 font-medium leading-relaxed">
                                枠を動かして刺繍したい範囲を選択してください。サイズ ({settings.widthCm}x{settings.heightCm}cm) に合わせて比率が固定されています。
                            </p>
                            <div className="p-4 bg-orange-50 text-orange-600 text-[11px] font-bold rounded-2xl border border-orange-100 leading-normal">
                                ヒント：画像を拡大・縮小して、モチーフが中心に来るように調整すると綺麗に仕上がります。
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && processedData && (
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-orange-50">
                            <h3 className="text-lg font-black text-[#4e342e] mb-6 flex items-center gap-2">
                                <div className="bg-green-100 p-1.5 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                図案の完成！
                            </h3>

                            {/* Editable Settings */}
                            <div className="space-y-6 border-b border-orange-50 pb-6 mb-6">
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-[10px] text-blue-600 font-bold mb-2 flex items-center gap-2">
                                        <Settings className="w-3 h-3" />
                                        設定を変更すると図案が自動更新されます
                                    </p>
                                </div>

                                {/* Size */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-orange-400">完成サイズ (cm)</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            min="5"
                                            max="50"
                                            step="0.5"
                                            value={settings.widthCm}
                                            onChange={(e) => {
                                                const newSettings = { ...settings, widthCm: parseFloat(e.target.value) };
                                                setSettings(newSettings);
                                                if (croppedImage) setTimeout(() => triggerProcess(croppedImage), 300);
                                            }}
                                            className="flex-1 px-3 py-2 border border-orange-200 rounded-xl text-sm font-bold text-[#4e342e] focus:border-[#ff8a65] focus:outline-none"
                                        />
                                        <span className="text-orange-300 font-bold">×</span>
                                        <input
                                            type="number"
                                            min="5"
                                            max="50"
                                            step="0.5"
                                            value={settings.heightCm}
                                            onChange={(e) => {
                                                const newSettings = { ...settings, heightCm: parseFloat(e.target.value) };
                                                setSettings(newSettings);
                                                if (croppedImage) setTimeout(() => triggerProcess(croppedImage), 300);
                                            }}
                                            className="flex-1 px-3 py-2 border border-orange-200 rounded-xl text-sm font-bold text-[#4e342e] focus:border-[#ff8a65] focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Fabric Count */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-xs font-bold text-orange-400">使用する布</label>
                                        <span className="text-[#4e342e] text-xs font-black">{settings.count} ct</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="11"
                                        max="32"
                                        step="1"
                                        value={settings.count}
                                        onChange={(e) => {
                                            const newSettings = { ...settings, count: parseInt(e.target.value) };
                                            setSettings(newSettings);
                                            if (croppedImage) setTimeout(() => triggerProcess(croppedImage), 300);
                                        }}
                                        className="w-full accent-[#ff8a65] cursor-pointer"
                                    />
                                </div>

                                {/* Max Colors */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-xs font-bold text-orange-400">最大色数</label>
                                        <span className="text-[#ff8a65] text-xs font-black">{settings.maxColors} 色</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={settings.maxColors}
                                        onChange={(e) => {
                                            const newSettings = { ...settings, maxColors: parseInt(e.target.value) };
                                            setSettings(newSettings);
                                            if (croppedImage) setTimeout(() => triggerProcess(croppedImage), 300);
                                        }}
                                        className="w-full accent-[#ff8a65] cursor-pointer"
                                    />
                                </div>

                                {/* Current Values Display */}
                                <div className="bg-orange-50/30 p-3 rounded-xl space-y-1 text-[10px]">
                                    <div className="flex justify-between">
                                        <span className="text-orange-400">ステッチ数</span>
                                        <span className="text-[#4e342e] font-bold">
                                            {Math.round((settings.widthCm / 2.54) * settings.count)} × {Math.round((settings.heightCm / 2.54) * settings.count)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-orange-400">実際の色数</span>
                                        <span className="text-[#ff8a65] font-black">{processedData.palette.length} 色</span>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <p className="text-[#4e342e] mb-3 uppercase tracking-tighter">使用する刺繍糸 (DMC)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {processedData.palette.map((colorObj) => (
                                            <span
                                                key={colorObj.code}
                                                className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white text-[10px] rounded-xl border border-orange-100 shadow-sm text-[#4e342e] hover:border-[#ff8a65] transition-colors"
                                                title={colorObj.name}
                                            >
                                                <span className="font-black text-[#ff8a65]">{colorObj.symbol}</span>
                                                <span>{colorObj.code}</span>
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full border border-orange-50 inline-block shadow-inner"
                                                    style={{ backgroundColor: `rgb(${colorObj.r},${colorObj.g},${colorObj.b})` }}
                                                />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full btn-primary"
                                >
                                    <ArrowRight className="w-4 h-4 shadow-sm" /> 印刷用PDFを保存
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="w-full btn-secondary text-xs"
                                >
                                    <FileJson className="w-4 h-4" /> データ保存 (JSON)
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm("作業内容を破棄して最初からやり直しますか？")) {
                                            localStorage.removeItem('creator_session');
                                            window.location.reload();
                                        }
                                    }}
                                    className="w-full mt-4 text-orange-200 hover:text-orange-400 text-[10px] font-black uppercase tracking-widest pt-4"
                                >
                                    最初からやり直す
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Guide Text */}
                    {currentStep === 1 && (
                        <div className="bg-orange-50 p-8 rounded-[2rem] border border-orange-100 text-[#4e342e]">
                            <h4 className="font-black flex items-center gap-2 mb-4">
                                <div className="bg-orange-200 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px]">!</div>
                                使いかた
                            </h4>
                            <p className="text-xs font-medium leading-relaxed opacity-80">
                                お気に入りのペットや、思い出のお家、色鮮やかなお花などの写真をアップロードしてください。AIがあなたの手刺繍のための最適な図案作りをお手伝いします。
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CreatorDashboard;
