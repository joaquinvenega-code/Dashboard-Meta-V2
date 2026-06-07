import React from 'react';
import { formatCurrency } from '../../../lib/utils';

export const BarLabel = (props: any) => {
  const { x, y, width, height, value, isCurrency, currency } = props;
  if (!value || value === 0) return null;

  const color = '#047857'; // Darker green for text inside/above green bar
  
  let displayValueStr = '';
  if (isCurrency) {
    if (value >= 1000000) {
      displayValueStr = `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      displayValueStr = `$${(value / 1000).toFixed(0)}k`;
    } else {
      displayValueStr = `$${value.toFixed(0)}`;
    }
  } else {
    displayValueStr = `${Math.round(Number(value))}%`;
  }

  // Siempre renderizamos el número arriba de la barra para mejor legibilidad
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill={color} 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize={10}
      fontWeight={900}
    >
      {displayValueStr}
    </text>
  );
};
