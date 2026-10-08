import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, RefreshCw, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const CameraCapture = ({
  label,
  onCaptured,
  existingUrl,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(existingUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
    } catch (err) {
      setError('Camera access denied or unavailable. Please grant permission in your browser.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const takeSnapshot = async () => {
    if (!videoRef.current) return;
    setUploading(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      stopCamera();

      // Convert to Blob (JPEG format)
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setError('Could not process photo image.');
            setUploading(false);
            return;
          }

          // Upload to Supabase Storage
          const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const filePath = `uploads/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('skilllab-evidence')
            .upload(filePath, blob, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) {
            setError('Upload failed: ' + uploadError.message);
            setUploading(false);
            return;
          }

          const { data } = supabase.storage.from('skilllab-evidence').getPublicUrl(filePath);
          const publicUrl = data.publicUrl;

          setPhotoUrl(publicUrl);
          onCaptured(publicUrl);
          setUploading(false);
        },
        'image/jpeg',
        0.82
      );
    } catch (err) {
      setError(err.message || 'Failed to capture photo.');
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setPhotoUrl(null);
    startCamera();
  };

  return (
    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-600" />
          {label}
        </span>
        {photoUrl && !isStreaming && (
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Captured
          </span>
        )}
      </div>

      {error && (
        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Camera Live Preview */}
      {isStreaming && (
        <div className="space-y-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={uploading}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" /> Capture Photo Now
                </>
              )}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="py-2 px-3 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Captured Image Preview */}
      {photoUrl && !isStreaming && (
        <div className="space-y-2">
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-emerald-300">
            <img src={photoUrl} alt="Captured evidence" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className="w-full py-1.5 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Retake Photo
          </button>
        </div>
      )}

      {/* Initial Capture Trigger */}
      {!photoUrl && !isStreaming && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Camera className="w-4 h-4 text-amber-600" />
          Click to Open Live Camera
        </button>
      )}
    </div>
  );
};
