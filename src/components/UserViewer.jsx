import { useState, useRef, useEffect } from 'react';
import { Upload, FileJson, ZoomIn, ZoomOut, Save, RotateCcw, CheckCircle, Printer } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';

const UserViewer = () => {
    const [pattern, setPattern] = useState(null);
    const [progress, setProgress] = useState(new Set()); // Set of "x,y" strings
    const [scale, setScale] = useState(1);
    const [selectedColor, setSelectedColor] = useState(null); // Filter by color
    const [viewMode, setViewMode] = useState('symbol'); // 'symbol' | 'color'

    const canvasRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragTargetSymbolRef = useRef(null);
    const shouldMarkDoneRef = useRef(true);
    const lastToggledRef = useRef(null);

    // Canvas Drawing Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && pattern) {
            const ctx = canvas.getContext('2d');
            const rulerSize = 20; // Space for rulers
            const cellSize = 20 * scale;
            const width = pattern.pattern.width * cellSize + rulerSize;
            const height = pattern.pattern.height * cellSize + rulerSize;

            canvas.width = width;
            canvas.height = height;

            // Clear
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Draw Ruler Background
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, width, rulerSize);
            ctx.fillRect(0, 0, rulerSize, height);

            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.font = `${12 * scale}px sans-serif`;

            // Draw Grid & Symbols
            pattern.pattern.grid.forEach((row, y) => {
                row.forEach((color, x) => {
                    const px = x * cellSize + rulerSize; // Shift for ruler
                    const py = y * cellSize + rulerSize;

                    // Highlight/Filter logic
                    const isSelected = selectedColor === color?.code;
                    const isDone = progress.has(`${x},${y}`);

                    if (color) {
                        if (viewMode === 'color') {
                            // COLOR MODE: Always show blocks
                            if (selectedColor && color.code !== selectedColor) {
                                // Dimmed (Non-selected)
                                ctx.fillStyle = '#f3f4f6'; // Very light gray
                                ctx.fillRect(px, py, cellSize, cellSize);
                            } else {
                                // Full Color (Selected or All)
                                ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                                ctx.fillRect(px, py, cellSize, cellSize);
                            }
                        } else {
                            // SYMBOL MODE (Existing Logic)
                            if (isDone) {
                                // DONE STATE
                                if (selectedColor === null || isSelected) {
                                    // "Active" Done: Show full color fill (Simulate stitch)
                                    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                                    ctx.fillRect(px, py, cellSize, cellSize);

                                    // Contrast symbol
                                    const brightness = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114);
                                    ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
                                    ctx.fillText(color.symbol || '?', px + cellSize / 2, py + cellSize / 2);
                                } else {
                                    // "Inactive" Done (Other colors when filtering): De-emphasize
                                    // Gray fill, simple gray symbol
                                    ctx.fillStyle = '#e5e7eb'; // Light gray fill (gray-200)
                                    ctx.fillRect(px, py, cellSize, cellSize);

                                    ctx.fillStyle = '#9ca3af'; // Gray text (gray-400)
                                    ctx.fillText(color.symbol || '?', px + cellSize / 2, py + cellSize / 2);
                                }
                            } else {
                                // NOT DONE STATE
                                if (selectedColor === null) {
                                    // No filter: Show all symbols in Dark Gray (Standard Chart Style)
                                    ctx.fillStyle = '#374151'; // gray-700
                                    ctx.fillText(color.symbol || '?', px + cellSize / 2, py + cellSize / 2);
                                } else if (isSelected) {
                                    // Selected Highlight
                                    ctx.fillStyle = '#fff9c4'; // Yellow highlight background
                                    ctx.fillRect(px, py, cellSize, cellSize);

                                    ctx.fillStyle = '#000000'; // Black symbol for contrast
                                    ctx.fillText(color.symbol || '?', px + cellSize / 2, py + cellSize / 2);
                                } else {
                                    // Not selected (Dimmed)
                                    ctx.fillStyle = 'rgba(0,0,0, 0.05)';
                                    ctx.fillText(color.symbol || '?', px + cellSize / 2, py + cellSize / 2);
                                }
                            }
                        }
                    }
                });
            });

            // Draw Grid Lines
            ctx.strokeStyle = '#e5e7eb'; // Light gray
            ctx.lineWidth = 1;

            // Vertical lines
            for (let x = 0; x <= pattern.pattern.width; x++) {
                const px = x * cellSize + rulerSize;
                ctx.beginPath();
                ctx.moveTo(px, rulerSize);
                ctx.lineTo(px, height);
                // Thicker line every 10
                ctx.lineWidth = (x % 10 === 0) ? 2 : 0.5;
                ctx.strokeStyle = (x % 10 === 0) ? '#9ca3af' : '#e5e7eb';
                ctx.stroke();

                // Ruler Numbers (Top)
                if (x > 0 && x % 10 === 0) {
                    ctx.fillStyle = '#374151';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(x, px, rulerSize / 2);
                }
            }

            // Horizontal lines
            for (let y = 0; y <= pattern.pattern.height; y++) {
                const py = y * cellSize + rulerSize;
                ctx.beginPath();
                ctx.moveTo(rulerSize, py);
                ctx.lineTo(width, py);
                // Thicker line every 10
                ctx.lineWidth = (y % 10 === 0) ? 2 : 0.5;
                ctx.strokeStyle = (y % 10 === 0) ? '#9ca3af' : '#e5e7eb';
                ctx.stroke();

                // Ruler Numbers (Left)
                if (y > 0 && y % 10 === 0) {
                    ctx.fillStyle = '#374151';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(y, rulerSize / 2, py);
                }
            }
        }
    }, [pattern, scale, selectedColor, progress, viewMode]);

    // Load progress from local storage when pattern loads
    useEffect(() => {
        if (pattern) {
            // Use a simple ID based on metadata or filename if available, fallback to created date
            const patternId = pattern.metadata?.created || 'unknown-pattern';
            const saved = localStorage.getItem(`progress_${patternId}`);
            if (saved) {
                try {
                    const savedSet = new Set(JSON.parse(saved));
                    setProgress(savedSet);
                } catch (e) {
                    console.error("Failed to load progress", e);
                }
            }
        }
    }, [pattern]);

    // Save progress to local storage
    useEffect(() => {
        if (pattern && progress.size > 0) {
            const patternId = pattern.metadata?.created || 'unknown-pattern';
            localStorage.setItem(`progress_${patternId}`, JSON.stringify(Array.from(progress)));
        }
    }, [progress, pattern]);

    // Load pattern from local storage on mount
    useEffect(() => {
        try {
            const savedPattern = localStorage.getItem('current_pattern');
            if (savedPattern) {
                const parsed = JSON.parse(savedPattern);
                setPattern(parsed);
            }
        } catch (e) {
            console.error("Failed to load saved pattern", e);
        }
    }, []);

    // Save pattern to local storage when it changes
    useEffect(() => {
        if (pattern) {
            try {
                localStorage.setItem('current_pattern', JSON.stringify(pattern));
            } catch (e) {
                console.error("Failed to save pattern", e);
            }
        }
    }, [pattern]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (json.pattern && json.pattern.grid) {
                    setPattern(json);
                } else {
                    alert("無効な図案ファイルです。");
                }
            } catch (err) {
                console.error(err);
                alert("ファイルの読み込みに失敗しました。");
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (confirm("現在開いている図案を閉じてもよろしいですか？")) {
            setPattern(null);
            setProgress(new Set());
            localStorage.removeItem('current_pattern');
        }
    };

    const updateProgress = (x, y, shouldDone) => {
        const key = `${x},${y}`;
        setProgress(prev => {
            const hasKey = prev.has(key);
            if ((shouldDone && hasKey) || (!shouldDone && !hasKey)) {
                return prev;
            }
            const newSet = new Set(prev);
            if (shouldDone) {
                newSet.add(key);
            } else {
                newSet.delete(key);
            }
            return newSet;
        });
    };

    const handleExportPDF = async () => {
        if (!pattern) return;
        try {
            // Generate Preview Image for Cover
            const canvas = document.createElement('canvas');
            canvas.width = pattern.pattern.width;
            canvas.height = pattern.pattern.height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            pattern.pattern.grid.forEach((row, y) => {
                row.forEach((color, x) => {
                    if (color) {
                        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
                        ctx.fillRect(x, y, 1, 1);
                    }
                });
            });

            const previewImage = canvas.toDataURL('image/png');

            // Clone pattern and add previewImage
            const exportPattern = { ...pattern, previewImage };

            await generatePDF(exportPattern, 'user');
        } catch (error) {
            console.error(error);
            alert(`PDFの作成に失敗しました。\nエラー: ${error.message}`);
        }
    };

    const handleMouseDown = (e) => {
        if (!pattern) return;
        isDraggingRef.current = true;

        const rect = e.target.getBoundingClientRect();
        const rulerSize = 20;
        const x = Math.floor((e.clientX - rect.left - rulerSize) / (20 * scale));
        const y = Math.floor((e.clientY - rect.top - rulerSize) / (20 * scale));

        if (x >= 0 && x < pattern.pattern.width && y >= 0 && y < pattern.pattern.height) {
            const cell = pattern.pattern.grid[y][x];
            if (cell) {
                dragTargetSymbolRef.current = cell.symbol;
                const key = `${x},${y}`;
                const isDone = progress.has(key);
                shouldMarkDoneRef.current = !isDone;

                updateProgress(x, y, shouldMarkDoneRef.current);
                lastToggledRef.current = key;
            }
        }
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current || !pattern) return;

        const rect = e.target.getBoundingClientRect();
        const rulerSize = 20;
        const x = Math.floor((e.clientX - rect.left - rulerSize) / (20 * scale));
        const y = Math.floor((e.clientY - rect.top - rulerSize) / (20 * scale));

        if (x >= 0 && x < pattern.pattern.width && y >= 0 && y < pattern.pattern.height) {
            const key = `${x},${y}`;
            if (key === lastToggledRef.current) return;

            const cell = pattern.pattern.grid[y][x];
            // Allow filling if symbol matches.
            if (cell && cell.symbol === dragTargetSymbolRef.current) {
                updateProgress(x, y, shouldMarkDoneRef.current);
                lastToggledRef.current = key;
            }
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        dragTargetSymbolRef.current = null;
        lastToggledRef.current = null;
    };

    // If no pattern loaded, show upload screen
    if (!pattern) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <FileJson className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">図案を開く</h2>
                <p className="text-gray-500 mb-8 max-w-md text-center">
                    作成ツールで保存したJSONファイルをアップロードして、ステッチを開始しましょう。
                </p>

                <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform active:scale-95">
                    <span>図案ファイル (JSON) を選択</span>
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>
            </div>
        );
    }

    // Pattern View
    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            {/* Sidebar: Details & Palette */}
            <div className="w-80 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-gray-900">図案詳細</h3>
                    </div>
                    <button
                        onClick={handleReset}
                        className="w-full mb-4 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        図案を閉じる
                    </button>
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                        <div className="flex justify-between">
                            <span>完成サイズ:</span>
                            <span>{pattern.metadata?.widthCm} x {pattern.metadata?.heightCm} cm</span>
                        </div>
                        <div className="flex justify-between">
                            <span>グリッド:</span>
                            <span>{pattern.pattern.width} x {pattern.pattern.height}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>色数:</span>
                            <span>{pattern.metadata?.colors}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleExportPDF}
                        className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-bold py-2 px-4 rounded-lg shadow transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        印刷用PDF
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">表示モード</h4>
                    <div className="flex gap-2 px-2 mb-4">
                        <button
                            onClick={() => setViewMode('symbol')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors border ${viewMode === 'symbol'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            記号
                        </button>
                        <button
                            onClick={() => setViewMode('color')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors border ${viewMode === 'color'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            カラー
                        </button>
                    </div>

                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">パレット</h4>
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedColor(null)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${selectedColor === null ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                                }`}
                        >
                            <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow-sm border border-gray-200 bg-white text-gray-500">
                                全
                            </span>
                            <div className="font-medium text-gray-900">全色表示</div>
                        </button>
                        {pattern.pattern.palette.map(color => (
                            <button
                                key={color.code}
                                onClick={() => setSelectedColor(selectedColor === color.code ? null : color.code)}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${selectedColor === color.code ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <span
                                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow-sm border border-gray-100"
                                    style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})`, color: (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) > 186 ? '#000' : '#fff' }}
                                >
                                    {color.symbol}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900">{color.code}</div>
                                    <div className="text-xs text-gray-500 truncate">{color.name}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main View: Canvas Grid */}
            <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 relative overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
                    <div className="bg-white/90 backdrop-blur shadow-lg rounded-lg p-1 flex gap-1 pointer-events-auto">
                        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600" onClick={() => setScale(s => Math.min(s * 1.2, 5))}><ZoomIn className="w-5 h-5" /></button>
                        <div className="w-px bg-gray-200 my-1" />
                        <span className="flex items-center px-2 text-xs font-mono text-gray-500">{Math.round(scale * 100)}%</span>
                        <div className="w-px bg-gray-200 my-1" />
                        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600" onClick={() => setScale(s => Math.max(s / 1.2, 0.5))}><ZoomOut className="w-5 h-5" /></button>
                    </div>

                    <div className="bg-white/90 backdrop-blur shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 pointer-events-auto text-sm font-bold text-gray-700">
                        <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>進捗: {Math.round((progress.size / (pattern.pattern.width * pattern.pattern.height)) * 100)}%</span>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 overflow-auto bg-gray-200 flex">
                    <div className="relative m-auto p-8 box-border">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className="shadow-xl bg-white cursor-crosshair"
                        />
                    </div>
                </div>
            </div>
        </div >
    );
};

export default UserViewer;
