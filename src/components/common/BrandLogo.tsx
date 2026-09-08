import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  showTagline = true,
  className = '',
}: BrandLogoProps) {
  const isDark = variant === 'dark';

  // Responsive, balanced sizing configurations
  const iconSizes = {
    sm: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]',
    md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl shadow-[0_6px_18px_-3px_rgba(37,99,235,0.4)]',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-[0_10px_24px_-4px_rgba(37,99,235,0.45)]',
  };

  const svgSizes = {
    sm: 'w-4.5 h-4.5 sm:w-5 sm:h-5',
    md: 'w-6 h-6 sm:w-6.5 sm:h-6.5',
    lg: 'w-8 h-8 sm:w-9 sm:h-9',
  };

  const titleSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-[21px]',
    lg: 'text-2xl sm:text-3xl',
  };

  const sublineTextSizes = {
    sm: 'text-[7.5px] sm:text-[8px] tracking-[0.2em]',
    md: 'text-[9px] sm:text-[9.5px] tracking-[0.24em]',
    lg: 'text-[11px] sm:text-xs tracking-[0.28em]',
  };

  const taglineSizes = {
    sm: 'text-[8px] gap-1.5',
    md: 'text-[9px] sm:text-[9.5px] gap-2',
    lg: 'text-[11px] gap-2.5',
  };

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none min-w-0 ${className}`}>
      {/* 3D Gradient Squircle Icon with Sleek Open Book Vector */}
      <div
        className={`relative shrink-0 flex items-center justify-center ${iconSizes[size]} bg-gradient-to-br from-[#2563eb] via-[#4f46e5] to-[#7c3aed] text-white ring-1 ring-white/30 border border-white/20 group-hover:scale-105 transition-all duration-300`}
      >
        {/* Subtle top inner glow */}
        <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-transparent via-white/5 to-white/20 pointer-events-none" />

        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgSizes[size]} text-white drop-shadow-sm relative z-10`}
        >
          {/* Left Book Page */}
          <path
            d="M8 12C14 10 20 11.5 22.5 14V36C20 33.8 14 32.5 8 34.5V12Z"
            fill="white"
            fillOpacity="0.95"
          />
          {/* Right Book Page */}
          <path
            d="M40 12C34 10 28 11.5 25.5 14V36C28 33.8 34 32.5 40 34.5V12Z"
            fill="white"
            fillOpacity="0.95"
          />
          {/* Spine & Page Bottom Curves */}
          <path
            d="M8 34.5C14 32.5 20 33.8 24 36.5C28 33.8 34 32.5 40 34.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Center Spine Crease */}
          <path
            d="M24 14.5V36"
            stroke="rgba(37,99,235,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Typography Header */}
      <div className="flex flex-col justify-center min-w-0">
        {/* Main Title: UNIVERSITY LIBRARY */}
        <div className={`font-black font-poppins leading-none flex items-center gap-1.5 truncate tracking-tight ${titleSizes[size]}`}>
          <span className={isDark ? 'text-white' : 'text-[#0a1128]'}>UNIVERSITY</span>
          <span className="bg-gradient-to-r from-[#2563eb] via-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
            LIBRARY
          </span>
        </div>

        {/* Subtitle with Gradient Flanking Lines: —— ENTERPRISE PORTAL —— */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.2 w-full">
          <span className="flex-1 h-[1.5px] bg-gradient-to-r from-blue-500/80 to-indigo-500/80 rounded-full min-w-[5px]" />
          <span
            className={`font-bold uppercase font-sans whitespace-nowrap leading-none ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            } ${sublineTextSizes[size]}`}
          >
            ENTERPRISE PORTAL
          </span>
          <span className="flex-1 h-[1.5px] bg-gradient-to-r from-indigo-500/80 to-purple-500/80 rounded-full min-w-[5px]" />
        </div>

        {/* Optional Tagline: Learn • Explore • Discover • Grow */}
        {showTagline && (
          <div
            className={`hidden min-[360px]:flex items-center justify-between font-semibold tracking-wider mt-1 leading-none ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            } ${taglineSizes[size]}`}
          >
            <span>Learn</span>
            <span className="text-blue-500 text-[8px] font-black">•</span>
            <span>Explore</span>
            <span className="text-indigo-500 text-[8px] font-black">•</span>
            <span>Discover</span>
            <span className="text-purple-500 text-[8px] font-black">•</span>
            <span>Grow</span>
          </div>
        )}
      </div>
    </div>
  );
}
