import React, { useMemo, useState, useRef } from 'react';
import { Globe, DollarSign, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import worldCountries from '../../assets/data/world_countries.json';

interface CountrySales {
  countryId: string; // ISO Alpha-3 (e.g. "USA", "ARG", "ESP")
  salesVolume: number;
  totalRevenue: number;
}

interface GlobalSalesMapProps {
  salesData?: CountrySales[];
  currency?: string;
}

// Low-resolution default sales data to avoid empty map screen
const DEFAULT_SALES_DATA: CountrySales[] = [
  { countryId: 'USA', salesVolume: 1540, totalRevenue: 135400 },
  { countryId: 'ARG', salesVolume: 1210, totalRevenue: 84200 },
  { countryId: 'ESP', salesVolume: 820, totalRevenue: 62500 },
  { countryId: 'BRA', salesVolume: 610, totalRevenue: 41800 },
  { countryId: 'MEX', salesVolume: 580, totalRevenue: 38200 },
  { countryId: 'CAN', salesVolume: 520, totalRevenue: 45600 },
  { countryId: 'GBR', salesVolume: 490, totalRevenue: 39500 },
  { countryId: 'DEU', salesVolume: 470, totalRevenue: 36200 },
  { countryId: 'FRA', salesVolume: 410, totalRevenue: 31400 },
  { countryId: 'COL', salesVolume: 340, totalRevenue: 18600 },
  { countryId: 'CHL', salesVolume: 290, totalRevenue: 16500 },
  { countryId: 'JPN', salesVolume: 250, totalRevenue: 24800 },
  { countryId: 'AUS', salesVolume: 210, totalRevenue: 19500 },
  { countryId: 'IND', salesVolume: 180, totalRevenue: 11200 },
];

export const GlobalSalesMap: React.FC<GlobalSalesMapProps> = ({ 
  salesData = DEFAULT_SALES_DATA,
  currency = 'USD'
}) => {
  const [hoveredCountry, setHoveredCountry] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Index sales data by countryId for fast O(1) checks
  const salesMap = useMemo(() => {
    const map = new Map<string, CountrySales>();
    salesData.forEach(item => {
      map.set(item.countryId.toUpperCase(), item);
    });
    return map;
  }, [salesData]);

  // Find max sales volume for normalization
  const maxSalesVolume = useMemo(() => {
    if (salesData.length === 0) return 1;
    return Math.max(...salesData.map(item => item.salesVolume), 1);
  }, [salesData]);

  // Miller Cylindrical Projection Converter
  const project = useMemo(() => {
    const width = 1010;
    const height = 660;
    
    return (lng: number, lat: number) => {
      // 1. Longitude mapping
      const x = ((lng + 180) * width) / 360;
      
      // 2. Latitude clamping (-80 to 82 is ideal to crop barren poles)
      const latClamped = Math.max(-60, Math.min(82, lat));
      const latRad = (latClamped * Math.PI) / 180;
      
      // 3. Miller cylindrical mathematical conversion
      const y = (height / 2) - 1.25 * (width / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));
      
      // Shift down slightly to focus on habitated land mass
      const finalY = y + 35;
      
      return `${x.toFixed(1)},${finalY.toFixed(1)}`;
    };
  }, []);

  // Parse geometries into SVG paths
  const countryPaths = useMemo(() => {
    return worldCountries.features.map((feature: any) => {
      const geometry = feature.geometry;
      if (!geometry) return { ...feature, pathData: '' };

      const { type, coordinates } = geometry;
      let pathData = '';

      if (type === 'Polygon') {
        pathData = coordinates
          .map((ring: any[]) => {
            const points = ring.map((coord) => project(coord[0], coord[1]));
            return `M${points.join('L')}Z`;
          })
          .join(' ');
      } else if (type === 'MultiPolygon') {
        pathData = coordinates
          .map((polygon: any[][]) => {
            return polygon
              .map((ring: any[]) => {
                const points = ring.map((coord) => project(coord[0], coord[1]));
                return `M${points.join('L')}Z`;
              })
              .join(' ');
          })
          .join(' ');
      }

      return {
        ...feature,
        pathData
      };
    });
  }, [project]);

  // Interpolate RGB color for heat intensity
  const getCountryColor = (isoCode: string) => {
    const sale = salesMap.get(isoCode.toUpperCase());
    if (!sale || sale.salesVolume === 0) {
      // Return beautiful slate-navy for a high-contrast dark map
      return '#1e2640'; 
    }

    // Dynamic temperature scale between 0.12 and 1.0 for better visibility
    const intensity = Math.max(0.15, sale.salesVolume / maxSalesVolume);
    
    // Smooth transition from radiant warm gold to glowing active red
    const startColor = { r: 245, g: 158, b: 11 }; // Amber-500
    const endColor = { r: 239, g: 68, b: 68 };    // Red-500

    const r = Math.round(startColor.r + (endColor.r - startColor.r) * intensity);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * intensity);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * intensity);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Format currency values based on active account context
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Position tooltip 15px to the right and 15px down from cursor relative to current map container
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15
    });
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSales = salesData.reduce((acc, curr) => acc + curr.salesVolume, 0);
    const totalRev = salesData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    return {
      totalSales,
      totalRev,
      countriesCount: salesData.filter(s => s.salesVolume > 0).length
    };
  }, [salesData]);

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col gap-6 select-none relative animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-900" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Distribución Geográfica
            </span>
          </div>
          <h4 className="text-lg font-black uppercase text-slate-900 leading-tight">
            Mapa de Ventas Global
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Volumen de conversiones BOFU y facturación total generada por país en tiempo real.
          </p>
        </div>

        {/* TOP MINI METRICS BANNER */}
        <div className="flex flex-wrap items-center gap-6 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 shadow-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Operaciones Activas</span>
            <span className="text-xs font-black text-slate-900 font-mono">{summary.countriesCount} Países</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-200" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Volumen Total BOFU</span>
            <span className="text-xs font-black text-slate-900 font-mono">{summary.totalSales.toLocaleString('es-AR')} Conversiones</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-200" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Facturación Consolidada</span>
            <span className="text-xs font-black text-rose-600 font-mono">{formatValue(summary.totalRev)}</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SVG MAP AREA */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCountry(null)}
        className="relative bg-[#0b0f19] rounded-2xl border border-slate-950 p-2 overflow-hidden flex items-center justify-center w-full shadow-inner"
        style={{ minHeight: '380px' }}
      >
        <svg 
          viewBox="0 0 1010 660" 
          className="w-full h-auto max-h-[500px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background / Ocean Glow / subtle map mesh */}
          <rect width="1010" height="660" fill="transparent" />

          {/* Render Countries list */}
          <g id="world-map-paths" className="transition-all">
            {countryPaths.map((country) => {
              if (!country.pathData) return null;

              const sale = salesMap.get(country.id.toUpperCase());
              const isHasSales = !!sale && sale.salesVolume > 0;
              const isHovered = hoveredCountry?.id === country.id;

              return (
                <path
                  key={country.id}
                  d={country.pathData}
                  fill={getCountryColor(country.id)}
                  stroke={isHovered ? '#ffffff' : '#0b0f19'}
                  strokeWidth={isHovered ? '1.5' : '0.5'}
                  style={{
                    cursor: isHasSales ? 'pointer' : 'default',
                    transition: 'fill 300ms ease, stroke 200ms ease, stroke-width 200ms ease, filter 200ms ease'
                  }}
                  className={`transition-all ${isHasSales ? 'hover:brightness-110 hover:opacity-100 active:scale-[0.99]' : 'opacity-85 hover:opacity-95'}`}
                  onMouseEnter={() => {
                    setHoveredCountry({
                      id: country.id,
                      name: country.properties.name,
                      salesVolume: sale?.salesVolume || 0,
                      totalRevenue: sale?.totalRevenue || 0,
                      active: isHasSales
                    });
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* FLOATING ABSOLUTE TOOLTIP */}
        <AnimatePresence>
          {hoveredCountry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                left: tooltipPos.x,
                top: tooltipPos.y,
                pointerEvents: 'none',
                zIndex: 150
              }}
              className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl border border-slate-150 p-4 shadow-xl min-w-[210px] flex flex-col gap-2.5 outline-none"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  País (ISO: {hoveredCountry.id})
                </span>
                <div className={`w-2 h-2 rounded-full ${hoveredCountry.active ? 'bg-emerald-500 blink-slow' : 'bg-slate-300'}`} />
              </div>
              
              <h5 className="font-black text-sm uppercase text-slate-900 tracking-wide font-sans m-0">
                {hoveredCountry.name}
              </h5>

              {hoveredCountry.active ? (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex justify-between items-center text-[10px] font-medium text-slate-650">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                      Conversiones BOFU:
                    </span>
                    <strong className="font-extrabold text-slate-900 font-mono text-xs">
                      {hoveredCountry.salesVolume.toLocaleString('es-AR')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-medium text-slate-650">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      Facturación Total:
                    </span>
                    <strong className="font-black text-rose-600 font-mono text-xs">
                      {formatValue(hoveredCountry.totalRevenue)}
                    </strong>
                  </div>
                </div>
              ) : (
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest font-mono">
                  Sin Conversiones
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER METADATA BAR */}
      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 font-sans font-medium">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>Gradiente termográfico: tonos cálidos representan mayor volumen de conversión.</span>
        </div>
        <span className="uppercase text-slate-350 tracking-widest font-bold">ORION GLOBAL GEOGRAPHY INSIGHTS</span>
      </div>
    </div>
  );
};
