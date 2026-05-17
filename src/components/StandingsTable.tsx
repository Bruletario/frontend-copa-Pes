import { TeamData } from "@/pages/Teams";
import { Shield } from "lucide-react";

interface StandingsTableProps {
  teams: TeamData[];
  compact?: boolean;
  ignoreGroups?: boolean;
}

export function StandingsTable({ teams, compact = false, ignoreGroups = false }: StandingsTableProps) {
  const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
  
  const sortTeams = (teamList: TeamData[]) => {
    return [...teamList].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goals_score - a.goals_conceded;
      const gdB = b.goals_score - b.goals_conceded;
      return gdB - gdA;
    });
  };

  const groups = Array.from(new Set(activeTeams.map(t => t.grupo))).filter(Boolean).sort();
  const hasGroups = !ignoreGroups && groups.length > 0;

  // Calculo matematico de aproveitamento
  const getAproveitamento = (pts: number, matches: number) => {
    if (matches === 0) return "0.0%";
    return ((pts / (matches * 3)) * 100).toFixed(1) + "%";
  };

  const renderTable = (teamList: TeamData[], title?: string) => (
    <div className="card-elevated overflow-hidden border-border/50 mb-6">
      {title && (
        <div className="bg-muted/40 px-4 py-3 border-b border-border/50">
          <h3 className="font-display font-bold text-primary tracking-wider uppercase text-sm">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <th className="text-left py-3 px-4 font-display text-xs text-muted-foreground uppercase tracking-wider">#</th>
              <th className="text-left py-3 px-4 font-display text-xs text-muted-foreground uppercase tracking-wider">Equipa</th>
              {!compact && <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">J</th>}
              <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">V</th>
              <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">E</th>
              <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">D</th>
              {!compact && (
                <>
                  <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">GM</th>
                  <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">GS</th>
                  <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">SG</th>
                  {/* Nova Coluna % */}
                  <th className="text-center py-3 px-2 font-display text-xs text-muted-foreground uppercase">%</th>
                </>
              )}
              <th className="text-center py-3 px-4 font-display text-xs font-bold text-primary uppercase">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortTeams(teamList).map((team, index) => {
              const sg = team.goals_score - team.goals_conceded;
              const bgRow = index % 2 === 0 ? "bg-background/50" : "bg-muted/10";
              const highlight = index < 4 ? "border-l-4 border-l-primary" : index >= teamList.length - 4 ? "border-l-4 border-l-destructive/50" : "border-l-4 border-l-transparent";
              
              return (
                <tr key={team.id} className={`${bgRow} ${highlight} border-b border-border/50 hover:bg-muted/30 transition-colors`}>
                  <td className="py-3 px-4 font-bold text-muted-foreground">{index + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 shrink-0" style={{ color: team.color }} />
                      <div className="flex flex-col">
                        <span className="font-display font-bold leading-none">{team.name_player}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">{team.team_player}</span>
                      </div>
                    </div>
                  </td>
                  {!compact && <td className="text-center py-3 px-2 text-muted-foreground">{team.matches_played}</td>}
                  <td className="text-center py-3 px-2 text-win font-medium">{team.wins}</td>
                  <td className="text-center py-3 px-2 text-draw font-medium">{team.draws}</td>
                  <td className="text-center py-3 px-2 text-loss font-medium">{team.losses}</td>
                  {!compact && (
                    <>
                      <td className="text-center py-3 px-2 opacity-80">{team.goals_score}</td>
                      <td className="text-center py-3 px-2 opacity-80">{team.goals_conceded}</td>
                      <td className="text-center py-3 px-2 font-bold"><span className={sg > 0 ? "text-win" : sg < 0 ? "text-loss" : "text-muted-foreground"}>{sg > 0 ? `+${sg}` : sg}</span></td>
                      {/* Novo Dado: % Aproveitamento */}
                      <td className="text-center py-3 px-2 font-bold text-xs text-muted-foreground">{getAproveitamento(team.points, team.matches_played)}</td>
                    </>
                  )}
                  <td className="text-center py-3 px-4 font-display text-lg font-black text-primary bg-primary/5">{team.points}</td>
                </tr>
              );
            })}
            {teamList.length === 0 && <tr><td colSpan={compact ? 6 : 10} className="text-center py-8 text-muted-foreground">Nenhuma equipa registada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (hasGroups) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
        {groups.map(g => renderTable(activeTeams.filter(t => t.grupo === g), `Grupo ${g}`))}
      </div>
    );
  }

  return <div className="animate-fade-in">{renderTable(activeTeams)}</div>;
}