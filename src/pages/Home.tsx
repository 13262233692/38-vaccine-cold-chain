import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useSSE } from '@/hooks/useSSE';
import StatusBar from '@/components/StatusBar';
import KpiPanel from '@/components/KpiPanel';
import TopologyMap from '@/components/TopologyMap';
import BatchPanel from '@/components/BatchPanel';
import AlertOverlay from '@/components/AlertOverlay';
import VehicleDetail from '@/components/VehicleDetail';
import MktReport from '@/components/MktReport';

export default function Home() {
  const { setVehicles, sseConnected } = useStore();
  useSSE();

  useEffect(() => {
    fetch('/api/alerts/vehicles')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setVehicles(json.data);
        }
      })
      .catch(console.error);
  }, [setVehicles]);

  useEffect(() => {
    const timer = setInterval(() => {
      document.getElementById('live-clock')!.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-deep-space overflow-hidden">
      <StatusBar />

      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        <div className="w-56 flex-shrink-0">
          <KpiPanel />
        </div>

        <div className="flex-1 min-w-0">
          <TopologyMap />
        </div>

        <div className="w-56 flex-shrink-0">
          <BatchPanel />
        </div>
      </div>

      <div className="h-8 bg-deep-space-light border-t border-panel-border flex items-center justify-between px-6 text-[10px] text-gray-600 font-mono">
        <span>HYPERLEDGER FABRIC | CHANNEL: vaccine-cold-chain | CHAINCODE: temp_audit_cc</span>
        <span>{sseConnected ? '● SSE 实时连接' : '○ SSE 断开'}</span>
      </div>

      <AlertOverlay />
      <VehicleDetail />
      <MktReport />
    </div>
  );
}
