import { Check, Minus, X } from "lucide-react";
import { ApiPlayer } from "@/pages/Players";

interface PlayerCardProps {
  player: ApiPlayer;
  onClick?: () => void;
  index?: number;
}

export function PlayerCard({ player, onClick, index = 0 }: PlayerCardProps) {
  
  const getOvrColor = (ovr: number) => {
    if (ovr < 60) return "text-red-500";
    if (ovr < 70) return "text-orange-500";
    if (ovr < 80) return "text-yellow-500";
    if (ovr < 90) return "text-green-500";
    return "text-blue-500"; 
  };

  // ATUALIZAÇÃO: Apontando para os dados de Histórico Geral (ALL TIME) para os resultados aparecerem
  const victories = player.all_time_wins;
  const draws = player.all_time_draws;
  const defeats = player.all_time_losses;
  const isAtivo = player.team_player !== 'INATIVO';

  return (
    <div
      onClick={onClick}
      // Aumentamos o padding principal (p-4 para p-5)
      className="card-elevated p-5 cursor-pointer hover:border-primary/40 transition-all duration-300 group flex flex-col justify-between animate-fade-in relative"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* OVR + Tag Ativo/Inativo agrupados - Tamanhos maiores */}
      <div className="absolute top-5 right-5 flex flex-col items-center justify-center bg-transparent p-1">
         <span className="text-[9px] text-white/70 font-bold uppercase tracking-wider leading-none mb-0.5">OVR</span>
         {/* Número do OVR maior: text-2xl */}
         <span className={`text-2xl font-black font-display leading-none ${getOvrColor(player.ovr)}`}>
           {player.ovr}
         </span>
         {isAtivo ? (
            <span className="text-[8px] mt-1.5 text-[#00BFFF] border border-[#00BFFF]/50 bg-[#00BFFF]/10 px-1.5 py-0.5 rounded tracking-widest font-bold uppercase">ATIVO</span>
         ) : (
            <span className="text-[8px] mt-1.5 text-[#FF003F] border border-[#FF003F]/50 bg-[#FF003F]/10 px-1.5 py-0.5 rounded tracking-widest font-bold uppercase">INATIVO</span>
         )}
      </div>

      {/* Header - Aumentamos distanciamento e avatares/fontes */}
      <div className="flex items-center gap-4 mb-5 pr-12">
        <div
          // Avatar maior: de w-12 para w-14 e fonte text-2xl
          className="w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl font-bold text-black shadow-lg border-2 border-background/50 shrink-0"
          style={{ backgroundColor: player.color || '#FFFFFF' }}
        >
          {player.name_player[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Nome maior: text-xl */}
            <h3 className="font-display font-bold text-white text-xl leading-tight truncate max-w-[140px]">
              {player.name_player}
            </h3>
            <div className="flex gap-1 mt-0.5">
              {/* Medalhas ligeiramente maiores: text-[10px] */}
              {player.ouro > 0 && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded border border-neon-yellow/30 text-neon-yellow shadow-sm">🥇 {player.ouro}</span>}
              {player.prata > 0 && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded border border-gray-400/30 text-gray-300 shadow-sm">🥈 {player.prata}</span>}
              {player.bronze > 0 && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded border border-amber-600/30 text-amber-500 shadow-sm">🥉 {player.bronze}</span>}
            </div>
          </div>
          {/* Subtítulo maior: text-sm */}
          <p className="text-sm text-white/70 truncate max-w-[140px]">
            {player.team_player}
          </p>
        </div>
      </div>

      {/* Stats da Temporada Atual mantendo as cores em Branco com gap maior */}
      <div className="grid grid-cols-3 gap-3 mt-auto">
        <StatItem icon={<Check className="h-4 w-4" />} label="Vitórias" value={victories} color="text-white" />
        <StatItem icon={<Minus className="h-4 w-4" />} label="Empates" value={draws} color="text-white" />
        <StatItem icon={<X className="h-4 w-4" />} label="Derrotas" value={defeats} color="text-white" />
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    // Padding maior (px-2.5 py-2)
    <div className="bg-muted/30 rounded px-2.5 py-2 text-center border border-border/20 flex flex-col items-center justify-center">
      <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${color}`}>
        {icon}
        {value}
      </div>
      {/* Label ligeiramente maior: text-[10px] */}
      <span className="text-[10px] text-white/70 tracking-tight mt-1">{label}</span>
    </div>
  );
}