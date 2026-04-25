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
  Type
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CanvasElement {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color: string;
  fontSize?: number;
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
  const [tool, setTool] = useState<'select' | 'pen' | 'rect' | 'circle' | 'text' | 'eraser'>('select');
  const [zoom, setZoom] = useState(0.8);
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    const saved = localStorage.getItem(`cr_canvas_${accountId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [newElement, setNewElement] = useState<CanvasElement | null>(null);

  const stageRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem(`cr_canvas_${accountId}`, JSON.stringify(elements));
  }, [elements, accountId]);

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

  // Layout calculations
  const STAGE_SPACING = 300;
  const CAMPAIGN_SPACING = 220; 
  const ADSET_X_OFFSET = 280;
  const AD_X_OFFSET = 260;

  const tofuCampaigns = campaigns.filter(c => c.funnelStage === 'TOFU');
  const mofuCampaigns = campaigns.filter(c => c.funnelStage === 'MOFU');
  const bofuCampaigns = campaigns.filter(c => c.funnelStage === 'BOFU');
  const unknownCampaigns = campaigns.filter(c => !c.funnelStage);

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

  const renderCampaign = (campaign: Campaign, x: number, y: number) => {
    const campaignAdSets = adsets.filter(s => s.campaignId === campaign.id);
    
    return (
      <Group x={x} y={y}>
        {/* Campaign Box */}
        <Rect
          width={240}
          height={80}
          fill="#1a1a1a"
          stroke={
            campaign.funnelStage === 'TOFU' ? '#3b82f6' : 
            campaign.funnelStage === 'MOFU' ? '#f59e0b' : 
            campaign.funnelStage === 'BOFU' ? '#ef4444' : '#333'
          }
          strokeWidth={2}
          cornerRadius={10}
          shadowBlur={10}
          shadowOpacity={0.4}
        />
        <Text
          text="CAMPAÑA"
          fontSize={8}
          fontStyle="black"
          fill={
            campaign.funnelStage === 'TOFU' ? '#3b82f6' : 
            campaign.funnelStage === 'MOFU' ? '#f59e0b' : 
            campaign.funnelStage === 'BOFU' ? '#ef4444' : '#666'
          }
          x={14}
          y={14}
          letterSpacing={1.2}
        />
        <Text
          text={campaign.name}
          fontSize={11}
          fontStyle="bold"
          fill="#ffffff"
          x={14}
          y={28}
          width={210}
          wrap="char"
        />
        <Text
          text={campaign.objective}
          fontSize={9}
          fill="#888"
          x={14}
          y={54}
          fontStyle="bold"
        />
        
        {/* Connections to AdSets */}
        {campaignAdSets.map((adset, idx) => {
          const adsetY = idx * 110 - ((campaignAdSets.length - 1) * 55);
          const adsetX = ADSET_X_OFFSET;
          
          return (
            <Group key={adset.id}>
              <Arrow
                points={[240, 40, adsetX, adsetY + 35]}
                stroke="#444"
                strokeWidth={1}
                pointerLength={6}
                pointerWidth={6}
                fill="#444"
                tension={0.5}
              />
              <Group x={adsetX} y={adsetY}>
                <Rect
                    width={200}
                    height={70}
                    fill="#111111"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    cornerRadius={8}
                    shadowBlur={5}
                    shadowOpacity={0.2}
                />
                <Text
                    text="CONJUNTO"
                    fontSize={7}
                    fontStyle="black"
                    fill="#8b5cf6"
                    x={12}
                    y={12}
                    letterSpacing={1}
                />
                <Text
                    text={adset.name}
                    fontSize={10}
                    fontStyle="bold"
                    fill="#eee"
                    x={12}
                    y={28}
                    width={176}
                    wrap="char"
                />

                {/* Ads */}
                {ads.filter(a => a.adsetId === adset.id).map((ad, aIdx) => {
                  const adX = AD_X_OFFSET;
                  const adY = aIdx * 65 - ((ads.filter(a => a.adsetId === adset.id).length - 1) * 32.5);
                  return (
                    <Group key={ad.id}>
                       <Arrow
                        points={[200, 35, adX, adY + 25]}
                        stroke="#333"
                        strokeWidth={1}
                        pointerLength={5}
                        pointerWidth={5}
                        fill="#333"
                      />
                      <Group x={adX} y={adY}>
                        <Rect
                            width={160}
                            height={50}
                            fill="#0d0d0d"
                            stroke="#ffffff10"
                            strokeWidth={1}
                            cornerRadius={6}
                        />
                        <Text
                            text={ad.name}
                            fontSize={9}
                            fill="#999"
                            x={10}
                            y={18}
                            width={140}
                            wrap="char"
                        />
                      </Group>
                    </Group>
                  );
                })}
              </Group>
            </Group>
          );
        })}
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
               <ToolbarButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={Square} />
               <ToolbarButton active={tool === 'circle'} onClick={() => setTool('circle')} icon={CircleIcon} />
               <ToolbarButton active={tool === 'text'} onClick={() => setTool('text')} icon={Type} />
               <ToolbarButton active={tool === 'eraser'} onClick={() => {
                 if (confirm('¿Limpiar canvas de propuesta?')) setElements([]);
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
                points={[0, 0, 360, 0, 310, 280, 50, 280]}
                fill="#1e3a8a"
                stroke="#1e40af"
                strokeWidth={1}
                closed
              />
              <Text text="TOFU" x={120} y={110} fontSize={32} fontStyle="black" fill="#ffffff" width={120} align="center" />
              <Text text="TOP OF FUNNEL" x={120} y={150} fontSize={10} fontStyle="bold" fill="#ffffff" opacity={0.4} width={120} align="center" />
              
              {/* MOFU SECTION - WARM AMBER */}
              <Line
                points={[50, 310, 310, 310, 260, 580, 100, 580]}
                fill="#b45309"
                stroke="#d97706"
                strokeWidth={1}
                closed
              />
              <Text text="MOFU" x={120} y={420} fontSize={28} fontStyle="black" fill="#ffffff" width={120} align="center" />
              <Text text="MIDDLE OF FUNNEL" x={120} y={460} fontSize={10} fontStyle="bold" fill="#ffffff" opacity={0.4} width={120} align="center" />

              {/* BOFU SECTION - HOT RED */}
              <Line
                points={[100, 610, 260, 610, 220, 880, 140, 880]}
                fill="#991b1b"
                stroke="#b91c1c"
                strokeWidth={1}
                closed
              />
              <Text text="BOFU" x={120} y={720} fontSize={24} fontStyle="black" fill="#ffffff" width={120} align="center" />
              <Text text="BOTTOM OF FUNNEL" x={120} y={755} fontSize={9} fontStyle="bold" fill="#ffffff" opacity={0.4} width={120} align="center" />
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
            {Array.from({ length: 70 }).map((_, i) => (
                <Line
                    key={`h-${i}`}
                    points={[-3000, i * 100, 5000, i * 100]}
                    stroke="#ffffff05"
                    strokeWidth={1}
                />
            ))}

            {/* Actual Structure Nodes */}
            <Group>
              {tofuCampaigns.map((c, i) => {
                const targetY = 50 + i * CAMPAIGN_SPACING;
                return (
                  <Group key={c.id}>
                    <Arrow 
                      points={[-85, 140, 0, targetY + 40]} 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      pointerLength={6} 
                      opacity={0.7} 
                      tension={0.4}
                    />
                    {renderCampaign(c, 0, targetY)}
                  </Group>
                );
              })}

              {mofuCampaigns.map((c, i) => {
                const targetY = 380 + i * CAMPAIGN_SPACING;
                return (
                  <Group key={c.id}>
                    <Arrow 
                      points={[-135, 445, 0, targetY + 40]} 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      pointerLength={6} 
                      opacity={0.7} 
                      tension={0.4}
                    />
                    {renderCampaign(c, 0, targetY)}
                  </Group>
                );
              })}

              {bofuCampaigns.map((c, i) => {
                const targetY = 680 + i * CAMPAIGN_SPACING;
                return (
                  <Group key={c.id}>
                    <Arrow 
                      points={[-180, 745, 0, targetY + 40]} 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      pointerLength={6} 
                      opacity={0.7} 
                      tension={0.4}
                    />
                    {renderCampaign(c, 0, targetY)}
                  </Group>
                );
              })}

              {unknownCampaigns.map((c, i) => renderCampaign(c, 0, 1000 + i * CAMPAIGN_SPACING))}
            </Group>

            {/* Proposal / Drawing Layer */}
            {elements.map((el) => {
              if (el.type === 'line') return <Line key={el.id} points={el.points} stroke={el.color} strokeWidth={3} tension={0.5} lineCap="round" />;
              if (el.type === 'rect') return <Rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} stroke={el.color} strokeWidth={2} dash={[5, 5]} />;
              if (el.type === 'circle') return <Circle key={el.id} x={el.x} y={el.y} radius={Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2))} stroke={el.color} strokeWidth={2} dash={[5, 5]} />;
              if (el.type === 'text') return <Text key={el.id} x={el.x} y={el.y} text={el.text} fill={el.color} fontSize={el.fontSize} fontStyle="bold" />;
              return null;
            })}

            {newElement && (
                <>
                {newElement.type === 'line' && <Line points={newElement.points} stroke={newElement.color} strokeWidth={3} tension={0.5} lineCap="round" />}
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
