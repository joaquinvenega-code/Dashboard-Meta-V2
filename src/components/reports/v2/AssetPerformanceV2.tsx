import React, { useState, useMemo } from 'react';
import { Trophy, ChevronDown, Star, Target, DollarSign, ShoppingBag, ImageOff } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

type SortCriteria = 'roas' | 'purchases' | 'revenue';

interface AdAsset {
  id: string;
  name: string;
  thumbnail: string;
  originalThumbnailUrl?: string;
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
          <div key={ad.id} className="relative group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all shadow-sm">
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
              <div className={`ad-placeholder absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#050505] text-neutral-600 gap-3 ${ad.thumbnail ? 'hidden' : ''}`}>
                <ImageOff className="w-8 h-8 print:text-neutral-400" strokeWidth={1} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#444] print:text-neutral-500">Sin miniatura</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
            </div>

            <div className="p-2 space-y-2 flex-1">
              <h4 className="text-[9px] font-bold text-slate-800 line-clamp-1 uppercase tracking-tight">{ad.name}</h4>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Target className="w-2 h-2 text-blue-500" />
                    <span className="text-[7px] font-black text-slate-400 uppercase">ROAS</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-900">{ad.roas.toFixed(2)}x</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-2 h-2 text-emerald-500" />
                    <span className="text-[7px] font-black text-slate-400 uppercase">Ventas</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-900">{ad.purchases}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Facturación</span>
                  <span className="text-[9px] font-black text-slate-900">{formatCurrency(ad.revenue, 'ARS')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
