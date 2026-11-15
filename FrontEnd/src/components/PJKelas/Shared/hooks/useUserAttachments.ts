'use client';

import React, { useState } from 'react';

export interface PendingFile {
  name: string;
  data: string;
  type: 'image' | 'file';
  sizeStr?: string;
}

interface UseUserAttachmentsOptions {
  platform: 'mobile' | 'web';
  roomId: number | null;
  showAlert: (message: string, title?: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const useUserAttachments = ({
  platform,
  roomId,
  showAlert,
  fileInputRef,
}: UseUserAttachmentsOptions) => {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (platform === 'mobile') {
      // ===== Versi Mobile (persis dari MobileLayout backup) =====
      const rawFiles = e.target.files ? Array.from(e.target.files) : [];
      if (!rawFiles.length || !roomId) return;

      const totalFiles = pendingFiles.length + rawFiles.length;
      if (totalFiles > 5) {
        showAlert(`Maksimal hanya boleh melampirkan 5 file sekaligus, bro! Kamu sudah melampirkan ${pendingFiles.length} file.`, 'Batas Maksimal File');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const validFiles: File[] = [];
      for (const file of rawFiles) {
        if (file.size > 1024 * 1024) {
          showAlert(`Waduh bro! File "${file.name}" ukurannya (${(file.size / (1024 * 1024)).toFixed(2)} MB) kegedean. Maksimal cuma boleh 1 MB per file biar server tetep ngebut!`, 'Ukuran File Kegedean');
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      let loadedCount = 0;
      const newItems: Array<{ name: string; data: string; type: 'image' | 'file'; sizeStr?: string }> = [];

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const fileType = file.type.startsWith('image/') ? 'image' : 'file';
          const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
          newItems.push({
            name: file.name,
            data: base64Data,
            type: fileType,
            sizeStr: sizeStr
          });
          loadedCount++;
          if (loadedCount === validFiles.length) {
            setPendingFiles(prev => [...prev, ...newItems]);
          }
        };
        reader.readAsDataURL(file);
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      // ===== Versi Web&Tab (persis dari WebTabLayout backup) =====
      const chosenFiles = Array.from(e.target.files || []);
      if (chosenFiles.length === 0 || !roomId) return;

      if (pendingFiles.length + chosenFiles.length > 5) {
        showAlert(`Waduh bro! Maksimal cuma boleh lampirkan 5 file sekaligus (sekarang sudah ada ${pendingFiles.length} file).`, 'Batas Maksimal File');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      for (const f of chosenFiles) {
        if (f.size > 1024 * 1024) {
          showAlert(`Waduh bro! File "${f.name}" (${(f.size / (1024 * 1024)).toFixed(2)} MB) kegedean. Maksimal cuma boleh 1 MB per file biar server tetep ngebut!`, 'Ukuran File Kegedean');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      const readers = chosenFiles.map(f => {
        return new Promise<{ name: string; data: string; type: 'image' | 'file'; sizeStr: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            const fileType = f.type.startsWith('image/') ? 'image' : 'file';
            const sizeStr = (f.size / 1024).toFixed(0) + ' KB';
            resolve({
              name: f.name,
              data: base64Data,
              type: fileType,
              sizeStr
            });
          };
          reader.readAsDataURL(f);
        });
      });

      Promise.all(readers).then(newFiles => {
        setPendingFiles(prev => [...prev, ...newFiles]);
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    // Mobile aslinya juga reset value input saat hapus 1 file, Web tidak.
    if (platform === 'mobile') {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    pendingFiles,
    setPendingFiles,
    handleFileClick,
    handleFileChange,
    handleRemovePendingFile,
  };
};

export default useUserAttachments;