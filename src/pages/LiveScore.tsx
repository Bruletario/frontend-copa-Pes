import { useState, useEffect } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { Radio, Gamepad2, Play, Plus, Minus, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamData } from "./Teams";
import { GameData } from "./Championship";
import { API_URL } from "@/lib/api";

const LiveScore = () => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [liveMatchIds, setLiveMatchIds] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<Record<number, { s1: number; s2: number }>>({});
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [teamsRes, gamesRes] = await Promise.all([
        fetch(`${API_URL}/TEAMS`),
        fetch(`${API_URL}/GAMES`)
      ]);
      const teamsData = await teamsRes.json();
      const gamesData = await gamesRes.json();
      
      setTeams(teamsData);
      setGames(gamesData);
    } catch (error) {
      toast({ title: "Erro de Conexão", description: "Não foi possível carregar os jogos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rounds = [...new Set(games.map((m) => m.round))].sort((a, b) => a - b);
  
  useEffect(() => {
    if (rounds.length > 0 && !rounds.includes(currentRound)) {
      const firstUnfinished = rounds.find(r => games.some(g => g.round === r && g.status_game !== "Finalizado"));
      setCurrentRound(firstUnfinished || rounds[0]);
    }
  }, [rounds, games]);

  const roundMatches = games.filter((m) => m.round === currentRound);
  const getTeam = (id: number) => teams.find(t => t.id === id);

  const getScore = (match: GameData, side: "s1" | "s2") => {
    if (liveMatchIds.has(match.match_id) && scores[match.match_id]) {
      return scores[match.match_id][side];
    }
    return side === "s1" ? (match.goals_home || 0) : (match.goals_out || 0);
  };

  const startMatch = (match: GameData) => {
    setLiveMatchIds((prev) => new Set(prev).add(match.match_id));
    if (!scores[match.match_id]) {
      setScores((prev) => ({ 
        ...prev, 
        [match.match_id]: { s1: match.goals_home || 0, s2: match.goals_out || 0 } 
      }));
    }
  };

  const addGoal = (matchId: number, side: "s1" | "s2") => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: (prev[matchId]?.[side] ?? 0) + 1 },
    }));
  };

  const removeGoal = (matchId: number, side: "s1" | "s2") => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: Math.max(0, (prev[matchId]?.[side] ?? 0) - 1) },
    }));
  };

  const isLive = (matchId: number) => liveMatchIds.has(matchId);

  const endMatch = async (matchId: number) => {
    setIsProcessing(matchId);
    try {
      const finalScore = scores[matchId];
      const response = await fetch(`${API_URL}/GAMES/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          goals_home: finalScore.s1, 
          goals_out: finalScore.s2, 
          status_game: "Finalizado" 
        }),
      });

      if (!response.ok) throw new Error("Falha ao salvar");

      setLiveMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });

      toast({ title: "Apito Final!", description: "Partida encerrada e tabela geral atualizada." });
      fetchData(); 
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível finalizar o jogo.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    // AQUI ESTAVA O PROBLEMA! Removido o min-h-screen e bg-background. 
    // Usando apenas flex layout padrão para encaixar no espaço correto do sistema.
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-muted/10 p-4 rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              LIVE <span className="text-primary neon-text">SCORE</span>
            </span>
          </div>

          {/* Round Selector */}
          <div className="flex items-center gap-3 bg-background border border-border/50 p-1.5 rounded-lg">
            <button
              onClick={() => setCurrentRound((r) => Math.max(rounds[0], r - 1))}
              disabled={currentRound === rounds[0]}
              className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-base font-bold min-w-[120px] text-center text-primary">
              {currentRound >= 90 ? `Mata-Mata` : `Rodada ${currentRound}`}
            </span>
            <button
              onClick={() => setCurrentRound((r) => Math.min(rounds[rounds.length - 1], r + 1))}
              disabled={currentRound === rounds[rounds.length - 1]}
              className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* All Matches */}
        <div className="space-y-4 w-full">
          {roundMatches.map((match) => {
            const live = isLive(match.match_id);
            const tHome = getTeam(match.team_house_id);
            const tOut = getTeam(match.team_out_id);
            const isFinished = match.status_game === "Finalizado";

            return (
              <div
                key={match.match_id}
                className={`card-elevated p-6 md:p-8 transition-all ${
                  live ? "border-neon-red/50 shadow-[0_0_20px_rgba(255,51,102,0.15)] bg-background" : 
                  isFinished ? "bg-muted/5 opacity-80 border-border/50" : "bg-muted/10 border-border/50"
                }`}
              >
                {/* Live Badge */}
                <div className="flex justify-center mb-4 h-6">
                  {live && (
                    <div className="flex items-center gap-1.5 text-neon-red text-xs font-bold animate-pulse px-3 py-1 bg-neon-red/10 rounded-full border border-neon-red/30">
                      <Radio className="h-3.5 w-3.5" /> AO VIVO
                    </div>
                  )}
                  {isFinished && !live && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold px-3 py-1 bg-muted/50 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ENCERRADO
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                  {/* Player 1 */}
                  <div className="flex-1 flex flex-col items-center gap-3 w-full">
                    <div
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-display text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg"
                      style={{ backgroundColor: tHome?.color || '#555' }}
                    >
                      {tHome?.name_player?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="text-center">
                      <p className="font-display text-lg font-bold leading-tight">{tHome?.name_player || "A Definir"}</p>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mt-1">
                        {tHome?.team_player}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 mt-2 transition-opacity ${live ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <button onClick={() => removeGoal(match.match_id, "s1")} className="p-1.5 rounded-md bg-secondary hover:bg-destructive/50 hover:text-white transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <button onClick={() => addGoal(match.match_id, "s1")} className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-4 md:gap-6 shrink-0">
                    <span className={`font-display text-5xl md:text-7xl font-bold ${live ? 'text-primary neon-text' : 'text-foreground'}`}>
                      {getScore(match, "s1")}
                    </span>
                    <span className="font-display text-2xl text-muted-foreground/50 pb-2">×</span>
                    <span className={`font-display text-5xl md:text-7xl font-bold ${live ? 'text-primary neon-text' : 'text-foreground'}`}>
                      {getScore(match, "s2")}
                    </span>
                  </div>

                  {/* Player 2 */}
                  <div className="flex-1 flex flex-col items-center gap-3 w-full">
                    <div
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-display text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg"
                      style={{ backgroundColor: tOut?.color || '#555' }}
                    >
                      {tOut?.name_player?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="text-center">
                      <p className="font-display text-lg font-bold leading-tight">{tOut?.name_player || "A Definir"}</p>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-bold mt-1">
                        {tOut?.team_player}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 mt-2 transition-opacity ${live ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <button onClick={() => removeGoal(match.match_id, "s2")} className="p-1.5 rounded-md bg-secondary hover:bg-destructive/50 hover:text-white transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <button onClick={() => addGoal(match.match_id, "s2")} className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {!live && tHome && tOut && (
                  <div className="flex justify-center mt-4 md:mt-2 h-10">
                    <button
                      onClick={() => startMatch(match)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-display font-semibold text-sm transition-all
                        ${isFinished ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:opacity-90 neon-glow'}
                      `}
                    >
                      <Play className="h-4 w-4" />
                      {isFinished ? "Reabrir Partida (Editar)" : "Iniciar Partida"}
                    </button>
                  </div>
                )}
                {live && (
                  <div className="flex justify-center mt-4 md:mt-2 h-10">
                    <button
                      onClick={() => endMatch(match.match_id)}
                      disabled={isProcessing === match.match_id}
                      className="flex items-center gap-2 bg-neon-red text-white px-8 py-2.5 rounded-full font-display font-semibold text-sm hover:opacity-90 transition-all shadow-[0_0_15px_rgba(255,51,102,0.4)] disabled:opacity-50"
                    >
                      {isProcessing === match.match_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar Partida"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {roundMatches.length === 0 && (
            <p className="font-display text-xl text-muted-foreground text-center py-12">
              Nenhuma partida nesta rodada
            </p>
          )}
        </div>
      </div>

      {/* ÁREA LATERAL: CLASSIFICAÇÃO GERAL */}
      <div className="lg:w-[380px] w-full border border-border/50 bg-card/50 p-6 rounded-xl self-start sticky top-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Classificação Geral
          </h3>
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse-neon" title="Atualização em tempo real"></div>
        </div>
        
        {/* ignoreGroups={true} FORÇA a tabela a juntar todos os jogadores em uma só! */}
        <StandingsTable teams={teams} compact ignoreGroups={true} />
        
        <p className="text-[10px] text-muted-foreground text-center mt-6 pt-4 border-t border-border/30">
          A tabela acumula todos os pontos do campeonato automaticamente.
        </p>
      </div>
    </div>
  );
};

export default LiveScore;