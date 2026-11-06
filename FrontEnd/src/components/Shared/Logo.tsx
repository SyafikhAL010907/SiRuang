import React from 'react';
import Image from 'next/image';

interface LogoProps {
  onlyLogo?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

const Logo = ({ onlyLogo = false, width = 48, height = 48, className = '' }: LogoProps) => {
  if (onlyLogo) {
    return (
      <Image
        src="/LogoSiRuang.png"
        alt="Logo SiRuang"
        width={width}
        height={height}
        priority
        className={`object-contain drop-shadow-md ${className}`}
     
      />
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 select-none ${className}`}>
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200/60 border border-[#B3B3B3] transition-transform duration-500 hover:scale-110 p-2">
        <Image
          src="/LogoSiRuang.png"
          alt="Logo SiRuang"
          width={width}
          height={height}
          priority
          className="object-contain"
          
        />
      </div>
      <div className="flex flex-col items-center">
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter leading-none flex items-center gap-1">
          SiRuang<span className="text-[#588CBC] text-3xl leading-none">.</span>
        </h3>
        <span className="text-[10px] font-black text-[#183449] uppercase tracking-widest mt-1">
          Sistem Informasi Ruang Kelas
        </span>
      </div>
    </div>
  );
};

export default Logo;
