import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';

export const ImageUpload = ({
  label,
  maxPhotos,
  photoUrls = [],
  onPhotosChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photoUrls.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed. You currently have ${photoUrls.length}.`);
      return;
    }

    setUploading(true);
    setError(null);

    const uploadedUrls = [...photoUrls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Compress image using canvas
        const compressedBlob = await compressImage(file);

        const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('skilllab-evidence')
          .upload(filePath, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error('Upload failed: ' + uploadError.message);
        }

        const { data } = supabase.storage.from('skilllab-evidence').getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }

      onPhotosChange(uploadedUrls);
    } catch (err) {
      setError(err.message || 'Error uploading image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    const updated = photoUrls.filter((_, idx) => idx !== indexToRemove);
    onPhotosChange(updated);
    setError(null);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Image compression error'));
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    });
  };

  const isMaxReached = photoUrls.length >= maxPhotos;

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
      {/* Header with counter */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-amber-600" />
          {label}
        </span>
        <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
          isMaxReached ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
        }`}>
          {photoUrls.length} / {maxPhotos} photos
        </span>
      </div>

      {error && (
        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of uploaded thumbnails */}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {photoUrls.map((url, idx) => (
            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group">
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/60 text-white text-[10px] font-mono">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input triggering native camera/gallery picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload Action Button */}
      {!isMaxReached ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading image(s)...
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Tap to Take Photo or Upload Image ({photoUrls.length}/{maxPhotos})</span>
            </>
          )}
        </button>
      ) : (
        <div className="p-2 text-center text-xs text-amber-800 bg-amber-50/70 border border-amber-200 rounded-lg">
          Maximum limit of {maxPhotos} photos reached.
        </div>
      )}
    </div>
  );
};
