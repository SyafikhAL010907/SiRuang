'use client';

import { useState, useCallback } from 'react';

export interface UseAttachmentsOptions {
  platform: 'web' | 'mobile';
  showAlert: (message: string, title?: string) => void;
  selectedChat: any | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useAttachments(options: UseAttachmentsOptions) {
  const { platform, showAlert, selectedChat, fileInputRef } = options;

  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string, data: string, type: 'image' | 'file', sizeStr?: string }>>([]);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (platform === 'mobile') {
      // ── Mobile version ──
      const rawFiles = e.target.files ? Array.from(e.target.files) : [];
      if (!rawFiles.length || !selectedChat) return;

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
      // ── Web version ──
      const chosenFiles = Array.from(e.target.files || []);
      if (chosenFiles.length === 0 || !selectedChat) return;

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
  }, [platform, selectedChat, pendingFiles, showAlert, fileInputRef]);

  const handleRemovePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    if (platform === 'mobile' && fileInputRef.current) fileInputRef.current.value = '';
  }, [platform, fileInputRef]);

  return {
    pendingFiles,
    setPendingFiles,
    handleFileClick,
    handleFileChange,
    handleRemovePendingFile,
  };
}
