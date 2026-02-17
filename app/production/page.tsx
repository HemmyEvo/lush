/* eslint-disable react-hooks/exhaustive-deps */
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
  Flame,
  FileBarChart,
  Play
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ProductionPage() {
  // --- 1. DATA FETCHING ---
  const newOrders = useQuery(api.orders.getByStatus, { status: "NEW" });
  const completedOrders = useQuery(api.orders.getCompleted);
  const updateStatus = useMutation(api.orders.updateStatus);

  // --- 2. SOUND & INTERACTION STATE ---
  const [soundEnabled, setSoundEnabled] = useState(true); 
  const [hasInteracted, setHasInteracted] = useState(false);
  const prevOrderCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/ding.mp3");
    }
  }, []);

  useEffect(() => {
    if (!newOrders) return;
    if (newOrders.length > prevOrderCount.current && hasInteracted && soundEnabled) {
      audioRef.current?.play().catch(e => console.error("Audio blocked:", e));
    }
    prevOrderCount.current = newOrders.length;
  }, [newOrders, soundEnabled, hasInteracted]);

  // --- 3. PDF REPORT GENERATION ---
  const generateDailyReport = () => {
    if (!completedOrders && !newOrders) return;
    
    const doc = new jsPDF();
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-");
    
    // Combine active and completed orders
    const allOrders = [...(completedOrders || []), ...(newOrders || [])];
    
    // Filter for TODAY using _creationTime (Fixes the type error)
    const todaysOrders = allOrders.filter(o => 
      new Date(o._creationTime).toDateString() === today.toDateString()
    );

    // --- MATH ANALYSIS ---
    const totalRevenue = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = todaysOrders.length;
    
    const itemCounts: Record<string, number> = {};
    let totalItemsCooked = 0;
    todaysOrders.forEach(order => {
      order.items.forEach((item: any) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        totalItemsCooked += item.quantity;
      });
    });

    const hourCounts = new Array(24).fill(0);
    todaysOrders.forEach(order => {
      const hour = new Date(order._creationTime).getHours();
      hourCounts[hour]++;
    });

    // --- PDF DRAWING ---
    doc.setFontSize(22);
    doc.text("Kitchen Production Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${today.toLocaleDateString()}`, 14, 30);
    doc.text(`Total Orders: ${totalOrders}`, 14, 38);
    doc.text(`Total Revenue: N${totalRevenue.toLocaleString()}`, 14, 46);

    // Table
    const tableData = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => [name, count, `${totalItemsCooked > 0 ? ((count / totalItemsCooked) * 100).toFixed(1) : 0}%`]);

    autoTable(doc, {
      startY: 55,
      head: [['Product Name', 'Qty Cooked', 'Share (%)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });

    // Bar Chart
    let finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text("Peak Ordering Hours", 14, finalY);
    
    finalY += 10;
    const chartHeight = 50;
    const barWidth = 6;
    const maxOrders = Math.max(...hourCounts, 1);
    
    doc.line(14, finalY + chartHeight, 200, finalY + chartHeight); // X Axis
    doc.line(14, finalY, 14, finalY + chartHeight); // Y Axis

    hourCounts.forEach((count, hour) => {
      if (hour >= 8 && hour <= 22) {
        const barHeight = (count / maxOrders) * chartHeight;
        const x = 20 + (hour - 8) * 12; 
        
        if (count > 0) {
          doc.setFillColor(255, 100, 0);
          doc.rect(x, finalY + chartHeight - barHeight, barWidth, barHeight, 'F');
          doc.setFontSize(8);
          doc.text(count.toString(), x + 1, finalY + chartHeight - barHeight - 2);
        }
        doc.setFontSize(8);
        doc.text(`${hour}:00`, x, finalY + chartHeight + 5);
      }
    });

    doc.save(`${dateStr}-orders.pdf`);
  };

  if (!hasInteracted) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center space-y-6">
        <div className="bg-orange-900/20 p-6 rounded-full animate-pulse">
          <Flame className="w-16 h-16 text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Kitchen Display System</h1>
        <button 
          onClick={() => {
            setHasInteracted(true);
            audioRef.current?.play().catch(() => {});
          }}
          className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Play className="w-5 h-5" /> Start Shift
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-orange-900/20 p-2 rounded-xl border border-orange-900/50">
              <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Production Line</h1>
              <p className="text-zinc-500 text-sm">{newOrders?.length || 0} Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-3 rounded-lg border ${soundEnabled ? "bg-white text-black" : "bg-zinc-900 border-zinc-700"}`}>
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button onClick={generateDailyReport} className="flex items-center gap-2 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg hover:bg-zinc-700 text-sm">
              <FileBarChart className="w-4 h-4 text-orange-400" /> End of Day Report
            </button>
            <Link href="/"><button className="px-4 py-3 border border-white/10 rounded-lg text-sm">Exit</button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {newOrders?.map((order) => (
          <KitchenTicket 
            key={order._id} 
            order={order} 
            onComplete={() => updateStatus({ id: order._id, status: "READY" })} 
          />
        ))}
      </main>
    </div>
  );
}

function KitchenTicket({ order, onComplete }: { order: any, onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  // Use _creationTime for the timer
  const elapsedMinutes = Math.floor((Date.now() - order._creationTime) / 60000);
  const createdTime = new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl">
      <div className={`p-4 border-b border-white/5 flex justify-between items-center ${elapsedMinutes > 20 ? "bg-red-900/40" : "bg-white/5"}`}>
        <div>
          <span className="font-bold text-zinc-300">#{order._id.slice(-4)}</span>
          <div className="text-[10px] uppercase text-zinc-500">{order.customerType}</div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-bold flex items-center gap-1 ${elapsedMinutes > 20 ? "text-red-400" : "text-green-400"}`}>
            <Clock className="w-3 h-3" /> {elapsedMinutes}m
          </div>
          <div className="text-[10px] text-zinc-500">In: {createdTime}</div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex justify-between items-center">
        <span className="text-xs text-zinc-300 truncate max-w-[150px]">{order.customerName}</span>
        {order.salesManager && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1 rounded">{order.salesManager}</span>}
      </div>

      <div className="p-4 flex-1 space-y-3">
        {order.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-start text-sm">
            <span className="text-zinc-200 font-medium w-[75%]">{item.name}</span>
            <span className="text-black font-bold bg-white px-2 py-0.5 rounded text-xs">x{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/40">
        <button 
          onClick={() => { setLoading(true); onComplete(); }} 
          disabled={loading}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl flex justify-center items-center gap-2"
        >
          {loading ? "Updating..." : <>Mark Ready <CheckCircle2 className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
