import { TeamData } from "@/pages/Teams";
import { Shield } from "lucide-react";
import { useMemo } from "react";

interface StandingsTableProps {
  teams: TeamData[];
  games?: any[];
  compact?: boolean;
  ignoreGroups?: boolean;
  liveScores?: Record<number, { s1: number; s2: number }>;
  liveMatchIds?: Set<number>;
  config?: any; //  Recebendo a configuração para calcular o destaque de classificação
}

export function StandingsTable({ teams, games, compact = false, ignoreGroups = false, liveScores, liveMatchIds, config }: StandingsTableProps) {
  const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
  
  const effectiveMatchIds = useMemo(() => {
    if (liveMatchIds) return liveMatchIds;
    const saved = localStorage.getItem('liveMatchIds');
    return saved ? new Set<number>(JSON.parse(saved)) : new Set<number>();
  }, [liveMatchIds, games]);

  const effectiveScores = useMemo(() => {
    if (liveScores) return liveScores;
    const saved = localStorage.getItem('liveScores');
    return saved ? JSON.parse(saved) : {};
  }, [liveScores, games]);

  const liveTeamSet = useMemo(() => {
    const teamsLive = new Set<number | string>();
    games?.forEach(g => {
      if (g.status_game === "Em Andamento" || effectiveMatchIds.has(g.match_id)) {
        teamsLive.add(g.team_house_id);
        teamsLive.add(g.team_out_id);
      }
    });
    return teamsLive;
  }, [games, effectiveMatchIds]);

  const projectedTeams = useMemo(() => {
    const newTeams = activeTeams.map(t => ({...t})); 
    const teamMap = new Map(newTeams.map(t => [t.id, t]));
    
    games?.forEach(game => {
      //  REGRA DE CONGELAMENTO: Se for Mata-Mata e NÃO for a Tabela Geral, ignora a soma.
      if (game.round >= 90 && !ignoreGroups) return;

      const isLocallyLive = effectiveMatchIds.has(game.match_id);
      const isBackendLive = game.status_game === "Em Andamento";
      const isFinished = game.status_game === "Finalizado";

      if (!isLocallyLive && !isBackendLive) return;

      const tHome = teamMap.get(game.team_house_id);
      const tOut = teamMap.get(game.team_out_id);
      if(!tHome || !tOut) return;

      if (isLocallyLive && isFinished) {
          const dbGh = Number(game.goals_home) || 0;
          const dbGo = Number(game.goals_out) || 0;
          
          tHome.goals_score -= dbGh;
          tHome.goals_conceded -= dbGo;
          tOut.goals_score -= dbGo;
          tOut.goals_conceded -= dbGh;
          tHome.matches_played -= 1;
          tOut.matches_played -= 1;

          if (dbGh > dbGo) { tHome.points -= 3; tHome.wins -= 1; tOut.losses -= 1; }
          else if (dbGo > dbGh) { tOut.points -= 3; tOut.wins -= 1; tHome.losses -= 1; }
          else { tHome.points -= 1; tHome.draws -= 1; tOut.points -= 1; tOut.draws -= 1; }
      }

      let gh = Number(game.goals_home) || 0;
      let go = Number(game.goals_out) || 0;

      if (isLocallyLive && effectiveScores[game.match_id]) {
          gh = Number(effectiveScores[game.match_id].s1) || 0;
          go = Number(effectiveScores[game.match_id].s2) || 0;
      }

      tHome.goals_score += gh;
      tHome.goals_conceded += go;
      tOut.goals_score += go;
      tOut.goals_conceded += gh;

      tHome.matches_played += 1;
      tOut.matches_played += 1;

      if (gh > go) {
         tHome.points += 3; tHome.wins += 1; tOut.losses += 1;
      } else if (go > gh) {
         tOut.points += 3; tOut.wins += 1; tHome.losses += 1;
      } else {
         tHome.points += 1; tHome.draws += 1; tOut.points += 1; tOut.draws += 1;
      }
    });
    return newTeams;
  }, [activeTeams, games, effectiveMatchIds, effectiveScores, ignoreGroups]);
  
  const sortTeams = (teamList: TeamData[]) => {
    return [...teamList].sort((a, b) => {
      if (b.points !== a.points) return (Number(b.points) || 0) - (Number(a.points) || 0);
      const gdA = a.goals_score - a.goals_conceded;
      const gdB = b.goals_score - b.goals_conceded;
      if (gdB !== gdA) return (Number(gdB) || 0) - (Number(gdA) || 0);
      return (Number(b.goals_score) || 0) - (Number(a.goals_score) || 0);
    });
  };

  const groups = Array.from(new Set(activeTeams.map(t => t.grupo)))
    .filter(g => g !== undefined && g !== null && g !== "")
    .sort((a, b) => {
       const numA = Number(a); const numB = Number(b);
       return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : String(a).localeCompare(String(b));
    });

  const hasGroups = !ignoreGroups && groups.length > 0;

  const getAproveitamento = (pts: number, matches: number) => {
    if (matches === 0) return "0.0%";
    return ((pts / (matches * 3)) * 100).toFixed(1) + "%";
  };

  const renderTable = (teamList: TeamData[], title?: string) => {
    //  CALCULO DE VAGAS DE CLASSIFICAÇÃO
    let qualifyingSpots = 0;
    if (config && config.type !== 'LEAGUE') {
      if (config.type === 'GROUPS_KNOCKOUT' && !ignoreGroups) {
         qualifyingSpots = config.knockoutTeams / config.groupsCount;
      } else if (config.type === 'LEAGUE_KNOCKOUT' || (config.type === 'GROUPS_KNOCKOUT' && ignoreGroups)) {
         qualifyingSpots = config.knockoutTeams;
      }
    }

    return (
      <div className="card-elevated overflow-hidden border-border/50 mb-6">
        {title && (
          <div className="bg-muted/40 px-4 py-3 border-b border-border/50">
            <h3 className="font-display font-bold text-primary tracking-wider uppercase text-sm">{title}</h3>
          </div>
        )}
        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="text-left py-3 px-3 font-display text-xs text-muted-foreground uppercase tracking-wider w-8">#</th>
                <th className="text-left py-3 px-3 font-display text-xs text-muted-foreground uppercase tracking-wider">Equipa</th>
                
                <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">J</th>
                <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">V</th>
                <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">E</th>
                <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">D</th>
                
                {!compact && (
                  <>
                    <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">GM</th>
                    <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">GS</th>
                  </>
                )}
                
                <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">SG</th>
                
                {!compact && (
                  <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">%</th>
                )}
                <th className="text-center py-3 px-3 font-display text-xs font-bold text-primary uppercase">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sortTeams(teamList).map((team, index) => {
                const sg = team.goals_score - team.goals_conceded;
                const bgRow = index % 2 === 0 ? "bg-background/50" : "bg-muted/10";
                
                //  APLICAÇÃO DO DESTAQUE AZUL SE ESTIVER NA ZONA DE CLASSIFICAÇÃO
                const isQualifying = qualifyingSpots > 0 && index < qualifyingSpots;
                const highlight = isQualifying 
                    ? "border-l-4 border-l-blue-500 bg-blue-500/5 shadow-[inset_2px_0_0_0_rgba(59,130,246,0.1)]" 
                    : "border-l-4 border-l-transparent";
                
                return (
                  <tr key={team.id} className={`${bgRow} ${highlight} border-b border-border/50 hover:bg-muted/30 transition-all duration-300`}>
                    <td className="py-3 px-3 font-bold text-muted-foreground">{index + 1}</td>
                    <td className="py-3 px-3 max-w-[150px] md:max-w-[200px]">
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Shield className="h-5 w-5 shrink-0" style={{ color: team.color }} />
                          <div className="flex flex-col min-w-0">
                             <span className="font-display font-bold leading-none truncate">{team.name_player}</span>
                             <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold truncate">{team.team_player}</span>
                          </div>
                        </div>
                        {liveTeamSet.has(team.id) && (
                           <span className="shrink-0 flex items-center gap-1 text-[8px] bg-red-500/10 border border-red-500/30 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Ao Vivo
                           </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="text-center py-3 px-2 text-muted-foreground">{team.matches_played}</td>
                    <td className="text-center py-3 px-2 text-win font-medium">{team.wins}</td>
                    <td className="text-center py-3 px-2 text-draw font-medium">{team.draws}</td>
                    <td className="text-center py-3 px-2 text-loss font-medium">{team.losses}</td>
                    
                    {!compact && (
                      <>
                        <td className="text-center py-3 px-2 opacity-80">{team.goals_score}</td>
                        <td className="text-center py-3 px-2 opacity-80">{team.goals_conceded}</td>
                      </>
                    )}
                    
                    <td className="text-center py-3 px-2 font-bold"><span className={sg > 0 ? "text-win" : sg < 0 ? "text-loss" : "text-muted-foreground"}>{sg > 0 ? `+${sg}` : sg}</span></td>
                    
                    {!compact && (
                      <td className="text-center py-3 px-2 font-bold text-xs text-muted-foreground">{getAproveitamento(team.points, team.matches_played)}</td>
                    )}
                    
                    <td className="text-center py-3 px-3 font-display text-lg font-black text-primary bg-primary/5">{team.points}</td>
                  </tr>
                );
              })}
              {teamList.length === 0 && <tr><td colSpan={compact ? 8 : 11} className="text-center py-8 text-muted-foreground">Nenhuma equipa registada neste grupo.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (hasGroups) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
        {groups.map(g => renderTable(projectedTeams.filter(t => t.grupo === g), `Grupo ${g}`))}
      </div>
    );
  }

  return <div className="animate-fade-in">{renderTable(projectedTeams)}</div>;
}