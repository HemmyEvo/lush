import Link from "next/link";
import { 
  ShoppingBag, 
  ChefHat, 
  PackageCheck, 
  Settings, 
  ArrowRight 
} from "lucide-react";

export default function Home() {
  const roles = [
    {
      title: "Sales Manager",
      description: "Take orders, select products, and send to production.",
      href: "/pos",
      icon: <ShoppingBag className="w-6 h-6" />,
    },
    {
      title: "Production Team",
      description: "View incoming orders and prepare the parfaits.",
      href: "/production",
      icon: <ChefHat className="w-6 h-6" />,
    },
    {
      title: "Sales Executive",
      description: "Pack orders, assign riders, and dispatch logistics.",
      href: "/logistics",
      icon: <PackageCheck className="w-6 h-6" />,
    },
    {
      title: "Admin",
      description: "Import products, manage menu, and download reports.",
      href: "/admin",
      icon: <Settings className="w-6 h-6" />,
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* 1. Ambient Background Glow (The Glassmorphism Base) */}
      <div className="absolute top-[-20%] left-[-10%] w-150 h-150 bg-zinc-800 rounded-full blur-[120px] opacity-20 animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-150 h-150 bg-zinc-700 rounded-full blur-[120px] opacity-20 animate-pulse delay-700" />

      <div className="z-10 w-full max-w-5xl space-y-12">
        {/* 2. Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-500">
            LUSH PARFAIT
          </h1>
          <p className="text-zinc-400 text-lg font-light tracking-wide">
            Select your workspace to begin.
          </p>
        </div>

        {/* 3. Role Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <Link key={role.href} href={role.href} className="group block h-full">
              <div className="h-full relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/30 backdrop-blur-md p-8 transition-all duration-300 hover:bg-zinc-800/50 hover:border-white/20 hover:shadow-[0_0_30px_-10px_rgba(255,255,255,0.1)]">
                
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white group-hover:scale-110 transition-transform duration-300">
                    {role.icon}
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-colors duration-300" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {role.title}
                  </h2>
                  <p className="text-zinc-400 leading-relaxed">
                    {role.description}
                  </p>
                </div>

              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}