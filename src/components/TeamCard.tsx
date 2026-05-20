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
  const [isExpanded, setIsExpanded] = useState(false);
  const isSemTime = team.team_player === "Sem Time" || !team.team_player;

  // Categorias para agrupamento
  const categories = [
    { title: "Goleiro", positions: ['GL'] },
    { title: "Defensores", positions: ['ZG', 'LD', 'LE'] },
    { title: "Meias", positions: ['VOL', 'MC', 'MA', 'MD', 'ME'] },
    { title: "Atacantes", positions: ['PE', 'PD', 'CA'] }
  ];

  return (
    <div
      className={`card-elevated transition-all duration-300 animate-fade-in flex flex-col overflow-hidden w-full ${isExpanded ? 'border-primary/50' : 'hover:border-primary/30'} ${isSemTime ? 'opacity-70 grayscale-[0.5]' : ''}`}
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

      <div className={`grid transition-all duration-300 ease-in-out bg-muted/10 ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-border/30' : 'grid-rows-[0fr] opacity-0 border-t-0 border-transparent'}`}>
        <div className="overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{team.formation}</span>
               <button onClick={() => onClearTeam(team.id)} className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-500 font-bold transition-colors">
                 <UserMinus className="h-3 w-3" /> Excluir time
               </button>
            </div>
            
            {/* Scrollbar padronizada aplicada aqui */}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
              {(!team.squad || team.squad.length === 0) ? (
                <p className="text-xs text-center text-muted-foreground py-4 bg-muted/20 rounded-lg border border-dashed border-border">Nenhum jogador adicionado.</p>
              ) : (
                categories.map(cat => {
                  const players = team.squad.filter(a => cat.positions.includes(a.position.toUpperCase()));
                  if (players.length === 0) return null;
                  
                  return (
                    <div key={cat.title}>
                      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 border-b border-border/30 pb-1">{cat.title}</h4>
                      <div className="space-y-1.5">
                        {players.map((athlete: SquadAthlete) => (
                          <div key={athlete.id} className="flex items-center justify-between bg-background/50 border border-border/50 rounded-md px-2.5 py-1.5 group hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-2.5">
                              {/* Tag de posição fixa com w-8 */}
                              <span className={`w-8 shrink-0 inline-block text-center text-[9px] font-bold px-1 py-0.5 rounded border ${getPosColor(athlete.position)}`}>
                                {athlete.position}
                              </span>
                              <span className="text-sm font-medium">{athlete.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono opacity-80">{athlete.ovr}</span>
                              <button onClick={(e) => { e.stopPropagation(); onRemoveAthlete(team.id, athlete.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}