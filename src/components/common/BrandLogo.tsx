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

  // Sizing configurations
  const iconSizes = {
    sm: 'w-10 h-10 rounded-xl shadow-[0_6px_16px_-3px_rgba(67,97,238,0.45)]',
    md: 'w-13 h-13 sm:w-14 sm:h-14 rounded-2xl shadow-[0_10px_25px_-4px_rgba(67,97,238,0.48)]',
    lg: 'w-16 h-16 sm:w-18 sm:h-18 rounded-3xl shadow-[0_14px_32px_-4px_rgba(67,97,238,0.5)]',
  };

  const svgSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const titleSizes = {
    sm: 'text-lg sm:text-xl',
    md: 'text-2xl sm:text-[26px]',
    lg: 'text-3xl sm:text-4xl',
  };

  const sublineTextSizes = {
    sm: 'text-[8px] tracking-[0.24em]',
    md: 'text-[10.5px] sm:text-[11px] tracking-[0.28em]',
    lg: 'text-xs tracking-[0.32em]',
  };

  const taglineSizes = {
    sm: 'text-[9px] gap-2',
    md: 'text-[11px] gap-2.5',
    lg: 'text-xs gap-3',
  };

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* 3D Gradient Squircle Icon with Filled White Open Book */}
      <div
        className={`relative shrink-0 flex items-center justify-center ${iconSizes[size]} bg-gradient-to-br from-[#2f70f6] via-[#4361ee] to-[#8a3ffc] text-white ring-2 ring-white/40 border border-white/20 group-hover:scale-105 transition-transform duration-300`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgSizes[size]} text-white drop-shadow-md`}
        >
          {/* Left Page (Solid White with gentle curve) */}
          <path
            d="M12 16 C 20 13, 27 15, 30 18 L 30 48 C 27 45, 20 43, 12 46 Z"
            fill="white"
          />
          {/* Right Page (Solid White with gentle curve) */}
          <path
            d="M52 16 C 44 13, 37 15, 34 18 L 34 48 C 37 45, 44 43, 52 46 Z"
            fill="white"
          />
          {/* Curved Bottom Outline Spine */}
          <path
            d="M12 47.5 C 20 44.5, 28 46.5, 32 49.5 C 36 46.5, 44 44.5, 52 47.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Typography Header */}
      <div className="flex flex-col justify-center">
        {/* Main Title: UNIVERSITY LIBRARY */}
        <div className={`font-black font-poppins leading-none flex items-center gap-1.5 ${titleSizes[size]}`}>
          <span className={isDark ? 'text-white' : 'text-[#0a1128]'}>UNIVERSITY</span>
          <span className="bg-gradient-to-r from-[#2563eb] via-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
            LIBRARY
          </span>
        </div>

        {/* Subtitle with Gradient Flanking Lines: —— ENTERPRISE PORTAL —— */}
        <div className="flex items-center gap-2 mt-1 w-full">
          <span className="flex-1 h-[2px] bg-gradient-to-r from-[#2563eb] to-[#4f46e5] rounded-full" />
          <span
            className={`font-bold uppercase font-sans whitespace-nowrap leading-none ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            } ${sublineTextSizes[size]}`}
          >
            ENTERPRISE PORTAL
          </span>
          <span className="flex-1 h-[2px] bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] rounded-full" />
        </div>

        {/* Optional Tagline: Learn • Explore • Discover • Grow */}
        {showTagline && (
          <div
            className={`flex items-center justify-between text-slate-500 font-medium tracking-wide mt-1 leading-none ${taglineSizes[size]}`}
          >
            <span>Learn</span>
            <span className="text-blue-500 text-[9px]">•</span>
            <span>Explore</span>
            <span className="text-indigo-500 text-[9px]">•</span>
            <span>Discover</span>
            <span className="text-purple-500 text-[9px]">•</span>
            <span>Grow</span>
          </div>
        )}
      </div>
    </div>
  );
}
