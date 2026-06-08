import { useStore } from '@/store/useStore';
import { useMemo } from 'react';

const WAREHOUSES = [
  { id: 'WH-BJ', name: '北京仓库', x: 80, y: 180 },
  { id: 'WH-SH', name: '上海仓库', x: 80, y: 360 },
  { id: 'WH-GZ', name: '广州仓库', x: 80, y: 540 },
];

const ROUTES = [
  { from: 'WH-BJ', to: 'VH-001' },
  { from: 'WH-BJ', to: 'VH-002' },
  { from: 'WH-SH', to: 'VH-003' },
  { from: 'WH-SH', to: 'VH-004' },
  { from: 'WH-GZ', to: 'VH-005' },
  { from: 'WH-GZ', to: 'VH-006' },
];

const DESTINATIONS = [
  { id: 'DEST-WH', name: '武汉疾控', x: 920, y: 270 },
  { id: 'DEST-GZ', name: '广州一院', x: 920, y: 450 },
  { id: 'DEST-JN', name: '济南疾控', x: 920, y: 180 },
];

const DEST_ROUTES = [
  { from: 'VH-001', to: 'DEST-WH' },
  { from: 'VH-002', to: 'DEST-WH' },
  { from: 'VH-003', to: 'DEST-GZ' },
  { from: 'VH-004', to: 'DEST-GZ' },
  { from: 'VH-005', to: 'DEST-JN' },
  { from: 'VH-006', to: 'DEST-JN' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'safe': return '#00E676';
    case 'warning': return '#FFB300';
    case 'danger': return '#FF2D55';
    default: return '#666';
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'safe': return 'node-safe';
    case 'warning': return 'node-warning';
    case 'danger': return 'node-danger';
    default: return '';
  }
}

export default function TopologyMap() {
  const { vehicles, setSelectedVehicleId } = useStore();

  const vehicleMap = useMemo(() => {
    const m: Record<string, typeof vehicles[0]> = {};
    vehicles.forEach((v) => { m[v.id] = v; });
    return m;
  }, [vehicles]);

  return (
    <div className="panel h-full overflow-hidden relative">
      <div className="panel-header flex items-center justify-between">
        <span>物流骨干网拓扑</span>
        <div className="flex items-center gap-4 text-xs font-body">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-safe-green inline-block" /> 安全 2-8°C</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn-amber inline-block" /> 预警</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-alert-red inline-block" /> 超温</span>
        </div>
      </div>

      <svg viewBox="0 0 1000 680" className="w-full h-full" style={{ minHeight: '400px' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#00D4FF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.4" />
          </linearGradient>
          <marker id="arrowBlue" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="#00D4FF" fillOpacity="0.5" />
          </marker>
        </defs>

        <rect x="0" y="0" width="1000" height="680" fill="transparent" />

        {ROUTES.map((route) => {
          const vehicle = vehicleMap[route.to];
          const wh = WAREHOUSES.find((w) => w.id === route.from);
          if (!vehicle || !wh) return null;
          return (
            <line
              key={`route-${route.from}-${route.to}`}
              x1={wh.x + 30}
              y1={wh.y}
              x2={vehicle.x - 20}
              y2={vehicle.y}
              stroke={getStatusColor(vehicle.status)}
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="5,5"
              className="animate-data-flow"
            />
          );
        })}

        {DEST_ROUTES.map((route) => {
          const vehicle = vehicleMap[route.from];
          const dest = DESTINATIONS.find((d) => d.id === route.to);
          if (!vehicle || !dest) return null;
          return (
            <line
              key={`dest-route-${route.from}-${route.to}`}
              x1={vehicle.x + 20}
              y1={vehicle.y}
              x2={dest.x - 30}
              y2={dest.y}
              stroke={getStatusColor(vehicle.status)}
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="5,5"
              className="animate-data-flow"
            />
          );
        })}

        {WAREHOUSES.map((wh) => (
          <g key={wh.id}>
            <rect
              x={wh.x - 30}
              y={wh.y - 20}
              width="60"
              height="40"
              rx="4"
              fill="rgba(0, 212, 255, 0.1)"
              stroke="#00D4FF"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
            <text x={wh.x} y={wh.y - 6} textAnchor="middle" fill="#00D4FF" fontSize="8" fontFamily="Rajdhani" fontWeight="600">
              {wh.name}
            </text>
            <text x={wh.x} y={wh.y + 8} textAnchor="middle" fill="#0099BB" fontSize="6" fontFamily="Source Sans 3">
              仓储节点
            </text>
          </g>
        ))}

        {vehicles.map((v) => {
          const color = getStatusColor(v.status);
          const nodeClass = getStatusClass(v.status);
          return (
            <g
              key={v.id}
              className={`cursor-pointer ${nodeClass}`}
              onClick={() => setSelectedVehicleId(v.id)}
            >
              <circle
                cx={v.x}
                cy={v.y}
                r="24"
                fill="rgba(10, 22, 40, 0.9)"
                stroke={color}
                strokeWidth="2"
              />

              {v.status === 'danger' && (
                <circle
                  cx={v.x}
                  cy={v.y}
                  r="30"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeOpacity="0.4"
                  className="animate-ping"
                />
              )}

              <text x={v.x} y={v.y - 6} textAnchor="middle" fill="white" fontSize="14" fontFamily="Rajdhani" fontWeight="700">
                🚛
              </text>
              <text x={v.x} y={v.y + 12} textAnchor="middle" fill={color} fontSize="8" fontFamily="Rajdhani" fontWeight="600">
                {v.lastTemperature}°C
              </text>

              <text x={v.x} y={v.y + 34} textAnchor="middle" fill="#aaa" fontSize="7" fontFamily="Source Sans 3">
                {v.id}
              </text>
              <text x={v.x} y={v.y + 44} textAnchor="middle" fill={color} fontSize="6" fontFamily="Source Sans 3">
                {v.status === 'safe' ? '温区正常' : v.status === 'warning' ? '温度偏离' : '超温告警!'}
              </text>
            </g>
          );
        })}

        {DESTINATIONS.map((dest) => (
          <g key={dest.id}>
            <rect
              x={dest.x - 30}
              y={dest.y - 20}
              width="60"
              height="40"
              rx="4"
              fill="rgba(0, 230, 118, 0.1)"
              stroke="#00E676"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
            <text x={dest.x} y={dest.y - 6} textAnchor="middle" fill="#00E676" fontSize="8" fontFamily="Rajdhani" fontWeight="600">
              {dest.name}
            </text>
            <text x={dest.x} y={dest.y + 8} textAnchor="middle" fill="#009944" fontSize="6" fontFamily="Source Sans 3">
              接收节点
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
