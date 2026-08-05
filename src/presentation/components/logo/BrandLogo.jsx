import React from 'react';

export default function BrandLogo({ className = "w-10 h-10" }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sharp square container – gov-blue */}
      <rect width="200" height="200" fill="#1a3a6b" />

      {/* Inner graphic: offset roller / cascading paths */}
      <path d="M140 50 H90 C78.954 50 70 58.954 70 70 V150" stroke="#e8eef5" strokeWidth="18" strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M150 90 H120 C108.954 90 100 98.954 100 110 V150" stroke="#e8eef5" strokeOpacity="0.6" strokeWidth="18" strokeLinecap="square" strokeLinejoin="miter" />
      <rect x="126" y="126" width="28" height="28" fill="#e8eef5" />
    </svg>
  );
}
