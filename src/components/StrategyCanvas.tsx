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
  const STAGE_SPACING = 400;
  const CAMPAIGN_HEIGHT = 100;
  const ADSET_HEIGHT = 80;
  const AD_HEIGHT = 60;

  const tofuCampaigns = campaigns.filter(c => c.funnelStage === 'TOFU');
  const mofuCampaigns = campaigns.filter(c => c.funnelStage === 'MOFU');
  const bofuCampaigns = campaigns.filter(c => c.funnelStage === 'BOFU');

  const renderFunnelNode = (label: string, y: number, color: string) => (
    <Group x={0} y={y}>
      <Rect
        width={180}
        height={60}
        fill={color}
        opacity={0.1}
        stroke={color}
        strokeWidth={2}
        cornerRadius={8}
      />
      <Text
        text={label}
        fontSize={14}
        fontStyle="black"
        fill={color}
        x={0}
        y={0}
        width={180}
        height={60}
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );

  const renderCampaign = (campaign: Campaign, x: number, y: number) => {
    const campaignAdSets = adsets.filter(s => s.campaignId === campaign.id);
    
    return (
      <Group key={campaign.id} x={x} y={y}>
        {/* Campaign Box */}
        <Rect
          width={220}
          height={80}
          fill="#1a1a1a"
          stroke="#3b82f6"
          strokeWidth={2}
          cornerRadius={12}
          shadowBlur={10}
          shadowOpacity={0.3}
        />
        <Text
          text="CAMPAÑA"
          fontSize={8}
          fontStyle="black"
          fill="#3b82f6"
          x={15}
          y={15}
          letterSpacing={1}
        />
        <Text
          text={campaign.name}
          fontSize={11}
          fontStyle="bold"
          fill="#ffffff"
          x={15}
          y={30}
          width={190}
          wrap="char"
        />
        <Text
          text={campaign.objective}
          fontSize={9}
          fill="#666"
          x={15}
          y={55}
          fontStyle="bold"
        />

        {/* Connections to AdSets */}
        {campaignAdSets.map((adset, idx) => {
          const adsetY = idx * 120 - ((campaignAdSets.length - 1) * 60);
          const adsetX = 300;
          
          return (
            <Group key={adset.id}>
              <Arrow
                points={[220, 40, adsetX, adsetY + 40]}
                stroke="#333"
                strokeWidth={2}
                pointerLength={10}
                pointerWidth={10}
                fill="#333"
                tension={0.5}
              />
              <Group x={adsetX} y={adsetY}>
                <Rect
                    width={200}
                    height={70}
                    fill="#151515"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    cornerRadius={10}
                />
                <Text
                    text="CONJUNTO"
                    fontSize={7}
                    fontStyle="black"
                    fill="#8b5cf6"
                    x={12}
                    y={12}
                />
                <Text
                    text={adset.name}
                    fontSize={10}
                    fontStyle="bold"
                    fill="#ccc"
                    x={12}
                    y={25}
                    width={176}
                    wrap="char"
                />

                {/* Ads */}
                {ads.filter(a => a.adsetId === adset.id).map((ad, aIdx) => {
                  const adX = 260;
                  const adY = aIdx * 80 - ((ads.filter(a => a.adsetId === adset.id).length - 1) * 40);
                  return (
                    <Group key={ad.id}>
                       <Arrow
                        points={[200, 35, adX, adY + 25]}
                        stroke="#222"
                        strokeWidth={1}
                        pointerLength={5}
                        pointerWidth={5}
                        fill="#222"
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
                            fill="#888"
                            x={10}
                            y={18}
                            width={140}
                            wrap="char"
                        />
                      </Group>
                    </Group>
                  )
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
              const dataUrl = stageRef.current.toDataURL();
              const link = document.createElement('a');
              link.download = `estrategia-${accountId}.png`;
              link.href = dataUrl;
              link.click();
            }}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair">
        <Stage
          width={window.innerWidth - 300} // Adjust based on sidebar
          height={window.innerHeight - 200}
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
            {/* Funnel Shape Visualization */}
            <Group x={-STAGE_SPACING - 50}>
              {/* TOFU Section */}
              <Line
                points={[0, -100, 250, -100, 230, 250, 20, 250]}
                fill="#3b82f6"
                opacity={0.03}
                closed
              />
              <Line
                points={[0, -100, 250, -100, 230, 250, 20, 250]}
                stroke="#3b82f6"
                strokeWidth={1}
                opacity={0.1}
                dash={[10, 10]}
                closed
              />
              <Text text="TOFU" x={100} y={50} fontSize={20} fontStyle="black" fill="#3b82f6" opacity={0.2} />
              
              {/* MOFU Section */}
              <Line
                points={[20, 250, 230, 250, 210, 550, 40, 550]}
                fill="#8b5cf6"
                opacity={0.03}
                closed
              />
              <Line
                points={[20, 250, 230, 250, 210, 550, 40, 550]}
                stroke="#8b5cf6"
                strokeWidth={1}
                opacity={0.1}
                dash={[10, 10]}
                closed
              />
              <Text text="MOFU" x={100} y={380} fontSize={20} fontStyle="black" fill="#8b5cf6" opacity={0.2} />

              {/* BOFU Section */}
              <Line
                points={[40, 550, 210, 550, 180, 850, 70, 850]}
                fill="#f43f5e"
                opacity={0.03}
                closed
              />
              <Line
                points={[40, 550, 210, 550, 180, 850, 70, 850]}
                stroke="#f43f5e"
                strokeWidth={1}
                opacity={0.1}
                dash={[10, 10]}
                closed
              />
              <Text text="BOFU" x={100} y={680} fontSize={20} fontStyle="black" fill="#f43f5e" opacity={0.2} />
            </Group>

            {/* Background Grid */}
            {Array.from({ length: 40 }).map((_, i) => (
                <Line
                    key={`v-${i}`}
                    points={[i * 100, -2000, i * 100, 4000]}
                    stroke="#ffffff05"
                    strokeWidth={1}
                />
            ))}
             {Array.from({ length: 40 }).map((_, i) => (
                <Line
                    key={`h-${i}`}
                    points={[-2000, i * 100, 4000, i * 100]}
                    stroke="#ffffff05"
                    strokeWidth={1}
                />
            ))}

            {/* Funnel Labels */}
            <Group x={-STAGE_SPACING}>
              {renderFunnelNode('TOFU - ATRACCIÓN', 0, '#3b82f6')}
              {renderFunnelNode('MOFU - CONSIDERACIÓN', 300, '#8b5cf6')}
              {renderFunnelNode('BOFU - CONVERSIÓN', 600, '#f43f5e')}
            </Group>

            {/* Actual Structure Nodes */}
            {tofuCampaigns.map((c, i) => renderCampaign(c, 0, i * 400))}
            {mofuCampaigns.map((c, i) => renderCampaign(c, 0, 300 + i * 400))}
            {bofuCampaigns.map((c, i) => renderCampaign(c, 0, 600 + i * 400))}

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
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> MOFU</div>
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> BOFU</div>
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
