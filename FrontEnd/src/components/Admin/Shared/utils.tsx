import React from 'react';
import { format } from 'date-fns';
import FormattedText from '@/components/Shared/FormattedText';

export const toLocalTime = (dateStr: string) => {
  if (!dateStr) return '--:--';
  try {
    // Ambil teks jamnya langsung biar ga kegeser timezone browser
    const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1];
    if (timePart) {
      return timePart.substring(0, 5); // Ambil HH:mm
    }
    return format(new Date(dateStr), 'HH:mm');
  } catch {
    return '--:--';
  }
};

export const downloadFile = (dataUrl: string, fileName: string) => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) throw new Error("Format base64 tidak valid");
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Gagal download:", e);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  }
};

export const formatNumber = (num: number) => {
  return num.toLocaleString('id-ID');
};

export const renderHighlightedText = (text: string, query: string) => {
  if (!query.trim()) return <FormattedText text={text} className="wrap-anywhere leading-relaxed" />;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="whitespace-pre-wrap leading-relaxed wrap-anywhere">
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-amber-300 text-slate-900 font-extrabold px-1 rounded-sm shadow-sm border border-amber-400 mx-0.5 select-all">
            {part}
          </span>
        ) : (
          <FormattedText key={i} text={part} className="wrap-anywhere inline" />
        )
      )}
    </span>
  );
};
