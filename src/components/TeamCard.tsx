import { useState } from "react";
import { TeamData, SquadAthlete } from "@/pages/Teams";
import { User, Trash2, Shield, ChevronDown, UserMinus } from "lucide-react";

interface TeamCardProps {
  team: TeamData;
  index?: number;
  onRemoveAthlete: (teamId: number | string, athleteId: string) => void;
  onClearTeam: (teamId: number | string) => void;
}

const getPosColor = (pos: string) => {
  const p = pos.toUpperCase();
  if (['GL'].includes(p)) return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
  if (['ZG', 'LD', 'LE'].includes(p)) return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  if (['VOL', 'MC', 'MA', 'MD', 'ME'].includes(p)) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
  return 'bg-red-500/20 text-red-400 border-red-500/50'; 
};

export function TeamCard({ team, index = 0, onRemoveAthlete, onClearTeam }: TeamCardProps) {
  // Estado local e independente para cada card!
  const [isExpanded, setIsExpanded] = useState(false);
  const isSemTime = team.team_player === "Sem Time" || !team.team_player;

  return (
    <div
      className={`card-elevated transition-all duration-300 animate-fade-in flex flex-col overflow-hidden ${isExpanded ? 'border-primary/50' : 'hover:border-primary/30'} ${isSemTime ? 'opacity-70 grayscale-[0.5]' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div 
        className="p-4 cursor-pointer flex items-center justify-between group"
        onClick={() => !isSemTime && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border shadow-sm group-hover:scale-105 transition-transform" style={{ borderColor: isSemTime ? '#555' : team.color }}>
            <Shield className="h-5 w-5" style={{ color: isSemTime ? '#555' : team.color }} />
          </div>
          <div>
            <h3 className={`font-display text-base font-bold leading-tight transition-colors ${isSemTime ? 'text-muted-foreground' : 'group-hover:text-primary'}`}>
              {isSemTime ? 'Aguardando Clube' : team.team_player}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
               <User className="h-3 w-3" /> Téc: {team.name_player}
            </p>
          </div>
        </div>
        
        {!isSemTime && (
          <div className="flex items-center gap-3">
            <span className="stat-badge text-sm px-2 py-0.5 bg-primary/10 text-primary border-primary/30">{team.ovr}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180 text-primary" : ""}`} />
          </div>
        )}
      </div>

      <div className={`transition-all duration-300 ease-in-out bg-muted/10 border-t border-border/30 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
             <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{team.formation}</span>
             <button onClick={() => onClearTeam(team.id)} className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-500 font-bold transition-colors">
               <UserMinus className="h-3 w-3" /> Dispensar Clube
             </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
            {(!team.squad || team.squad.length === 0) ? (
              <p className="text-xs text-center text-muted-foreground py-4 bg-muted/20 rounded-lg border border-dashed border-border">Nenhum jogador customizado.</p>
            ) : (
              team.squad.map((athlete: SquadAthlete) => (
                <div key={athlete.id} className="flex items-center justify-between bg-background/50 border border-border/50 rounded-md px-2.5 py-1.5 group hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPosColor(athlete.position)}`}>{athlete.position}</span>
                    <span className="text-sm font-medium">{athlete.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono opacity-80">{athlete.ovr}</span>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveAthlete(team.id, athlete.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}