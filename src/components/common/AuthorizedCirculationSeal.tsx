import React from 'react';
import { ShieldCheck, CheckCircle2, Award, BookOpen, Stamp } from 'lucide-react';

export interface AuthorizedCirculationSealProps {
  type?: 'CIRCULATION' | 'FINE_PAYMENT' | 'NO_DUE' | 'GENERAL';
  date?: string;
  officerName?: string;
  receiptNo?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'stamp' | 'badge' | 'full';
  className?: string;
}

export default function AuthorizedCirculationSeal({
  type = 'CIRCULATION',
  date,
  officerName = 'Chief Circulation Officer',
  receiptNo,
  size = 'md',
  variant = 'stamp',
  className = '',
}: AuthorizedCirculationSealProps) {
  const displayDate = date || new Date().toISOString().split('T')[0];

  const config = {
    CIRCULATION: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ AUTHORIZED CIRCULATION DESK ★',
      centerTag: 'ISSUED & VERIFIED',
      accentColor: '#1e3a8a', // Deep Blue
      borderColor: 'border-blue-900/40 text-blue-900 bg-blue-50/50',
      fillColor: '#eff6ff',
      textColor: '#1e3a8a',
      icon: BookOpen,
      codePrefix: 'CIR-SEAL',
    },
    FINE_PAYMENT: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ ACCOUNTS & FINES CLEARED ★',
      centerTag: 'PAID & VERIFIED',
      accentColor: '#065f46', // Emerald
      borderColor: 'border-emerald-900/40 text-emerald-900 bg-emerald-50/50',
      fillColor: '#ecfdf5',
      textColor: '#065f46',
      icon: CheckCircle2,
      codePrefix: 'FIN-RCP',
    },
    NO_DUE: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ NO DUE CLEARANCE CERTIFIED ★',
      centerTag: '100% AUDITED & CLEARED',
      accentColor: '#4338ca', // Indigo
      borderColor: 'border-indigo-900/40 text-indigo-900 bg-indigo-50/50',
      fillColor: '#eef2ff',
      textColor: '#4338ca',
      icon: Award,
      codePrefix: 'NDC-SEAL',
    },
    GENERAL: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ OFFICIAL REPOSITORY DESK ★',
      centerTag: 'OFFICIALLY VERIFIED',
      accentColor: '#334155', // Slate
      borderColor: 'border-slate-800/40 text-slate-800 bg-slate-50/50',
      fillColor: '#f8fafc',
      textColor: '#334155',
      icon: ShieldCheck,
      codePrefix: 'UNIV-SEAL',
    },
  }[type];

  const sizeStyles = {
    sm: {
      dim: 'w-24 h-24',
      fontSize: 'text-[7px]',
      centerSize: 'text-[9px]',
      iconSize: 'w-4 h-4',
    },
    md: {
      dim: 'w-32 h-32',
      fontSize: 'text-[9px]',
      centerSize: 'text-[11px]',
      iconSize: 'w-5 h-5',
    },
    lg: {
      dim: 'w-40 h-40',
      fontSize: 'text-[10px]',
      centerSize: 'text-xs',
      iconSize: 'w-6 h-6',
    },
  }[size];

  const Icon = config.icon;

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-extrabold shadow-xs ${config.borderColor} ${className}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <div className="flex flex-col text-left leading-tight">
          <span className="uppercase text-[9px] tracking-wider text-slate-500">Official Seal</span>
          <span>{config.centerTag}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{ transform: 'rotate(-4deg)' }}
      title="Official University Library Authorized Circulation Seal"
    >
      {/* SVG Circular Stamp */}
      <svg
        viewBox="0 0 160 160"
        className={`${sizeStyles.dim} filter drop-shadow-xs transition-transform hover:scale-105`}
        style={{ color: config.accentColor }}
      >
        {/* Outer Sawtooth / Double Ring */}
        <circle
          cx="80"
          cy="80"
          r="76"
          fill="none"
          stroke={config.accentColor}
          strokeWidth="2.5"
          strokeDasharray="4 2"
          opacity="0.85"
        />
        <circle
          cx="80"
          cy="80"
          r="71"
          fill="none"
          stroke={config.accentColor}
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Inner Ring */}
        <circle
          cx="80"
          cy="80"
          r="52"
          fill="none"
          stroke={config.accentColor}
          strokeWidth="1.5"
          strokeDasharray="2 1"
          opacity="0.8"
        />
        <circle
          cx="80"
          cy="80"
          r="48"
          fill="none"
          stroke={config.accentColor}
          strokeWidth="1.2"
        />

        {/* Circular Top Path */}
        <defs>
          <path
            id="topCurve"
            d="M 22 80 A 58 58 0 0 1 138 80"
            fill="none"
          />
          <path
            id="bottomCurve"
            d="M 138 80 A 58 58 0 0 1 22 80"
            fill="none"
          />
        </defs>

        {/* Top Circular Text */}
        <text
          fontSize="9.5"
          fontWeight="900"
          letterSpacing="1.2"
          fill={config.accentColor}
          opacity="0.95"
        >
          <textPath href="#topCurve" startOffset="50%" textAnchor="middle">
            {config.topText}
          </textPath>
        </text>

        {/* Bottom Circular Text */}
        <text
          fontSize="8.5"
          fontWeight="900"
          letterSpacing="1.1"
          fill={config.accentColor}
          opacity="0.95"
        >
          <textPath href="#bottomCurve" startOffset="50%" textAnchor="middle">
            {config.bottomText}
          </textPath>
        </text>

        {/* Center Content */}
        {/* Decorative Stars */}
        <text x="80" y="58" textAnchor="middle" fontSize="10" fill={config.accentColor}>
          ★ ★ ★
        </text>

        {/* Main Center Badge */}
        <rect
          x="28"
          y="63"
          width="104"
          height="22"
          rx="4"
          fill={config.accentColor}
          opacity="0.95"
        />
        <text
          x="80"
          y="77"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="900"
          letterSpacing="0.8"
          fill="#ffffff"
        >
          {config.centerTag}
        </text>

        {/* Date & Seal Details */}
        <text
          x="80"
          y="95"
          textAnchor="middle"
          fontSize="8"
          fontWeight="800"
          fontFamily="monospace"
          fill={config.accentColor}
        >
          {displayDate}
        </text>
        <text
          x="80"
          y="105"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="700"
          letterSpacing="0.5"
          fill={config.accentColor}
          opacity="0.8"
        >
          AUTH CIRCULATION DESK
        </text>
      </svg>
    </div>
  );
}

/**
 * Generates an SVG string representation for print windows / raw HTML printing
 */
export function generateAuthorizedSealHtml(
  type: 'CIRCULATION' | 'FINE_PAYMENT' | 'NO_DUE' | 'GENERAL' = 'CIRCULATION',
  date?: string
): string {
  const displayDate = date || new Date().toISOString().split('T')[0];

  const config = {
    CIRCULATION: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ AUTHORIZED CIRCULATION DESK ★',
      centerTag: 'ISSUED & VERIFIED',
      accentColor: '#1e3a8a',
    },
    FINE_PAYMENT: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ ACCOUNTS & FINES CLEARED ★',
      centerTag: 'PAID & VERIFIED',
      accentColor: '#065f46',
    },
    NO_DUE: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ NO DUE CLEARANCE CERTIFIED ★',
      centerTag: 'AUDITED & CLEARED',
      accentColor: '#4338ca',
    },
    GENERAL: {
      topText: 'CENTRAL UNIVERSITY LIBRARY',
      bottomText: '★ OFFICIAL REPOSITORY DESK ★',
      centerTag: 'OFFICIALLY VERIFIED',
      accentColor: '#334155',
    },
  }[type];

  return `
    <div style="display: inline-block; transform: rotate(-4deg); text-align: center;">
      <svg viewBox="0 0 160 160" width="125" height="125" style="color: ${config.accentColor};">
        <circle cx="80" cy="80" r="76" fill="none" stroke="${config.accentColor}" stroke-width="2.5" stroke-dasharray="4 2" opacity="0.85" />
        <circle cx="80" cy="80" r="71" fill="none" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.9" />
        <circle cx="80" cy="80" r="52" fill="none" stroke="${config.accentColor}" stroke-width="1.5" stroke-dasharray="2 1" opacity="0.8" />
        <circle cx="80" cy="80" r="48" fill="none" stroke="${config.accentColor}" stroke-width="1.2" />
        <defs>
          <path id="topCurve_${type}" d="M 22 80 A 58 58 0 0 1 138 80" fill="none" />
          <path id="bottomCurve_${type}" d="M 138 80 A 58 58 0 0 1 22 80" fill="none" />
        </defs>
        <text font-size="9.5" font-weight="900" letter-spacing="1.2" fill="${config.accentColor}" opacity="0.95">
          <textPath href="#topCurve_${type}" startOffset="50%" text-anchor="middle">
            ${config.topText}
          </textPath>
        </text>
        <text font-size="8.5" font-weight="900" letter-spacing="1.1" fill="${config.accentColor}" opacity="0.95">
          <textPath href="#bottomCurve_${type}" startOffset="50%" text-anchor="middle">
            ${config.bottomText}
          </textPath>
        </text>
        <text x="80" y="58" text-anchor="middle" font-size="10" fill="${config.accentColor}">★ ★ ★</text>
        <rect x="28" y="63" width="104" height="22" rx="4" fill="${config.accentColor}" opacity="0.95" />
        <text x="80" y="77" text-anchor="middle" font-size="8.5" font-weight="900" letter-spacing="0.8" fill="#ffffff">
          ${config.centerTag}
        </text>
        <text x="80" y="95" text-anchor="middle" font-size="8" font-weight="800" font-family="monospace" fill="${config.accentColor}">
          ${displayDate}
        </text>
        <text x="80" y="105" text-anchor="middle" font-size="6.5" font-weight="700" letter-spacing="0.5" fill="${config.accentColor}" opacity="0.8">
          AUTH CIRCULATION DESK
        </text>
      </svg>
    </div>
  `;
}
