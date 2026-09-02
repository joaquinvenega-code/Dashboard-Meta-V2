import React from 'react';
export const reportChartColors = ['#2563eb', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b', '#06b6d4', '#84cc16'];
export function ReportDonut({ values, label, center, caption }: { values: number[]; label: string; center: string; caption: string }) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const circumference = 2 * Math.PI * 48;
  let offset = 0;
  return <svg viewBox="0 0 140 140" className="report-donut-svg" role="img" aria-label={label}>
    <circle cx="70" cy="70" r="48" fill="none" stroke="#e2e8f0" strokeWidth="17" />
    {values.map((value, index) => {
      const length = total ? Math.max(0, value) / total * circumference : 0;
      const start = offset; offset += length;
      return length > 0 && <circle key={index} cx="70" cy="70" r="48" fill="none" stroke={reportChartColors[index % reportChartColors.length]} strokeWidth="17" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 70 70)" />;
    })}
    <text x="70" y="70" textAnchor="middle" fill="currentColor" fontSize="20" fontWeight="750">{center}</text>
    <text x="70" y="88" textAnchor="middle" fill="#64748b" fontSize="9">{caption}</text>
  </svg>;
}
