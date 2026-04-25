import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Arrow, Circle } from 'react-konva';
import { Campaign, AdSet, Ad } from '../types';
import { 
  Plus, 
  Trash2, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Hand, 
  PenTool, 
  MousePointer2, 
  Square, 
  Circle as CircleIcon,
  Eraser,
  Save,
  MessageSquare,
  Type,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CanvasElement {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line' | 'arrow' | 'node';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color: string;
  fontSize?: number;
  startNodeId?: string;
  endNodeId?: string;
}

interface StrategyCanvasProps {
  accountId: string;
  campaigns: Campaign[];
  adsets: AdSet[];
  ads: Ad[];
}

export const StrategyCanvas: React.FC<StrategyCanvasProps> = ({ 
  accountId, 
  campaigns, 
  adsets, 
  ads 
}) => {
  const [mode, setMode] = useState<'view' | 'draw'>('view');
  const [tool, setTool] = useState<'select' | 'pen' | 'rect' | 'circle' | 'text' | 'arrow' | 'node' | 'eraser'>('select');
  const [zoom, setZoom] = useState(0.8);
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    const saved = localStorage.getItem(`cr_canvas_${accountId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>(() => {
    const saved = localStorage.getItem(`cr_nodes_${accountId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [funnelConfig, setFunnelConfig] = useState(() => {
    const saved = localStorage.getItem(`cr_funnel_${accountId}`);
    return saved ? JSON.parse(saved) : {
      mofuY: 350,
      bofuY: 700,
      bofuEndY: 1000,
      fontSize: 48
    };
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [newElement, setNewElement] = useState<CanvasElement | null>(null);

  const stageRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem(`cr_canvas_${accountId}`, JSON.stringify(elements));
  }, [elements, accountId]);

  useEffect(() => {
    localStorage.setItem(`cr_nodes_${accountId}`, JSON.stringify(nodePositions));
  }, [nodePositions, accountId]);

  useEffect(() => {
    localStorage.setItem(`cr_funnel_${accountId}`, JSON.stringify(funnelConfig));
  }, [funnelConfig, accountId]);

  const handleMouseDown = (e: any) => {
    if (mode === 'view') return;
    if (tool === 'select') return;

    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();
    setIsDrawing(true);

    if (tool === 'pen') {
      setNewElement({
        id: Math.random().toString(36).substr(2, 9),
        type: 'line',
        x: 0,
        y: 0,
        points: [point.x, point.y],
        color: '#3b82f6'
      });
    } else if (tool === 'arrow') {
      setNewElement({
        id: Math.random().toString(36).substr(2, 9),
        type: 'arrow',
        x: 0,
        y: 0,
        points: [point.x, point.y, point.x, point.y],
        color: '#3b82f6'
      });
    } else if (tool === 'rect') {
      setNewElement({
        id: Math.random().toString(36).substr(2, 9),
        type: 'rect',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color: '#3b82f6'
      });
    } else if (tool === 'node') {
      const text = prompt('Nombre del módulo:');
      if (text) {
        setElements([...elements, {
          id: `custom_${Math.random().toString(36).substr(2, 9)}`,
          type: 'node',
          x: point.x,
          y: point.y,
          width: 180,
          height: 60,
          text,
          color: '#8b5cf6'
        }]);
      }
      setIsDrawing(false);
    } else if (tool === 'circle') {
      setNewElement({
        id: Math.random().toString(36).substr(2, 9),
        type: 'circle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color: '#3b82f6'
      });
    } else if (tool === 'text') {
      const text = prompt('Texto:');
      if (text) {
        setElements([...elements, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'text',
          x: point.x,
          y: point.y,
          text,
          color: '#ffffff',
          fontSize: 16
        }]);
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !newElement) return;

    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();

    if (tool === 'pen') {
      setNewElement({
        ...newElement,
        points: [...(newElement.points || []), point.x, point.y]
      });
    } else if (tool === 'arrow') {
      setNewElement({
        ...newElement,
        points: [newElement.points![0], newElement.points![1], point.x, point.y]
      });
    } else if (tool === 'rect' || tool === 'circle') {
      setNewElement({
        ...newElement,
        width: point.x - newElement.x,
        height: point.y - newElement.y
      });
    }
  };

  const handleMouseUp = () => {
    if (newElement) {
      setElements([...elements, newElement]);
      setNewElement(null);
    }
    setIsDrawing(false);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });
    setZoom(newScale);

    const newPos = {
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    };
    stage.position(newPos);
    setPos(newPos);
  };

  // Layout constants
  const STAGE_SPACING = 340;
  const ADSET_X_OFFSET = 260;
  const AD_X_OFFSET = 240;

  // New sizing for nodes (more compact)
  const NODE_CONFIG = {
    campaign: { w: 220, h: 70, fontSize: 11 },
    adset: { w: 180, h: 60, fontSize: 10 },
    ad: { w: 150, h: 38, fontSize: 9 },
    spacing: {
      campaign: 280, 
      adset: 140,
      ad: 48
    }
  };

  // Helper to determine stage based on objective if not explicitly set
  const getEffectiveStage = (c: Campaign) => {
    if (c.funnelStage) return c.funnelStage;
    if (c.outcome === 'OUTCOME_TRAFFIC' || c.outcome === 'OUTCOME_AWARENESS') return 'TOFU';
    if (c.outcome === 'OUTCOME_ENGAGEMENT' || c.outcome === 'OUTCOME_APP_PROMOTION') return 'MOFU';
    if (c.outcome === 'OUTCOME_SALES' || c.outcome === 'OUTCOME_LEADS') return 'BOFU';
    return null;
  };

  const tofuCampaigns = campaigns.filter(c => getEffectiveStage(c) === 'TOFU');
  const mofuCampaigns = campaigns.filter(c => getEffectiveStage(c) === 'MOFU');
  const bofuCampaigns = campaigns.filter(c => getEffectiveStage(c) === 'BOFU');
  const unknownCampaigns = campaigns.filter(c => !getEffectiveStage(c));

  // Dynamic start positions to fill space (more compact than hardcoded gaps)
  const tofuY = 100;
  const mofuY = funnelConfig.mofuY;
  const bofuY = funnelConfig.bofuY;
  const bofuEndY = funnelConfig.bofuEndY || (funnelConfig.bofuY + 300);

  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  const renderCampaign = (campaign: Campaign, defaultX: number, defaultY: number) => {
    const stage = getEffectiveStage(campaign);
    const color = stage === 'TOFU' ? '#3b82f6' : 
                  stage === 'MOFU' ? '#f59e0b' : 
                  stage === 'BOFU' ? '#ef4444' : '#333';
    
    const pos = nodePositions[campaign.id] || { x: defaultX, y: defaultY };

    return (
      <Group 
        key={campaign.id}
        x={pos.x} 
        y={pos.y} 
        draggable={mode === 'draw' && tool === 'select'}
        onDragEnd={(e) => {
          setNodePositions({
            ...nodePositions,
            [campaign.id]: { x: e.target.x(), y: e.target.y() }
          });
        }}
      >
        <Rect
          width={NODE_CONFIG.campaign.w}
          height={NODE_CONFIG.campaign.h}
          fill="#111"
          stroke={color}
          strokeWidth={2}
          cornerRadius={8}
          shadowBlur={8}
          shadowOpacity={0.4}
        />
        <Text
          text="CAMPAÑA"
          fontSize={7}
          fontStyle="black"
          fill={color}
          x={12}
          y={12}
          letterSpacing={1}
        />
        <Text
          text={campaign.name}
          fontSize={NODE_CONFIG.campaign.fontSize}
          fontStyle="bold"
          fill="#ffffff"
          x={12}
          y={24}
          width={NODE_CONFIG.campaign.w - 24}
          wrap="char"
        />
        <Text
          text={campaign.objective}
          fontSize={8}
          fill="#666"
          x={12}
          y={44}
          fontStyle="bold"
        />
      </Group>
    );
  };

  const renderAdSet = (adset: AdSet, defaultX: number, defaultY: number) => {
    const pos = nodePositions[adset.id] || { x: defaultX, y: defaultY };

    return (
      <Group 
        key={adset.id}
        x={pos.x} 
        y={pos.y}
        draggable={mode === 'draw' && tool === 'select'}
        onDragEnd={(e) => {
          setNodePositions({
            ...nodePositions,
            [adset.id]: { x: e.target.x(), y: e.target.y() }
          });
        }}
      >
        <Rect
            width={NODE_CONFIG.adset.w}
            height={NODE_CONFIG.adset.h}
            fill="#0a0a0a"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            cornerRadius={6}
        />
        <Text
            text="CONJUNTO"
            fontSize={7}
            fontStyle="black"
            fill="#8b5cf6"
            x={10}
            y={10}
            letterSpacing={0.8}
        />
        <Text
            text={adset.name}
            fontSize={NODE_CONFIG.adset.fontSize}
            fontStyle="bold"
            fill="#ccc"
            x={10}
            y={22}
            width={NODE_CONFIG.adset.w - 20}
            wrap="char"
        />
      </Group>
    );
  };

  const renderAd = (ad: Ad, defaultX: number, defaultY: number) => {
    const pos = nodePositions[ad.id] || { x: defaultX, y: defaultY };

    return (
      <Group 
        key={ad.id}
        x={pos.x} 
        y={pos.y}
        draggable={mode === 'draw' && tool === 'select'}
        onDragEnd={(e) => {
          setNodePositions({
            ...nodePositions,
            [ad.id]: { x: e.target.x(), y: e.target.y() }
          });
        }}
      >
        <Rect
            width={NODE_CONFIG.ad.w}
            height={NODE_CONFIG.ad.h}
            fill="#080808"
            stroke="#ffffff10"
            strokeWidth={1}
            cornerRadius={4}
        />
        <Text
            text={ad.name}
            fontSize={NODE_CONFIG.ad.fontSize}
            fill="#777"
            x={8}
            y={12}
            width={NODE_CONFIG.ad.w - 16}
            wrap="char"
        />
      </Group>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-lg border border-white/5 overflow-hidden">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <div className="flex bg-black p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setMode('view')}
              className={cn(
                "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                mode === 'view' ? "bg-blue-600 text-white" : "text-neutral-600 hover:text-neutral-400"
              )}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              Estructura Real
            </button>
            <button
              onClick={() => setMode('draw')}
              className={cn(
                "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                mode === 'draw' ? "bg-purple-600 text-white" : "text-neutral-600 hover:text-neutral-400"
              )}
            >
              <PenTool className="w-3.5 h-3.5" />
              Propuesta / Dibujo
            </button>
          </div>

          {mode === 'draw' && (
            <div className="flex bg-black p-1 rounded-lg border border-white/5 gap-1">
               <ToolbarButton active={tool === 'select'} onClick={() => setTool('select')} icon={MousePointer2} />
               <ToolbarButton active={tool === 'pen'} onClick={() => setTool('pen')} icon={PenTool} />
               <ToolbarButton active={tool === 'arrow'} onClick={() => setTool('arrow')} icon={ArrowRight} />
               <ToolbarButton active={tool === 'node'} onClick={() => setTool('node')} icon={MessageSquare} />
               <ToolbarButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={Square} />
               <ToolbarButton active={tool === 'circle'} onClick={() => setTool('circle')} icon={CircleIcon} />
               <ToolbarButton active={tool === 'text'} onClick={() => setTool('text')} icon={Type} />
               <ToolbarButton active={tool === 'eraser'} onClick={() => {
                 if (confirm('¿Limpiar canvas de propuesta?')) {
                   setElements([]);
                   setNodePositions({});
                   setFunnelConfig({ mofuY: 350, bofuY: 700, bofuEndY: 1000, fontSize: 48 });
                 }
               }} icon={Trash2} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-black p-1 rounded-lg border border-white/5">
            <button onClick={() => setZoom(z => z * 1.2)} className="p-2 text-neutral-600 hover:text-white transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="px-2 flex items-center text-[9px] font-black text-neutral-700 w-12 justify-center">
              {Math.round(zoom * 100)}%
            </div>
            <button onClick={() => setZoom(z => z / 1.2)} className="p-2 text-neutral-600 hover:text-white transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => {
              if (stageRef.current) {
                const dataUrl = stageRef.current.toDataURL();
                const link = document.createElement('a');
                link.download = `estrategia-${accountId}.png`;
                link.href = dataUrl;
                link.click();
              }
            }}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden" ref={containerRef}>
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scaleX={zoom}
          scaleY={zoom}
          x={pos.x}
          y={pos.y}
          draggable={tool === 'select' || mode === 'view'}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {/* FUNNEL SHAPE */}
            <Group x={-420} y={0}>
              {/* TOFU SECTION - COLD BLUE */}
              <Line
                points={[0, 0, 360, 0, 310, mofuY - 30, 50, mofuY - 30]}
                fill="#1e40af"
                stroke="#1e3a8a"
                strokeWidth={1}
                closed
              />
              <Text 
                text="TOFU" 
                x={120} 
                y={(mofuY - 30) / 2 - 20} 
                fontSize={funnelConfig.fontSize} 
                fontStyle="black" 
                fill="#ffffff" 
                width={120} 
                align="center"
                draggable={mode === 'draw'}
                onDragEnd={(e) => setFunnelConfig({...funnelConfig, fontSize: Math.abs(e.target.y())})}
              />
              <Text text="TOP OF FUNNEL" x={120} y={(mofuY - 30) / 2 + (funnelConfig.fontSize * 0.6)} fontSize={10} fontStyle="bold" fill="#ffffff" opacity={0.4} width={120} align="center" />
              
              {/* Handle for MOFU Y */}
              {mode === 'draw' && (
                <Circle 
                  x={180} 
                  y={mofuY - 15} 
                  radius={10} 
                  fill="#f59e0b" 
                  stroke="#ffffff"
                  strokeWidth={2}
                  draggable 
                  onDragMove={(e) => setFunnelConfig({...funnelConfig, mofuY: e.target.y() + 15})}
                />
              )}

              {/* MOFU SECTION - WARM AMBER */}
              <Line
                points={[50, mofuY, 310, mofuY, 260, bofuY - 30, 100, bofuY - 30]}
                fill="#b45309"
                stroke="#d97706"
                strokeWidth={1}
                closed
              />
              <Text text="MOFU" x={120} y={mofuY + (bofuY - mofuY - 30) / 2 - 20} fontSize={funnelConfig.fontSize * 0.8} fontStyle="black" fill="#ffffff" width={120} align="center" />
              <Text text="MIDDLE OF FUNNEL" x={120} y={mofuY + (bofuY - mofuY - 30) / 2 + (funnelConfig.fontSize * 0.5)} fontSize={10} fontStyle="bold" fill="#ffffff" opacity={0.4} width={120} align="center" />

              {/* Handle for BOFU Y */}
              {mode === 'draw' && (
                <Circle 
                  x={180} 
                  y={bofuY - 15} 
                  radius={10} 
                  fill="#ef4444" 
                  stroke="#ffffff"
                  strokeWidth={2}
                  draggable 
                  onDragMove={(e) => setFunnelConfig({...funnelConfig, bofuY: e.target.y() + 15})}
                />
              )}

              {/* BOFU SECTION - HOT RED */}
              <Line
                points={[100, bofuY, 260, bofuY, 210, bofuEndY, 150, bofuEndY]}
                fill="#991b1b"
                stroke="#b91c1c"
                strokeWidth={1}
                closed
              />
              <Text text="BOFU" x={120} y={bofuY + (bofuEndY - bofuY) / 2 - 20} fontSize={funnelConfig.fontSize * 0.65} fontStyle="black" fill="#ffffff" width={120} align="center" />
              <Text text="BOTTOM OF FUNNEL" x={120} y={bofuY + (bofuEndY - bofuY) / 2 + (funnelConfig.fontSize * 0.4)} fontSize={9} fontStyle="bold" fill="#ffffff" opacity={0.4} width={120} align="center" />

              {/* Handle for BOFU Bottom */}
              {mode === 'draw' && (
                <Circle 
                  x={180} 
                  y={bofuEndY} 
                  radius={10} 
                  fill="#991b1b" 
                  stroke="#ffffff"
                  strokeWidth={2}
                  draggable 
                  onDragMove={(e) => setFunnelConfig({...funnelConfig, bofuEndY: e.target.y()})}
                />
              )}
            </Group>

            {/* Background Grid */}
            {Array.from({ length: 50 }).map((_, i) => (
                <Line
                    key={`v-${i}`}
                    points={[i * 100, -3000, i * 100, 5000]}
                    stroke="#ffffff05"
                    strokeWidth={1}
                />
            ))}
            {Array.from({ length: 80 }).map((_, i) => (
                <Line
                    key={`h-${i}`}
                    points={[-3000, i * 100, 5000, i * 100]}
                    stroke="#ffffff05"
                    strokeWidth={1}
                />
            ))}

            {/* Funnel Connections */}
            {tofuCampaigns.map((c, i) => {
              const targetY = tofuY + i * NODE_CONFIG.spacing.campaign;
              const pos = nodePositions[c.id] || { x: 0, y: targetY };
              return (
                <Arrow 
                  key={`conn-funnel-${c.id}`}
                  points={[-60, (mofuY - 30) / 2 + 10, pos.x, pos.y + NODE_CONFIG.campaign.h / 2]} 
                  stroke="#3b82f6" strokeWidth={2} pointerLength={6} opacity={0.5} tension={0.4}
                />
              );
            })}
            {mofuCampaigns.map((c, i) => {
              const targetY = mofuY + i * NODE_CONFIG.spacing.campaign;
              const pos = nodePositions[c.id] || { x: 0, y: targetY };
              return (
                <Arrow 
                  key={`conn-funnel-${c.id}`}
                  points={[-110, mofuY + (bofuY - mofuY - 30) / 2 + 10, pos.x, pos.y + NODE_CONFIG.campaign.h / 2]} 
                  stroke="#f59e0b" strokeWidth={2} pointerLength={6} opacity={0.5} tension={0.4}
                />
              );
            })}
            {bofuCampaigns.map((c, i) => {
              const targetY = bofuY + i * NODE_CONFIG.spacing.campaign;
              const pos = nodePositions[c.id] || { x: 0, y: targetY };
              return (
                <Arrow 
                  key={`conn-funnel-${c.id}`}
                  points={[-160, bofuY + 140, pos.x, pos.y + NODE_CONFIG.campaign.h / 2]} 
                  stroke="#ef4444" strokeWidth={2} pointerLength={6} opacity={0.5} tension={0.4}
                />
              );
            })}

            {/* Internal Node Connections (Dynamic) */}
            {campaigns.map(campaign => {
              const campaignAdSets = adsets.filter(s => s.campaignId === campaign.id);
              const campaignIdx = campaigns.indexOf(campaign);
              const defaultCampaignY = (campaign.funnelStage === 'TOFU' ? tofuY : campaign.funnelStage === 'MOFU' ? mofuY : bofuY) + campaignIdx * NODE_CONFIG.spacing.campaign;
              
              const cX = nodePositions[campaign.id]?.x ?? 0;
              const cY = nodePositions[campaign.id]?.y ?? defaultCampaignY;

              let currentAdSetYTotal = 0;
              const totalAdSetsHeight = campaignAdSets.reduce((sum, as) => {
                const adCount = ads.filter(a => a.adsetId === as.id).length;
                return sum + Math.max(NODE_CONFIG.adset.h, adCount * NODE_CONFIG.spacing.ad);
              }, 0);

              return campaignAdSets.map((adset, idx) => {
                const adCount = ads.filter(a => a.adsetId === adset.id).length;
                const adsetHeight = Math.max(NODE_CONFIG.adset.h, adCount * NODE_CONFIG.spacing.ad);
                
                // Centering the group of adsets relative to the campaign
                const adsetYOffset = currentAdSetYTotal - (totalAdSetsHeight / 2) + (adsetHeight / 2);
                currentAdSetYTotal += adsetHeight;

                const adsetX = cX + ADSET_X_OFFSET;
                const adsetY = cY + adsetYOffset;
                
                const aX = nodePositions[adset.id]?.x ?? adsetX;
                const aY = nodePositions[adset.id]?.y ?? adsetY;

                return (
                  <Group key={`conn-as-${adset.id}`}>
                    <Arrow
                      points={[cX + NODE_CONFIG.campaign.w, cY + NODE_CONFIG.campaign.h / 2, aX, aY + NODE_CONFIG.adset.h / 2]}
                      stroke="#333" strokeWidth={1} pointerLength={6} pointerWidth={6} fill="#333" tension={0.5}
                    />
                    {ads.filter(a => a.adsetId === adset.id).map((ad, aIdx) => {
                      const adCountInSet = ads.filter(a => a.adsetId === adset.id).length;
                      const adYOffset = aIdx * NODE_CONFIG.spacing.ad - ((adCountInSet - 1) * NODE_CONFIG.spacing.ad / 2);
                      
                      const defAdX = aX + AD_X_OFFSET;
                      const defAdY = aY + adYOffset;
                      
                      const adX = nodePositions[ad.id]?.x ?? defAdX;
                      const adY = nodePositions[ad.id]?.y ?? defAdY;

                      return (
                        <Arrow
                          key={`conn-ad-${ad.id}`}
                          points={[aX + NODE_CONFIG.adset.w, aY + NODE_CONFIG.adset.h / 2, adX, adY + NODE_CONFIG.ad.h / 2]}
                          stroke="#222" strokeWidth={1} pointerLength={5} pointerWidth={5} fill="#222"
                        />
                      );
                    })}
                  </Group>
                );
              });
            })}

            {/* Render Actual Nodes (Flat) */}
            {campaigns.map((c, i) => {
              const defaultY = (c.funnelStage === 'TOFU' ? tofuY : c.funnelStage === 'MOFU' ? mofuY : c.funnelStage === 'BOFU' ? bofuY : bofuY + 400) + i * NODE_CONFIG.spacing.campaign;
              return renderCampaign(c, 0, defaultY);
            })}

            {campaigns.map(campaign => {
              const campaignAdSets = adsets.filter(s => s.campaignId === campaign.id);
              const campaignIdx = campaigns.indexOf(campaign);
              const defaultCampaignY = (campaign.funnelStage === 'TOFU' ? tofuY : campaign.funnelStage === 'MOFU' ? mofuY : bofuY) + campaignIdx * NODE_CONFIG.spacing.campaign;
              const cX = nodePositions[campaign.id]?.x ?? 0;
              const cY = nodePositions[campaign.id]?.y ?? defaultCampaignY;

              let currentAdSetYTotal = 0;
              const totalAdSetsHeight = campaignAdSets.reduce((sum, as) => {
                const adCount = ads.filter(a => a.adsetId === as.id).length;
                return sum + Math.max(NODE_CONFIG.adset.h, adCount * NODE_CONFIG.spacing.ad);
              }, 0);

              return campaignAdSets.map((adset, idx) => {
                const adCount = ads.filter(a => a.adsetId === adset.id).length;
                const adsetHeight = Math.max(NODE_CONFIG.adset.h, adCount * NODE_CONFIG.spacing.ad);
                const adsetYOffset = currentAdSetYTotal - (totalAdSetsHeight / 2) + (adsetHeight / 2);
                currentAdSetYTotal += adsetHeight;

                const adsetX = cX + ADSET_X_OFFSET;
                const adsetY = cY + adsetYOffset;
                
                return (
                  <Group key={`group-${adset.id}`}>
                    {renderAdSet(adset, adsetX, adsetY)}
                    {ads.filter(a => a.adsetId === adset.id).map((ad, aIdx) => {
                      const adCountInSet = ads.filter(a => a.adsetId === adset.id).length;
                      const adYOffset = aIdx * NODE_CONFIG.spacing.ad - ((adCountInSet - 1) * NODE_CONFIG.spacing.ad / 2);
                      
                      const currentAdsetX = nodePositions[adset.id]?.x ?? adsetX;
                      const currentAdsetY = nodePositions[adset.id]?.y ?? adsetY;
                      
                      const defAdX = currentAdsetX + AD_X_OFFSET;
                      const defAdY = currentAdsetY + adYOffset;
                      
                      return renderAd(ad, defAdX, defAdY);
                    })}
                  </Group>
                );
              });
            })}

            {/* Proposal / Drawing Layer */}
            {elements.map((el) => {
              const isDraggable = mode === 'draw' && tool === 'select';
              const onDragEnd = (e: any) => {
                setElements(elements.map(item => 
                  item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                ));
              };

              if (el.type === 'line') return <Line key={el.id} points={el.points} stroke={el.color} strokeWidth={3} tension={0.5} lineCap="round" draggable={isDraggable} onDragEnd={onDragEnd} />;
              if (el.type === 'arrow') return <Arrow key={el.id} points={el.points} stroke={el.color} strokeWidth={3} tension={0.5} lineCap="round" pointerLength={6} pointerWidth={6} fill={el.color} draggable={isDraggable} onDragEnd={onDragEnd} />;
              if (el.type === 'rect') return <Rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} stroke={el.color} strokeWidth={2} dash={[5, 5]} draggable={isDraggable} onDragEnd={onDragEnd} />;
              if (el.type === 'circle') return <Circle key={el.id} x={el.x} y={el.y} radius={Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2))} stroke={el.color} strokeWidth={2} dash={[5, 5]} draggable={isDraggable} onDragEnd={onDragEnd} />;
              if (el.type === 'text') return <Text key={el.id} x={el.x} y={el.y} text={el.text} fill={el.color} fontSize={el.fontSize} fontStyle="bold" draggable={isDraggable} onDragEnd={onDragEnd} />;
              if (el.type === 'node') return (
                <Group key={el.id} x={el.x} y={el.y} draggable={isDraggable} onDragEnd={onDragEnd}>
                  <Rect width={el.width} height={el.height} fill="#1a1a1a" stroke={el.color} strokeWidth={2} cornerRadius={8} />
                  <Text text={el.text} fill="#fff" fontSize={11} fontStyle="bold" x={10} y={el.height!/2 - 6} width={el.width! - 20} align="center" wrap="char" />
                </Group>
              );
              return null;
            })}

            {newElement && (
                <>
                {(newElement.type === 'line' || newElement.type === 'arrow') && (
                  newElement.type === 'line' ? 
                    <Line points={newElement.points} stroke={newElement.color} strokeWidth={3} tension={0.5} lineCap="round" /> :
                    <Arrow points={newElement.points} stroke={newElement.color} strokeWidth={3} tension={0.5} lineCap="round" pointerLength={6} pointerWidth={6} fill={newElement.color} />
                )}
                {newElement.type === 'rect' && <Rect x={newElement.x} y={newElement.y} width={newElement.width} height={newElement.height} stroke={newElement.color} strokeWidth={2} />}
                {newElement.type === 'circle' && <Circle x={newElement.x} y={newElement.y} radius={Math.sqrt(Math.pow(newElement.width || 0, 2) + Math.pow(newElement.height || 0, 2))} stroke={newElement.color} strokeWidth={2} />}
                </>
            )}
          </Layer>
        </Stage>
      </div>

      <div className="p-4 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between">
        <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">
            {mode === 'view' ? 'Visualizando estructura real de Meta Ads' : 'Modo dibujo activo: El boceto se guarda automáticamente por cliente'}
        </p>
        <div className="flex gap-2 text-[8px] font-black text-neutral-700 uppercase">
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> TOFU</div>
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> MOFU</div>
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> BOFU</div>
        </div>
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{ active: boolean; onClick: () => void; icon: any }> = ({ active, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg transition-all",
      active ? "bg-white/10 text-white shadow-inner" : "text-neutral-600 hover:text-neutral-400"
    )}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);
