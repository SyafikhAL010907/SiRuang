'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Table,
  Download,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export type FilePreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fileData: string; // base64 or dataURL
  fileName: string;
  onDownload?: () => void;
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileData,
  fileName,
  onDownload,
}) => {
  // Common states
  const [fileType, setFileType] = useState<'excel' | 'pdf' | 'image' | 'word' | 'text' | 'other'>('excel');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Excel states
  const [sheets, setSheets] = useState<{ [name: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');

  // Image states
  const [imgZoom, setImgZoom] = useState<number>(1);
  const [imgRotation, setImgRotation] = useState<number>(0);

  // Text states
  const [textContent, setTextContent] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !fileData) return;

    setIsLoading(true);
    setError(null);
    setSheets({});
    setSheetNames([]);
    setActiveSheet('');
    setImgZoom(1);
    setImgRotation(0);
    setTextContent('');
    setIsCopied(false);

    // Hitung ukuran file dari data base64
    try {
      const base64Only = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      const sizeInBytes = Math.round((base64Only.length * 3) / 4);
      if (sizeInBytes < 1024) {
        setFileSizeStr(`${sizeInBytes} B`);
      } else if (sizeInBytes < 1024 * 1024) {
        setFileSizeStr(`${(sizeInBytes / 1024).toFixed(1)} KB`);
      } else {
        setFileSizeStr(`${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`);
      }
    } catch {
      setFileSizeStr('');
    }

    // Deteksi tipe file berdasarkan nama file & mime
    const nameLower = (fileName || '').toLowerCase();
    const ext = nameLower.split('.').pop() || '';

    let detected: 'excel' | 'pdf' | 'image' | 'word' | 'text' | 'other' = 'other';
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      detected = 'excel';
    } else if (ext === 'pdf' || fileData.startsWith('data:application/pdf')) {
      detected = 'pdf';
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext) || fileData.startsWith('data:image/')) {
      detected = 'image';
    } else if (['docx', 'doc', 'dotx', 'dot'].includes(ext)) {
      detected = 'word';
    } else if (['txt', 'json', 'log', 'md', 'xml'].includes(ext) || fileData.startsWith('data:text/')) {
      detected = 'text';
    }
    setFileType(detected);

    // Buat Blob URL untuk preview file jika didukung
    let createdBlobUrl: string | null = null;
    try {
      let mimeType = 'application/octet-stream';
      let base64String = fileData;
      if (fileData.includes(',')) {
        const parts = fileData.split(',');
        mimeType = parts[0].match(/:(.*?);/)?.[1] || mimeType;
        base64String = parts[1];
      }

      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (detected === 'pdf') {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        createdBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(createdBlobUrl);
      } else if (detected === 'word') {
        const blob = new Blob([bytes], { type: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        createdBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(createdBlobUrl);
      } else if (detected === 'text') {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(bytes);
        setTextContent(text);
      } else if (detected === 'excel') {
        // Parse XLSX
        const workbook = XLSX.read(bytes, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
        }

        const parsedSheets: { [name: string]: any[][] } = {};
        workbook.SheetNames.forEach((name) => {
          const worksheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });
          parsedSheets[name] = jsonData;
        });

        setSheets(parsedSheets);
        setSheetNames(workbook.SheetNames);
        setActiveSheet(workbook.SheetNames[0]);
      }
    } catch (err: any) {
      console.error('Gagal membaca file untuk preview:', err);
      if (detected === 'excel') {
        setError('Format file Excel tidak dapat dibaca atau rusak. Anda masih bisa mengunduh file ini secara langsung.');
      } else if (detected === 'text') {
        setError('Gagal membaca isi teks file.');
      }
    } finally {
      setIsLoading(false);
    }

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, fileData, fileName]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = blobUrl || fileData;
      link.download = fileName || 'Dokumen';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Gagal download file:', e);
    }
  };

  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else if (fileData) {
      window.open(fileData, '_blank');
    }
  };

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  const currentRows = (activeSheet && sheets[activeSheet]) || [];

  // Konfigurasi Header badge & icon berdasarkan tipe file
  const getHeaderMeta = () => {
    switch (fileType) {
      case 'excel':
        return {
          icon: <FileSpreadsheet size={22} className="text-emerald-400" />,
          badgeText: 'Excel Spreadsheet',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          footerDesc: 'Microsoft Excel / Spreadsheet Document',
        };
      case 'pdf':
        return {
          icon: <FileText size={22} className="text-rose-400" />,
          badgeText: 'PDF Document',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          footerDesc: 'Dokumen Portable Document Format (PDF)',
        };
      case 'image':
        return {
          icon: <ImageIcon size={22} className="text-sky-400" />,
          badgeText: 'Image Preview',
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          footerDesc: 'Gambar / Foto Lampiran',
        };
      case 'word':
        return {
          icon: <FileText size={22} className="text-blue-400" />,
          badgeText: 'Word Document',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          footerDesc: 'Microsoft Word Document (.docx / .doc)',
        };
      case 'text':
        return {
          icon: <FileText size={22} className="text-amber-400" />,
          badgeText: 'Text Document',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          footerDesc: 'File Teks / Log Lampiran',
        };
      default:
        return {
          icon: <FileIcon size={22} className="text-slate-300" />,
          badgeText: 'File Lampiran',
          badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
          footerDesc: 'File Dokumen Lampiran',
        };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-9999 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl h-[90vh] max-h-212.5 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200"
        >
          {/* Header Modal */}
          <div className="p-3.5 sm:px-6 sm:py-4 bg-linear-to-r from-[#183449] to-[#2B5474] text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                {headerMeta.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${headerMeta.badgeClass}`}>
                    {headerMeta.badgeText}
                  </span>
                  {fileSizeStr && (
                    <span className="text-[10px] text-white/70 font-semibold hidden sm:inline">
                      {fileSizeStr}
                    </span>
                  )}
                  {fileType === 'excel' && currentRows.length > 0 && (
                    <span className="text-[10px] text-white/70 font-semibold hidden sm:inline">
                      • {currentRows.length} Baris
                    </span>
                  )}
                </div>
                <h3 className="text-sm md:text-base font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5" title={fileName}>
                  {fileName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Tombol buka di tab baru untuk PDF/Word */}
              {(fileType === 'pdf' || fileType === 'word') && (
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all hidden sm:flex items-center gap-1.5 border border-white/20 active:scale-95"
                  title="Buka file di tab baru"
                >
                  <ExternalLink size={14} />
                  <span>Tab Baru</span>
                </button>
              )}

              {/* Tombol Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 active:scale-95"
                title="Download file ini"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Unduh</span>
              </button>

              {/* Tombol Tutup */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-white/80 transition-all flex items-center justify-center active:scale-95"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Sheet Tabs Header (Hanya untuk Excel jika terdapat > 1 sheet) */}
          {fileType === 'excel' && sheetNames.length > 1 && (
            <div className="flex items-center gap-1.5 px-4 md:px-6 py-2 bg-slate-100/80 border-b border-slate-200 overflow-x-auto scrollbar-hide shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">
                Sheet:
              </span>
              {sheetNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveSheet(name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeSheet === name
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Image Toolbar (Hanya untuk gambar) */}
          {fileType === 'image' && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-100 border-b border-slate-200 text-xs shrink-0">
              <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                Zoom: {Math.round(imgZoom * 100)}%
              </span>
              <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => setImgZoom((prev) => Math.max(0.25, prev - 0.25))}
                  className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all active:scale-95"
                  title="Perkecil"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setImgZoom(1)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-bold transition-all active:scale-95"
                  title="Reset Ukuran"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setImgZoom((prev) => Math.min(3, prev + 0.25))}
                  className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all active:scale-95"
                  title="Perbesar"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setImgRotation((prev) => (prev + 90) % 360)}
                  className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all active:scale-95 ml-2"
                  title="Putar 90 Derajat"
                >
                  <RotateCw size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Text Toolbar (Hanya untuk text) */}
          {fileType === 'text' && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-100 border-b border-slate-200 text-xs shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                {textContent.split('\n').length} Baris Teks
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-bold transition-all flex items-center gap-1 active:scale-95"
              >
                {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
            </div>
          )}

          {/* Body Content Utama */}
          <div className="flex-1 overflow-auto bg-slate-50/50 p-2 md:p-4 flex flex-col">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 my-auto">
                <div className="w-10 h-10 border-3 border-[#183449] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Memuat Pratinjau Dokumen...
                </p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 max-w-md mx-auto text-center p-6 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <AlertCircle size={28} />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Tidak Dapat Menampilkan Preview
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-2 px-5 py-2.5 bg-[#183449] hover:bg-[#588CBC] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Download size={14} /> Unduh File Sekarang
                </button>
              </div>
            ) : fileType === 'excel' ? (
              // ===== PREVIEW EXCEL SPREADSHEET =====
              currentRows.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 my-auto">
                  <Table size={32} className="text-slate-300" />
                  <p className="text-xs font-bold">Sheet ini kosong</p>
                </div>
              ) : (
                <div className="inline-block min-w-full align-middle bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[calc(90vh-170px)]">
                    <table className="min-w-full divide-y divide-slate-200 text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-xs">
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12 border-r border-slate-200 bg-slate-100">
                            #
                          </th>
                          {currentRows[0]?.map((_: any, colIdx: number) => (
                            <th
                              key={colIdx}
                              className="px-4 py-2.5 text-[11px] font-black text-slate-600 uppercase tracking-wider border-r border-slate-200 whitespace-nowrap bg-slate-100"
                            >
                              {String.fromCharCode(65 + (colIdx % 26)) +
                                (colIdx >= 26 ? Math.floor(colIdx / 26) : '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {currentRows.map((row: any[], rowIdx: number) => {
                          const isHeader = rowIdx === 0;
                          return (
                            <tr
                              key={rowIdx}
                              className={`transition-colors hover:bg-emerald-50/40 ${
                                isHeader ? 'bg-slate-50 font-bold text-slate-900' : ''
                              }`}
                            >
                              <td className="px-3 py-2 text-[10px] font-bold text-slate-400 text-center border-r border-slate-100 bg-slate-50/50 select-none">
                                {rowIdx + 1}
                              </td>
                              {currentRows[0]?.map((_: any, colIdx: number) => {
                                const cellValue = row[colIdx];
                                const displayVal =
                                  cellValue !== undefined && cellValue !== null
                                    ? String(cellValue)
                                    : '';
                                return (
                                  <td
                                    key={colIdx}
                                    className="px-4 py-2 border-r border-slate-100 whitespace-pre truncate max-w-xs"
                                    title={displayVal}
                                  >
                                    {displayVal}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : fileType === 'pdf' ? (
              // ===== PREVIEW PDF DOCUMENT =====
              <div className="w-full h-full min-h-112.5 flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner relative">
                {blobUrl ? (
                  <iframe
                    src={`${blobUrl}#toolbar=1`}
                    className="w-full h-full min-h-125 border-0 rounded-2xl"
                    title={fileName}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs text-slate-500 mb-3">Tidak dapat memuat PDF di dalam frame.</p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 bg-[#183449] text-white rounded-xl text-xs font-bold"
                    >
                      Unduh PDF
                    </button>
                  </div>
                )}
              </div>
            ) : fileType === 'image' ? (
              // ===== PREVIEW IMAGE =====
              <div className="w-full h-full min-h-112.5 flex-1 flex items-center justify-center overflow-auto rounded-2xl bg-slate-900/90 p-4 border border-slate-200">
                <div
                  className="transition-all duration-200 flex items-center justify-center"
                  style={{
                    transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                  }}
                >
                  <img
                    src={fileData}
                    alt={fileName}
                    className="max-h-[calc(90vh-230px)] max-w-full object-contain rounded-lg shadow-2xl pointer-events-auto select-none"
                  />
                </div>
              </div>
            ) : fileType === 'word' ? (
              // ===== PREVIEW WORD DOCUMENT (.DOCX / .DOC) =====
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center p-6 my-auto">
                <div className="w-24 h-24 rounded-3xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-5 relative">
                  <FileText size={48} className="drop-shadow-xs" />
                  <span className="absolute -bottom-2 px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-md shadow-xs">
                    WORD
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-800 break-all mb-1 max-w-md">
                  {fileName}
                </h4>
                <p className="text-xs text-slate-400 font-semibold mb-6">
                  Microsoft Word Document • {fileSizeStr || 'Format .docx'}
                </p>

                <div className="w-full bg-blue-50/60 rounded-2xl border border-blue-100 p-4 mb-6 text-left">
                  <p className="text-xs text-blue-900/80 leading-relaxed">
                    Dokumen Word ini siap untuk diunduh dan dibuka langsung menggunakan <strong>Microsoft Word</strong>, <strong>Google Docs</strong>, atau aplikasi pembaca dokumen lainnya di perangkat Anda.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full sm:flex-1 py-3 px-5 bg-[#183449] hover:bg-[#2B5474] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Download size={16} /> Unduh File Word
                  </button>
                  {blobUrl && (
                    <button
                      type="button"
                      onClick={handleOpenExternal}
                      className="w-full sm:flex-1 py-3 px-5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ExternalLink size={16} /> Buka Pratinjau
                    </button>
                  )}
                </div>
              </div>
            ) : fileType === 'text' ? (
              // ===== PREVIEW TEXT DOCUMENT =====
              <div className="w-full h-full min-h-112.5 flex-1 bg-slate-900 rounded-2xl p-4 overflow-auto border border-slate-800 font-mono text-xs text-slate-200">
                <pre className="whitespace-pre-wrap leading-relaxed select-text">
                  {textContent || 'Dokumen teks kosong.'}
                </pre>
              </div>
            ) : (
              // ===== PREVIEW FORMAT LAINNYA =====
              <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center p-6 my-auto">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mb-4">
                  <FileIcon size={40} />
                </div>
                <h4 className="text-base font-bold text-slate-800 break-all mb-1">
                  {fileName}
                </h4>
                <p className="text-xs text-slate-400 mb-6">{fileSizeStr || 'Lampiran Dokumen'}</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-6 py-3 bg-[#183449] hover:bg-[#588CBC] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Download size={16} /> Unduh Dokumen Ini
                </button>
              </div>
            )}
          </div>

          {/* Footer Info Modal */}
          <div className="px-6 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
            <span>{headerMeta.footerDesc}</span>
            <span>Pratinjau Dokumen SiRuang</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FilePreviewModal;

// Alias untuk backward-compatibility
export const ExcelPreviewModal = FilePreviewModal;
