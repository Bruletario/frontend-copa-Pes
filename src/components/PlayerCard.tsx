import { Target, ShieldAlert, Swords } from "lucide-react";
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
      className="card-elevated p-4 cursor-pointer hover:border-primary/40 transition-all duration-300 group animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-display text-lg font-bold text-primary-foreground shadow-lg"
          style={{ backgroundColor: player.color }}
        >
          {player.name_player[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">
            {player.name_player}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
             {player.team_player} <span className="opacity-50">•</span> {player.formation}
          </p>
        </div>
        {player.ovr && (
          <span className="stat-badge">OVR {player.ovr}</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatItem icon={<Target className="h-3.5 w-3.5" />} label="Gols" value={player.goals_score} color="text-primary" />
        <StatItem icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Sofridos" value={player.goals_conceded} color="text-neon-red" />
        <StatItem icon={<Swords className="h-3.5 w-3.5" />} label="Jogos" value={player.matches_played} color="text-neon-blue" />
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center bg-muted/50 rounded-md py-2">
      <div className={`${color} mb-1`}>{icon}</div>
      <span className="font-display text-lg font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}