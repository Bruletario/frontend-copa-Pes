import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom"; 
import { StandingsTable } from "@/components/StandingsTable";
import { Radio, Play, Plus, Minus, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Tv, Shield, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamData } from "./Teams";
import { GameData } from "./Championship";
import { API_URL } from "@/lib/api";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LiveScore = () => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  
  const [penaltyPrompt, setPenaltyPrompt] = useState<{match: GameData, s1: number, s2: number} | null>(null);
  const [config, setConfig] = useState<any>({});

  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);

  const [liveMatchIds, setLiveMatchIds] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('liveMatchIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [scores, setScores] = useState<Record<number, { s1: number; s2: number }>>(() => {
    const saved = localStorage.getItem('liveScores');
    return saved ? JSON.parse(saved) : {};
  });

  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('liveMatchIds', JSON.stringify([...liveMatchIds]));
  }, [liveMatchIds]);

  useEffect(() => {
    localStorage.setItem('liveScores', JSON.stringify(scores));
  }, [scores]);

  const fetchData = async () => {
    try {
      const [teamsRes, gamesRes, configRes] = await Promise.all([
        fetch(`${API_URL}/TEAMS`),
        fetch(`${API_URL}/GAMES`),
        fetch(`${API_URL}/CONFIGS`) 
      ]);
      
      const [teamsData, gamesData, configData] = await Promise.all([
        teamsRes.json(),
        gamesRes.json(),
        configRes.ok ? configRes.json() : Promise.resolve(null)
      ]);

      setTeams(teamsData);
      setGames(gamesData);
      if(configData) setConfig(configData);
      return gamesData; 
    } catch (error) {
      toast({ title: "Erro", description: "Nao foi possivel carregar os jogos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const rounds = useMemo(() => [...new Set(games.map((m) => m.round))].sort((a, b) => a - b), [games]);
  const knockoutGames = useMemo(() => games.filter(g => g.round >= 90), [games]);
  const leagueGames = useMemo(() => games.filter(g => g.round < 90), [games]);

  const sidebarGroups = useMemo(() => {
    const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
    return Array.from(new Set(activeTeams.map(t => t.grupo)))
      .filter(g => g !== undefined && g !== null && g !== "")
      .sort((a, b) => {
         const numA = Number(a); const numB = Number(b);
         return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : String(a).localeCompare(String(b));
      });
  }, [teams]);

  useEffect(() => {
    if (rounds.length === 0) return;

    if (!currentRound || !rounds.includes(currentRound)) {
      const firstUnfinished = rounds.find(r => games.some(g => g.round === r && g.status_game !== "Finalizado"));
      setCurrentRound(firstUnfinished || rounds[0]);
    }
  }, [rounds, games]); 

  const currentIndex = rounds.indexOf(currentRound);
  const handlePrevRound = () => { if (currentIndex > 0) setCurrentRound(rounds[currentIndex - 1]); };
  const handleNextRound = () => { if (currentIndex < rounds.length - 1) setCurrentRound(rounds[currentIndex + 1]); };

  const hasKnockout = knockoutGames.length > 0;
  const isHomeAway = knockoutGames.some(g => g.is_return_match);

  const getRoundTitle = (round: number, isHomeAway: boolean) => {
    if (round < 90) return `Rodada ${round}`;
    if (round === 99) return "3º Lugar (Bronze)";
    
    const knRounds = knockoutGames.filter(r => r.round !== 99).map(r => r.round);
    if (knRounds.length === 0) return "Mata-Mata";
    
    const maxRound = Math.max(...knRounds);
    const dist = maxRound - round;

    if (isHomeAway) {
        if (dist === 0) return "Grande Final (Volta)";
        if (dist === 1) return "Grande Final (Ida)";
        if (dist === 2) return "Semifinal (Volta)";
        if (dist === 3) return "Semifinal (Ida)";
        if (dist === 4) return "Quartas de Final (Volta)";
        if (dist === 5) return "Quartas de Final (Ida)";
        if (dist === 6) return "Oitavas de Final (Volta)";
        if (dist === 7) return "Oitavas de Final (Ida)";
    } else {
        if (dist === 0) return "Grande Final";
        if (dist === 1) return "Semifinal";
        if (dist === 2) return "Quartas de Final";
        if (dist === 3) return "Oitavas de Final";
    }
    return `Eliminatorias`;
  };

  const roundMatches = useMemo(() => games.filter((m) => m.round === currentRound), [games, currentRound]);
  const getTeam = (id: number) => teams.find(t => t.id === id);

  const getScore = (match: GameData, side: "s1" | "s2") => {
    if (liveMatchIds.has(match.match_id) && scores[match.match_id]) return scores[match.match_id][side];
    return side === "s1" ? (match.goals_home || 0) : (match.goals_out || 0);
  };

  const startMatch = (match: GameData) => {
    setLiveMatchIds((prev) => new Set(prev).add(match.match_id));
    if (!scores[match.match_id]) {
        setScores((prev) => ({ ...prev, [match.match_id]: { s1: match.goals_home || 0, s2: match.goals_out || 0 } }));
    }
  };

  const addGoal = (matchId: number, side: "s1" | "s2") => setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: (prev[matchId]?.[side] ?? 0) + 1 } }));
  const removeGoal = (matchId: number, side: "s1" | "s2") => setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: Math.max(0, (prev[matchId]?.[side] ?? 0) - 1) } }));
  
  const isLive = (matchId: number) => liveMatchIds.has(matchId);

  const endMatch = async (matchId: number, advancingTeamId?: number) => {
    const match = games.find(g => g.match_id === matchId);
    if (!match) return;

    const s1 = scores[matchId].s1;
    const s2 = scores[matchId].s2;

    let needsPenalties = false;
    const isKnockoutMatch = match.round >= 90 && match.round < 99;
    
    if (isKnockoutMatch && !advancingTeamId) {
        if (match.is_return_match) {
            const idaGame = games.find(g => g.round === match.round - 1 && g.team_house_id === match.team_out_id);
            if (idaGame) {
                const agg1 = s1 + (idaGame.goals_out || 0);
                const agg2 = s2 + (idaGame.goals_home || 0);
                needsPenalties = agg1 === agg2;
            }
        } else if (!isHomeAway) {
            needsPenalties = s1 === s2;
        }
    } else if (match.round === 99 && s1 === s2 && !advancingTeamId) {
        needsPenalties = true;
    }

    if (needsPenalties) {
       setPenaltyPrompt({ match, s1, s2 });
       return;
    }

    setIsProcessing(matchId);
    try {
      const response = await fetch(`${API_URL}/GAMES/${matchId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals_home: s1, goals_out: s2, status_game: "Finalizado", advancing_team_id: advancingTeamId }),
      });
      if (!response.ok) throw new Error("Falha ao salvar");

      setLiveMatchIds((prev) => { const next = new Set(prev); next.delete(matchId); return next; });
      setScores((prev) => { const next = { ...prev }; delete next[matchId]; return next; });
      setPenaltyPrompt(null);
      
      toast({ title: "Apito Final!", description: advancingTeamId ? "Vencedor nos penaltis definido!" : "Partida encerrada." });
      
      const freshGames = await fetchData(); 
      if (freshGames) {
        const currentRoundGames = freshGames.filter((g: any) => g.round === match.round);
        const isRoundFinished = currentRoundGames.length > 0 && currentRoundGames.every((g: any) => g.status_game === "Finalizado");
        if (isRoundFinished) {
          const allRounds: number[] = Array.from(new Set<number>(freshGames.map((m: any) => Number(m.round)))).sort((a: number, b: number) => a - b);
          const nextUnfinished = allRounds.find((r: number) => freshGames.some((g: any) => g.round === r && g.status_game !== "Finalizado"));
          
          if (nextUnfinished !== undefined) {
            setCurrentRound(nextUnfinished);
          }
        }
      }
    } catch (error) {
      toast({ title: "Erro", description: "Nao foi possivel finalizar o jogo.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const isTournamentRunning = games.length > 0;
  const hasLeague = leagueGames.length > 0;
  const isLeagueFinished = hasLeague && leagueGames.every(g => g.status_game === "Finalizado");

  const mainBracketGames = knockoutGames.filter(g => g.round < 99);
  const maxKnockoutRound = mainBracketGames.length > 0 ? Math.max(...mainBracketGames.map(g => g.round)) : 0;
  const finalMatch = mainBracketGames.find(g => g.round === maxKnockoutRound);
  
  const thirdPlaceMatch = knockoutGames.find(g => g.round === 99);
  
  const isFinalFinished = finalMatch ? finalMatch.status_game === "Finalizado" : false;
  const isThirdPlaceFinished = thirdPlaceMatch ? thirdPlaceMatch.status_game === "Finalizado" : true;

  const isKnockoutFinished = isFinalFinished && isThirdPlaceFinished;

  let isFullyFinished = false;
  if (isTournamentRunning) {
      if (hasLeague && !hasKnockout) {
          if (config.type === 'LEAGUE') isFullyFinished = isLeagueFinished;
      } else if (!hasLeague && hasKnockout) {
          isFullyFinished = isKnockoutFinished;
      } else if (hasLeague && hasKnockout) {
          isFullyFinished = isLeagueFinished && isKnockoutFinished;
      }
  }

  const sortedTeams = useMemo(() => {
    const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
    return [...activeTeams].sort((a, b) => {
      if (b.points !== a.points) return (Number(b.points) || 0) - (Number(a.points) || 0);
      return (Number(b.goals_score) - Number(b.goals_conceded)) - (Number(a.goals_score) - Number(a.goals_conceded));
    });
  }, [teams]);

  let podium = { first: sortedTeams[0], second: sortedTeams[1], third: sortedTeams[2] };
  
  if (isFullyFinished && hasKnockout && finalMatch) {
      let homeWon = false;
      if (finalMatch.is_return_match) {
          const idaGame = knockoutGames.find(g => g.round === finalMatch.round - 1 && g.team_house_id === finalMatch.team_out_id);
          if (idaGame) {
              const aggHome = finalMatch.goals_home + (idaGame.goals_out || 0);
              const aggOut = finalMatch.goals_out + (idaGame.goals_home || 0);
              const isTie = aggHome === aggOut;
              homeWon = aggHome > aggOut || (isTie && finalMatch.penalty_winner_id === finalMatch.team_house_id);
          }
      } else {
          const isTie = finalMatch.goals_home === finalMatch.goals_out;
          homeWon = finalMatch.goals_home > finalMatch.goals_out || (isTie && finalMatch.penalty_winner_id === finalMatch.team_house_id);
      }
      const winnerId = homeWon ? finalMatch.team_house_id : finalMatch.team_out_id;
      podium.first = teams.find(t => t.id === winnerId) || sortedTeams[0];
  }

  // Libera todas as equipas se o index chegar ao final (Tabela Geral)
  const filteredTeamsForSidebar = useMemo(() => {
    if (config.type === 'GROUPS_KNOCKOUT' && sidebarGroups.length > 0 && currentGroupIndex < sidebarGroups.length) {
      return teams.filter(t => t.grupo === sidebarGroups[currentGroupIndex]);
    }
    return teams;
  }, [teams, config.type, sidebarGroups, currentGroupIndex]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <div className="flex-1 flex flex-col w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Tv className="h-8 w-8 text-primary" />
            <h1 className="page-header">Live Score</h1>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 border border-border/50 p-1.5 rounded-lg">
            <button onClick={handlePrevRound} disabled={currentIndex <= 0} className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-base font-bold min-w-[160px] text-center text-primary">
              {getRoundTitle(currentRound, isHomeAway)}
            </span>
            <button onClick={handleNextRound} disabled={currentIndex === -1 || currentIndex >= rounds.length - 1} className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isFullyFinished && podium.first && (
          <div className="mb-6 card-elevated border-neon-yellow/50 bg-neon-yellow/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-[0_0_15px_rgba(250,204,21,0.05)]">
            <div className="flex items-center gap-4">
              <Trophy className="h-10 w-10 text-neon-yellow drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Torneio Concluido</p>
                <p className="font-display text-base text-foreground">O campeao e <span className="font-bold text-neon-yellow drop-shadow-sm">{podium.first.name_player}</span>.</p>
              </div>
            </div>
            <Link to="/campeonato" className="w-full sm:w-auto px-6 py-2.5 bg-neon-yellow text-black border-0 rounded-lg text-sm font-bold hover:bg-yellow-400 transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4"/> Ir para o Podio Oficial
            </Link>
          </div>
        )}

        <div className="space-y-4 w-full">
          {roundMatches.map((match) => {
            const live = isLive(match.match_id);
            const tHome = getTeam(match.team_house_id);
            const tOut = getTeam(match.team_out_id);
            const isFinished = match.status_game === "Finalizado";

            const idaGame = match.is_return_match ? games.find(g => g.round === match.round - 1 && g.team_house_id === match.team_out_id) : null;
            let aggHome = null; let aggOut = null;
            
            if (idaGame) {
               aggHome = Number(getScore(match, "s1")) + (idaGame.goals_out || 0);
               aggOut = Number(getScore(match, "s2")) + (idaGame.goals_home || 0);
            }

            return (
              <div key={match.match_id} className={`card-elevated p-6 md:p-8 transition-all ${ live ? "border-primary/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-background" : isFinished ? "bg-muted/5 opacity-80 border-border/50" : "bg-muted/10 border-border/50" }`}>
                <div className="flex justify-center mb-4 h-6">
                  {live && <div className="flex items-center gap-1.5 text-primary text-xs font-bold animate-pulse px-3 py-1 bg-primary/10 rounded-full border border-primary/30"><Radio className="h-3.5 w-3.5" /> AO VIVO</div>}
                  {isFinished && !live && <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold px-3 py-1 bg-muted/50 rounded-full"><CheckCircle2 className="h-3.5 w-3.5" /> ENCERRADO</div>}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                  <div className="flex-1 flex flex-col items-center gap-3 w-full">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-display text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg" style={{ backgroundColor: tHome?.color || '#555' }}>{tHome?.name_player?.[0]?.toUpperCase() || "?"}</div>
                    <div className="text-center">
                      <p className="font-display text-lg font-bold leading-tight flex items-center justify-center gap-2">
                        {tHome?.name_player || "A Definir"}
                        {isFinished && match.penalty_winner_id === tHome?.id && (
                           <span className="text-[9px] text-primary border border-primary/30 bg-primary/10 px-1 py-0.5 rounded tracking-widest uppercase">Penaltis</span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mt-1">{tHome?.team_player}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-2 transition-opacity ${live ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <button onClick={() => removeGoal(match.match_id, "s1")} className="p-1.5 rounded-md bg-secondary hover:bg-destructive/50 hover:text-white transition-colors"><Minus className="h-4 w-4" /></button>
                      <button onClick={() => addGoal(match.match_id, "s1")} className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary transition-colors"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="flex items-center gap-4 md:gap-6">
                      <span className={`font-display text-5xl md:text-7xl font-bold ${live ? 'text-primary neon-text' : 'text-foreground'}`}>{getScore(match, "s1")}</span>
                      <span className="font-display text-2xl text-muted-foreground/50 pb-2">x</span>
                      <span className={`font-display text-5xl md:text-7xl font-bold ${live ? 'text-primary neon-text' : 'text-foreground'}`}>{getScore(match, "s2")}</span>
                    </div>
                    {idaGame && (
                      <div className="mt-2 text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-md shadow-sm">
                          Agregado: {aggHome} - {aggOut}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-3 w-full">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-display text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg" style={{ backgroundColor: tOut?.color || '#555' }}>{tOut?.name_player?.[0]?.toUpperCase() || "?"}</div>
                    <div className="text-center">
                      <p className="font-display text-lg font-bold leading-tight flex items-center justify-center gap-2">
                        {tOut?.name_player || "A Definir"}
                        {isFinished && match.penalty_winner_id === tOut?.id && (
                           <span className="text-[9px] text-primary border border-primary/30 bg-primary/10 px-1 py-0.5 rounded tracking-widest uppercase">Penaltis</span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mt-1">{tOut?.team_player}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-2 transition-opacity ${live ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <button onClick={() => removeGoal(match.match_id, "s2")} className="p-1.5 rounded-md bg-secondary hover:bg-destructive/50 hover:text-white transition-colors"><Minus className="h-4 w-4" /></button>
                      <button onClick={() => addGoal(match.match_id, "s2")} className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary transition-colors"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>

                {!live && tHome && tOut && (
                  <div className="flex justify-center mt-4 md:mt-2 h-10">
                    <button onClick={() => startMatch(match)} className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-display font-semibold text-sm transition-all ${isFinished ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:opacity-90 neon-glow'} `}>
                      <Play className="h-4 w-4" /> {isFinished ? "Reabrir Partida (Editar)" : "Iniciar Partida"}
                    </button>
                  </div>
                )}
                {live && (
                  <div className="flex justify-center mt-4 md:mt-2 h-10">
                    <button onClick={() => endMatch(match.match_id)} disabled={isProcessing === match.match_id} className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-full font-display font-semibold text-sm hover:opacity-90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)] disabled:opacity-50">
                      {isProcessing === match.match_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar Partida"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {roundMatches.length === 0 && <p className="font-display text-xl text-muted-foreground text-center py-12">Nenhuma partida nesta rodada</p>}
        </div>
      </div>

      <div className="lg:w-[490px] lg:min-w-[490px] w-full border border-border/50 bg-card/50 p-6 rounded-xl self-start sticky top-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {/* Título muda para Tabela Geral no último passo */}
            {config.type === 'GROUPS_KNOCKOUT' 
              ? (currentGroupIndex === sidebarGroups.length ? "Classificacao Geral" : "Classificação por Grupos") 
              : "Classificacao Geral"}
          </h3>
          
          {config.type === 'GROUPS_KNOCKOUT' && sidebarGroups.length > 1 && (
            <div className="flex items-center gap-1 bg-muted/80 border border-border/50 p-1 rounded-md animate-fade-in">
              <button 
                onClick={() => setCurrentGroupIndex(prev => Math.max(0, prev - 1))} 
                disabled={currentGroupIndex === 0}
                className="p-1 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-bold px-2 text-primary min-w-[65px] text-center uppercase tracking-wider">
                {/*Texto muda dinamicamente baseado no limite do array */}
                {currentGroupIndex === sidebarGroups.length ? "Tabela Geral" : `Grupo ${sidebarGroups[currentGroupIndex]}`}
              </span>
              <button 
                onClick={() => setCurrentGroupIndex(prev => Math.min(sidebarGroups.length, prev + 1))} 
                disabled={currentGroupIndex === sidebarGroups.length}
                className="p-1 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        
        <StandingsTable 
          teams={filteredTeamsForSidebar} 
          games={games} 
          compact 
          ignoreGroups={true} 
          liveScores={scores} 
          liveMatchIds={liveMatchIds} 
        />
      </div>

      <AlertDialog open={!!penaltyPrompt} onOpenChange={(open) => !open && setPenaltyPrompt(null)}>
        <AlertDialogContent className="max-w-md shadow-[0_0_20px_rgba(255,255,255,0.15)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl text-primary">Disputa de Penaltis!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">O agregado terminou empatado. <strong>Quem venceu nos penaltis?</strong></AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
             <button onClick={() => penaltyPrompt && endMatch(penaltyPrompt.match.match_id, penaltyPrompt.match.team_house_id)} className="flex flex-col items-center justify-center p-6 border-2 border-border/50 rounded-xl hover:border-primary hover:bg-primary/10 transition-all group">
                <Shield className="h-12 w-12 mb-3 transition-transform group-hover:scale-110" style={{ color: getTeam(penaltyPrompt?.match.team_house_id || 0)?.color }} />
                <span className="font-bold text-sm text-center">{getTeam(penaltyPrompt?.match.team_house_id || 0)?.name_player}</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Avancar</span>
             </button>
             <button onClick={() => penaltyPrompt && endMatch(penaltyPrompt.match.match_id, penaltyPrompt.match.team_out_id)} className="flex flex-col items-center justify-center p-6 border-2 border-border/50 rounded-xl hover:border-primary hover:bg-primary/10 transition-all group">
                <Shield className="h-12 w-12 mb-3 transition-transform group-hover:scale-110" style={{ color: getTeam(penaltyPrompt?.match.team_out_id || 0)?.color }} />
                <span className="font-bold text-sm text-center">{getTeam(penaltyPrompt?.match.team_out_id || 0)?.name_player}</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Avancar</span>
             </button>
          </div>
          <div className="flex justify-center mt-2"><AlertDialogCancel className="bg-transparent border-0 text-muted-foreground hover:bg-muted/50">Cancelar (Manter Ao Vivo)</AlertDialogCancel></div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default LiveScore;