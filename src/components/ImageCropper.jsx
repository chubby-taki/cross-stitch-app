import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropUtils'; // We'll need this utility
import { Check, X } from 'lucide-react';

const ImageCropper = ({ imageSrc, aspect, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Sanitize aspect
    // If aspect is passed but is NaN, 0, or Infinite, fallback to 1 (square) or undefined (free)
    // We want it to be defined if passed.
    const safeAspect = (typeof aspect === 'number' && isFinite(aspect) && aspect > 0) ? aspect : 1;

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error(e);
        }
    };

    if (!imageSrc) return <div className="text-red-500">No Image Source</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="relative flex-1 bg-orange-50/50 rounded-[2rem] overflow-hidden min-h-[400px] shadow-inner border border-orange-100/50">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={safeAspect}
                    onCropChange={onCropChange}
                    onCropComplete={onCropCompleteHandler}
                    onZoomChange={onZoomChange}
                    objectFit="contain"
                />
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <div className="flex flex-col gap-2 w-full md:w-1/3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-orange-300">
                        <label>ズーム調整</label>
                        <span>{zoom}x</span>
                    </div>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(e.target.value)}
                        className="w-full accent-[#ff8a65]"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={onCancel}
                        className="flex-1 btn-secondary text-sm py-2"
                    >
                        <X className="w-4 h-4" /> やめとく
                    </button>
                    <button
                        onClick={showCroppedImage}
                        className="flex-[2] btn-primary text-sm py-2"
                    >
                        <Check className="w-4 h-4" /> この範囲で切り取る
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
