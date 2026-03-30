import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GripVertical, 
  Maximize2, 
  Minimize2,
  TrendingUp, 
  TrendingDown
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Legend,
  ComposedChart
} from "recharts";

export interface DashboardTile {
  id: string;
  type: "kpi" | "bar" | "line" | "pie" | "area" | "scatter" | "combo" | "table" | "radar" | "funnel" | "waterfall" | "heatmap" | "gauge" | "treemap" | "histogram" | "boxplot";
  title: string;
  size: "small" | "medium" | "large";
  column?: string;
  xAxis?: string;
  yAxis?: string;
  data?: any[];
  value?: number;
  change?: number;
  color?: string;
  secondaryData?: any[];
  width?: number;
  height?: number;
}

export const POWER_BI_COLORS = [
  "#01B8AA", // Teal
  "#374649", // Dark Gray
  "#FD625E", // Red
  "#F2C80F", // Yellow
  "#5F6B6D", // Gray
  "#8AD4EB", // Light Blue
  "#FE9666", // Orange
  "#A66999", // Purple
  "#3599B8", // Blue
  "#DFBFBF"  // Pink
];

interface DraggableTileProps {
  tile: DashboardTile;
  isSelected: boolean;
  onSelect: () => void;
  viewMode: "grid" | "list";
  onResize?: (id: string, size: "small" | "medium" | "large") => void;
  isDragging?: boolean;
}

export const DraggableTile = ({ 
  tile, 
  isSelected, 
  onSelect, 
  viewMode,
  onResize,
  isDragging 
}: DraggableTileProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sizeClasses = {
    small: "col-span-1",
    medium: viewMode === "grid" ? "col-span-1 md:col-span-2" : "col-span-1",
    large: viewMode === "grid" ? "col-span-1 md:col-span-2 lg:col-span-3" : "col-span-1"
  };

  const cycleSize = () => {
    const sizes: ("small" | "medium" | "large")[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(tile.size);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    onResize?.(tile.id, nextSize);
  };

  return (
    <div ref={setNodeRef} style={style} className={sizeClasses[tile.size]}>
      <Card 
        className={`group cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${isDragging ? "opacity-50 scale-105 shadow-2xl" : ""}`}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-sm font-medium truncate flex-1">{tile.title}</CardTitle>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSize();
                }}
              >
                {tile.size === "large" ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tile.type === "kpi" && (
            <div className="space-y-2">
              <div className="text-3xl font-bold" style={{ color: tile.color }}>
                {tile.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {tile.change !== undefined && (
                <div className={`flex items-center text-sm ${
                  tile.change >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {tile.change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {tile.change >= 0 ? "+" : ""}{tile.change.toFixed(2)}%
                </div>
              )}
            </div>
          )}

          {tile.type === "bar" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "line" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[2]} strokeWidth={2} dot={false} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "pie" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={tile.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    dataKey="value"
                    label={({ name }) => name}
                    labelLine={false}
                  >
                    {tile.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={POWER_BI_COLORS[index % POWER_BI_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "area" && tile.data && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tile.data}>
                  <defs>
                    <linearGradient id={`gradient-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[4]} fill={`url(#gradient-${tile.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "scatter" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name={tile.xAxis} />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name={tile.yAxis} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={tile.data} fill={tile.color || POWER_BI_COLORS[5]} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "combo" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={Object.keys(tile.data[0] || {})[1] || "value"} fill={POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey={Object.keys(tile.data[0] || {})[2] || "value2"} stroke={POWER_BI_COLORS[2]} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "gauge" && tile.data && (
            <div className="h-32 flex items-center justify-center">
              <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute inset-0 rounded-t-full border-8 border-muted" />
                <div 
                  className="absolute inset-0 rounded-t-full border-8 origin-bottom transition-transform duration-1000"
                  style={{
                    borderColor: tile.color || POWER_BI_COLORS[7],
                    clipPath: `polygon(0 0, ${tile.value || 50}% 0, ${tile.value || 50}% 100%, 0 100%)`,
                  }}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                  <span className="text-xl font-bold">{tile.value?.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {tile.type === "histogram" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "treemap" && tile.data && (
            <div className="h-48 grid grid-cols-4 gap-1 p-2">
              {tile.data.slice(0, 12).map((item, idx) => {
                const maxValue = Math.max(...tile.data!.map(d => d.value || 0));
                const ratio = (item.value || 0) / maxValue;
                return (
                  <div
                    key={idx}
                    className="rounded flex items-center justify-center text-white text-xs font-medium p-1 truncate"
                    style={{
                      backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length],
                      opacity: 0.5 + ratio * 0.5,
                      gridColumn: ratio > 0.5 ? 'span 2' : 'span 1',
                      gridRow: ratio > 0.7 ? 'span 2' : 'span 1'
                    }}
                    title={`${item.name}: ${item.value?.toFixed(2)}`}
                  >
                    {item.name?.split('/')[1] || item.name}
                  </div>
                );
              })}
            </div>
          )}

          {tile.type === "funnel" && tile.data && (
            <div className="h-48 flex flex-col justify-center space-y-1 px-4">
              {tile.data.map((item, idx) => {
                const maxValue = tile.data![0]?.value || 1;
                const width = ((item.value || 0) / maxValue) * 100;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div 
                      className="h-6 rounded-r-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all"
                      style={{
                        width: `${width}%`,
                        backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length],
                        minWidth: '40px'
                      }}
                    >
                      {item.value?.toFixed(0)}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {tile.type === "waterfall" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" fill={tile.color || POWER_BI_COLORS[9]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "boxplot" && tile.data && (
            <div className="h-48 flex items-end justify-around px-4 pb-6">
              {tile.data.map((item, idx) => {
                const maxVal = Math.max(...tile.data!.map(d => d.max || 0));
                const scale = (val: number) => (val / maxVal) * 140;
                return (
                  <div key={idx} className="flex flex-col items-center relative" style={{ height: '100%' }}>
                    <div 
                      className="absolute w-px bg-muted-foreground"
                      style={{
                        bottom: `${scale(item.min || 0)}px`,
                        height: `${scale((item.max || 0) - (item.min || 0))}px`
                      }}
                    />
                    <div 
                      className="absolute w-8 rounded"
                      style={{
                        bottom: `${scale(item.q1 || 0)}px`,
                        height: `${scale((item.q3 || 0) - (item.q1 || 0))}px`,
                        backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length]
                      }}
                    />
                    <div 
                      className="absolute w-8 h-0.5 bg-white"
                      style={{
                        bottom: `${scale(item.median || 0)}px`
                      }}
                    />
                    <span className="absolute -bottom-5 text-[10px] text-muted-foreground truncate max-w-12">
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggableTile;
