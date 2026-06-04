import React from 'react';

export const BarLabel = (props: any) => {
  const { x, y, width, height, value, dataKey } = props;
  if (!value || value === 0) return null;

  const isMale = dataKey === 'male';
  const color = isMale ? '#1d4ed8' : '#be185d';
  
  const displayValue = Math.round(Number(value));

  // Si la barra es lo suficientemente alta, renderizamos adentro
  if (height >= 16) {
    return (
      <text 
        x={x + width / 2} 
        y={y + height / 2} 
        fill="#ffffff" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={9}
        fontWeight={800}
      >
        {displayValue}%
      </text>
    );
  }

  // Si la barra es pequeña, sacamos el número con una pequeña flecha indicadora
  const lineY = y + height / 2;
  const labelX = isMale ? x - 25 : x + width + 25;
  const isTooSmall = height < 2; // Si es casi invisible, ocultamos el texto para no saturar

  if (isTooSmall) return null;

  return (
    <g>
      <path 
        d={`M ${isMale ? x : x + width} ${lineY} L ${isMale ? x - 8 : x + width + 8} ${lineY} L ${isMale ? x - 12 : x + width + 12} ${isMale ? lineY + 6 : lineY - 6}`} 
        stroke={color} 
        strokeWidth={1.5} 
        fill="none" 
      />
      <text 
        x={labelX} 
        y={isMale ? lineY + 6 : lineY - 6} 
        fill={color} 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={9}
        fontWeight={800}
      >
        {displayValue}%
      </text>
    </g>
  );
};
