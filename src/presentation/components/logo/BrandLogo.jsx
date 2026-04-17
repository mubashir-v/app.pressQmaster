import React from 'react';

export default function BrandLogo({ className = "w-10 h-10" }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pressGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A8E9E" />
          <stop offset="1" stopColor="#0A243F" />
        </linearGradient>
      </defs>
      
      {/* Outer sleek rounded container */}
      <rect width="200" height="200" rx="48" fill="url(#pressGrad)" className="shadow-2xl" />
      
      {/* Inner graphic: Minimalist offset roller / cascading 'P' for Press */}
      {/* Paper track 1 (Mint) */}
      <path d="M140 50 H90 C78.954 50 70 58.954 70 70 V150" stroke="#E9F5F6" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Paper track 2 (Teal interaction) */}
      <path d="M150 90 H120 C108.954 90 100 98.954 100 110 V150" stroke="#E9F5F6" strokeOpacity="0.6" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Action Roller (Mint core) */}
      <circle cx="140" cy="140" r="14" fill="#E9F5F6" />
    </svg>
  );
}