import { GameData } from "@/pages/Championship";
import { TeamData } from "@/pages/Teams";
import { Shield, Zap, Medal } from "lucide-react";

interface TournamentBracketProps {
  games: GameData[];
  teams: TeamData[];
  onRefresh: () => void;
  config: any;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
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
      
      const firstTitle = numKnockout === 16 ? "Oitavas" : numKnockout === 8 ? "Quartas" : numKnockout === 4 ? "Semis" : "Final";
      cols.push({ title: firstTitle, matches: [...matches] });
      currentRound += isHomeAway ? 2 : 1;

      while (prevGames > 1) {
        prevGames = prevGames / 2;
        const fakeMatches = Array(prevGames).fill(0).map(() => ({ 
            ida: { _ghost_t1: null, _ghost_t2: null, match_id: Math.random(), round: currentRound },
            volta: isHomeAway ? {} : null
        }));
        const phaseTitle = prevGames === 8 ? "Oitavas" : prevGames === 4 ? "Quartas" : prevGames === 2 ? "Semis" : "Final";
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
            
            const title = phaseGamesIda.length === 1 ? "Final" : phaseGamesIda.length === 2 ? "Semis" : phaseGamesIda.length === 4 ? "Quartas" : phaseGamesIda.length === 8 ? "Oitavas" : "Fase";
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
    <div className="relative w-full h-[100vh] min-h-[700px] flex flex-col items-center justify-center overflow-visible bg-background/50 rounded-xl pt-2 pb-6 border border-border/20">
      
      {isProjection && (
         <div className="bg-primary/10 border border-primary/20 text-primary px-6 py-2 rounded-lg flex items-center gap-3 shadow-sm backdrop-blur-md shrink-0 mb-4">
            <Zap className="h-5 w-5 animate-pulse-neon" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">Projeção Dinâmica</span>
              <span className="text-[10px] opacity-80 leading-tight">Árvore oficial gerada no início.</span>
            </div>
         </div>
      )}

      {/* Grid principal do mata-mata */}
      <div className="w-full flex-1 flex justify-center items-stretch px-1 md:px-2 gap-0 mt-4">
        
          {/* =================== LADO ESQUERDO =================== */}
          {leftCols.map((col, colIndex) => {
             const pairs = chunkArray(col.matches, 2);
             
             return (
              <div key={`left-${colIndex}`} className="flex-1 min-w-0 flex flex-col h-full shrink-0">
                <div className="h-8 lg:h-10 flex items-center justify-center shrink-0 mb-2">
                   <span className="font-display text-[10px] md:text-xs lg:text-sm text-muted-foreground uppercase tracking-widest font-bold text-center drop-shadow-sm">
                      {col.title}
                   </span>
                </div>

                <div className="flex-1 flex flex-col w-full">
                   {pairs.map((pair, pairIndex) => (
                      <div key={pairIndex} className="flex-1 flex flex-col relative w-full justify-around px-2 md:px-3 lg:px-4 py-1 lg:py-2">
                          
                          {pair.length === 2 && (
                              <>
                                  <div className="absolute right-0 top-[25%] bottom-[25%] w-2 md:w-3 lg:w-4 border-r-2 border-y-2 border-primary/30 rounded-r-lg z-0" />
                                  <div className="absolute -right-2 md:-right-3 lg:-right-4 top-1/2 w-2 md:w-3 lg:w-4 border-t-2 border-primary/30 z-0" />
                              </>
                          )}
                          {pair.length === 1 && (
                              <div className="absolute -right-2 md:-right-3 lg:-right-4 top-1/2 w-4 md:w-6 lg:w-8 border-t-2 border-primary/30 z-0" />
                          )}

                          <div className="flex-1 flex flex-col justify-center w-full relative z-10 py-1">
                              <BracketMatchCard matchObj={pair[0]} isFinal={false} getTeam={getTeam} />
                          </div>
                          {pair.length > 1 && (
                              <div className="flex-1 flex flex-col justify-center w-full relative z-10 py-1">
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
          <div className="flex-[1.2] lg:flex-[1.5] min-w-0 flex flex-col h-full relative z-20 shrink-0">
            <div className="h-8 lg:h-10 flex items-center justify-center shrink-0 mb-2">
                <span className="font-display text-xs md:text-sm lg:text-base text-primary uppercase tracking-widest font-black flex items-center gap-2 drop-shadow-sm">
                   <Zap className="w-3 h-3 md:w-4 md:h-4" /> {finalMatch?.title || "Grande Final"} <Zap className="w-3 h-3 md:w-4 md:h-4" />
                </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full px-2 md:px-3 lg:px-4">
              
              <div className="flex flex-col items-center justify-end flex-1 w-full pb-4 lg:pb-8">
                <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" alt="Troféu" className="w-20 h-20 md:w-28 md:h-28 lg:w-36 lg:h-36 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-3 lg:mb-4 hover:scale-110 transition-transform" />
                {championTeam ? (
                  <div className="bg-background/95 border border-primary/50 px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] text-center flex flex-col items-center w-full max-w-[90%] backdrop-blur-md">
                    <span className="font-display font-black text-lg md:text-2xl lg:text-3xl text-primary uppercase truncate w-full drop-shadow-md">{championTeam.name_player}</span>
                    <span className="text-[9px] md:text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Campeão Oficial</span>
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-dashed border-border px-6 py-2 lg:py-3 rounded-xl text-center w-full max-w-[200px]">
                    <span className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold tracking-wider">A Definir</span>
                  </div>
                )}
              </div>

              {/* Card da Final */}
              {finalMatch && (
                <div className="w-full shrink-0 relative z-10">
                   <BracketMatchCard matchObj={finalMatch.matches[0]} isFinal={true} getTeam={getTeam} />
                </div>
              )}

              {/* Área de 3º Lugar */}
              <div className="flex flex-col items-center justify-start flex-1 w-full pt-6 lg:pt-10 relative">
                {!isProjection && thirdPlaceMatch && (
                  <div className="w-full max-w-[90%] border-t border-border/30 pt-6 relative animate-fade-in">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-background/90 px-3 py-1 rounded-full border border-border/20 backdrop-blur-sm flex items-center gap-1.5 z-40">
                       <Medal className="h-3 w-3 lg:h-4 lg:w-4 text-amber-500" />
                       <span className="font-display font-black text-amber-500 uppercase tracking-widest text-[9px] lg:text-[11px]">3º Lugar</span>
                    </div>
                    <BracketMatchCard matchObj={{ ida: thirdPlaceMatch, volta: null }} isFinal={false} getTeam={getTeam} isBronze={true} />
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* =================== LADO DIREITO (Invertido Visualmente) =================== */}
          {[...rightCols].reverse().map((col, colIndex) => {
             const pairs = chunkArray(col.matches, 2);
             
             return (
              <div key={`right-${colIndex}`} className="flex-1 min-w-0 flex flex-col h-full shrink-0">
                <div className="h-8 lg:h-10 flex items-center justify-center shrink-0 mb-2">
                   <span className="font-display text-[10px] md:text-xs lg:text-sm text-muted-foreground uppercase tracking-widest font-bold text-center drop-shadow-sm">
                      {col.title}
                   </span>
                </div>

                <div className="flex-1 flex flex-col w-full">
                   {pairs.map((pair, pairIndex) => (
                      <div key={pairIndex} className="flex-1 flex flex-col relative w-full justify-around px-2 md:px-3 lg:px-4 py-1 lg:py-2">
                          
                          {pair.length === 2 && (
                              <>
                                  <div className="absolute left-0 top-[25%] bottom-[25%] w-2 md:w-3 lg:w-4 border-l-2 border-y-2 border-primary/30 rounded-l-lg z-0" />
                                  <div className="absolute -left-2 md:-left-3 lg:-left-4 top-1/2 w-2 md:w-3 lg:w-4 border-t-2 border-primary/30 z-0" />
                              </>
                          )}
                          {pair.length === 1 && (
                              <div className="absolute -left-2 md:-left-3 lg:-left-4 top-1/2 w-4 md:w-6 lg:w-8 border-t-2 border-primary/30 z-0" />
                          )}

                          <div className="flex-1 flex flex-col justify-center w-full relative z-10 py-1">
                              <BracketMatchCard matchObj={pair[0]} isFinal={false} getTeam={getTeam} />
                          </div>
                          {pair.length > 1 && (
                              <div className="flex-1 flex flex-col justify-center w-full relative z-10 py-1">
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
  );
}

function BracketMatchCard({ matchObj, isFinal, getTeam, isBronze }: any) {
  const { ida, volta } = matchObj;
  const isHomeAway = !!volta && Object.keys(volta).length > 0;
  
  const isIdaFinished = ida?.status_game === "Finalizado";
  const isVoltaFinished = volta?.status_game === "Finalizado";
  const isGhost = !ida?.team_house_id && !ida?._ghost_t1;

  const isLive = ida?.status_game === "Em Andamento" || volta?.status_game === "Em Andamento";
  
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

  const badgeText = isHomeAway ? (!isIdaFinished ? "IDA" : "VOLTA") : "";

  let cardStyles = "border-border/50 hover:border-primary/50 transition-all shadow-md bg-card/95";
  if (isFinal && (isIdaFinished || isVoltaFinished)) {
      cardStyles = "border-primary shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-2 ring-primary/50 bg-background";
  } else if (isFinal) {
      cardStyles = "border-border/80 shadow-[0_0_20px_rgba(255,255,255,0.08)] ring-1 ring-border bg-background";
  } else if (isBronze) {
      cardStyles = "border-amber-700/60 shadow-[0_0_20px_rgba(217,119,6,0.15)] ring-1 ring-amber-700/50 bg-amber-950/20";
  }

  if (isGhost) {
    return (
      <div className="w-full h-full min-h-[60px] lg:min-h-[80px] max-h-[140px] relative rounded-xl border-2 border-dashed border-border/40 opacity-50 bg-transparent min-w-0">
        {badgeText && (
           <div className="absolute -top-3 lg:-top-3.5 left-1/2 -translate-x-1/2 bg-background border border-border/50 px-2 py-0.5 rounded-md text-[7px] lg:text-[9px] font-bold uppercase tracking-widest text-muted-foreground z-30 shadow-sm whitespace-nowrap">
             {badgeText}
           </div>
        )}
        <div className="w-full h-full flex flex-col justify-center overflow-hidden rounded-xl">
          <MatchRow player={null} score={null} subScore={null} seed={ida?._ghost_t1_seed} />
          <div className="border-t-2 border-dashed border-border/30 w-full" />
          <MatchRow player={null} score={null} subScore={null} seed={ida?._ghost_t2_seed} />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[60px] lg:min-h-[80px] max-h-[140px] rounded-xl relative border-2 ${cardStyles} min-w-0`}>
      
      {(badgeText || isLive) && (
         <div className="absolute -top-3 lg:-top-3.5 left-1/2 -translate-x-1/2 bg-muted border border-border/50 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-[7px] lg:text-[9px] font-bold uppercase tracking-widest text-muted-foreground z-30 shadow-sm whitespace-nowrap">
           {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
           {badgeText}
           {isLive && !badgeText && <span className="text-red-500">Ao Vivo</span>}
         </div>
      )}
      
      <div className="w-full h-full flex flex-col justify-center rounded-[10px] overflow-hidden backdrop-blur-md">
        <MatchRow player={t1} score={s1Main} subScore={s1Sub} isWinner={homeWins} isPenaltyWinner={isTie && pWinner === t1?.id} />
        <div className="border-t border-border/40 w-full" />
        <MatchRow player={t2} score={s2Main} subScore={s2Sub} isWinner={outWins} isPenaltyWinner={isTie && pWinner === t2?.id} />
      </div>
    </div>
  );
}

function MatchRow({ player, score, subScore, isWinner = false, seed, isPenaltyWinner }: any) {
  return (
    <div className={`flex flex-1 items-center justify-between px-2 md:px-3 lg:px-4 py-1.5 lg:py-2 transition-colors ${isWinner ? "bg-primary/15" : ""}`}>
      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
        {player ? (
          <Shield className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 shrink-0 drop-shadow-md" style={{ color: player.color }} />
        ) : (
          <div className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 shrink-0 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center font-bold text-[9px] lg:text-xs text-muted-foreground">{seed || "?"}</div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <span className={`text-xs md:text-sm lg:text-base font-display font-black leading-none truncate max-w-[60px] md:max-w-[100px] lg:max-w-[160px] ${isWinner ? "text-primary drop-shadow-sm" : player ? "text-foreground" : "text-muted-foreground"}`}>
              {player?.name_player || "A Definir"}
            </span>
            {isPenaltyWinner && (
               <span className="text-[7px] lg:text-[9px] text-primary border border-primary/40 bg-primary/10 px-1 py-0.5 rounded tracking-widest uppercase shadow-sm font-bold">Pên</span>
            )}
          </div>
          {player && <span className="text-[8px] lg:text-[10px] font-medium text-muted-foreground/80 mt-0.5 truncate max-w-[60px] md:max-w-[100px] lg:max-w-[160px]">{player.team_player}</span>}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 lg:gap-2 shrink-0 pl-2">
        {subScore !== null && (
           <span className="text-[9px] lg:text-[11px] text-muted-foreground/70 font-bold">({subScore})</span>
        )}
        <span className={`font-display font-black text-sm md:text-base lg:text-xl ${isWinner ? "text-primary drop-shadow-sm" : "text-foreground/80"}`}>
          {score !== null ? score : "-"}
        </span>
      </div>
    </div>
  );
}