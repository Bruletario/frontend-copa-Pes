import { ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { Users, Shield, Trophy, Tv, Gamepad2, Medal } from "lucide-react";

const navItems = [
  { path: "/", label: "Jogadores", icon: Users },
  { path: "/times", label: "Times", icon: Shield },
  { path: "/campeonato", label: "Campeonato", icon: Trophy },
  { path: "/live", label: "Live Score", icon: Tv }, 
  { path: "/copas", label: "Copas", icon: Medal },  
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    // Transformamos em h-screen e adicionamos overflow-y-auto com a mesma estilização do modal
    <div className="h-screen flex flex-col bg-background overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
      
      {/* Top Bar Fixa */}
      <header className="border-b border-border/50 bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Gamepad2 className="h-7 w-7 text-primary" />
            <span className="font-display text-2xl font-bold tracking-tight">
              COPA <span className="text-primary neon-text">PES</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 overflow-x-auto custom-scrollbar px-2 py-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-center gap-2 w-12 md:w-[140px] h-10 md:h-auto md:py-2 rounded-lg text-sm font-medium transition-all shrink-0 border
                    ${active
                      ? "border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                      : "border-transparent text-muted-foreground hover:text-white hover:border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                    }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        {children}
      </main>
    </div>
  );
}