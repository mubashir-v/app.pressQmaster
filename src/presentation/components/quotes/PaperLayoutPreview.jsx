import React from "react";
import { MdWarningAmber, MdLayers, MdInfoOutline, MdSettingsEthernet, MdAnalytics, MdAttachMoney } from "react-icons/md";

export default function PaperLayoutPreview({ 
  layout, 
  piecesRequested, 
  sheets, 
  parentSheets,
  prints,
  piecesPerSheet,
  printerName,
  totalPrice,
  currency = "INR"
}) {
  if (!layout || !layout.paper || !layout.placements) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-brand-navy/10 mt-4 outline-none">
        <MdWarningAmber className="w-10 h-10 text-brand-navy/20 mb-3" />
        <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest leading-relaxed max-w-[240px]">
          No paper dimensions available to render layout preview.
        </p>
      </div>
    );
  }

  const { sourcePaper, paper, placements, waste, fit, paperFeed } = layout;
  
  // Use sourcePaper for canvas if available, else fallback to paper
  const canvas = sourcePaper || paper;
  const viewBox = `0 0 ${canvas.width} ${canvas.breadth}`;
  
  const isPortioned = paperFeed?.kind === "PORTIONED";
  const grid = paperFeed?.grid || { cols: 1, rows: 1 };
  const cellWidth = canvas.width / grid.cols;
  const cellHeight = canvas.breadth / grid.rows;

  return (
    <div className="space-y-6 animate-fade-in translate-y-0.5 outline-none select-none">
      
      {/* 1. Metric Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatBox 
          label="Feed Strategy" 
          value={isPortioned ? `Portion: ${grid.cols}×${grid.rows}` : "Full Sheet"} 
          sub={isPortioned ? `${paperFeed.portionsPerParent} portions per stock` : "Direct Feed"} 
          icon={<MdSettingsEthernet />} 
          color="text-brand-teal"
         />
         <StatBox 
          label="Yield / Sheet" 
          value={piecesPerSheet} 
          sub="Deliverables per portion" 
          icon={<MdLayers />} 
         />
         <StatBox 
          label="Usage (Portion / Stock)" 
          value={`${sheets} / ${parentSheets || '--'}`} 
          sub="Portions used / Stock used" 
          icon={<MdAnalytics />}
         />
         <StatBox 
          label="Commercial Total" 
          value={`${currency} ${totalPrice?.toLocaleString() || '--'}`} 
          sub={`${prints} Total Impressions`} 
          icon={<MdAttachMoney />}
          color="text-brand-teal"
         />
      </div>

      {/* 2. SVG Visualization */}
      <div className="relative bg-zinc-100 rounded-3xl p-8 border border-brand-navy/5 shadow-inner overflow-hidden flex items-center justify-center min-h-[450px]">
         {/* Feed Multiplier Label */}
         <div className="absolute top-6 left-6 z-10 flex gap-2">
            <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-navy text-white shadow-sm border border-brand-navy">
               Stock: {canvas.width}×{canvas.breadth}{canvas.unit}
            </span>
            {isPortioned && (
              <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-teal text-white shadow-sm border border-brand-teal">
                 Fed Portion: {paper.width}×{paper.breadth}{paper.unit}
              </span>
            )}
         </div>

         <div className="w-full max-w-full h-full flex items-center justify-center">
            <svg 
              viewBox={viewBox} 
              className="max-w-full max-h-[500px] drop-shadow-2xl transition-transform duration-500 hover:scale-[1.01]"
              style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.1))" }}
            >
              {/* 1. Source Paper (Full Stock) */}
              <rect 
                x="0" y="0" 
                width={canvas.width} height={canvas.breadth} 
                fill="white" 
                rx={canvas.width * 0.005}
                stroke="#E5E7EB"
                strokeWidth={canvas.width * 0.001}
              />

              {/* 2. Grid & Highlight */}
              {isPortioned && (
                <g>
                  {/* Grid Lines */}
                  {Array.from({ length: grid.cols - 1 }).map((_, i) => (
                    <line 
                      key={`v-${i}`}
                      x1={(i + 1) * cellWidth} y1="0"
                      x2={(i + 1) * cellWidth} y2={canvas.breadth}
                      stroke="#F3F4F6"
                      strokeWidth={canvas.width * 0.002}
                      strokeDasharray={`${canvas.width * 0.005} ${canvas.width * 0.005}`}
                    />
                  ))}
                  {Array.from({ length: grid.rows - 1 }).map((_, i) => (
                    <line 
                      key={`h-${i}`}
                      x1="0" y1={(i + 1) * cellHeight}
                      x2={canvas.width} y2={(i + 1) * cellHeight}
                      stroke="#F3F4F6"
                      strokeWidth={canvas.width * 0.002}
                      strokeDasharray={`${canvas.width * 0.005} ${canvas.width * 0.005}`}
                    />
                  ))}

                  {/* Fed Highlight Area (Picked Top-Left Cell as per symmetrical rule) */}
                  <rect 
                    x="0" y="0"
                    width={cellWidth} height={cellHeight}
                    fill="var(--color-brand-teal)"
                    stroke="var(--color-brand-teal)"
                    style={{ fillOpacity: 0.02, strokeOpacity: 0.2 }}


                    strokeWidth={canvas.width * 0.003}
                    rx={canvas.width * 0.005}
                  />
                </g>
              )}

              {/* 3. Placements (Rendered inside the highlighted cell) */}
              <g transform="translate(0, 0)">
                {placements.map((block, bIdx) => {
                  const cellW = block.width / block.across;
                  const cellH = block.breadth / block.down;
                  const cells = [];
                  let cellsDrawn = 0;

                  for (let r = 0; r < block.down; r++) {
                    for (let c = 0; c < block.across; c++) {
                      if (cellsDrawn >= block.count) break;
                      cells.push({ x: block.x + (c * cellW), y: block.y + (r * cellH) });
                      cellsDrawn++;
                    }
                    if (cellsDrawn >= block.count) break;
                  }

                  return (
                    <g key={bIdx} className="group/block">
                      {/* Block Outline */}
                      <rect 
                        x={block.x} y={block.y} 
                        width={block.width} height={block.breadth} 
                        fill={bIdx === 0 ? "var(--color-brand-teal)" : "rgba(145, 166, 186, 0.08)"}
                        style={bIdx === 0 ? { fillOpacity: 0.08 } : {}}
                        stroke={bIdx === 0 ? "var(--color-brand-teal)" : "#91A6BA"}

                        strokeWidth={canvas.width * 0.002}
                        strokeDasharray={`${canvas.width * 0.005} ${canvas.width * 0.005}`}
                      />

                      {/* Individual Deliverable Units */}
                      {cells.map((cell, cIdx) => (
                        <rect 
                          key={cIdx}
                          x={cell.x + (cellW * 0.05)} 
                          y={cell.y + (cellH * 0.05)}
                          width={cellW * 0.9} 
                          height={cellH * 0.9}
                          fill={bIdx === 0 ? "var(--color-brand-teal)" : "#91A6BA"}

                          rx={cellW * 0.1}
                          className="opacity-40 hover:opacity-100 transition-all cursor-pointer"
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            </svg>
         </div>

         {/* Technical Footer Label */}
         <div className="absolute bottom-4 left-6 text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.25em] flex items-center gap-4">
            <span>Canvas: {canvas.width}×{canvas.breadth} {canvas.unit}</span>
            <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
            <span>Scale: 1 Unit = 1 {canvas.unit}</span>
         </div>
      </div>

      {/* 3. Detailed Technical Specs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-10 bg-brand-teal rounded-full" />
             <div>
                <div className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest">Selected Equipment</div>
                <div className="text-sm font-black text-brand-navy tracking-tight">{printerName}</div>
             </div>
          </div>
          
          <div className="flex gap-10 items-center bg-zinc-50 px-8 py-4 rounded-3xl border border-brand-navy/5 shadow-sm">
             {waste && (
                <div className="flex gap-8">
                   <div>
                      <div className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest text-right">Waste Width</div>
                      <div className="text-xs font-black text-brand-navy text-right">{waste.remainingWidth}{canvas.unit}</div>
                   </div>
                   <div>
                      <div className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest text-right">Waste Breadth</div>
                      <div className="text-xs font-black text-brand-navy text-right">{waste.remainingBreadth}{canvas.unit}</div>
                   </div>
                   <div className="pl-8 border-l border-brand-navy/10">
                      <div className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest text-right">Utilization</div>
                      <div className="text-xs font-black text-brand-teal text-right">{(waste.utilization * 100).toFixed(1)}%</div>
                   </div>
                </div>
             )}
          </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, icon, color = "text-brand-navy" }) {
  return (
    <div className="bg-white rounded-[2rem] border border-brand-navy/5 p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
       <div className="absolute -right-4 -bottom-4 text-brand-navy/5 group-hover:text-brand-teal/10 transition-colors">
          {React.cloneElement(icon, { size: 64 })}
       </div>
       <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-zinc-50 text-brand-navy transition-colors group-hover:bg-brand-teal/5 group-hover:text-brand-teal">
            {React.cloneElement(icon, { size: 16 })}
          </div>
          <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.1em]">{label}</span>
       </div>
       <div className={`text-xl font-black ${color} truncate mb-0.5 tracking-tight`}>{value}</div>
       <div className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-tight">{sub}</div>
    </div>
  );
}
