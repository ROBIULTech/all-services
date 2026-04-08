import React from 'react';

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
      <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
    </defs>
    
    {/* Top Blue Arc */}
    <path d="M 75 35 C 75 15 25 15 25 40 C 25 55 40 60 50 60" stroke="url(#blueGrad)" strokeWidth="16" strokeLinecap="round" />
    
    {/* Middle Orange Arc */}
    <path d="M 30 45 C 50 45 75 50 75 70 C 75 90 25 90 25 70" stroke="url(#orangeGrad)" strokeWidth="16" strokeLinecap="round" />
    
    {/* Bottom Yellow Arc */}
    <path d="M 25 70 C 25 85 50 90 65 80" stroke="url(#yellowGrad)" strokeWidth="16" strokeLinecap="round" />

    {/* Star */}
    <path d="M 85 15 L 88 22 L 95 25 L 88 28 L 85 35 L 82 28 L 75 25 L 82 22 Z" fill="#0ea5e9" />
  </svg>
);
