import { GameData } from "@/pages/Championship";
import { TeamData } from "@/pages/Teams";
import { Shield, Zap, Medal } from "lucide-react";

interface TournamentBracketProps {
  games: GameData[];
  teams: TeamData[];
  onRefresh: () => void;
  config: any;
}

// Helper para agrupar as partidas em pares perfeitamente matemáticos
function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Larguras muito maiores para aproveitar o espaço da tela
const getColumnWidth = (matchCount: number) => {
  if (matchCount >= 4) return "w-[220px] md:w-[250px]"; // Oitavas de Final
  if (matchCount === 2) return "w-[240px] md:w-[270px]"; // Quartas de Final
  if (matchCount === 1) return "w-[260px] md:w-[290px]"; // Semifinais
  return "w-[220px]";
};

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

  const generateAllColumns = () => {
    if (isProjection) {
      const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
      const sortedTeams = [...activeTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.goals_score - b.goals_conceded) - (a.goals_score - a.goals_conceded);
      });

      const numKnockout = config.knockoutTeams || 4;
      const pairs = numKnockout === 16 ? [[1,16],[8,9],[4,13],[5,12],[3,14],[6,11],[2,15],[7,10]] :
                    numKnockout === 8 ? [[1,8],[4,5],[3,6],[2,7]] : 
                    numKnockout === 4 ? [[1,4],[2,3]] : [[1,2]];
      
      const cols: any[] = [];
      let currentRound = 90;
      let prevGames = pairs.length;

      let matches = pairs.map(pair => ({ 
          ida: { _ghost_t1: sortedTeams[pair[0] - 1] || null, _ghost_t2: sortedTeams[pair[1] - 1] || null, _ghost_t1_seed: pair[0], _ghost_t2_seed: pair[1], match_id: Math.random(), round: currentRound },
          volta: isHomeAway ? {} : null
      }));
      
      const firstTitle = numKnockout === 16 ? "Oitavas de Final" : numKnockout === 8 ? "Quartas de Final" : numKnockout === 4 ? "Semifinal" : "Grande Final";
      cols.push({ title: firstTitle, matches: [...matches] });
      currentRound += isHomeAway ? 2 : 1;

      while (prevGames > 1) {
        prevGames = prevGames / 2;
        const fakeMatches = Array(prevGames).fill(0).map(() => ({ 
            ida: { _ghost_t1: null, _ghost_t2: null, match_id: Math.random(), round: currentRound },
            volta: isHomeAway ? {} : null
        }));
        const phaseTitle = prevGames === 8 ? "Oitavas de Final" : prevGames === 4 ? "Quartas de Final" : prevGames === 2 ? "Semifinal" : "Grande Final";
        cols.push({ title: phaseTitle, matches: fakeMatches });
        currentRound += isHomeAway ? 2 : 1;
      }
      return cols;
    }

    const cols = [];
    if (mainBracketGames.length === 0) return cols;

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
            
            const title = phaseGamesIda.length === 1 ? "Grande Final" : phaseGamesIda.length === 2 ? "Semifinal" : phaseGamesIda.length === 4 ? "Quartas de Final" : phaseGamesIda.length === 8 ? "Oitavas de Final" : "Eliminatórias";
            cols.push({ title, matches });
        }
        currentRound += isHomeAway ? 2 : 1;
    }
    return cols;
  };

  const allColumns = generateAllColumns();
  const leftCols: any[] = [];
  const rightCols: any[] = [];
  let finalMatch: any = null;

  allColumns.forEach(col => {
    if (col.matches.length === 1) {
      finalMatch = col; 
    } else {
      const half = col.matches.length / 2;
      leftCols.push({ title: col.title, matches: col.matches.slice(0, half) });
      rightCols.push({ title: col.title, matches: col.matches.slice(half) });
    }
  });

  return (
    <div className="relative w-[96vw] md:w-[98vw] left-1/2 -translate-x-1/2 mt-4 min-h-[60vh] flex flex-col items-center justify-center">
      
      {isProjection && (
         <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg flex items-start gap-3 w-fit shadow-sm backdrop-blur-md relative z-20 mb-6 mx-auto">
            <Zap className="h-5 w-5 mt-0.5 animate-pulse-neon" />
            <div>
              <p className="font-bold text-sm">Projeção Dinâmica</p>
              <p className="text-xs opacity-80">A árvore oficial será gerada automaticamente.</p>
            </div>
         </div>
      )}

      <div className="w-full overflow-x-auto custom-scrollbar flex justify-start 2xl:justify-center items-center py-8">
        
        <div className="flex items-stretch w-max mx-auto h-[600px] md:h-[750px] gap-0">
          
          {/* =================== LADO ESQUERDO =================== */}
          {leftCols.map((col, colIndex) => {
             const pairs = chunkArray(col.matches, 2);
             const colWidth = getColumnWidth(col.matches.length);
             
             return (
              <div key={`left-${colIndex}`} className={`flex flex-col h-full ${colWidth} px-6 relative shrink-0 transition-all duration-300`}>
                <div className="flex-1 flex flex-col w-full relative">
                   {pairs.map((pair, pairIndex) => (
                      <div key={pairIndex} className="flex-1 flex flex-col relative w-full justify-around">
                          
                          {/* O Titulo agora flutua rigidamente acima do PRIMEIRO jogo da coluna */}
                          {pairIndex === 0 && (
                            <div className="absolute -top-7 left-0 right-0 font-display text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider text-center font-bold">
                               {col.title}
                            </div>
                          )}

                          {pair.length === 2 && (
                              <>
                                  <div className="absolute right-[-24px] w-[24px] top-[25%] bottom-[25%] border-r-2 border-y-2 border-primary/30 rounded-r-lg pointer-events-none z-0" />
                                  <div className="absolute right-[-48px] w-[24px] top-1/2 border-t-2 border-primary/30 pointer-events-none z-0" />
                              </>
                          )}
                          {pair.length === 1 && (
                              <div className="absolute right-[-48px] w-[48px] top-1/2 border-t-2 border-primary/30 pointer-events-none z-0" />
                          )}

                          <div className="flex flex-col justify-center w-full relative z-10 py-3">
                              <BracketMatchCard matchObj={pair[0]} isFinal={false} getTeam={getTeam} />
                          </div>
                          {pair.length > 1 && (
                              <div className="flex flex-col justify-center w-full relative z-10 py-3">
                                  <BracketMatchCard matchObj={pair[1]} isFinal={false} getTeam={getTeam} />
                              </div>
                          )}
                      </div>
                   ))}
                </div>
              </div>
             );
          })}

          {/* =================== CENTRO (FINAL E CAMPEÃO) =================== */}
          <div className="flex flex-col items-center justify-center h-full px-8 shrink-0 min-w-[280px] md:min-w-[360px] relative z-20">
            <div className="flex flex-col items-center mb-8 w-full">
              <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" alt="Troféu de Campeão" className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] mb-4 hover:scale-110 transition-transform" />
              {championTeam ? (
                <div className="bg-background/95 border border-primary/50 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.15)] text-center flex flex-col items-center w-full max-w-[260px] animate-fade-in backdrop-blur-sm">
                  <span className="font-display font-black text-lg md:text-2xl text-primary uppercase truncate w-full drop-shadow-md">{championTeam.name_player}</span>
                  <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mt-1">Campeão Oficial</span>
                </div>
              ) : (
                <div className="bg-muted/30 border border-dashed border-border px-6 py-3 rounded-xl text-center w-full max-w-[200px]">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">A Definir</span>
                </div>
              )}
            </div>

            {finalMatch && (
              <div className="w-full relative px-2 mt-4">
                 <h4 className="absolute -top-7 left-0 right-0 font-display text-xs md:text-sm text-primary uppercase tracking-widest text-center font-black flex items-center justify-center gap-2 drop-shadow-sm">
                    <Zap className="w-4 h-4" /> {finalMatch.title} <Zap className="w-4 h-4" />
                 </h4>
                 <BracketMatchCard matchObj={finalMatch.matches[0]} isFinal={true} getTeam={getTeam} />
              </div>
            )}

            {!isProjection && thirdPlaceMatch && (
              <div className="w-full max-w-[280px] mt-12 pt-6 border-t border-border/30 relative animate-fade-in">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-background px-4">
                  <div className="flex items-center justify-center gap-2">
                     <Medal className="h-4 w-4 text-amber-500 drop-shadow-sm" />
                     <h3 className="font-display font-black text-amber-500 uppercase tracking-widest text-[10px] md:text-xs">3º Lugar (Bronze)</h3>
                  </div>
                </div>
                <div className="mt-4">
                   <BracketMatchCard matchObj={{ ida: thirdPlaceMatch, volta: null }} isFinal={false} getTeam={getTeam} isBronze={true} />
                </div>
              </div>
            )}
          </div>

          {/* =================== LADO DIREITO (Invertido Visualmente) =================== */}
          {[...rightCols].reverse().map((col, colIndex) => {
             const pairs = chunkArray(col.matches, 2);
             const colWidth = getColumnWidth(col.matches.length);
             
             return (
              <div key={`right-${colIndex}`} className={`flex flex-col h-full ${colWidth} px-6 relative shrink-0 transition-all duration-300`}>
                <div className="flex-1 flex flex-col w-full relative">
                   {pairs.map((pair, pairIndex) => (
                      <div key={pairIndex} className="flex-1 flex flex-col relative w-full justify-around">
                          
                          {pairIndex === 0 && (
                            <div className="absolute -top-7 left-0 right-0 font-display text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider text-center font-bold">
                               {col.title}
                            </div>
                          )}

                          {pair.length === 2 && (
                              <>
                                  <div className="absolute left-[-24px] w-[24px] top-[25%] bottom-[25%] border-l-2 border-y-2 border-primary/30 rounded-l-lg pointer-events-none z-0" />
                                  <div className="absolute left-[-48px] w-[24px] top-1/2 border-t-2 border-primary/30 pointer-events-none z-0" />
                              </>
                          )}
                          {pair.length === 1 && (
                              <div className="absolute left-[-48px] w-[48px] top-1/2 border-t-2 border-primary/30 pointer-events-none z-0" />
                          )}

                          <div className="flex flex-col justify-center w-full relative z-10 py-3">
                              <BracketMatchCard matchObj={pair[0]} isFinal={false} getTeam={getTeam} />
                          </div>
                          {pair.length > 1 && (
                              <div className="flex flex-col justify-center w-full relative z-10 py-3">
                                  <BracketMatchCard matchObj={pair[1]} isFinal={false} getTeam={getTeam} />
                              </div>
                          )}
                      </div>
                   ))}
                </div>
              </div>
             );
          })}

        </div>
      </div>
    </div>
  );
}

// O CARD COMPACTO: Badge ejetada para fora, mantendo a altura exata h-[76px] para não quebrar a linha flex
function BracketMatchCard({ matchObj, isFinal, getTeam, isBronze }: any) {
  const { ida, volta } = matchObj;
  const isHomeAway = !!volta && Object.keys(volta).length > 0;
  const isIdaFinished = ida?.status_game === "Finalizado";
  const isVoltaFinished = volta?.status_game === "Finalizado";
  const isGhost = !ida?.team_house_id && !ida?._ghost_t1;
  
  let t1 = getTeam(ida?.team_house_id) || ida?._ghost_t1;
  let t2 = getTeam(ida?.team_out_id) || ida?._ghost_t2;
  
  let s1Main = null, s1Sub = null;
  let s2Main = null, s2Sub = null;
  let homeWins = false, outWins = false, isTie = false, pWinner = null;

  if (isHomeAway) {
      if (!isIdaFinished) {
          s1Main = ida?.status_game !== 'Pendente' ? ida?.goals_home : null;
          s2Main = ida?.status_game !== 'Pendente' ? ida?.goals_out : null;
      } else {
          // Ida finalizou, salvamos os scores como "Sub" (parenteses)
          s1Sub = ida.goals_home; 
          s2Sub = ida.goals_out;
          
          const isVoltaPending = !volta?.status_game || volta.status_game === 'Pendente';
          s1Main = !isVoltaPending ? volta.goals_out : null; 
          s2Main = !isVoltaPending ? volta.goals_home : null; 
          
          if (isVoltaFinished) {
              const agg1 = s1Sub + (s1Main || 0);
              const agg2 = s2Sub + (s2Main || 0);
              isTie = agg1 === agg2;
              pWinner = volta.penalty_winner_id;
              homeWins = agg1 > agg2 || (isTie && pWinner === t1?.id);
              outWins = agg2 > agg1 || (isTie && pWinner === t2?.id);
          }
      }
  } else if (!isGhost) {
      s1Main = ida?.status_game !== 'Pendente' ? ida?.goals_home : null;
      s2Main = ida?.status_game !== 'Pendente' ? ida?.goals_out : null;
      if (isIdaFinished) {
          isTie = s1Main === s2Main;
          pWinner = ida.penalty_winner_id;
          homeWins = s1Main > s2Main || (isTie && pWinner === t1?.id);
          outWins = s2Main > s1Main || (isTie && pWinner === t2?.id);
      }
  }

  const badgeText = isHomeAway ? (!isIdaFinished ? "JOGO DE IDA" : "VOLTA (IDA)") : "";

  let cardStyles = "border-border/50 hover:border-primary/30 transition-colors";
  if (isFinal && (isIdaFinished || isVoltaFinished)) {
      cardStyles = "border-primary shadow-[0_0_15px_rgba(250,204,21,0.15)] ring-1 ring-primary/50";
  } else if (isFinal) {
      cardStyles = "border-border/80 shadow-[0_0_15px_rgba(255,255,255,0.05)]";
  } else if (isBronze) {
      cardStyles = "border-amber-700/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] ring-1 ring-amber-700/30 bg-amber-950/10";
  }

  if (isGhost) {
    return (
      <div className="w-full h-[76px] relative">
        <div className={`w-full h-full flex flex-col justify-center card-elevated overflow-hidden border-dashed border-border/50 opacity-40 bg-transparent ${isFinal ? "shadow-[0_0_10px_rgba(255,255,255,0.05)] border-border/80" : ""}`}>
          <MatchRow player={null} score={null} subScore={null} seed={ida?._ghost_t1_seed} />
          <div className="border-t border-border/30" />
          <MatchRow player={null} score={null} subScore={null} seed={ida?._ghost_t2_seed} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[76px] relative">
      {/* O badge agora flutua acima do card e não o afeta dimensionalmente */}
      {badgeText && (
         <div className="absolute -top-4 left-0 right-0 text-center text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-muted-foreground drop-shadow-sm">
           {badgeText}
         </div>
      )}
      
      <div className={`w-full h-full card-elevated overflow-hidden bg-background/95 backdrop-blur-sm flex flex-col relative justify-center ${cardStyles}`}>
        <div className="flex flex-col h-full justify-center pt-1">
          <MatchRow player={t1} score={s1Main} subScore={s1Sub} isWinner={homeWins} isPenaltyWinner={isTie && pWinner === t1?.id} />
          <div className="border-t border-border/30 w-full" />
          <MatchRow player={t2} score={s2Main} subScore={s2Sub} isWinner={outWins} isPenaltyWinner={isTie && pWinner === t2?.id} />
        </div>
      </div>
    </div>
  );
}

function MatchRow({ player, score, subScore, isWinner = false, seed, isPenaltyWinner }: any) {
  return (
    <div className={`flex flex-1 items-center justify-between px-2 md:px-3 py-1 transition-colors ${isWinner ? "bg-primary/10" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        {player ? (
          <Shield className="h-3 w-3 md:h-4 md:w-4 shrink-0 drop-shadow-md" style={{ color: player.color }} />
        ) : (
          <div className="h-3 w-3 md:h-4 md:w-4 shrink-0 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center font-bold text-[7px] text-muted-foreground">{seed || "?"}</div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] md:text-xs font-display font-bold leading-none truncate max-w-[100px] md:max-w-[140px] ${isWinner ? "text-primary" : player ? "text-foreground" : "text-muted-foreground"}`}>
              {player?.name_player || "A Definir"}
            </span>
            {isPenaltyWinner && (
               <span className="text-[6px] text-blue-400 border border-blue-400/30 bg-blue-400/10 px-1 rounded tracking-widest uppercase shadow-sm">Pênaltis</span>
            )}
          </div>
          {player && <span className="text-[7px] md:text-[8px] text-muted-foreground mt-0.5 truncate max-w-[100px] md:max-w-[140px]">{player.team_player}</span>}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {subScore !== null && (
           <span className="text-[9px] md:text-[10px] text-muted-foreground/70 font-bold">({subScore})</span>
        )}
        <span className={`font-display font-black text-xs md:text-sm ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
          {score !== null ? score : "-"}
        </span>
      </div>
    </div>
  );
}