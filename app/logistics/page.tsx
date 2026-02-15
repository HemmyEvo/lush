/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, BellOff, CheckCircle2, Package, Plus, Save, Users, Download, Briefcase, ClipboardList } from "lucide-react";
import Link from "next/link";
import { exportToCsv } from "@/lib/exportToCsv";
import useSound from "use-sound";

type MainTab = "dispatch" | "riders" | "sales" | "records";
type DispatchTab = "incoming" | "outgoing";

export default function AssistantPage() {
  const [mainTab, setMainTab] = useState<MainTab>("dispatch");
  const [dispatchTab, setDispatchTab] = useState<DispatchTab>("incoming");
  const [readyDetailsTab, setReadyDetailsTab] = useState<"orders" | "riders">("orders");

  const newOrders = useQuery(api.orders.getByStatus, { status: "NEW" });
  const readyOrders = useQuery(api.orders.getByStatus, { status: "READY" });
  const completedOrders = useQuery(api.orders.getCompleted);
  const riders = useQuery(api.riders.list);

  const updateStatus = useMutation(api.orders.updateStatus);
  const createRider = useMutation(api.riders.create);

  const [permission, setPermission] = useState("default");
  const prevIncomingOrderCount = useRef(0);
  const prevReadyOrderCount = useRef(0);
  const [playNewOrderSound] = useSound("/sounds/ding.mp3", { volume: 0.8 });
  const [playReadyOrderSound] = useSound("/sounds/ding.mp3", { volume: 1 });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerWorker = async () => {
        try {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        } catch (error) {
          console.error("SW registration failed", error);
        }
      };
      registerWorker();
    }
  }, []);

  const notifyOrderUpdate = useCallback(async (title: string, body: string, tag: string) => {
    if (permission !== "granted") return;

    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, { body, tag });
        return;
      } catch {
        // fall back to browser notifications when SW is unavailable.
      }
    }

    new Notification(title, { body, tag });
  }, [permission]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return alert("Browser does not support notifications");
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (!newOrders) return;
    if (newOrders.length > prevIncomingOrderCount.current) {
      playNewOrderSound();
      notifyOrderUpdate("New Order! 🍧", "Assistant has new incoming order(s).", "new-order");
    }
    prevIncomingOrderCount.current = newOrders.length;
  }, [newOrders, notifyOrderUpdate, playNewOrderSound]);

  useEffect(() => {
    if (!readyOrders) return;
    if (readyOrders.length > prevReadyOrderCount.current) {
      playReadyOrderSound();
      notifyOrderUpdate("Order Ready ✅", "A kitchen order is now ready for dispatch.", "ready-order");
    }
    prevReadyOrderCount.current = readyOrders.length;
  }, [notifyOrderUpdate, playReadyOrderSound, readyOrders]);


  const riderAssignments = useMemo(
    () => (completedOrders ?? []).filter((order) => order.riderName || order.riderPhone || order.riderCompanyName),
    [completedOrders],
  );

  const downloadReadyOrders = () => {
    exportToCsv(
      "ready-order-details",
      ["Order ID", "Customer", "Customer Type", "Address", "Sales Manager", "Status", "Items", "Total", "Created At"],
      (readyOrders ?? []).map((order) => [
        order._id,
        order.customerName,
        order.customerType,
        order.customerAddress || "",
        order.salesManager || "",
        order.status,
        order.items.map((item) => `${item.quantity}x ${item.name}`).join(" | "),
        order.totalAmount,
        new Date(order.createdAt).toLocaleString(),
      ]),
    );
  };

  const downloadRiderAssignments = () => {
    exportToCsv(
      "rider-assignments",
      ["Order ID", "Customer", "Customer Type", "Rider", "Rider Phone", "Company", "Address", "Completed At"],
      riderAssignments.map((order) => [
        order._id,
        order.customerName,
        order.customerType,
        order.riderName || "",
        order.riderPhone || "",
        order.riderCompanyName || "",
        order.customerAddress || "",
        order.assistantCompletedAt ? new Date(order.assistantCompletedAt).toLocaleString() : "",
      ]),
    );
  };

  const walkInManaged = useMemo(
    () => (completedOrders ?? []).filter((order) => order.customerType === "WALK_IN" && order.salesManager),
    [completedOrders],
  );

  const downloadOrders = () => {
    const allOrders = [...(newOrders ?? []), ...(readyOrders ?? []), ...(completedOrders ?? [])];
    const deduped = Array.from(new Map(allOrders.map((order) => [order._id, order])).values());
    exportToCsv(
      "assistant-orders",
      ["Order ID", "Status", "Type", "Customer", "Address", "Sales Manager", "Rider", "Rider Phone", "Company", "Items", "Total", "Created At"],
      deduped.map((order) => [
        order._id,
        order.status,
        order.customerType,
        order.customerName,
        order.customerAddress,
        order.salesManager,
        order.riderName,
        order.riderPhone,
        order.riderCompanyName,
        order.items.map((item) => `${item.quantity}x ${item.name}`).join(" | "),
        order.totalAmount,
        new Date(order.createdAt).toLocaleString(),
      ]),
    );
  };

  const downloadRiders = () => {
    exportToCsv(
      "assistant-riders",
      ["Name", "Phone", "Company", "Active", "Created At"],
      (riders ?? []).map((rider) => [rider.name, rider.phone, rider.companyName, rider.isActive ? "Yes" : "No", new Date(rider.createdAt).toLocaleString()]),
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Sales Executive</h1>
            {permission !== "granted" ? (
              <button onClick={requestPermission} className="bg-pink-600 p-2 rounded-full animate-pulse"><BellOff className="w-4 h-4 text-white" /></button>
            ) : (
              <div className="bg-green-900/20 p-2 rounded-full border border-green-900/50"><Bell className="w-4 h-4 text-green-400" /></div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={downloadOrders} className="px-3 py-2 text-xs border border-white/10 rounded-lg hover:bg-white/10 flex items-center gap-1"><Download className="w-3 h-3" /> Orders</button>
            <button onClick={downloadRiders} className="px-3 py-2 text-xs border border-white/10 rounded-lg hover:bg-white/10 flex items-center gap-1"><Download className="w-3 h-3" /> Riders</button>
            <Link href="/"><button className="px-3 py-2 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10">Exit</button></Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
          {[
            { value: "dispatch", label: "Dispatch", icon: <Package className="w-4 h-4" /> },
            { value: "riders", label: "Riders", icon: <Users className="w-4 h-4" /> },
            { value: "sales", label: "Sales", icon: <Briefcase className="w-4 h-4" /> },
            { value: "records", label: "Ready Details", icon: <ClipboardList className="w-4 h-4" /> },
          ].map(({ value, label, icon }) => (
            <button key={value} onClick={() => setMainTab(value as MainTab)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${mainTab === value ? "bg-zinc-800" : "text-zinc-500 hover:text-zinc-300"}`}>{icon}{label}</button>
          ))}
        </div>

        {mainTab === "dispatch" && (
          <div className="lg:hidden grid grid-cols-2 p-2 gap-2 border-t border-white/5">
            <button onClick={() => setDispatchTab("incoming")} className={`py-2 px-4 rounded-lg text-sm font-bold ${dispatchTab === "incoming" ? "bg-zinc-800" : "text-zinc-500"}`}>Incoming ({newOrders?.length ?? 0})</button>
            <button onClick={() => setDispatchTab("outgoing")} className={`py-2 px-4 rounded-lg text-sm font-bold ${dispatchTab === "outgoing" ? "bg-zinc-800" : "text-zinc-500"}`}>Ready ({readyOrders?.length ?? 0})</button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-4 w-full">
        {mainTab === "dispatch" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderColumn
              title="Incoming Orders"
              count={newOrders?.length ?? 0}
              show={dispatchTab === "incoming"}
              items={newOrders ?? []}
              emptyText="No pending orders"
              action={(order) => (
                <button onClick={() => updateStatus({ id: order._id, status: "IN_PROGRESS" })} className="w-full py-3 bg-white text-black font-bold rounded-lg text-sm">
                  Send to Kitchen
                </button>
              )}
            />

            <OrderColumn
              title="Ready to Pack"
              count={readyOrders?.length ?? 0}
              show={dispatchTab === "outgoing"}
              items={readyOrders ?? []}
              emptyText="Waiting for kitchen..."
              action={(order) => <DispatchCard order={order} riders={riders ?? []} onDispatch={async (args) => { await updateStatus(args); }} />}
            />
          </div>
        )}

        {mainTab === "riders" && <RiderManagement riders={riders ?? []} createRider={createRider} />}

        {mainTab === "sales" && (
          <div className="space-y-4">
            <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4">
              <h2 className="font-bold mb-2">Walk-in customers managed by Sales team</h2>
              <p className="text-sm text-zinc-400 mb-3">Assistant can now see these orders clearly during handoff.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-zinc-500"><tr><th className="text-left py-2">Customer</th><th className="text-left py-2">Sales Manager</th><th className="text-left py-2">Items</th><th className="text-right py-2">Amount</th></tr></thead>
                  <tbody>
                    {walkInManaged.length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-zinc-500">No managed walk-in sales yet.</td></tr>
                    ) : walkInManaged.map((order) => (
                      <tr key={order._id} className="border-t border-white/5">
                        <td className="py-2">{order.customerName}</td>
                        <td className="py-2">{order.salesManager}</td>
                        <td className="py-2">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</td>
                        <td className="py-2 text-right">₦{order.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {mainTab === "records" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button onClick={() => setReadyDetailsTab("orders")} className={`px-3 py-2 text-xs rounded-lg border ${readyDetailsTab === "orders" ? "bg-zinc-800 border-zinc-600" : "border-white/10"}`}>Order & Customer Info</button>
                <button onClick={() => setReadyDetailsTab("riders")} className={`px-3 py-2 text-xs rounded-lg border ${readyDetailsTab === "riders" ? "bg-zinc-800 border-zinc-600" : "border-white/10"}`}>Rider Assignments</button>
              </div>
              {readyDetailsTab === "orders" ? (
                <button onClick={downloadReadyOrders} className="px-3 py-2 text-xs border border-white/10 rounded-lg hover:bg-white/10 flex items-center gap-1"><Download className="w-3 h-3" /> Download Orders</button>
              ) : (
                <button onClick={downloadRiderAssignments} className="px-3 py-2 text-xs border border-white/10 rounded-lg hover:bg-white/10 flex items-center gap-1"><Download className="w-3 h-3" /> Download Riders</button>
              )}
            </div>

            {readyDetailsTab === "orders" ? (
              <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-zinc-500"><tr><th className="text-left py-2">Order</th><th className="text-left py-2">Customer</th><th className="text-left py-2">Type</th><th className="text-left py-2">Address</th><th className="text-left py-2">Items</th><th className="text-left py-2">Sales</th><th className="text-right py-2">Amount</th></tr></thead>
                  <tbody>
                    {(readyOrders ?? []).length === 0 ? (
                      <tr><td colSpan={7} className="py-4 text-zinc-500">No ready orders currently.</td></tr>
                    ) : (readyOrders ?? []).map((order) => (
                      <tr key={order._id} className="border-t border-white/5">
                        <td className="py-2 text-xs">#{order._id.slice(-6)}</td>
                        <td className="py-2">{order.customerName}</td>
                        <td className="py-2">{order.customerType === "WALK_IN" ? "Walk-in" : "Delivery"}</td>
                        <td className="py-2">{order.customerAddress || "—"}</td>
                        <td className="py-2">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</td>
                        <td className="py-2">{order.salesManager || "—"}</td>
                        <td className="py-2 text-right">₦{order.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-zinc-500"><tr><th className="text-left py-2">Order</th><th className="text-left py-2">Customer</th><th className="text-left py-2">Type</th><th className="text-left py-2">Rider</th><th className="text-left py-2">Phone</th><th className="text-left py-2">Company</th><th className="text-left py-2">Completed</th></tr></thead>
                  <tbody>
                    {riderAssignments.length === 0 ? (
                      <tr><td colSpan={7} className="py-4 text-zinc-500">No rider assignments yet.</td></tr>
                    ) : riderAssignments.map((order) => (
                      <tr key={order._id} className="border-t border-white/5">
                        <td className="py-2 text-xs">#{order._id.slice(-6)}</td>
                        <td className="py-2">{order.customerName}</td>
                        <td className="py-2">{order.customerType === "WALK_IN" ? "Walk-in" : "Delivery"}</td>
                        <td className="py-2">{order.riderName || "—"}</td>
                        <td className="py-2">{order.riderPhone || "—"}</td>
                        <td className="py-2">{order.riderCompanyName || "—"}</td>
                        <td className="py-2">{order.assistantCompletedAt ? new Date(order.assistantCompletedAt).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function OrderColumn({ title, count, show, items, emptyText, action }: { title: string; count: number; show: boolean; items: any[]; emptyText: string; action: (order: any) => React.ReactNode; }) {
  return (
    <section className={`flex flex-col h-full bg-zinc-900/30 rounded-2xl border border-white/10 overflow-hidden ${show ? "block" : "hidden lg:block"}`}>
      <div className="p-4 border-b border-white/5 flex justify-between items-center"><h2 className="font-bold">{title}</h2><span className="bg-zinc-700 px-2 py-0.5 rounded text-xs font-bold">{count}</span></div>
      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {items.length === 0 ? <div className="text-zinc-500 text-sm">{emptyText}</div> : items.map((order) => (
          <div key={order._id} className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center"><span className="text-xs text-zinc-500">#{order._id.slice(-4)}</span><span className="font-bold">₦{order.totalAmount.toLocaleString()}</span></div>
            <div className="text-xs text-zinc-400">{order.customerType === "WALK_IN" ? "Walk-in" : "Delivery"} • {order.customerName} {order.salesManager ? `• Sales: ${order.salesManager}` : ""}</div>
            {order.items.map((item: any, i: number) => <div key={i} className="flex justify-between text-sm"><span>{item.name}</span><span>x{item.quantity}</span></div>)}
            {action(order)}
          </div>
        ))}
      </div>
    </section>
  );
}

function DispatchCard({ order, riders, onDispatch }: { order: any; riders: any[]; onDispatch: (args: any) => Promise<void>; }) {
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderCompanyName, setRiderCompanyName] = useState("");

  const handleSelectRider = (id: string) => {
    const rider = riders.find((item) => item._id === id);
    if (!rider) return;
    setRiderName(rider.name);
    setRiderPhone(rider.phone);
    setRiderCompanyName(rider.companyName ?? "");
  };

  const isWalkIn = order.customerType === "WALK_IN";

  const handleDispatch = async () => {
    if (!isWalkIn && (!riderName.trim() || !riderPhone.trim())) return alert("Provide rider name and phone number.");
    await onDispatch({
      id: order._id,
      status: "COMPLETED",
      riderName: isWalkIn ? undefined : riderName,
      riderPhone: isWalkIn ? undefined : riderPhone,
      riderCompanyName: isWalkIn ? undefined : (riderCompanyName || undefined),
    });
  };

  return (
    <div className="space-y-2">
      {isWalkIn ? (
        <div className="text-xs rounded-lg border border-emerald-500/40 bg-emerald-900/20 p-2 text-emerald-300">Walk-in order: rider assignment is not required.</div>
      ) : (
        <>
          <select onChange={(e) => handleSelectRider(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm">
            <option value="">Select existing rider</option>
            {riders.filter((rider) => rider.isActive).map((rider) => <option key={rider._id} value={rider._id}>{rider.name} • {rider.phone}</option>)}
          </select>
          <input value={riderName} onChange={(e) => setRiderName(e.target.value)} placeholder="Rider name" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm" />
          <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="Rider phone" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm" />
          <input value={riderCompanyName} onChange={(e) => setRiderCompanyName(e.target.value)} placeholder="Logistics company (optional)" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm" />
        </>
      )}
      <button onClick={handleDispatch} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex justify-center text-xs font-semibold">{isWalkIn ? "Complete walk-in pickup" : <CheckCircle2 className="w-4 h-4" />}</button>
    </div>
  );
}

function RiderManagement({ riders, createRider }: { riders: any[]; createRider: any }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    await createRider({ name: name.trim(), phone: phone.trim(), companyName: company.trim() || undefined });
    setName("");
    setPhone("");
    setCompany("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form onSubmit={submit} className="bg-zinc-900/40 border border-white/10 rounded-xl p-4 space-y-3 h-fit">
        <h2 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Rider</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rider name" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm" />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm" />
        <button className="w-full bg-white text-black py-2 rounded-lg font-semibold flex justify-center gap-2"><Save className="w-4 h-4" /> Save Rider</button>
      </form>

      <div className="lg:col-span-2 bg-zinc-900/40 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 font-bold">Riders ({riders.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Phone</th><th className="text-left p-3">Company</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {riders.map((rider) => (
                <tr key={rider._id} className="border-t border-white/5">
                  <td className="p-3">{rider.name}</td>
                  <td className="p-3">{rider.phone}</td>
                  <td className="p-3">{rider.companyName || "—"}</td>
                  <td className="p-3">{rider.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
