'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck } from 'lucide-react';
import { Message } from '@/constants/chatTypes';
import FormattedText from '@/components/Shared/FormattedText';
import FileChatBubble, { isFileMessage } from '@/components/Shared/FileChatBubble';
import { cn } from '@/lib/utils';

export interface ChatMessagesAreaProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  localSearchQuery: string;
  messages: Message[];
  viewFile: (dataUrl: string, fileName?: string) => void;
  downloadFile: (dataUrl: string, fileName: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = ({
  scrollContainerRef,
  handleScroll,
  localSearchQuery,
  messages,
  viewFile,
  downloadFile,
  renderHighlightedText,
  messagesEndRef,
}) => {
  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 lg:p-10 flex flex-col gap-8 scrollbar-hide"
    >
      <div className="flex justify-center mb-2">
        <span className="bg-white border border-slate-100 shadow-sm text-[10px] font-black text-slate-400 px-4 py-1.5 rounded-full uppercase tracking-widest">
          Secure Communication
        </span>
      </div>

      <AnimatePresence>
        {(() => {
          const filteredMessages = localSearchQuery.trim()
            ? messages.filter((m: Message) => m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))
            : messages;
          return filteredMessages.map((msg: Message, idx: number) => {
            const isMe = msg.sender === 'admin';
            return (
              <motion.div
                id={`msg-${msg.id || msg.timestamp}`}
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex flex-col gap-1.5 max-w-[85%] md:max-w-[75%] min-w-0 w-fit",
                  isMe ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div className={cn(
                  "w-fit max-w-full px-6 py-4 rounded-3xl md:rounded-4xl shadow-md text-sm font-medium leading-relaxed relative wrap-anywhere min-w-0",
                  isMe
                    ? "bg-linear-to-br from-[#183449] to-[#285577] text-white rounded-tr-none border border-[#588CBC]/40 shadow-lg shadow-[#183449]/15"
                    : "bg-white text-[#2B2B2B] rounded-tl-none border border-[#B3B3B3] shadow-sm"
                )}>
                  {isFileMessage(msg) ? (
                    <FileChatBubble
                      messageText={msg.text}
                      messageType={msg.type}
                      isMe={isMe}
                      onViewFile={viewFile}
                      onDownloadFile={downloadFile}
                    />
                  ) : msg.type === 'image' ? (
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const parts = msg.text.split('|');
                        const imgData = parts.length > 1 ? parts[1] : msg.text;
                        const caption = parts.length > 2 ? parts.slice(2).join('|') : null;
                        return (
                          <>
                            <img
                              src={imgData}
                              alt="Sent image"
                              onClick={() => viewFile(imgData, "Gambar_Lampiran.png")}
                              className="rounded-2xl max-w-60 h-auto shadow-sm border border-slate-100 cursor-zoom-in hover:opacity-90 transition-all"
                            />
                            {caption && (
                              <FormattedText text={caption} className="text-sm font-medium leading-relaxed mt-1 px-1" />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    renderHighlightedText(msg.text, localSearchQuery)
                  )}
                  <div className={cn(
                    "flex items-center gap-2 mt-2.5 justify-end",
                    isMe ? "text-slate-300" : "text-[#848484]"
                  )}>
                    <span className="text-[10px] font-bold">{msg.timestamp}</span>
                    {isMe && <CheckCheck size={14} className="text-[#588CBC]" />}
                  </div>
                </div>
              </motion.div>
            );
          });
        })()}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessagesArea;
