import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let colorStyles = 'text-neutral-400 border-neutral-700 bg-neutral-500/10';

  switch (status) {
    case 'Confirmed_Phishing':
      colorStyles = 'text-red-400 border-red-500/40 bg-red-500/10';
      break;
    case 'Suspect':
      colorStyles = 'text-amber-400 border-amber-400/40 bg-amber-400/10';
      break;
    case 'Benign':
      colorStyles = 'text-sky-400 border-sky-400/40 bg-sky-400/10';
      break;
    case 'Official':
      colorStyles = 'text-[#22ff88] border-[#22ff88]/40 bg-[#22ff88]/10';
      break;
    case 'Pending':
    default:
      colorStyles = 'text-neutral-400 border-neutral-600/40 bg-neutral-500/10';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider ${colorStyles}`}
    >
      {status?.replace('_', ' ')}
    </span>
  );
}

