import { useState } from "react";
import { GameData } from "@/pages/Championship";
import { TeamData } from "@/pages/Teams";
import { Shield, ChevronDown, Trophy, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api"; // <-- Importação corrigida com o caminho exato!

interface MatchInputProps {
  games: GameData[];
  teams: TeamData[];
  onRefresh: () => void;
}

export function MatchInput({ games, teams, onRefresh }: MatchInputProps) {
  const [showLeague, setShowLeague] = useState(true);
  const [showKnockout, setShowKnockout] = useState(true);
  const [scores, setScores] = useState<Record<number, { s1: string; s2: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const getTeam = (id: number) => teams.find(t => t.id === id);

  const leagueGames = games.filter(g => g.round < 90);
  const knockoutGames = games.filter(g => g.round >= 90);
  
  const leagueRounds = [...new Set(leagueGames.map((g) => g.round))].sort((a, b) => a - b);
  const knockoutRounds = [...new Set(knockoutGames.map((g) => g.round))].sort((a, b) => a - b);

  const handleScoreChange = (matchId: number, side: "s1" | "s2", value: string) => {
    setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  };

  const handleSaveMatch = async (matchId: number) => {
    const s1 = scores[matchId]?.s1;
    const s2 = scores[matchId]?.s2;

    if (s1 === undefined || s2 === undefined || s1 === "" || s2 === "") {
      toast({ title: "Atenção", description: "Preencha os dois placares.", variant: "destructive" });
      return;
    }

    setSavingId(matchId);
    try {
      await fetch(`${API_URL}/GAMES/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals_home: Number(s1), goals_out: Number(s2), status_game: "Finalizado" }),
      });
      toast({ title: "Salvo!", description: "Placar atualizado via Rodadas." });
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

    return (
      <div key={match.match_id} className={`w-full card-elevated p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-primary/30 border-border/50 ${isFinished ? "bg-muted/10" : "bg-muted/5"}`}>
        
        {/* Casa */}
        <div className="flex-1 w-full flex items-center justify-center md:justify-end gap-3">
          <div className="text-center md:text-right">
            <span className="font-display font-bold block leading-tight text-foreground">{tHome?.name_player || "A Definir"}</span>
            <span className="text-xs text-muted-foreground">{tHome?.team_player}</span>
          </div>
          <Shield className="h-8 w-8 shrink-0" style={{ color: tHome?.color || '#555' }} />
        </div>

        {/* Placar Box com Inputs */}
        <div className="flex flex-col items-center gap-2 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <input 
              type="number" min={0} className={inputModernCSS} placeholder="-"
              value={scores[match.match_id]?.s1 ?? (isFinished ? match.goals_home : "")} 
              onChange={(e) => handleScoreChange(match.match_id, "s1", e.target.value)} 
            />
            <span className="text-muted-foreground font-display text-sm">X</span>
            <input 
              type="number" min={0} className={inputModernCSS} placeholder="-"
              value={scores[match.match_id]?.s2 ?? (isFinished ? match.goals_out : "")} 
              onChange={(e) => handleScoreChange(match.match_id, "s2", e.target.value)} 
            />
          </div>
          
          <button 
            onClick={() => handleSaveMatch(match.match_id)} disabled={savingId === match.match_id} 
            className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            {savingId === match.match_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 
            Editar / Salvar
          </button>
        </div>

        {/* Fora */}
        <div className="flex-1 w-full flex items-center justify-center md:justify-start gap-3">
          <Shield className="h-8 w-8 shrink-0" style={{ color: tOut?.color || '#555' }} />
          <div className="text-center md:text-left">
            <span className="font-display font-bold block leading-tight text-foreground">{tOut?.name_player || "A Definir"}</span>
            <span className="text-xs text-muted-foreground">{tOut?.team_player}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="bg-primary/10 w-full text-primary px-4 py-2.5 rounded-lg text-sm font-medium text-center border border-primary/20 flex items-center justify-center gap-2">
        <Trophy className="h-4 w-4" />
        O Live Score é ideal, mas você também pode registrar resultados diretamente aqui.
      </div>

      {/* SESSÃO: PONTOS CORRIDOS */}
      <div className="card-elevated w-full p-0 overflow-hidden border border-border/50">
        <button onClick={() => setShowLeague(!showLeague)} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
          <h3 className="font-display text-lg font-bold text-primary">Fase de Liga / Grupos</h3>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showLeague ? "rotate-180" : ""}`} />
        </button>
        
        <div className={`transition-all duration-500 ease-in-out ${showLeague ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="p-4 space-y-6 border-t border-border/50">
            {leagueGames.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nenhum jogo de liga gerado.</p>
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

      {/* SESSÃO: MATA-MATA */}
      <div className="card-elevated w-full p-0 overflow-hidden border border-border/50">
        <button onClick={() => setShowKnockout(!showKnockout)} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
          <h3 className="font-display text-lg font-bold text-neon-blue">Fase Eliminatória (Mata-Mata)</h3>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showKnockout ? "rotate-180" : ""}`} />
        </button>
        
        <div className={`transition-all duration-500 ease-in-out ${showKnockout ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="p-4 space-y-6 border-t border-border/50">
            {knockoutGames.length > 0 ? (
              knockoutRounds.map(round => (
                <div key={round} className="space-y-3 w-full">
                  <h4 className="w-full font-display text-sm font-bold text-muted-foreground pl-1 uppercase tracking-wider text-left border-b border-border/30 pb-2">
                    Confrontos Finais
                  </h4>
                  <div className="flex flex-col w-full gap-3">
                    {knockoutGames.filter((m) => m.round === round).map(renderMatchCard)}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3 opacity-60 grayscale-[0.5] w-full">
                 <h4 className="w-full font-display text-sm font-bold text-muted-foreground pl-1 uppercase tracking-wider text-left border-b border-border/30 pb-2">Confrontos a Definir</h4>
                 <div className="flex flex-col w-full gap-3">
                   {[1, 2, 3, 4].map(num => (
                     <div key={num} className="w-full card-elevated p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-dashed border-border/50 bg-transparent">
                        <div className="flex-1 text-center md:text-right text-muted-foreground font-display text-sm">{num}º Colocado</div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-background/30 rounded-xl border border-border/30">
                          <div className="w-8 h-8 flex items-center justify-center">-</div><span className="text-muted-foreground/30">X</span><div className="w-8 h-8 flex items-center justify-center">-</div>
                        </div>
                        <div className="flex-1 text-center md:text-left text-muted-foreground font-display text-sm">{5 - num + 4}º Colocado</div>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}