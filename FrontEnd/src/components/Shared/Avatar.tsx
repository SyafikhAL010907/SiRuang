'use client';

import React, { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline';
  className?: string;
  icon?: React.ReactNode;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User',
  size = 'md',
  status,
  className,
  icon,
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const isImageValid = Boolean(src && src.trim() && !hasError);
  const isLogo = Boolean(src && (src.includes('LogoSiRuang') || src.endsWith('.svg') || src.includes('Polos')));

  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      <div
        className={cn(
          sizeClasses[size],
          "rounded-full overflow-hidden flex items-center justify-center bg-slate-100 border border-slate-200/80 shadow-xs select-none"
        )}
      >
        {isImageValid ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full",
              isLogo ? "object-contain p-1.5 bg-white" : "object-cover"
            )}
            onError={() => setHasError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
            {icon || <UserCircle className="w-full h-full p-1" strokeWidth={1.5} />}
          </div>
        )}
      </div>

      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white",
            status === 'online' ? "bg-green-500" : "bg-gray-400"
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
