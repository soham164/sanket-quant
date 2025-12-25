import { useState } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

const CameraCapture = ({ onCapture, onClose }) => {
  const { videoRef, error, isActive, startCamera, stopCamera, capturePhoto, switchCamera } = useCamera();
  const [preview, setPreview] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const handleStart = async () => await startCamera();

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
    if (preview && onCapture) onCapture(preview);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setPreview(null);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-primary z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-sm font-medium text-text-inverse">
          {preview ? 'Review' : 'Capture'}
        </h2>
        <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded transition-colors">
          <X className="w-5 h-5 text-text-inverse" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black">
        {error && (
          <div className="text-center p-4">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button onClick={handleStart} className="btn btn-accent">Try Again</button>
          </div>
        )}

        {!error && !isActive && !preview && (
          <button onClick={handleStart} className="flex flex-col items-center gap-3 p-6 text-text-inverse">
            <Camera className="w-12 h-12 text-accent" />
            <span className="text-sm">Tap to start camera</span>
          </button>
        )}

        {isActive && !preview && (
          <video ref={videoRef} autoPlay playsInline muted className="max-h-full max-w-full object-contain" />
        )}

        {preview && (
          <img src={preview.dataUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      <div className="p-4 bg-primary/50 flex items-center justify-center gap-4">
        {isActive && !preview && (
          <>
            <button onClick={switchCamera} className="p-3 bg-white/10 text-text-inverse rounded hover:bg-white/20 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={handleCapture} disabled={capturing} className="p-4 bg-accent text-white rounded-full hover:bg-accent-600 transition-colors disabled:opacity-50">
              <Camera className="w-6 h-6" />
            </button>
            <div className="w-11" />
          </>
        )}

        {preview && (
          <>
            <button onClick={handleRetake} className="btn btn-ghost text-text-inverse">
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button onClick={handleConfirm} className="btn btn-accent">
              <Check className="w-4 h-4" /> Use Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
