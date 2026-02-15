/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Volume2,
  VolumeX,
  Flame
} from "lucide-react";
import Link from "next/link";

export default function ProductionPage() {
  // --- 1. DATA FETCHING ---
  // Only show orders that the Assistant has approved ("IN_PROGRESS")
  const orders = useQuery(api.orders.getByStatus, { status: "IN_PROGRESS" });
  const updateStatus = useMutation(api.orders.updateStatus);

  // --- 2. SOUND NOTIFICATION ---
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevOrderCount = useRef(0);

  useEffect(() => {
    if (!orders) return;
    
    // Play sound if a new order arrives
    if (orders.length > prevOrderCount.current) {
      if (soundEnabled) {
        const audio = new Audio("/sounds/ding.mp3");
        audio.play().catch(e => console.log("Audio blocked:", e));
      }
    }
    prevOrderCount.current = orders.length;
  }, [orders, soundEnabled]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
      
      {/* Background Ambience (Kitchen Heat Theme) */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-orange-900/20 rounded-full blur-[150px]" />
         <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[150px]" />
      </div>

      {/* --- HEADER --- */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-orange-900/20 p-2 rounded-xl border border-orange-900/50">
              <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Production Line</h1>
              <p className="text-zinc-500 text-sm">
                {orders ? `${orders.length} orders pending` : "Connecting..."}
              </p>
            </div>

            {/* Sound Toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`ml-4 p-2 rounded-full border transition-all ${soundEnabled ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-700"}`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <Link href="/">
             <button className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/10 text-sm transition-colors">
               <ArrowLeft className="w-4 h-4" /> Exit
             </button>
          </Link>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="relative z-10 max-w-7xl mx-auto p-6">
        
        {!orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-600 space-y-6">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
               <ChefHat className="w-10 h-10 opacity-50" />
            </div>
            <h2 className="text-xl font-medium">All caught up! No active orders.</h2>
            <p className="text-sm opacity-50">Waiting for Assistant Manager...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => (
              <KitchenTicket 
                key={order._id} 
                order={order} 
                onComplete={() => updateStatus({ id: order._id, status: "READY" })} 
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

// --- TICKET COMPONENT ---
function KitchenTicket({ order, onComplete }: { order: any, onComplete: () => void }) {
  const [loading, setLoading] = useState(false);

  // Calculate elapsed time (e.g. "5 mins ago")
  const elapsedMinutes = Math.floor((Date.now() - order.createdAt) / 60000);
  
  const handleComplete = () => {
    setLoading(true);
    // Small delay for UX feeling
    setTimeout(() => onComplete(), 500);
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl hover:border-orange-500/30 transition-all duration-300 group">
      
      {/* Ticket Header */}
      <div className={`p-4 border-b border-white/5 flex justify-between items-center 
        ${elapsedMinutes > 15 ? "bg-red-900/20" : "bg-white/5"}`}>
        <div className="flex items-center gap-2">
           <span className="font-mono text-zinc-500 text-xs">#{order._id.slice(-4)}</span>
           {elapsedMinutes > 15 && (
             <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">LATE</span>
           )}
        </div>
        <div className="flex items-center gap-1 text-zinc-400 text-xs font-mono">
           <Clock className="w-3 h-3" /> {elapsedMinutes}m
        </div>
      </div>

      {/* Customer Note (Optional) */}
      <div className="px-4 py-2 bg-black/20 border-b border-white/5">
        <p className="text-xs text-zinc-500 truncate">{order.customerName}</p>
      </div>

      {/* Order Items (The Meat) */}
      <div className="p-4 flex-1 space-y-3">
        {order.items.map((item: any, i: number) => (
           <div key={i} className="flex justify-between items-start text-sm">
             <span className="text-zinc-200 font-medium leading-tight">{item.name}</span>
             <span className="text-orange-400 font-bold bg-orange-900/20 px-2 py-0.5 rounded border border-orange-900/30 ml-2 shrink-0">
               x{item.quantity}
             </span>
           </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-black/40 border-t border-white/5">
        <button 
          onClick={handleComplete}
          disabled={loading}
          className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-green-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
             <>Mark Ready <CheckCircle2 className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}