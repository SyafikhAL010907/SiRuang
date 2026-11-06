'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormattedTextProps {
  text: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className }) => {
  if (!text) return null;

  const parseLine = (line: string) => {
    // 1. Check for Block Formats (at start of line)
    
    // Quote (>)
    if (line.startsWith('> ')) {
      return (
        <blockquote className="border-l-4 border-[#588CBC] pl-4 py-1 my-1 italic text-slate-500 bg-slate-50/50 rounded-r-lg wrap-anywhere">
          {parseInline(line.substring(2))}
        </blockquote>
      );
    }

    // Bullet List (* or -)
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return (
        <div className="flex gap-2 ml-2 my-0.5 min-w-0">
          <span className="text-current opacity-80 text-lg leading-none shrink-0">•</span>
          <span className="flex-1 min-w-0 wrap-anywhere">{parseInline(line.substring(2))}</span>
        </div>
      );
    }

    // Numbered List (1. etc)
    const numListMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numListMatch) {
      return (
        <div className="flex gap-2 ml-2 my-0.5 min-w-0">
          <span className="text-current opacity-90 font-bold min-w-[1.2em] shrink-0">{numListMatch[1]}.</span>
          <span className="flex-1 min-w-0 wrap-anywhere">{parseInline(numListMatch[2])}</span>
        </div>
      );
    }

    // Default inline parsing
    return parseInline(line);
  };

  const parseInline = (line: string) => {
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    
    // Combined regex for all formats
    // Group 1: Monospace (```text``` or `text`)
    // Group 2: Bold (*text*)
    // Group 3: Italic (_text_ or __text__)
    // Group 4: Strikethrough (~text~)
    const regex = /(```([^`]+)```|`([^`]+)`)|(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)/g;
    
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      
      if (match[1]) { // Monospace
        const codeText = match[2] || match[3];
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 bg-slate-100 text-rose-500 rounded font-mono text-[0.9em] border border-slate-200 break-all whitespace-pre-wrap">
            {codeText}
          </code>
        );
      } else if (match[4]) { // Bold
        parts.push(<strong key={match.index} className="font-bold">{match[5]}</strong>);
      } else if (match[6]) { // Italic
        parts.push(<em key={match.index} className="italic">{match[7]}</em>);
      } else if (match[8]) { // Strikethrough
        parts.push(<del key={match.index} className="line-through opacity-70">{match[9]}</del>);
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : line;
  };

  // Split text by new lines
  const lines = text.split('\n');

  return (
    <div className={cn("wrap-anywhere whitespace-pre-wrap min-w-0", className)}>
      {lines.map((line, idx) => (
        <div key={idx} className={cn("wrap-anywhere", line === '' ? 'h-3' : 'min-h-[1.25em]')}>
          {parseLine(line)}
        </div>
      ))}
    </div>
  );
};

export default FormattedText;
