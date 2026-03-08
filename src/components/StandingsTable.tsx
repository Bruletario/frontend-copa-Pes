import { TeamData } from "@/pages/Teams";
import { Shield } from "lucide-react";

interface StandingsTableProps {
  teams: TeamData[];
  compact?: boolean;
  ignoreGroups?: boolean; // Nova propriedade para forçar tabela única!
}

export function StandingsTable({ teams, compact = false, ignoreGroups = false }: StandingsTableProps) {
  // Filtra times sem dono e ordena a base por pontos/saldo
  const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
  
  const sortTeams = (teamList: TeamData[]) => {
    return [...teamList].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goals_score - a.goals_conceded;
      const gdB = b.goals_score - b.goals_conceded;
      return gdB - gdA;
    });
  };

  // Descobre se estamos usando Fase de Grupos
  const groups = Array.from(new Set(activeTeams.map(t => t.grupo))).filter(Boolean).sort();
  // Se ignoreGroups for passado como TRUE pelo LiveScore, ele anula os grupos e faz a tabela geral!
  const hasGroups = !ignoreGroups && groups.length > 0;

  const renderTable = (teamList: TeamData[], title?: string) => (
    <div className="card-elevated overflow-hidden border-border/50 mb-6">
      {title && (
        <div className="bg-muted/40 px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-display font-bold text-primary">GRUPO {title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/10 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-2">Time / Técnico</th>
              {!compact && <th className="text-center py-3 px-2">J</th>}
              <th className="text-center py-3 px-2">V</th>
              <th className="text-center py-3 px-2">E</th>
              <th className="text-center py-3 px-2">D</th>
              {!compact && (
                <>
                  <th className="text-center py-3 px-2">GP</th>
                  <th className="text-center py-3 px-2">GC</th>
                  <th className="text-center py-3 px-2">SG</th>
                </>
              )}
              <th className="text-center py-3 px-4 text-primary font-black">PTS</th>
            </tr>
          </thead>
          <tbody>
            {sortTeams(teamList).map((team, i) => {
              const sg = team.goals_score - team.goals_conceded;
              return (
                <tr key={team.id} className={`border-b border-border/30 transition-colors hover:bg-secondary/30 ${i < (hasGroups ? 2 : 4) ? "border-l-2 border-l-primary" : ""}`}>
                  <td className="py-3 px-4 font-display font-bold text-muted-foreground">{i + 1}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center border border-border shadow-sm" style={{ borderColor: team.color }}>
                         <Shield className="h-4 w-4" style={{ color: team.color }} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold leading-none mb-1">{team.team_player}</span>
                        <span className="text-xs text-muted-foreground leading-none">{team.name_player}</span>
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
                    </>
                  )}
                  <td className="text-center py-3 px-4 font-display text-lg font-black text-primary bg-primary/5">{team.points}</td>
                </tr>
              );
            })}
            {teamList.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum time cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (hasGroups) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {groups.map(g => renderTable(activeTeams.filter(t => t.grupo === g), String(g)))}
      </div>
    );
  }

  return renderTable(activeTeams);
}