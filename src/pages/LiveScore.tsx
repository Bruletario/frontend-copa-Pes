import { useState, useEffect } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { Radio, Play, Plus, Minus, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Tv, Shield } from "lucide-react";
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
  const [liveMatchIds, setLiveMatchIds] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<Record<number, { s1: number; s2: number }>>({});
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [isAutoConsolidating, setIsAutoConsolidating] = useState(false);
  
  const [penaltyPrompt, setPenaltyPrompt] = useState<{match: GameData, s1: number, s2: number} | null>(null);

  const [config, setConfig] = useState<any>({});

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [teamsRes, gamesRes, configRes] = await Promise.all([
        fetch(`${API_URL}/TEAMS`),
        fetch(`${API_URL}/GAMES`),
        fetch(`${API_URL}/CONFIGS`) 
      ]);
      setTeams(await teamsRes.json());
      setGames(await gamesRes.json());
      if(configRes.ok) setConfig(await configRes.json());
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os jogos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const rounds = [...new Set(games.map((m) => m.round))].sort((a, b) => a - b);
  
  useEffect(() => {
    if (rounds.length > 0 && (!currentRound || !rounds.includes(currentRound))) {
      const firstUnfinished = rounds.find(r => games.some(g => g.round === r && g.status_game !== "Finalizado"));
      setCurrentRound(firstUnfinished || rounds[0]);
    }
  }, [rounds, games, currentRound]);

  const currentIndex = rounds.indexOf(currentRound);
  const handlePrevRound = () => { if (currentIndex > 0) setCurrentRound(rounds[currentIndex - 1]); };
  const handleNextRound = () => { if (currentIndex < rounds.length - 1) setCurrentRound(rounds[currentIndex + 1]); };

  const isHomeAway = config.knockoutFormat === "homeaway";
  const knockoutGames = games.filter(g => g.round >= 90);

  // 👇 TÍTULOS INTELIGENTES BASEADOS NA DISTÂNCIA PARA A FINAL 👇
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
    return `Eliminatórias`;
  };

  const roundMatches = games.filter((m) => m.round === currentRound);
  const getTeam = (id: number) => teams.find(t => t.id === id);

  const getScore = (match: GameData, side: "s1" | "s2") => {
    if (liveMatchIds.has(match.match_id) && scores[match.match_id]) return scores[match.match_id][side];
    return side === "s1" ? (match.goals_home || 0) : (match.goals_out || 0);
  };

  const startMatch = (match: GameData) => {
    setLiveMatchIds((prev) => new Set(prev).add(match.match_id));
    if (!scores[match.match_id]) setScores((prev) => ({ ...prev, [match.match_id]: { s1: match.goals_home || 0, s2: match.goals_out || 0 } }));
  };

  const addGoal = (matchId: number, side: "s1" | "s2") => setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: (prev[matchId]?.[side] ?? 0) + 1 } }));
  const removeGoal = (matchId: number, side: "s1" | "s2") => setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: Math.max(0, (prev[matchId]?.[side] ?? 0) - 1) } }));
  const isLive = (matchId: number) => liveMatchIds.has(matchId);

  const endMatch = async (matchId: number, advancingTeamId?: number) => {
    const match = games.find(g => g.match_id === matchId);
    if (!match) return;

    const s1 = scores[matchId].s1;
    const s2 = scores[matchId].s2;

    // 👇 BLINDAGEM: PÊNALTIS SÓ NA VOLTA OU MATA-MATA SIMPLES 👇
    let needsPenalties = false;
    const isKnockoutMatch = match.round >= 90 && match.round < 99;
    
    if (isKnockoutMatch && !advancingTeamId) {
        if (!isHomeAway) {
            needsPenalties = s1 === s2;
        } else {
            // Identifica se é o jogo de Volta
            const isVoltaRound = match.round % 2 !== 0; 
            if (isVoltaRound) {
                const idaGame = games.find(g => g.round === match.round - 1 && g.team_house_id === match.team_out_id && g.team_out_id === match.team_house_id);
                if (idaGame) {
                    const agg1 = s1 + (idaGame.goals_out || 0);
                    const agg2 = s2 + (idaGame.goals_home || 0);
                    needsPenalties = agg1 === agg2;
                }
            }
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
      setPenaltyPrompt(null);
      toast({ title: "Apito Final!", description: advancingTeamId ? "Vencedor nos pênaltis definido!" : "Partida encerrada." });
      fetchData(); 
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível finalizar o jogo.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const leagueGames = games.filter(g => g.round < 90);
  const hasLeague = leagueGames.length > 0;
  const isLeagueFinished = hasLeague && leagueGames.every(g => g.status_game === "Finalizado");

  useEffect(() => {
    const autoGenerateKnockout = async () => {
      if (isLeagueFinished && config.type !== 'LEAGUE' && knockoutGames.length === 0 && !isAutoConsolidating) {
        setIsAutoConsolidating(true);
        toast({ title: "Fase Base Concluída!", description: "A gerar a árvore de Mata-Mata..." });
        try {
          await fetch(`${API_URL}/GAMES/MATA-MATA`, { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ formato: config.knockoutFormat, size: config.knockoutTeams, logic: config.seedingLogic, hasThirdPlace: config.hasThirdPlace }) 
          });
          await fetchData();
          setCurrentRound(90); 
        } catch (error) {
          toast({ title: "Erro", description: "Falha ao gerar.", variant: "destructive" });
        } finally {
          setIsAutoConsolidating(false);
        }
      }
    };
    autoGenerateKnockout();
  }, [isLeagueFinished, knockoutGames.length, config.type, isAutoConsolidating, config, toast]);

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

        <div className="space-y-4 w-full">
          {roundMatches.map((match) => {
            const live = isLive(match.match_id);
            const tHome = getTeam(match.team_house_id);
            const tOut = getTeam(match.team_out_id);
            const isFinished = match.status_game === "Finalizado";
            const isTie = isFinished && getScore(match, "s1") === getScore(match, "s2");

            // 👇 CALCULA O AGREGADO PARA EXIBIÇÃO SE FOR MATA MATA VOLTA 👇
            const isVoltaRound = isHomeAway && match.round >= 90 && match.round % 2 !== 0;
            const idaGame = isVoltaRound ? games.find(g => g.round === match.round - 1 && g.team_house_id === match.team_out_id && g.team_out_id === match.team_house_id) : null;
            let aggHome = null; let aggOut = null;
            
            if (idaGame) {
               aggHome = Number(getScore(match, "s1")) + (idaGame.goals_out || 0);
               aggOut = Number(getScore(match, "s2")) + (idaGame.goals_home || 0);
            }

            return (
              <div key={match.match_id} className={`card-elevated p-6 md:p-8 transition-all ${ live ? "border-neon-blue/50 shadow-[0_0_20px_rgba(0,191,255,0.15)] bg-background" : isFinished ? "bg-muted/5 opacity-80 border-border/50" : "bg-muted/10 border-border/50" }`}>
                <div className="flex justify-center mb-4 h-6">
                  {live && <div className="flex items-center gap-1.5 text-neon-blue text-xs font-bold animate-pulse px-3 py-1 bg-neon-blue/10 rounded-full border border-neon-blue/30"><Radio className="h-3.5 w-3.5" /> AO VIVO</div>}
                  {isFinished && !live && <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold px-3 py-1 bg-muted/50 rounded-full"><CheckCircle2 className="h-3.5 w-3.5" /> ENCERRADO</div>}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                  <div className="flex-1 flex flex-col items-center gap-3 w-full">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-display text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg" style={{ backgroundColor: tHome?.color || '#555' }}>{tHome?.name_player?.[0]?.toUpperCase() || "?"}</div>
                    <div className="text-center">
                      <p className="font-display text-lg font-bold leading-tight flex items-center justify-center gap-2">
                        {tHome?.name_player || "A Definir"}
                        {isFinished && match.penalty_winner_id === tHome?.id && (
                           <span className="text-[9px] text-neon-blue border border-neon-blue/30 bg-neon-blue/10 px-1 py-0.5 rounded tracking-widest uppercase">Pênaltis</span>
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
                      <span className="font-display text-2xl text-muted-foreground/50 pb-2">×</span>
                      <span className={`font-display text-5xl md:text-7xl font-bold ${live ? 'text-primary neon-text' : 'text-foreground'}`}>{getScore(match, "s2")}</span>
                    </div>
                    {/* 👇 O AGREGADO DA VOLTA 👇 */}
                    {idaGame && (
                      <div className="mt-2 text-[10px] text-neon-blue font-bold uppercase tracking-widest bg-neon-blue/10 border border-neon-blue/30 px-2 py-0.5 rounded-md shadow-sm">
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
                           <span className="text-[9px] text-neon-blue border border-neon-blue/30 bg-neon-blue/10 px-1 py-0.5 rounded tracking-widest uppercase">Pênaltis</span>
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
                    <button onClick={() => endMatch(match.match_id)} disabled={isProcessing === match.match_id} className="flex items-center gap-2 bg-neon-blue text-primary-foreground px-8 py-2.5 rounded-full font-display font-semibold text-sm hover:opacity-90 transition-all shadow-[0_0_15px_rgba(0,191,255,0.4)] disabled:opacity-50">
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

      <div className="lg:w-[380px] w-full border border-border/50 bg-card/50 p-6 rounded-xl self-start sticky top-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">Classificação Geral</h3>
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse-neon" title="Atualização em tempo real"></div>
        </div>
        <StandingsTable teams={teams} compact ignoreGroups={true} />
      </div>

      <AlertDialog open={!!penaltyPrompt} onOpenChange={(open) => !open && setPenaltyPrompt(null)}>
        <AlertDialogContent className="max-w-md shadow-[0_0_20px_rgba(0,191,255,0.15)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl text-neon-blue">Disputa de Pênaltis!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">O agregado terminou empatado. <strong>Quem venceu nos pênaltis?</strong></AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
             <button onClick={() => penaltyPrompt && endMatch(penaltyPrompt.match.match_id, penaltyPrompt.match.team_house_id)} className="flex flex-col items-center justify-center p-6 border-2 border-border/50 rounded-xl hover:border-primary hover:bg-primary/10 transition-all group">
                <Shield className="h-12 w-12 mb-3 transition-transform group-hover:scale-110" style={{ color: getTeam(penaltyPrompt?.match.team_house_id || 0)?.color }} />
                <span className="font-bold text-sm text-center">{getTeam(penaltyPrompt?.match.team_house_id || 0)?.name_player}</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Avançar</span>
             </button>
             <button onClick={() => penaltyPrompt && endMatch(penaltyPrompt.match.match_id, penaltyPrompt.match.team_out_id)} className="flex flex-col items-center justify-center p-6 border-2 border-border/50 rounded-xl hover:border-primary hover:bg-primary/10 transition-all group">
                <Shield className="h-12 w-12 mb-3 transition-transform group-hover:scale-110" style={{ color: getTeam(penaltyPrompt?.match.team_out_id || 0)?.color }} />
                <span className="font-bold text-sm text-center">{getTeam(penaltyPrompt?.match.team_out_id || 0)?.name_player}</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Avançar</span>
             </button>
          </div>
          <div className="flex justify-center mt-2"><AlertDialogCancel className="bg-transparent border-0 text-muted-foreground hover:bg-muted/50">Cancelar (Manter Ao Vivo)</AlertDialogCancel></div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default LiveScore;