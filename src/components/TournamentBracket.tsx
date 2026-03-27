import { GameData } from "@/pages/Championship";
import { TeamData } from "@/pages/Teams";
import { GitBranch, Shield, Zap, Medal } from "lucide-react";

interface TournamentBracketProps {
  games: GameData[];
  teams: TeamData[];
  onRefresh: () => void;
  config: any;
}

export function TournamentBracket({ games, teams, config }: TournamentBracketProps) {
  const getTeam = (id: number) => teams.find(t => t.id === id);

  const knockoutGames = games.filter(g => g.round >= 90).sort((a,b) => a.round - b.round);
  const isProjection = knockoutGames.length === 0;

  const mainBracketGames = knockoutGames.filter(g => g.round < 99);
  const thirdPlaceMatch = knockoutGames.find(g => g.round === 99);
  const isHomeAway = config.knockoutFormat === "homeaway";

  const getChampion = () => {
    if (mainBracketGames.length === 0) return null;
    const maxRound = Math.max(...mainBracketGames.map(g => g.round));
    const finalMatch = mainBracketGames.find(g => g.round === maxRound);
    
    if (finalMatch && finalMatch.status_game === "Finalizado") {
      const isTie = finalMatch.goals_home === finalMatch.goals_out;
      if (isHomeAway) {
          const idaGame = mainBracketGames.find(g => g.round === finalMatch.round - 1 && g.team_house_id === finalMatch.team_out_id);
          if (idaGame) {
              const aggHome = finalMatch.goals_home + idaGame.goals_out;
              const aggOut = finalMatch.goals_out + idaGame.goals_home;
              if (aggHome > aggOut || (aggHome === aggOut && finalMatch.penalty_winner_id === finalMatch.team_house_id)) return getTeam(finalMatch.team_house_id);
              if (aggOut > aggHome || (aggHome === aggOut && finalMatch.penalty_winner_id === finalMatch.team_out_id)) return getTeam(finalMatch.team_out_id);
          }
      } else {
          if (finalMatch.goals_home > finalMatch.goals_out || (isTie && finalMatch.penalty_winner_id === finalMatch.team_house_id)) return getTeam(finalMatch.team_house_id);
          if (finalMatch.goals_out > finalMatch.goals_home || (isTie && finalMatch.penalty_winner_id === finalMatch.team_out_id)) return getTeam(finalMatch.team_out_id);
      }
    }
    return null;
  };

  const championTeam = getChampion();

  // 👇 GERAÇÃO DE COLUNAS SEM DUPLICAÇÃO HORIZONTAL 👇
  const generateColumns = () => {
    if (isProjection) {
      const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
      const sortedTeams = [...activeTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.goals_score - b.goals_conceded) - (a.goals_score - a.goals_conceded);
      });

      const numKnockout = config.knockoutTeams || 4;
      const pairs = numKnockout === 8 ? [[1,8],[4,5],[3,6],[2,7]] : numKnockout === 4 ? [[1,4],[2,3]] : [[1,2]];
      
      const cols: any[] = [];
      let currentRound = 90;
      let prevGames = pairs.length;

      let matches = pairs.map(pair => ({ 
          ida: { _ghost_t1: sortedTeams[pair[0] - 1] || null, _ghost_t2: sortedTeams[pair[1] - 1] || null, _ghost_t1_seed: pair[0], _ghost_t2_seed: pair[1], match_id: Math.random(), round: currentRound },
          volta: isHomeAway ? {} : null
      }));
      cols.push({ title: numKnockout === 8 ? "Quartas de Final" : numKnockout === 4 ? "Semifinal" : "Grande Final", matches: [...matches] });
      currentRound += isHomeAway ? 2 : 1;

      while (prevGames > 1) {
        prevGames = prevGames / 2;
        const fakeMatches = Array(prevGames).fill(0).map(() => ({ 
            ida: { _ghost_t1: null, _ghost_t2: null, match_id: Math.random(), round: currentRound },
            volta: isHomeAway ? {} : null
        }));
        cols.push({ title: prevGames === 4 ? "Quartas de Final" : prevGames === 2 ? "Semifinal" : "Grande Final", matches: fakeMatches });
        currentRound += isHomeAway ? 2 : 1;
      }
      return cols;
    }

    const cols = [];
    const maxRound = Math.max(...mainBracketGames.map(g => g.round));
    let currentRound = isHomeAway ? (maxRound % 2 !== 0 ? 90 : 90) : 90;
    
    while (currentRound <= maxRound) {
        const phaseGamesIda = mainBracketGames.filter(g => g.round === currentRound);
        const phaseGamesVolta = isHomeAway ? mainBracketGames.filter(g => g.round === currentRound + 1) : [];
        
        if (phaseGamesIda.length > 0) {
            const matches = phaseGamesIda.map(ida => {
                const volta = phaseGamesVolta.find(v => v.team_house_id === ida.team_out_id && v.team_out_id === ida.team_house_id);
                return { ida, volta };
            });
            
            const title = phaseGamesIda.length === 1 ? "Grande Final" : phaseGamesIda.length === 2 ? "Semifinal" : phaseGamesIda.length === 4 ? "Quartas de Final" : "Oitavas de Final";
            cols.push({ title, matches });
        }
        currentRound += isHomeAway ? 2 : 1;
    }
    return cols;
  };

  const columns = generateColumns();

  return (
    <div className="space-y-6 w-full relative min-h-[400px]">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <GitBranch className="w-96 h-96" />
      </div>

      {isProjection && (
         <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg flex items-start gap-3 w-fit shadow-sm backdrop-blur-md relative z-10">
            <Zap className="h-5 w-5 mt-0.5 animate-pulse-neon" />
            <div>
              <p className="font-bold text-sm">Projeção Dinâmica</p>
              <p className="text-xs opacity-80">A árvore oficial só será gerada quando a Fase Inicial acabar.</p>
            </div>
         </div>
      )}

      <div className="flex flex-col relative z-10 w-full">
        <div className="flex items-center gap-6 md:gap-8 overflow-x-auto pb-8 pt-4 custom-scrollbar w-full">
          {columns.map((col, colIndex) => (
            <div key={colIndex} className="flex gap-6 md:gap-8 items-center shrink-0">
              <div className="space-y-6 min-w-[240px] md:min-w-[260px] flex flex-col justify-around">
                <h4 className="font-display text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">
                  {col.title}
                </h4>
                {col.matches.map((matchObj: any, matchIndex: number) => {
                  return (
                    <BracketMatchCard 
                      key={matchObj.ida.match_id || matchIndex} 
                      matchObj={matchObj} 
                      isFinal={colIndex === columns.length - 1} 
                      getTeam={getTeam}
                    />
                  );
                })}
              </div>
              
              {colIndex < columns.length - 1 && (
                <div className="flex flex-col items-center justify-around w-6 md:w-8 border-r-2 border-t-2 border-b-2 border-primary/20 rounded-r-xl my-8 h-[50%]" />
              )}
            </div>
          ))}

          <div className="flex flex-col items-center justify-center min-w-[160px] pl-4 md:pl-8 shrink-0">
            <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" alt="Troféu de Campeão" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] mb-4 hover:scale-110 transition-transform" />
            {championTeam ? (
              <div className="bg-background/95 border border-border/50 px-5 py-2 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] text-center flex flex-col items-center min-w-[120px] animate-fade-in backdrop-blur-sm">
                <span className="font-display font-black text-sm text-foreground uppercase truncate max-w-[120px] drop-shadow-md">{championTeam.name_player}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Campeão Oficial</span>
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border px-5 py-2 rounded-lg text-center min-w-[120px]">
                <span className="text-xs text-muted-foreground uppercase font-bold">A Definir</span>
              </div>
            )}
            <div className="mt-4 w-16 h-1 bg-gradient-to-r from-foreground/50 to-transparent rounded-full" />
          </div>

          {!isProjection && thirdPlaceMatch && (
            <div className="flex flex-col items-center justify-center min-w-[260px] md:min-w-[280px] pl-6 md:pl-10 ml-4 md:ml-6 border-l border-border/30 h-full shrink-0 animate-fade-in">
              <div className="flex items-center gap-2 mb-4 w-full justify-center">
                <Medal className="h-4 w-4 text-amber-600" />
                <h3 className="font-display font-bold text-amber-600 uppercase tracking-widest text-xs">3º Lugar (Bronze)</h3>
              </div>
              <div className="w-full">
                <BracketMatchCard 
                  matchObj={{ ida: thirdPlaceMatch, volta: null }} 
                  isFinal={false} 
                  getTeam={getTeam}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 👇 O CARD AGRUPA O AGREGADO E CORTA AS COLUNAS DUPLAS PELA METADE 👇
function BracketMatchCard({ matchObj, isFinal, getTeam }: any) {
  const { ida, volta } = matchObj;
  const isHomeAway = !!volta && Object.keys(volta).length > 0;
  const isIdaFinished = ida?.status_game === "Finalizado";
  const isVoltaFinished = volta?.status_game === "Finalizado";
  const isGhost = !ida?.team_house_id && !ida?._ghost_t1;
  
  let t1 = getTeam(ida?.team_house_id) || ida?._ghost_t1;
  let t2 = getTeam(ida?.team_out_id) || ida?._ghost_t2;
  
  let score1 = null, score2 = null;
  let homeWins = false, outWins = false, isTie = false, pWinner = null;

  if (isHomeAway) {
      if (!isIdaFinished) {
          score1 = ida?.status_game !== 'Pendente' ? ida?.goals_home : null;
          score2 = ida?.status_game !== 'Pendente' ? ida?.goals_out : null;
      } else {
          const voltaGoalsOut = volta?.status_game && volta.status_game !== 'Pendente' ? volta.goals_out : 0;
          const voltaGoalsHome = volta?.status_game && volta.status_game !== 'Pendente' ? volta.goals_home : 0;
          
          score1 = ida.goals_home + voltaGoalsOut;
          score2 = ida.goals_out + voltaGoalsHome;
          
          if (isVoltaFinished) {
              isTie = score1 === score2;
              pWinner = volta.penalty_winner_id;
              homeWins = score1 > score2 || (isTie && pWinner === t1?.id);
              outWins = score2 > score1 || (isTie && pWinner === t2?.id);
          }
      }
  } else if (!isGhost) {
      score1 = ida?.status_game !== 'Pendente' ? ida?.goals_home : null;
      score2 = ida?.status_game !== 'Pendente' ? ida?.goals_out : null;
      if (isIdaFinished) {
          isTie = score1 === score2;
          pWinner = ida.penalty_winner_id;
          homeWins = score1 > score2 || (isTie && pWinner === t1?.id);
          outWins = score2 > score1 || (isTie && pWinner === t2?.id);
      }
  }

  const badgeText = isHomeAway ? (!isIdaFinished ? "IDA" : !isVoltaFinished ? "AGREGADO (VOLTA)" : "AGREGADO FINAL") : "";

  if (isGhost) {
    return (
      <div className={`card-elevated overflow-hidden border-dashed border-border/50 opacity-40 bg-transparent ${isFinal ? "shadow-[0_0_10px_rgba(255,255,255,0.05)] border-border/80" : ""}`}>
        <MatchRow player={null} score={null} seed={ida?._ghost_t1_seed} />
        <div className="border-t border-border/30" />
        <MatchRow player={null} score={null} seed={ida?._ghost_t2_seed} />
      </div>
    );
  }

  return (
    <div className={`card-elevated overflow-hidden bg-background/80 backdrop-blur-sm flex flex-col relative ${isFinal && (isIdaFinished || isVoltaFinished) ? "border-foreground shadow-[0_0_15px_rgba(255,255,255,0.15)]" : isFinal ? "border-border/80 shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "border-border/50"}`}>
      {badgeText && <div className="text-[8px] text-center bg-muted/50 text-muted-foreground py-0.5 border-b border-border/30 font-bold uppercase tracking-widest">{badgeText}</div>}
      <MatchRow player={t1} score={score1} isWinner={homeWins} isPenaltyWinner={isTie && pWinner === t1?.id} />
      <div className="border-t border-border/30" />
      <MatchRow player={t2} score={score2} isWinner={outWins} isPenaltyWinner={isTie && pWinner === t2?.id} />
    </div>
  );
}

function MatchRow({ player, score, isWinner = false, seed, isPenaltyWinner }: any) {
  return (
    <div className={`flex items-center justify-between px-3 md:px-4 py-2.5 transition-colors ${isWinner ? "bg-primary/10" : ""}`}>
      <div className="flex items-center gap-2 md:gap-3">
        {player ? (
          <Shield className="h-4 w-4 md:h-5 md:w-5 shrink-0" style={{ color: player.color }} />
        ) : (
          <div className="h-4 w-4 md:h-5 md:w-5 shrink-0 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center font-bold text-[8px] text-muted-foreground">{seed || "?"}</div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs md:text-sm font-display font-bold leading-none truncate ${isWinner ? "text-primary" : player ? "text-foreground" : "text-muted-foreground"}`}>
              {player?.name_player || "A Definir"}
            </span>
            {isPenaltyWinner && (
               <span className="text-[8px] text-neon-blue border border-neon-blue/30 bg-neon-blue/10 px-1 py-0.5 rounded tracking-widest uppercase shadow-sm">Pênaltis</span>
            )}
          </div>
          {player && <span className="text-[8px] md:text-[9px] text-muted-foreground mt-1 truncate">{player.team_player}</span>}
        </div>
      </div>
      <span className={`font-display font-black text-base md:text-lg pl-3 ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
        {score !== null ? score : "-"}
      </span>
    </div>
  );
}