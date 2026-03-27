import { useState } from "react";
import { GameData } from "@/pages/Championship";
import { TeamData } from "@/pages/Teams";
import { Shield, ChevronDown, Trophy, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api"; 

import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel
} from "@/components/ui/alert-dialog";

interface MatchInputProps {
  games: GameData[];
  teams: TeamData[];
  onRefresh: () => void;
  config: any;
}

export function MatchInput({ games, teams, onRefresh, config }: MatchInputProps) {
  const [showLeague, setShowLeague] = useState(true);
  const [showKnockout, setShowKnockout] = useState(true);
  const [scores, setScores] = useState<Record<number, { s1: string; s2: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  
  const [penaltyPrompt, setPenaltyPrompt] = useState<{match: GameData, s1: string, s2: string} | null>(null);
  
  const { toast } = useToast();
  const getTeam = (id: number) => teams.find(t => t.id === id);

  const leagueGames = games.filter(g => g.round < 90);
  const knockoutGames = games.filter(g => g.round >= 90);
  
  const leagueRounds = [...new Set(leagueGames.map((g) => g.round))].sort((a, b) => a - b);
  const knockoutRounds = [...new Set(knockoutGames.map((g) => g.round))].sort((a, b) => a - b);
  const isHomeAway = config.knockoutFormat === "homeaway";

  const getKnockoutRoundTitle = (round: number, isHomeAway: boolean) => {
    if (round === 99) return "Disputa de 3º Lugar (Bronze)";
    const knRounds = knockoutGames.filter(r => r.round !== 99).map(r => r.round);
    if (knRounds.length === 0) return "Eliminatórias";

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
    return `Fase Eliminatória ${round}`;
  };

  const handleScoreChange = (matchId: number, side: "s1" | "s2", value: string) => {
    setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  };

  const handleSaveMatch = async (match: GameData) => {
    const s1 = scores[match.match_id]?.s1;
    const s2 = scores[match.match_id]?.s2;

    if (s1 === undefined || s2 === undefined || s1 === "" || s2 === "") {
      toast({ title: "Atenção", description: "Preencha os dois placares.", variant: "destructive" });
      return;
    }

    let needsPenalties = false;
    const isKnockoutMatch = match.round >= 90 && match.round < 99;

    if (isKnockoutMatch) {
        if (!isHomeAway) {
            needsPenalties = s1 === s2;
        } else {
            const isVoltaRound = match.round % 2 !== 0;
            if (isVoltaRound) {
                const idaGame = games.find(g => g.round === match.round - 1 && g.team_house_id === match.team_out_id && g.team_out_id === match.team_house_id);
                if (idaGame) {
                    const agg1 = Number(s1) + (idaGame.goals_out || 0);
                    const agg2 = Number(s2) + (idaGame.goals_home || 0);
                    needsPenalties = agg1 === agg2;
                }
            }
        }
    } else if (match.round === 99 && s1 === s2) {
        needsPenalties = true;
    }

    if (needsPenalties) {
       setPenaltyPrompt({ match, s1, s2 });
       return;
    }

    executeSave(match.match_id, s1, s2, undefined);
  };

  const executeSave = async (matchId: number, s1: string, s2: string, advancingTeamId?: number) => {
    setSavingId(matchId);
    try {
      await fetch(`${API_URL}/GAMES/${matchId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals_home: Number(s1), goals_out: Number(s2), status_game: "Finalizado", advancing_team_id: advancingTeamId }),
      });
      toast({ title: "Salvo!", description: advancingTeamId ? "Vencedor nos pênaltis definido!" : "Placar atualizado." });
      setPenaltyPrompt(null);
      onRefresh();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar a partida.", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const inputModernCSS = "w-12 h-12 bg-background/50 border border-border/50 rounded-xl text-center text-xl font-display font-bold text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all [&::-webkit-inner-spin-button]:appearance-none";

  const renderMatchCard = (match: GameData) => {
    const tHome = getTeam(match.team_house_id);
    const tOut = getTeam(match.team_out_id);
    const isFinished = match.status_game === "Finalizado";
    const isTie = isFinished && match.goals_home === match.goals_out;

    const isVoltaRound = isHomeAway && match.round >= 90 && match.round % 2 !== 0;
    const idaGame = isVoltaRound ? games.find(g => g.round === match.round - 1 && g.team_house_id === match.team_out_id && g.team_out_id === match.team_house_id) : null;
    let aggHome = null; let aggOut = null;
    if (idaGame && isFinished) {
        aggHome = match.goals_home + (idaGame.goals_out || 0);
        aggOut = match.goals_out + (idaGame.goals_home || 0);
    }

    return (
      <div key={match.match_id} className={`w-full card-elevated p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-primary/30 border-border/50 ${isFinished ? "bg-muted/10" : "bg-muted/5"}`}>
        <div className="flex-1 w-full flex items-center justify-center md:justify-end gap-3">
          <div className="text-center md:text-right">
            <span className="font-display font-bold flex items-center justify-center md:justify-end gap-2 leading-tight text-foreground">
              {isFinished && match.penalty_winner_id === tHome?.id && ( <span className="text-[8px] text-neon-blue border border-neon-blue/30 bg-neon-blue/10 px-1 py-0.5 rounded uppercase tracking-wider">Pênaltis</span> )}
              {tHome?.name_player || "A Definir"}
            </span>
            <span className="text-xs text-muted-foreground">{tHome?.team_player}</span>
          </div>
          <Shield className="h-8 w-8 shrink-0" style={{ color: tHome?.color || '#555' }} />
        </div>

        <div className="flex flex-col items-center gap-2 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <input type="number" min={0} className={inputModernCSS} placeholder="-" value={scores[match.match_id]?.s1 ?? (isFinished ? match.goals_home : "")} onChange={(e) => handleScoreChange(match.match_id, "s1", e.target.value)} />
            <span className="text-muted-foreground font-display text-sm">X</span>
            <input type="number" min={0} className={inputModernCSS} placeholder="-" value={scores[match.match_id]?.s2 ?? (isFinished ? match.goals_out : "")} onChange={(e) => handleScoreChange(match.match_id, "s2", e.target.value)} />
          </div>
          
          {idaGame && isFinished && (
             <div className="mt-1 text-[10px] text-neon-blue font-bold uppercase tracking-widest bg-neon-blue/10 border border-neon-blue/30 px-2 py-0.5 rounded-md shadow-sm">
                Agregado: {aggHome} - {aggOut}
             </div>
          )}

          <button onClick={() => handleSaveMatch(match)} disabled={savingId === match.match_id || (!tHome || !tOut)} className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30">
            {savingId === match.match_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Editar / Salvar
          </button>
        </div>

        <div className="flex-1 w-full flex items-center justify-center md:justify-start gap-3">
          <Shield className="h-8 w-8 shrink-0" style={{ color: tOut?.color || '#555' }} />
          <div className="text-center md:text-left">
            <span className="font-display font-bold flex items-center justify-center md:justify-start gap-2 leading-tight text-foreground">
              {tOut?.name_player || "A Definir"}
              {isFinished && match.penalty_winner_id === tOut?.id && ( <span className="text-[8px] text-neon-blue border border-neon-blue/30 bg-neon-blue/10 px-1 py-0.5 rounded uppercase tracking-wider">Pênaltis</span> )}
            </span>
            <span className="text-xs text-muted-foreground">{tOut?.team_player}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full animate-fade-in relative">
      <div className="bg-primary/10 w-full text-primary px-4 py-2.5 rounded-lg text-sm font-medium text-center border border-primary/20 flex items-center justify-center gap-2">
        <Trophy className="h-4 w-4" /> O Live Score é ideal, mas você também pode registrar resultados diretamente aqui.
      </div>

      {config.type !== 'KNOCKOUT' && (
        <div className="card-elevated w-full p-0 overflow-hidden border border-border/50">
          <button onClick={() => setShowLeague(!showLeague)} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
            <h3 className="font-display text-lg font-bold text-primary">Fase Inicial</h3>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showLeague ? "rotate-180" : ""}`} />
          </button>
          <div className={`transition-all duration-500 ease-in-out ${showLeague ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="p-4 space-y-6 border-t border-border/50">
              {leagueGames.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">O campeonato não foi iniciado.</p>
              ) : (
                leagueRounds.map(round => (
                  <div key={round} className="space-y-3 w-full">
                    <h4 className="w-full font-display text-sm font-bold text-muted-foreground pl-1 uppercase tracking-wider text-left border-b border-border/30 pb-2">Rodada {round}</h4>
                    <div className="flex flex-col w-full gap-3">
                      {leagueGames.filter((m) => m.round === round).map(renderMatchCard)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {config.type !== 'LEAGUE' && (
        <div className="card-elevated w-full p-0 overflow-hidden border border-border/50">
          <button onClick={() => setShowKnockout(!showKnockout)} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
            <h3 className="font-display text-lg font-bold text-neon-blue">Fase Eliminatória (Mata-Mata)</h3>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showKnockout ? "rotate-180" : ""}`} />
          </button>
          <div className={`transition-all duration-500 ease-in-out ${showKnockout ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="p-4 space-y-6 border-t border-border/50">
              {knockoutGames.length > 0 ? (
                knockoutRounds.map((round) => (
                  <div key={round} className="space-y-3 w-full">
                    <h4 className="w-full font-display text-sm font-bold text-muted-foreground pl-1 uppercase tracking-wider text-left border-b border-border/30 pb-2">
                      {getKnockoutRoundTitle(round, isHomeAway)}
                    </h4>
                    <div className="flex flex-col w-full gap-3">
                      {knockoutGames.filter((m) => m.round === round).map(renderMatchCard)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-6 border border-dashed border-border/50 rounded-lg">Aguardando a Fase de Grupos.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!penaltyPrompt} onOpenChange={(open) => !open && setPenaltyPrompt(null)}>
        <AlertDialogContent className="max-w-md shadow-[0_0_20px_rgba(0,191,255,0.15)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl text-neon-blue">Disputa de Pênaltis!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">O agregado terminou empatado. <strong>Quem venceu nos pênaltis?</strong></AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
             <button onClick={() => penaltyPrompt && executeSave(penaltyPrompt.match.match_id, penaltyPrompt.s1, penaltyPrompt.s2, penaltyPrompt.match.team_house_id)} className="flex flex-col items-center justify-center p-6 border-2 border-border/50 rounded-xl hover:border-primary hover:bg-primary/10 transition-all group">
                <Shield className="h-12 w-12 mb-3 transition-transform group-hover:scale-110" style={{ color: getTeam(penaltyPrompt?.match.team_house_id || 0)?.color }} />
                <span className="font-bold text-sm text-center">{getTeam(penaltyPrompt?.match.team_house_id || 0)?.name_player}</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Avançar</span>
             </button>
             <button onClick={() => penaltyPrompt && executeSave(penaltyPrompt.match.match_id, penaltyPrompt.s1, penaltyPrompt.s2, penaltyPrompt.match.team_out_id)} className="flex flex-col items-center justify-center p-6 border-2 border-border/50 rounded-xl hover:border-primary hover:bg-primary/10 transition-all group">
                <Shield className="h-12 w-12 mb-3 transition-transform group-hover:scale-110" style={{ color: getTeam(penaltyPrompt?.match.team_out_id || 0)?.color }} />
                <span className="font-bold text-sm text-center">{getTeam(penaltyPrompt?.match.team_out_id || 0)?.name_player}</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Avançar</span>
             </button>
          </div>
          <div className="flex justify-center mt-2"><AlertDialogCancel className="bg-transparent border-0 text-muted-foreground hover:bg-muted/50">Cancelar (Não salvar placar)</AlertDialogCancel></div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}