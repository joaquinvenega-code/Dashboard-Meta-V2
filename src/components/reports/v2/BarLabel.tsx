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
  const isTooSmall = height < 2; // Si es casi invisible, ocultamos el texto para no saturar

  if (isTooSmall) return null;

  // Reducimos las distancias horizontales para evitar superposición con barras adyacentes
  const offsetX = 14;
  const labelX = isMale ? x - offsetX : x + width + offsetX;
  
  // Desplazamos hacia ARRIBA (y disminuye) para evitar colisionar con el eje X abajo
  const textY = lineY - 14;

  return (
    <g>
      <path 
        d={`M ${isMale ? x : x + width} ${lineY} L ${isMale ? x - 6 : x + width + 6} ${lineY} L ${isMale ? x - 10 : x + width + 10} ${textY}`} 
        stroke={color} 
        strokeWidth={1.5} 
        fill="none" 
      />
      <text 
        x={isMale ? x - 12 : x + width + 12} 
        y={textY} 
        fill={color} 
        textAnchor={isMale ? 'end' : 'start'} 
        dominantBaseline="central"
        fontSize={10}
        fontWeight={900}
      >
        {displayValue}%
      </text>
    </g>
  );
};
