import { Check, Minus, X } from "lucide-react";
import { ApiPlayer } from "@/pages/Players";

interface PlayerCardProps {
  player: ApiPlayer;
  onClick?: () => void;
  index?: number;
}

export function PlayerCard({ player, onClick, index = 0 }: PlayerCardProps) {
  return (
    <div
      onClick={onClick}
      className="card-elevated p-4 cursor-pointer hover:border-primary/40 transition-all duration-300 group flex flex-col justify-between animate-fade-in relative"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* OVR do time adicionado no topo direito */}
      <div className="absolute top-4 right-4 flex flex-col items-center justify-center bg-background border border-border/50 rounded-md px-2 py-1 shadow-sm">
         <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-0.5">OVR</span>
         <span className="text-sm font-black text-foreground font-mono leading-none">{player.ovr}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-display text-xl font-bold text-black shadow-lg border-2 border-background/50 shrink-0"
          style={{ backgroundColor: player.color || '#FFFFFF' }}
        >
          {player.name_player[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors flex items-center gap-2 truncate">
            <span className="truncate">{player.name_player}</span>
            {/* Tag ATIVO em Azul Neon agora retangular */}
            <span className="text-[9px] text-[#00BFFF] border border-[#00BFFF]/50 bg-[#00BFFF]/10 px-1.5 py-0.5 rounded-sm shadow-[0_0_8px_rgba(0,191,255,0.4)] tracking-widest font-black uppercase shrink-0 leading-none h-fit">
              ATIVO
            </span>
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 mb-1 truncate">
             {player.team_player} <span className="opacity-50">•</span> {player.formation}
          </p>
          
          {/* Lógica de Medalhas (Badges) do Histórico Geral */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {player.ouro > 0 && <span className="text-[10px] shrink-0 font-bold bg-muted px-1.5 py-0.5 rounded-md border border-neon-yellow/30 text-neon-yellow shadow-sm">🥇 {player.ouro}</span>}
            {player.prata > 0 && <span className="text-[10px] shrink-0 font-bold bg-muted px-1.5 py-0.5 rounded-md border border-gray-400/30 text-gray-300 shadow-sm">🥈 {player.prata}</span>}
            {player.bronze > 0 && <span className="text-[10px] shrink-0 font-bold bg-muted px-1.5 py-0.5 rounded-md border border-amber-600/30 text-amber-500 shadow-sm">🥉 {player.bronze}</span>}
          </div>
        </div>
      </div>

      {/* Stats da Temporada Atual (Agora usando Histórico Geral com design minimalista) */}
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <StatItem icon={<Check className="h-3.5 w-3.5" />} label="Vitórias" value={player.all_time_wins} color="text-win" />
        <StatItem icon={<Minus className="h-3.5 w-3.5" />} label="Empates" value={player.all_time_draws} color="text-draw" />
        <StatItem icon={<X className="h-3.5 w-3.5" />} label="Derrotas" value={player.all_time_losses} color="text-loss" />
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center bg-muted/50 rounded-md py-2 border border-border/30">
      <div className={`${color} mb-1`}>{icon}</div>
      <span className="font-display text-lg font-bold leading-none">{value}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}