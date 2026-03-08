import { ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { Users, Shield, Trophy, Tv, Gamepad2, Medal } from "lucide-react";

const navItems = [
  { path: "/", label: "Jogadores", icon: Users },
  { path: "/times", label: "Times", icon: Shield },
  { path: "/campeonato", label: "Campeonato", icon: Trophy },
  { path: "/live", label: "Live Score", icon: Tv }, // <- Live Score agora é o 4º
  { path: "/copas", label: "Copas", icon: Medal },  // <- Copas agora é o 5º
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar Fixa */}
      <header className="border-b border-border/50 bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Gamepad2 className="h-7 w-7 text-primary" />
            <span className="font-display text-2xl font-bold tracking-tight">
              COPA <span className="text-primary neon-text">PES</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${active
                      ? "bg-primary/10 text-primary neon-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
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