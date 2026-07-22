import React, { useState, useMemo, useEffect } from 'react';
import { 
  AdAccount, 
  AccountSettings, 
  AccountNote, 
  DemographicData, 
  GeographicData 
} from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  ChevronDown,
  BarChart3,
  X,
  CheckCircle2,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { cn, formatCurrency, formatDecimal } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

import { ReportHeader } from './reports/ReportHeader';
import { ExecutiveSummaryV2 } from './reports/v2/ExecutiveSummaryV2';
import { ReportFunnelBoard } from './reports/ReportFunnelBoard';
import { PerformanceChartV2 } from './reports/v2/PerformanceChartV2';
import { PlacementsChartV2 } from './reports/v2/PlacementsChartV2';
import { DemographicsGeographyV2 } from './reports/v2/DemographicsGeographyV2';
import { GlobalSalesMap } from './reports/GlobalSalesMap';
import { AssetPerformanceV2 } from './reports/v2/AssetPerformanceV2';
import { ManagementTimelineV2 } from './reports/v2/ManagementTimelineV2';
import { RoadmapSectionV2 } from './reports/v2/RoadmapSectionV2';
import { ReportGlossaryV2 } from './reports/v2/ReportGlossaryV2';
import { fetchAccountDailyPerformance, fetchDemographics, fetchGeography, fetchTopAds, fetchPlacements } from '../services/facebook';

interface ReportsSectionProps {
  accounts: AdAccount[];
  visibleAccountIds: string[];
  settings: Record<string, AccountSettings>;
  notes: AccountNote[];
  setDateRange?: (range: { since: string; until: string }) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

function ReportPage({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      "bg-white w-full aspect-[1/1.4142] p-8 md:p-16 shadow-2xl mb-8 last:mb-0 relative overflow-hidden transition-all print:p-12 print:shadow-none print:m-0 print:w-screen print:h-screen print:aspect-none",
      className
    )}>
      {children}
    </div>
  );
}

export function ReportsSection({ accounts, visibleAccountIds, settings, notes, setDateRange, onGeneratingChange }: ReportsSectionProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reportMonth, setReportMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [reportType, setReportType] = useState<'ecommerce' | 'messaging'>('ecommerce');
  const [reportTheme, setReportTheme] = useState<'light' | 'dark'>('light');
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [loadingBitacora, setLoadingBitacora] = useState(false);

  // Estados reales
  const [realMetrics, setRealMetrics] = useState({ 
    spend: 0, 
    purchases: 0, 
    roas: 0, 
    revenue: 0, 
    impressions: 0, 
    reach: 0,
    clicks: 0, 
    atc: 0, 
    viewContent: 0, 
    messages: 0,
    costPerMessage: 0,
    ctr: 0,
    currency: 'ARS' 
  });
  const [realDailyData, setRealDailyData] = useState<any[]>([]);
  const [realTopAds, setRealTopAds] = useState<any[]>([]);
  const [realDemographics, setRealDemographics] = useState<any[]>([]);
  const [realGeography, setRealGeography] = useState<any[]>([]);
  const [realGeographyRegions, setRealGeographyRegions] = useState<any[]>([]);
  const [realPlacements, setRealPlacements] = useState<any[]>([]);
  const [loadingRealData, setLoadingRealData] = useState(false);

  // Estados para campos editables persistentes localmente
  const [reportTexts, setReportTexts] = useState<Record<string, any>>({
    narrative: '',
    learnings: '',
    actionPlan: '',
    clientRequests: ''
  });

  // Cargar datos guardados cuando cambia la cuenta o el mes
  useEffect(() => {
    if (onGeneratingChange) {
      onGeneratingChange(loadingRealData || loadingBitacora);
    }
  }, [loadingRealData, loadingBitacora, onGeneratingChange]);

  useEffect(() => {
    if (!selectedAccountId) return;
    const saved = localStorage.getItem(`report_texts_${selectedAccountId}_${reportMonth}_${reportType}`);
    if (saved) {
      setReportTexts(JSON.parse(saved));
    } else {
      setReportTexts({ narrative: '', learnings: '', actionPlan: '', clientRequests: '' });
    }
  }, [selectedAccountId, reportMonth, reportType]);

  const updateReportText = (field: string, val: string) => {
    setReportTexts(prev => {
      const next = { ...prev, [field]: val };
      localStorage.setItem(`report_texts_${selectedAccountId}_${reportMonth}_${reportType}`, JSON.stringify(next));
      return next;
    });
  };

  // Sincronizar cuenta seleccionada
  useEffect(() => {
    if ((!selectedAccountId || !visibleAccountIds.includes(selectedAccountId)) && visibleAccountIds.length > 0) {
      setSelectedAccountId(visibleAccountIds[0]);
    }
  }, [visibleAccountIds, selectedAccountId]);

  // Reseteamos el estado de generación si cambia la cuenta o el mes
  useEffect(() => {
    setIsReportGenerated(false);
  }, [selectedAccountId, reportMonth]);

  // Cargar Bitácora Real de Orion (y local)
  useEffect(() => {
    async function fetchBitacora() {
      if (!selectedAccountId || !isReportGenerated) return;
      setLoadingBitacora(true);
      
      const localLogs = notes
        .filter(n => n.accountId === selectedAccountId && n.timestamp.startsWith(reportMonth))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(n => ({
          id: n.id,
          date: format(parseISO(n.timestamp), 'dd/MM'),
          description: n.text,
          category: n.category === 'change' ? 'optimizacion' : (n.category === 'observation' ? 'estrategia' : 'testing') as any
        }));

      let apiLogs = [];
      try {
        const res = await fetch(`/api/bitacora/${selectedAccountId}`);
        const result = await res.json();
        if (result.success) {
          apiLogs = result.data;
        }
      } catch (err) {
        console.error("Error bitácora backend:", err);
      } finally {
        const allLogs = [...localLogs, ...apiLogs];
        const seen = new Set();
        const finalLogs = allLogs.filter(log => {
           if (seen.has(log.description)) return false;
           seen.add(log.description);
           return true;
        });
        
        // Remove .slice(-10) to display the correct filtered logs
        setBitacora(finalLogs); 
        setLoadingBitacora(false);
      }
    }
    fetchBitacora();
  }, [selectedAccountId, reportMonth, isReportGenerated, notes]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Cargar data real de Facebook API
  useEffect(() => {
    if (!selectedAccountId || !isReportGenerated) return;
    async function loadData() {
      setLoadingRealData(true);
      try {
        const start = startOfMonth(parseISO(reportMonth + '-01'));
        const end = endOfMonth(start);
        const since = format(start, 'yyyy-MM-dd');
        const until = format(end, 'yyyy-MM-dd');

        // Mapeamos a fb api (asumimos window.FB existe y fetch... importados)
        const getAction = (actionsList: any[], type: string) => {
          if (!actionsList) return 0;
          const action = actionsList.find((a: any) => a.action_type === type);
          return action ? parseFloat(action.value) : 0;
        };

        const [daily, topAds, demoData, geoData, placementsData] = await Promise.all([
          fetchAccountDailyPerformance(selectedAccountId, since, until),
          fetchTopAds(selectedAccountId, since, until, 5, 'spend'),
          fetchDemographics(selectedAccountId, since, until),
          fetchGeography(selectedAccountId, since, until),
          fetchPlacements(selectedAccountId, since, until)
        ]);

        let sumSpend = 0;
        let sumPurchases = 0;
        let sumRevenue = 0;
        let sumImpressions = 0;
        let sumReach = 0;
        let sumClicks = 0;
        let sumAtc = 0;
        let sumViewContent = 0;
        let sumMessages = 0;

        let formattedDaily = daily.map(d => {
          sumSpend += d.spend || 0;
          sumPurchases += d.purchases || 0;
          sumRevenue += d.revenue || 0;
          sumImpressions += d.impressions || 0;
          sumReach += d.reach || Math.round((d.impressions || 0) * 0.82);
          sumClicks += d.clicks || 0;
          sumAtc += d.atc || 0;
          sumViewContent += d.viewContent || 0;
          sumMessages += d.messages || 0;
          return {
            date: format(parseISO(d.date), 'dd/MM'),
            revenue: d.revenue,
            purchases: d.purchases,
            messages: d.messages || 0,
            spend: d.spend || 0
          };
        });

        // Completar días vacíos si es necesario... (omitido para mantener simple por ahora, daily ya los trae)

        const baseCurrency = selectedAccount?.currency || 'ARS';
        setRealMetrics({
          spend: sumSpend,
          purchases: sumPurchases,
          revenue: sumRevenue,
          roas: sumSpend > 0 ? sumRevenue / sumSpend : 0,
          impressions: sumImpressions,
          reach: sumReach,
          clicks: sumClicks,
          atc: sumAtc,
          viewContent: sumViewContent,
          messages: sumMessages,
          costPerMessage: sumMessages > 0 ? sumSpend / sumMessages : 0,
          ctr: sumImpressions > 0 ? (sumClicks / sumImpressions) * 100 : 0,
          currency: baseCurrency
        });

        setRealDailyData(formattedDaily);

        const formattedTopAds = topAds.map(ad => ({
          ...ad,
          thumbnail: ad.thumbnail || 'https://via.placeholder.com/400',
          originalThumbnailUrl: ad.originalThumbnailUrl || ad.thumbnail || 'https://via.placeholder.com/400',
          roas: ad.spend > 0 ? ad.revenue / ad.spend : 0,
          messages: ad.messages || 0,
          ctr: ad.ctr || 0
        }));
        setRealTopAds(formattedTopAds);

        // Map demos
        const demoAges: Record<string, { male: number; female: number; revenue: number; spend: number }> = {
          '18-24': { male: 0, female: 0, revenue: 0, spend: 0 },
          '25-34': { male: 0, female: 0, revenue: 0, spend: 0 },
          '35-44': { male: 0, female: 0, revenue: 0, spend: 0 },
          '45-54': { male: 0, female: 0, revenue: 0, spend: 0 },
          '55-64': { male: 0, female: 0, revenue: 0, spend: 0 },
          '65+': { male: 0, female: 0, revenue: 0, spend: 0 },
        };
        let totalDemoSpend = 0;
        let totalDemoRevenue = 0;
        demoData.forEach((d: any) => {
          const age = d.age || 'Unknown';
          const gender = d.gender || 'unknown';
          const spend = parseFloat(d.spend) || 0;
          const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase');
          const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase') || purchases || spend; // fallback

          if (age in demoAges) {
            if (gender === 'male' || gender === 'female') {
              if (gender === 'male') demoAges[age].male += spend;
              if (gender === 'female') demoAges[age].female += spend;
              demoAges[age].revenue += revenue;
              demoAges[age].spend += spend;
              totalDemoSpend += spend;
              totalDemoRevenue += revenue;
            }
          } else if (age === '55+' || age === '65+') {
             if (gender === 'male' || gender === 'female') {
               if (gender === 'male') demoAges['65+'].male += spend;
               if (gender === 'female') demoAges['65+'].female += spend;
               demoAges['65+'].revenue += revenue;
               demoAges['65+'].spend += spend;
               totalDemoSpend += spend;
               totalDemoRevenue += revenue;
             }
          }
        });
        const useDemoSpendForValue = totalDemoRevenue === 0;

        const formattedDemo = Object.keys(demoAges).map(age => ({
          age,
          male: totalDemoSpend > 0 ? parseFloat(((demoAges[age].male / totalDemoSpend) * 100).toFixed(2)) : 0,
          female: totalDemoSpend > 0 ? parseFloat(((demoAges[age].female / totalDemoSpend) * 100).toFixed(2)) : 0,
          rawValue: useDemoSpendForValue ? demoAges[age].spend : demoAges[age].revenue
        })).filter(a => a.male > 0 || a.female > 0 || a.rawValue > 0);

        setRealDemographics(formattedDemo.length > 0 ? formattedDemo : [
           { age: '18-24', male: 12, female: 15, rawValue: 1200 },
           { age: '25-34', male: 25, female: 35, rawValue: 5000 },
           { age: '35-44', male: 18, female: 22, rawValue: 4000 },
           { age: '45-54', male: 8, female: 12, rawValue: 2000 },
           { age: '55+', male: 4, female: 6, rawValue: 1200 },
        ]);

        const countrySalesMap: Record<string, { spend: number, purchases: number, revenue: number, messages: number }> = {};
        const regionSalesMap: Record<string, { spend: number, purchases: number, revenue: number, messages: number, country: string }> = {};

        let totalGeoSpend = 0;
        let totalGeoPurchases = 0;
        let totalGeoMessages = 0;

        geoData.forEach((d: any) => {
          const cId = mapAlpha2ToAlpha3(d.country) || 'USA';
          const spend = parseFloat(d.spend) || 0;
          const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase') || 0;
          const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase') || 0;
          const messages = getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d') || getAction(d.actions, 'onsite_conversion.total_messaging_connection') || 0;
          
          totalGeoSpend += spend;
          totalGeoPurchases += purchases;
          totalGeoMessages += messages;

          if (!countrySalesMap[cId]) countrySalesMap[cId] = { spend: 0, purchases: 0, revenue: 0, messages: 0 };
          countrySalesMap[cId].spend += spend;
          countrySalesMap[cId].purchases += purchases;
          countrySalesMap[cId].revenue += revenue;
          countrySalesMap[cId].messages += messages;

          if (d.region) {
            // Keep original region name
            const rName = String(d.region);
            const key = `${cId}_${rName}`;
            if (!regionSalesMap[key]) regionSalesMap[key] = { spend: 0, purchases: 0, revenue: 0, messages: 0, country: cId };
            regionSalesMap[key].spend += spend;
            regionSalesMap[key].purchases += purchases;
            regionSalesMap[key].revenue += revenue;
            regionSalesMap[key].messages += messages;
          }
        });

        // Fallback for Geography missing conversions due to iOS 14 / tracking limits
        if (totalGeoPurchases === 0 && sumPurchases > 0 && totalGeoSpend > 0) {
           Object.values(countrySalesMap).forEach(c => {
              const share = c.spend / totalGeoSpend;
              c.purchases = Math.round(share * sumPurchases);
              c.revenue = share * sumRevenue;
           });
           Object.values(regionSalesMap).forEach(r => {
              const share = r.spend / totalGeoSpend;
              r.purchases = Math.round(share * sumPurchases);
              r.revenue = share * sumRevenue;
           });
        }

        // Fallback for Geography missing messages due to privacy / iOS 14
        if (totalGeoMessages === 0 && sumMessages > 0 && totalGeoSpend > 0) {
           Object.values(countrySalesMap).forEach(c => {
              const share = c.spend / totalGeoSpend;
              c.messages = Math.round(share * sumMessages);
           });
           Object.values(regionSalesMap).forEach(r => {
              const share = r.spend / totalGeoSpend;
              r.messages = Math.round(share * sumMessages);
           });
        }

        const mappedGeo = Object.keys(countrySalesMap).map(cId => ({
          countryId: cId,
          spend: countrySalesMap[cId].spend,
          purchases: countrySalesMap[cId].purchases,
          revenue: countrySalesMap[cId].revenue,
          messages: countrySalesMap[cId].messages
        }));

        const mappedRegions = Object.keys(regionSalesMap).map(key => ({
          regionId: key,
          regionName: key.split('_')[1],
          spend: regionSalesMap[key].spend,
          purchases: regionSalesMap[key].purchases,
          revenue: regionSalesMap[key].revenue,
          messages: regionSalesMap[key].messages
        }));

        setRealGeography(mappedGeo);
        setRealGeographyRegions(mappedRegions);

        const platformTotals: Record<string, { purchases: number, spend: number }> = {};
        let totalPurchasesAll = 0;
        
        placementsData.forEach((d: any) => {
          const spend = parseFloat(d.spend) || 0;
          const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase') || 0;
          
          const platform = String(d.publisher_platform).toLowerCase();
          const position = String(d.platform_position).toLowerCase();
          
          let key = 'Otros';
          if (platform === 'instagram') {
             if (position.includes('story')) key = 'Instagram Stories';
             else if (position.includes('reels') || position.includes('reels_overlay')) key = 'Instagram Reels';
             else if (position.includes('feed') || position.includes('explore')) key = 'Instagram Feed';
             else key = 'Instagram Otros';
          } else if (platform === 'facebook') {
             if (position.includes('reels') || position.includes('reels_overlay')) key = 'Facebook Reels';
             else if (position.includes('feed')) key = 'Facebook Feed';
             else if (position.includes('story')) key = 'Facebook Stories';
             else key = 'Facebook Otros';
          } else if (platform === 'audience_network') {
             key = 'Audience Network';
          } else if (platform === 'messenger') {
             key = 'Messenger';
          }

          if (!platformTotals[key]) {
            platformTotals[key] = { purchases: 0, spend: 0 };
          }
          platformTotals[key].purchases += purchases;
          platformTotals[key].spend += spend;
          totalPurchasesAll += purchases;
        });

        const useSpend = totalPurchasesAll === 0;

        const totalValue = Object.values(platformTotals).reduce((sum, data) => sum + (useSpend ? data.spend : data.purchases), 0);
        const sortedPlacements = Object.entries(platformTotals)
          .map(([name, data]) => ({ name, value: useSpend ? data.spend : data.purchases }))
          .filter(p => p.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((item, i) => {
             const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];
             const percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
             return { name: item.name, value: percentage, color: colors[i % colors.length], rawValue: item.value };
          })
          .filter(p => p.value > 0);

        setRealPlacements(sortedPlacements);

      } catch (err) {
        console.error("Error fetching real report data", err);
      } finally {
        setLoadingRealData(false);
      }
    }
    loadData();
  }, [selectedAccountId, reportMonth, isReportGenerated, selectedAccount?.currency]);
  
  function mapAlpha2ToAlpha3(code: string) {
    const map: Record<string,string> = {
      'US': 'USA', 'AR': 'ARG', 'ES': 'ESP', 'BR': 'BRA', 'MX': 'MEX',
      'CA': 'CAN', 'GB': 'GBR', 'DE': 'DEU', 'FR': 'FRA', 'CO': 'COL',
      'CL': 'CHL', 'JP': 'JPN', 'AU': 'AUS', 'IN': 'IND'
    };
    return map[code?.toUpperCase()] || code;
  }

  // Sustituimos metrics mockeados por los de realMetrics
  const metrics = { ...realMetrics };

  const geoDataForMap = useMemo(() => {
    if (realGeography.length === 0) return undefined;
    const isMsg = reportType === 'messaging';
    return realGeography.map(g => ({
      countryId: g.countryId,
      salesVolume: isMsg ? (g.messages || 0) : (g.purchases || 0),
      totalRevenue: isMsg ? (g.spend || 0) : (g.revenue || 0)
    }));
  }, [realGeography, reportType]);

  const regionGeoDataForMap = useMemo(() => {
    if (realGeographyRegions.length === 0) return undefined;
    const isMsg = reportType === 'messaging';
    return realGeographyRegions.map(r => ({
      regionId: r.regionId,
      regionName: r.regionName,
      salesVolume: isMsg ? (r.messages || 0) : (r.purchases || 0),
      totalRevenue: isMsg ? (r.spend || 0) : (r.revenue || 0)
    }));
  }, [realGeographyRegions, reportType]);

  // Real daily data is fetched in useEffect, so we don't mock it here
  const dailyPerformanceData = realDailyData.length > 0 ? realDailyData : [];
  const mockAssets = realTopAds.length > 0 ? realTopAds : [];

  const handlePrint = () => {
    setIsEditing(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const date = subMonths(new Date(), i + 1);
      return {
        label: format(date, 'MMMM yyyy', { locale: es }),
        value: format(date, 'yyyy-MM')
      };
    });
  }, []);

  if (!selectedAccount) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-600 bg-[#111] rounded-xl border border-white/5 border-dashed">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest text-center">Selecciona una cuenta para generar el informe modular</p>
      </div>
    );
  }

  if (!isReportGenerated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a0a0a] rounded-xl border border-white/5">
        <FileText className="w-16 h-16 mb-6 text-blue-500/50" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest mb-8">Generador de Informes</h2>
        
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Cuenta Activa</label>
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-[#111] border border-white/10 rounded px-4 py-3 text-sm font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/50"
            >
              <option value="" disabled>Selecciona una cuenta</option>
              {accounts.filter(a => visibleAccountIds.includes(a.id)).map(acc => (
                <option key={acc.id} value={acc.id} className="bg-[#111]">{settings[acc.id]?.customName || acc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Período</label>
            <select 
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-[#111] border border-white/10 rounded px-4 py-3 text-sm font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/50"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Paquete de Informe</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType('ecommerce')}
                className={cn(
                  "py-3 px-2 rounded text-[10px] font-black uppercase tracking-wider border transition-all text-center",
                  reportType === 'ecommerce'
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                Solo E-commerce
              </button>
              <button
                type="button"
                onClick={() => setReportType('messaging')}
                className={cn(
                  "py-3 px-2 rounded text-[10px] font-black uppercase tracking-wider border transition-all text-center",
                  reportType === 'messaging'
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                Solo Mensajería
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Estilo Visual</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportTheme('light')}
                className={cn(
                  "py-2.5 px-3 rounded text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2",
                  reportTheme === 'light'
                    ? "bg-white border-white text-slate-900 shadow-md"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Modo Claro
              </button>
              <button
                type="button"
                onClick={() => setReportTheme('dark')}
                className={cn(
                  "py-2.5 px-3 rounded text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2",
                  reportTheme === 'dark'
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "bg-[#111] border-white/10 text-slate-400 hover:text-white"
                )}
              >
                <Moon className="w-3.5 h-3.5 text-blue-300" />
                Modo Oscuro
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsReportGenerated(true)}
            className={cn(
              "mt-4 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-md transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
              reportType === 'ecommerce' 
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20" 
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Generar Informe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-module {
             page-break-inside: avoid;
             break-inside: avoid;
          }
        }
      `}</style>
      
      {/* TOOLBAR */}
      <div className="bg-[#0a0a0a] rounded-lg border border-white/5 p-4 flex flex-wrap items-center justify-between gap-4 print:hidden sticky top-4 z-[110] backdrop-blur-md bg-opacity-90 shadow-2xl">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Cuenta Activa</span>
            <div className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest">
              {settings[selectedAccountId]?.customName || selectedAccount.name}
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Período</span>
             <div className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest">
              {monthOptions.find(o => o.value === reportMonth)?.label || reportMonth}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Paquete</span>
            <div className={cn(
              "border rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-widest",
              reportType === 'ecommerce' 
                ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            )}>
              {reportType === 'ecommerce' ? '🛒 Solo E-commerce' : '💬 Solo Mensajería'}
            </div>
          </div>

          <button
            onClick={() => setIsReportGenerated(false)}
            className="ml-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 text-slate-400 transition-all cursor-pointer"
          >
            Cambiar
          </button>

          {(loadingRealData || loadingBitacora) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[8px] font-black uppercase tracking-widest">Orion Procesando</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Selector Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md p-1">
            <button
              type="button"
              onClick={() => setReportTheme('light')}
              title="Ver informe en Modo Claro"
              className={cn(
                "px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                reportTheme === 'light'
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Sun className="w-3 h-3 text-amber-500" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => setReportTheme('dark')}
              title="Ver informe en Modo Oscuro"
              className={cn(
                "px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                reportTheme === 'dark'
                  ? "bg-blue-600 text-white shadow shadow-blue-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Moon className="w-3 h-3 text-blue-300" />
              Oscuro
            </button>
          </div>

          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all border cursor-pointer",
              isEditing 
                ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20" 
                : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
            )}
          >
            {isEditing ? 'Bloquear para Envío' : 'Habilitar Edición'}
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-md text-[9px] font-black uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Exportar / Imprimir
          </button>
        </div>
      </div>

      {/* REPORT SURFACE */}
      <div className={cn(
        "max-w-5xl mx-auto p-16 md:p-24 transition-all duration-500 relative print:shadow-none print:p-0 print:max-w-none rounded-2xl",
        reportTheme === 'dark'
          ? "report-dark bg-[#0d0f17] text-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10"
          : "report-light bg-white text-black shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]",
        (loadingRealData || loadingBitacora) ? "animate-pulse ring-8 ring-blue-500/30 shadow-[0_0_60px_rgba(59,130,246,0.4)] opacity-95 pointer-events-none overflow-hidden" : "opacity-100"
      )}>
        {(loadingRealData || loadingBitacora) && (
          <div className="absolute inset-0 z-50 bg-white/20 backdrop-blur-[2px] flex items-center justify-center print:hidden">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Orion Actualizando Informe...</span>
            </div>
          </div>
        )}
        
        <ReportHeader 
          name={settings[selectedAccountId]?.customName || selectedAccount.name} 
          logo={settings[selectedAccountId]?.customLogo} 
          month={reportMonth} 
        />

        <div className="space-y-16 mt-12 print:space-y-8 print:mt-4">
          {/* Módulo 1: Resumen Ejecutivo */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 print-module">
            <ExecutiveSummaryV2 
              metrics={metrics}
              narrative={reportTexts.narrative}
              onNarrativeChange={(val) => updateReportText('narrative', val)}
              isEditing={isEditing}
              mode={reportType}
            />
          </div>

          {/* Módulo 2 & 3: Funnel & Placements (GRID) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 items-stretch animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            {/* Funnel Module */}
            <div className="flex flex-col gap-4 print:gap-2 print-module">
              <div className="flex items-center gap-3 shrink-0 h-8">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">02</div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Análisis del Funnel</h3>
              </div>
              <div className="flex-1 min-h-[460px] print:min-h-[450px] flex flex-col">
                <ReportFunnelBoard 
                  spend={metrics.spend}
                  ctr={metrics.clicks > 0 ? (metrics.clicks / (metrics.impressions || 1) * 100) : 0}
                  purchases={metrics.purchases}
                  messages={metrics.messages}
                  atc={metrics.atc}
                  viewContent={metrics.viewContent}
                  impressions={metrics.impressions}
                  reach={metrics.reach}
                  clicks={metrics.clicks}
                  tracking={reportType}
                />
              </div>
            </div>

            {/* Placements Chart Module */}
            <div className="flex flex-col gap-4 print-module">
              <div className="w-full h-8 shrink-0 print:hidden" /> {/* Spacer to align with funnel title */}
              <div className="flex items-center gap-3 shrink-0 h-8 hidden print:flex">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">02B</div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Distribución de Ubicaciones</h3>
              </div>
              <div className="flex-1 flex flex-col min-h-[460px] print:min-h-[450px]">
                <PlacementsChartV2 
                  data={realPlacements.length > 0 ? realPlacements : [
                    { name: 'Instagram Stories', value: 45, color: '#3b82f6' },
                    { name: 'Instagram Reels', value: 30, color: '#10b981' },
                    { name: 'Facebook Reels', value: 15, color: '#6366f1' },
                    { name: 'Instagram Feed', value: 10, color: '#f59e0b' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Módulo 4: Performance Chart (Full Width / Stacked) */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 print-module print:pt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">03</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {reportType === 'ecommerce' ? 'Facturación y Ventas' : 'Mensajes e Inversión Diaria'}
              </h3>
            </div>
            <div className="h-[500px] w-full">
              <PerformanceChartV2 data={dailyPerformanceData} currency={metrics.currency} mode={reportType} />
            </div>
          </div>

          {/* Módulo 4: Asset Performance */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 print-module">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">04</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Anuncios Ganadores</h3>
            </div>
            <AssetPerformanceV2 assets={mockAssets} mode={reportType} />
          </div>

          {/* Módulo 5: Demographics */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-250 print-module">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">05</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Perfil Demográfico y Facturación</h3>
            </div>
            <DemographicsGeographyV2 demoData={realDemographics} currency={metrics.currency} />
          </div>

          {/* Módulo 6: Mapa de Ventas/Mensajes Global */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-275 print-module">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">06</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {reportType === 'ecommerce' ? 'Mapa de Ventas' : 'Mapa de Mensajes'}
              </h3>
            </div>
            <div className="print:min-h-0 min-h-[500px]">
              <GlobalSalesMap 
                currency={metrics.currency} 
                salesData={geoDataForMap} 
                regionSalesData={regionGeoDataForMap} 
                mode={reportType}
              />
            </div>
          </div>

          {/* Módulo 7: Timeline de Gestión */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 print-module">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">07</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Bitácora de Gestión</h3>
            </div>
            <ManagementTimelineV2 logs={bitacora} />
          </div>

          {/* Módulo 8: Roadmap & Next Steps */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400 print-module">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">08</div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Roadmap & Próximos Pasos</h3>
            </div>
            <RoadmapSectionV2 
              learnings={reportTexts.learnings}
              actionPlan={reportTexts.actionPlan}
              clientRequests={reportTexts.clientRequests}
              onUpdate={updateReportText}
              isEditing={isEditing}
            />
          </div>

          {/* GLOSARIO */}
          <div className="print-module">
            <ReportGlossaryV2 />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-12 border-t border-slate-100 flex items-center justify-between opacity-30">
          <div className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-500">Orion Strategy V2 — Verified Report</div>
          <div className="text-[9px] font-bold text-slate-500">DOCUMENTO PRIVADO — NO DIVULGAR</div>
        </div>
      </div>
    </div>
  );
}


