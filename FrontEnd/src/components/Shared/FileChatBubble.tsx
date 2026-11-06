'use client';

import React from 'react';
import { FileText, FileSpreadsheet, Download, Eye, Image as ImageIcon } from 'lucide-react';
import FormattedText from '@/components/Shared/FormattedText';
import { cn } from '@/lib/utils';

export type FileItem = {
  name: string;
  data: string;
  type?: string;
};

export type FileChatBubbleProps = {
  messageText: string;
  messageType: string;
  isMe: boolean;
  onViewFile: (data: string, name: string) => void;
  onDownloadFile: (data: string, name: string) => void;
  isMobile?: boolean;
};

export const isFileMessage = (msg: { text: string; type?: string }): boolean => {
  if (!msg) return false;
  if (msg.type === 'file' || msg.type === 'multi_file') return true;
  if (typeof msg.text === 'string') {
    const trimmed = msg.text.trim();
    if (trimmed.startsWith('{"files"') || trimmed.startsWith('{"files":') || (trimmed.startsWith('{') && trimmed.includes('"files"'))) {
      return true;
    }
  }
  return false;
};

export const parseFileMessage = (
  msgText: string,
  msgType: string
): { files: FileItem[]; caption: string | null } => {
  const trimmed = (msgText || '').trim();

  // Cek apakah format JSON (multi-file)
  if (msgType === 'multi_file' || trimmed.startsWith('{') || trimmed.includes('"files"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        return {
          files: parsed.files,
          caption: parsed.caption || null,
        };
      }
    } catch {
      // fallback
    }
  }

  // Format single file tradisional: fileName|fileData|caption
  const parts = (msgText || '').split('|');
  const fileName = parts.length > 1 ? parts[0] : (msgType === 'image' ? 'Gambar_Lampiran.png' : 'Dokumen');
  const fileData = parts.length > 1 ? parts[1] : msgText;
  const caption = parts.length > 2 ? parts.slice(2).join('|') : null;

  return {
    files: [{ name: fileName, data: fileData, type: msgType }],
    caption: caption,
  };
};

export const FileChatBubble: React.FC<FileChatBubbleProps> = ({
  messageText,
  messageType,
  isMe,
  onViewFile,
  onDownloadFile,
  isMobile = false,
}) => {
  const { files, caption } = parseFileMessage(messageText, messageType);

  return (
    <div className={cn(
      "flex flex-col w-full",
      isMobile ? "max-w-65" : "max-w-70 sm:max-w-80"
    )}>
      {/* 1. CONTAINER FILE (List / Stack Vertikal Bertingkat) */}
      <div className="flex flex-col gap-2 w-full">
        {files.map((file, idx) => {
          const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
          const isPdf = ext === 'pdf';
          const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
          const isWord = ['docx', 'doc'].includes(ext);
          const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || (file.data || '').startsWith('data:image/');

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border transition-all w-full",
                isMobile ? "p-2.5" : "p-3",
                isMe
                  ? "bg-white/10 backdrop-blur-xs border-white/20 shadow-inner"
                  : "bg-slate-50 border-slate-200 shadow-xs"
              )}
            >
              {/* Icon Kotak Dinamis */}
              <div
                className={cn(
                  "rounded-xl flex items-center justify-center shrink-0 border",
                  isMobile ? "w-9 h-9" : "w-10 h-10",
                  isMe
                    ? isPdf
                      ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                      : isExcel
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : isWord
                      ? "bg-sky-500/20 text-sky-300 border-sky-400/30"
                      : isImg
                      ? "bg-purple-500/20 text-purple-300 border-purple-400/30"
                      : "bg-white/15 text-white border-white/20"
                    : isPdf
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : isExcel
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : isWord
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : isImg
                    ? "bg-purple-50 text-purple-600 border-purple-200"
                    : "bg-[#588CBC]/15 text-[#183449] border-[#588CBC]/20"
                )}
              >
                {isExcel ? (
                  <FileSpreadsheet size={isMobile ? 18 : 20} />
                ) : isImg ? (
                  <ImageIcon size={isMobile ? 18 : 20} />
                ) : (
                  <FileText size={isMobile ? 18 : 20} />
                )}
              </div>

              {/* Rincian Nama File & Tombol Aksi */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-bold truncate",
                    isMobile ? "text-[11px] max-w-37.5" : "text-xs max-w-42.5 sm:max-w-50",
                    isMe ? "text-white" : "text-slate-800"
                  )}
                  title={file.name}
                >
                  {file.name}
                </p>
                <div className={cn("flex items-center gap-1.5", isMobile ? "mt-1" : "mt-1.5")}>
                  {/* Tombol Lihat */}
                  <button
                    type="button"
                    onClick={() => onViewFile(file.data, file.name)}
                    className={cn(
                      "font-bold flex items-center gap-1 transition-all active:scale-95",
                      isMobile ? "px-2 py-0.5 rounded-md text-[9px]" : "px-2.5 py-1 rounded-lg text-[10px]",
                      isMe
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-slate-200/80 hover:bg-slate-300 text-slate-800"
                    )}
                  >
                    <Eye size={isMobile ? 10 : 11} />
                    Lihat
                  </button>
                  {/* Tombol Download */}
                  <button
                    type="button"
                    onClick={() => onDownloadFile(file.data, file.name)}
                    className={cn(
                      "font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs",
                      isMobile ? "px-2 py-0.5 rounded-md text-[9px]" : "px-2.5 py-1 rounded-lg text-[10px]",
                      isMe
                        ? "bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-black"
                        : "bg-[#183449] hover:bg-[#2B5474] text-white"
                    )}
                  >
                    <Download size={isMobile ? 10 : 11} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. DIVIDER / GARIS PEMISAH */}
      {caption && (
        <div
          className={cn(
            "border-t",
            isMobile ? "mt-2.5 pt-2.5" : "mt-3 pt-3",
            isMe ? "border-white/15" : "border-slate-200"
          )}
        />
      )}

      {/* 3. AREA TEKS & CATATAN TAMBAHAN */}
      {caption && (
        <div className="px-1">
          <FormattedText
            text={caption}
            className={cn(
              "font-medium leading-relaxed",
              isMobile ? "text-[13px]" : "text-sm"
            )}
          />
        </div>
      )}
    </div>
  );
};

export default FileChatBubble;
