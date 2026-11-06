import React from 'react';
import Image from 'next/image';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline';
  className?: string;
  icon?: React.ReactNode;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt = 'User', size = 'md', status, className, icon }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn(
        sizeClasses[size], 
        "rounded-full overflow-hidden flex items-center justify-center",
        !src && "bg-slate-100 border border-slate-200"
      )}>
        {src ? (
          <Image 
            src={src} 
            alt={alt} 
            width={48} 
            height={48} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            {icon || <UserCircle className="w-full h-full p-1" strokeWidth={1.5} />}
          </div>
        )}
      </div>
      {status && (
        <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white ${
          status === 'online' ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      )}
    </div>
  );
};

export default Avatar;
