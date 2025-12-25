import { useState } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

const CameraCapture = ({ onCapture, onClose }) => {
  const { videoRef, error, isActive, startCamera, stopCamera, capturePhoto, switchCamera } = useCamera();
  const [preview, setPreview] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const handleStart = async () => {
    await startCamera();
  };

  const handleCapture = async () => {
    setCapturing(true);
    const result = await capturePhoto();
    if (result) {
      setPreview(result);
      stopCamera();
    }
    setCapturing(false);
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (preview && onCapture) {
      onCapture(preview);
    }
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setPreview(null);
    if (onClose) onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-title"
    >
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 id="camera-title" className="text-white font-semibold">
          {preview ? 'Review Photo' : 'Take Photo'}
        </h2>
        <button
          onClick={handleClose}
          className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close camera"
        >
          <X className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black">
        {error && (
          <div className="text-center p-4" role="alert">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {!error && !isActive && !preview && (
          <button
            onClick={handleStart}
            className="flex flex-col items-center gap-4 p-8 text-white"
            aria-label="Start camera"
          >
            <Camera className="w-16 h-16" aria-hidden="true" />
            <span>Tap to start camera</span>
          </button>
        )}

        {isActive && !preview && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full object-contain"
            aria-label="Camera preview"
          />
        )}

        {preview && (
          <img
            src={preview.dataUrl}
            alt="Captured photo preview"
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="p-6 bg-black/50 flex items-center justify-center gap-6">
        {isActive && !preview && (
          <>
            <button
              onClick={switchCamera}
              className="p-4 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
              aria-label="Switch camera"
            >
              <RotateCcw className="w-6 h-6" aria-hidden="true" />
            </button>
            <button
              onClick={handleCapture}
              disabled={capturing}
              className="p-6 bg-white rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              aria-label="Capture photo"
            >
              <Camera className="w-8 h-8 text-gray-900" aria-hidden="true" />
            </button>
            <div className="w-14" /> {/* Spacer for alignment */}
          </>
        )}

        {preview && (
          <>
            <button
              onClick={handleRetake}
              className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
              aria-label="Retake photo"
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              aria-label="Use this photo"
            >
              <Check className="w-5 h-5" aria-hidden="true" />
              Use Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
