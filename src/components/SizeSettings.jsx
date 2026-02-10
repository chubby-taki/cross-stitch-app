import { useState, useEffect } from 'react';
import { RefreshCw, Ruler } from 'lucide-react';

const FABRIC_COUNTS = [11, 14, 16, 18, 20, 22, 25, 28, 32];

// Common Physical Sizes in cm
const COMMON_SIZES = [
    { name: 'A4', width: 21, height: 29.7 },
    { name: 'A5', width: 14.8, height: 21 },
    { name: 'ハガキ (Postcard)', width: 10, height: 14.8 },
    { name: '刺繍枠 10cm', width: 10, height: 10 },
    { name: '刺繍枠 12cm', width: 12, height: 12 },
    { name: '刺繍枠 15cm', width: 15, height: 15 },
    { name: 'カスタム', width: 0, height: 0 },
];

const SizeSettings = ({ image, settings, onChange }) => {
    // settings: { count: 14, widthCm: 21, heightCm: 29.7, maxColors: 50, lockRatio: true }

    const [aspectRatio, setAspectRatio] = useState(1);
    const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'

    useEffect(() => {
        if (image) {
            setAspectRatio(image.width / image.height);
        }
    }, [image]);

    const handleSizeChange = (key, value) => {
        const newSettings = { ...settings, [key]: value };

        // Auto-calculate other dimension if locked AND we have an image context (Step 3)
        // In Step 2 (Settings first), we might not want to lock ratio to image since image isn't cropped yet?
        // Actually in Step 2 we define the TARGET ratio. So lockRatio just means "keep the current width/height ratio".

        if (settings.lockRatio && aspectRatio && image) {
            // logic if image exists
            if (key === 'widthCm') {
                newSettings.heightCm = parseFloat((value / aspectRatio).toFixed(1));
            } else if (key === 'heightCm') {
                newSettings.widthCm = parseFloat((value * aspectRatio).toFixed(1));
            }
        }

        onChange(newSettings);
    };

    const handlePresetChange = (e) => {
        const idx = e.target.value;
        if (idx === "") return;
        const preset = COMMON_SIZES[idx];
        if (preset.name === 'カスタム') return;

        // Apply preset based on orientation
        let w = preset.width;
        let h = preset.height;

        if (orientation === 'landscape') {
            // Swap if landscape
            // A4 Landscape is 29.7 width
            // But preset is defined as 21 width (A4) usually implies Portrait dimensions in array?
            // Let's assume presets are stored loosely.
            // If preset.width < preset.height (Portrait stored), and we want Landscape, swap.
            if (w < h) {
                const temp = w; w = h; h = temp;
            }
        } else {
            // Portrait
            if (w > h) {
                const temp = w; w = h; h = temp;
            }
        }

        onChange({
            ...settings,
            widthCm: parseFloat(w.toFixed(1)),
            heightCm: parseFloat(h.toFixed(1))
        });
    };

    const toggleOrientation = () => {
        const newOd = orientation === 'portrait' ? 'landscape' : 'portrait';
        setOrientation(newOd);
        // Swap current W H
        onChange({
            ...settings,
            widthCm: settings.heightCm,
            heightCm: settings.widthCm
        });
    };

    // Calculate generic Stitches
    // 1 inch = 2.54 cm
    const stitchesW = Math.round((settings.widthCm / 2.54) * settings.count);
    const stitchesH = Math.round((settings.heightCm / 2.54) * settings.count);

    return (
        <div className="space-y-8 font-bold text-[#4e342e]">

            {/* Fabric Count */}
            <div>
                <label className="block text-sm mb-3 opacity-70">布のカウント数 (ct)</label>
                <div className="grid grid-cols-5 gap-2">
                    {FABRIC_COUNTS.map(ct => (
                        <button
                            key={ct}
                            onClick={() => onChange({ ...settings, count: ct })}
                            className={`py-2 px-1 text-xs rounded-xl border-2 transition-all ${settings.count === ct
                                ? 'bg-[#ff8a65] text-white border-[#ff8a65] shadow-lg shadow-orange-100 scale-105'
                                : 'bg-white text-orange-200 border-orange-50 hover:border-orange-100'
                                }`}
                        >
                            {ct}
                        </button>
                    ))}
                </div>
            </div>

            {/* Physical Size */}
            <div className="space-y-4">
                <label className="block text-sm opacity-70">完成サイズを設定</label>

                <div className="flex flex-col gap-3">
                    <select
                        className="w-full p-3 bg-orange-50/50 border-2 border-orange-100/50 rounded-2xl text-sm focus:outline-none focus:border-[#ff8a65] transition-colors"
                        onChange={handlePresetChange}
                        defaultValue=""
                    >
                        <option value="" disabled>標準サイズから選ぶ</option>
                        {COMMON_SIZES.map((s, idx) => (
                            <option key={s.name} value={idx}>{s.name} {s.width > 0 ? `(${s.width}x${s.height}cm)` : ''}</option>
                        ))}
                    </select>

                    <button
                        onClick={toggleOrientation}
                        className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-orange-100 rounded-2xl text-xs hover:bg-orange-50 transition-colors text-orange-400"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {orientation === 'portrait' ? '縦向きにする' : '横向きにする'}
                    </button>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-orange-300 uppercase tracking-widest pl-2">幅 (cm)</label>
                        <input
                            type="number"
                            value={settings.widthCm}
                            onChange={(e) => handleSizeChange('widthCm', parseFloat(e.target.value))}
                            className="w-full p-3 bg-white border-2 border-orange-50 rounded-2xl focus:border-[#ff8a65] focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-orange-300 uppercase tracking-widest pl-2">高さ (cm)</label>
                        <input
                            type="number"
                            value={settings.heightCm}
                            onChange={(e) => handleSizeChange('heightCm', parseFloat(e.target.value))}
                            className="w-full p-3 bg-white border-2 border-orange-50 rounded-2xl focus:border-[#ff8a65] focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-2">
                    <input
                        type="checkbox"
                        id="lockRatio"
                        checked={settings.lockRatio}
                        onChange={(e) => onChange({ ...settings, lockRatio: e.target.checked })}
                        className="w-4 h-4 rounded-lg border-2 border-orange-200 text-[#ff8a65] focus:ring-[#ff8a65]"
                    />
                    <label htmlFor="lockRatio" className="text-xs text-orange-400">比率を固定して調整</label>
                </div>

                {/* Calculated Result */}
                <div className="mt-6 bg-[#ff8a65] p-5 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-xl shadow-orange-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                        <Ruler className="w-16 h-16 rotate-45" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Stitches Count</span>
                    <span className="text-2xl font-black">
                        {stitchesW} <span className="text-sm font-medium opacity-60">×</span> {stitchesH}
                    </span>
                    <span className="text-[10px] mt-1 opacity-60 italic">Approx. {stitchesW * stitchesH} total stitches</span>
                </div>
            </div>

            {/* Color Settings */}
            <div className="space-y-4">
                <div className="flex justify-between items-center pl-2">
                    <label className="text-sm opacity-70">刺繍糸の最大色数</label>
                    <span className="bg-orange-100 text-[#ff8a65] px-3 py-1 rounded-full text-xs font-black">{settings.maxColors} 色</span>
                </div>
                <input
                    type="range"
                    min="2"
                    max="100"
                    value={settings.maxColors}
                    onChange={(e) => onChange({ ...settings, maxColors: parseInt(e.target.value) })}
                    className="w-full accent-[#ff8a65] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-orange-200 font-bold px-1">
                    <span>SIMPLE (2)</span>
                    <span>DETAILED (100)</span>
                </div>
            </div>

        </div>
    );
};

export default SizeSettings;
