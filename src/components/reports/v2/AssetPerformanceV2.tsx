import React, { useState, useMemo } from 'react';
import { Trophy, ChevronDown, Star, Target, DollarSign, ShoppingBag, ImageOff } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

type SortCriteria = 'roas' | 'purchases' | 'revenue';

interface AdAsset {
  id: string;
  name: string;
  thumbnail: string;
  originalThumbnailUrl?: string;
  previewUrl?: string;
  roas: number;
  purchases: number;
  revenue: number;
  spend: number;
}

interface AssetPerformanceV2Props {
  assets: AdAsset[];
}

export const AssetPerformanceV2: React.FC<AssetPerformanceV2Props> = ({ assets }) => {
  const [sortBy, setSortBy] = useState<SortCriteria>('roas');

  const sortedAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, 5);
  }, [assets, sortBy]);

  const criteriaLabels = {
    roas: 'Mayor ROAS',
    purchases: 'Más Conversiones',
    revenue: 'Mayor Facturación'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priorizar por:</span>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200 transition-all">
              {criteriaLabels[sortBy]}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              {(Object.keys(criteriaLabels) as SortCriteria[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors",
                    sortBy === key ? "text-blue-600 bg-blue-50" : "text-slate-600"
                  )}
                >
                  {criteriaLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {sortedAssets.map((ad, index) => (
          <div key={ad.id} className="relative group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all shadow-sm print:break-inside-avoid">
            <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-slate-900/90 text-white flex items-center justify-center text-[10px] font-black border border-white/20">
              #{index + 1}
            </div>
            
            <div className="aspect-square relative overflow-hidden bg-slate-100 flex items-center justify-center">
              <img 
                src={ad.thumbnail} 
                alt={ad.name}
                data-original={ad.originalThumbnailUrl || ad.thumbnail}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.getAttribute('data-retried') && ad.originalThumbnailUrl && ad.originalThumbnailUrl !== ad.thumbnail) {
                    img.setAttribute('data-retried', 'true');
                    img.src = ad.originalThumbnailUrl;
                  } else {
                    img.style.display = 'none';
                    const placeholder = img.parentElement?.querySelector('.ad-placeholder');
                    if (placeholder) placeholder.classList.remove('hidden');
                  }
                }}
                style={{ 
                  WebkitFontSmoothing: 'antialiased',
                  imageRendering: 'crisp-edges',
                  transform: 'translateZ(0)'
                }}
              />
              <div className={`ad-placeholder absolute inset-0 z-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 gap-2 ${ad.thumbnail ? 'hidden' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <ImageOff className="w-4 h-4 text-slate-400" strokeWidth={2} />
                </div>
                <span className="text-[8px] uppercase font-black tracking-widest text-slate-400">Sin Previsualización</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
            </div>

            <div className="p-2 flex flex-col flex-1">
              <div className="flex-1 flex flex-col">
                <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-tight mb-2">{ad.name}</h4>
                
                <div className="grid grid-cols-2 gap-1.5 mt-auto pb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Target className="w-2 h-2 text-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">ROAS</span>
                    </div>
                    <p className="text-xs font-black text-slate-900">{ad.roas.toFixed(2)}x</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="w-2 h-2 text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Ventas</span>
                    </div>
                    <p className="text-xs font-black text-slate-900">{ad.purchases}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 shrink-0">
                <div className="flex flex-col text-left">
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-tight print:text-[7.5px]">Facturación</span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-900 leading-none mt-0.5 print:text-[9.5px]">{formatCurrency(ad.revenue, 'ARS')}</span>
                </div>
                {ad.previewUrl && (
                  <a 
                    href={ad.previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded flex items-center justify-center transition-colors print:hidden"
                  >
                    Ver Anuncio
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
