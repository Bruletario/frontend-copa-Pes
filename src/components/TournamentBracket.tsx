import { useState } from "react";
import { GameData } from "@/pages/Championship";
import { TeamData } from "@/pages/Teams";
import { Loader2, GitBranch, Shield, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api"; // <-- Importação corrigida com o caminho exato!

interface TournamentBracketProps {
  games: GameData[];
  teams: TeamData[];
  onRefresh: () => void;
}

export function TournamentBracket({ games, teams, onRefresh }: TournamentBracketProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [knockoutFormat, setKnockoutFormat] = useState("single");
  const [showConfig, setShowConfig] = useState(false);
  const { toast } = useToast();

  const getTeam = (id: number) => teams.find(t => t.id === id);

  const handleGenerateBracket = async () => {
    if (!window.confirm("Gerar chaveamento com base na classificação ATUAL?")) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/GAMES/MATA-MATA`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formato: knockoutFormat })
      });
      if (!response.ok) throw new Error("Erro");
      toast({ title: "Chaveamento Criado!", description: "Os confrontos iniciais foram definidos." });
      setShowConfig(false);
      onRefresh();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao criar chaveamento.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const baseMatches = games.filter(g => g.round === 99); 
  
  const generateBracketColumns = () => {
    if (baseMatches.length === 0) return [];
    const columns = [];
    let currentMatchCount = baseMatches.length;
    
    columns.push({
      title: currentMatchCount >= 4 ? "Quartas de Final" : currentMatchCount === 2 ? "Semifinal" : "Final",
      matches: baseMatches
    });

    while (currentMatchCount > 1) {
      currentMatchCount = Math.floor(currentMatchCount / 2);
      columns.push({
        title: currentMatchCount >= 2 ? "Semifinal" : "Final",
        matches: Array(currentMatchCount).fill(null)
      });
    }
    return columns;
  };

  const columns = generateBracketColumns();
  const selectModernCSS = "bg-background/50 border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="space-y-6 w-full">
      
      {/* Barra Deslizável de Configuração do Mata-Mata */}
      <div className="card-elevated p-0 overflow-hidden border border-border/50 w-full">
        <button 
          onClick={() => setShowConfig(!showConfig)} 
          className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 font-display text-base font-bold text-neon-blue">
            <GitBranch className="h-5 w-5" /> Configurar & Gerar Chaveamento
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showConfig ? "rotate-180" : ""}`} />
        </button>
        
        <div className={`transition-all duration-500 ease-in-out ${showConfig ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="p-6 border-t border-border/50 bg-muted/5 flex flex-col md:flex-row items-center gap-4 justify-between">
            <p className="text-sm text-muted-foreground">O sistema pega os líderes da Classificação Geral e monta a árvore automaticamente.</p>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select value={knockoutFormat} onChange={(e) => setKnockoutFormat(e.target.value)} className={selectModernCSS}>
                <option value="single">Jogo Único</option>
                <option value="homeaway">Ida e Volta</option>
              </select>
              <button onClick={handleGenerateBracket} disabled={isGenerating} className="bg-neon-blue text-primary-foreground px-5 py-2 rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2 neon-glow transition-all whitespace-nowrap">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar Árvore"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desenho da Árvore */}
      {games.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/5 border border-dashed border-border/50 rounded-lg">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Nenhum jogo eliminatório ativo no momento.</p>
          <p className="text-xs mt-1">Abra o painel acima para gerar.</p>
        </div>
      ) : (
        <div className="flex items-center gap-6 md:gap-8 overflow-x-auto pb-8 pt-4 custom-scrollbar w-full">
          {columns.map((col, colIndex) => (
            <div key={colIndex} className="flex gap-6 md:gap-8 items-center">
              <div className="space-y-6 min-w-[240px] md:min-w-[260px] flex flex-col justify-around">
                <h4 className="font-display text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">
                  {col.title}
                </h4>
                {col.matches.map((match: GameData | null, matchIndex: number) => (
                  <BracketMatchCard key={matchIndex} match={match} getTeam={getTeam} isFinal={colIndex === columns.length - 1} />
                ))}
              </div>
              
              {colIndex < columns.length - 1 && (
                <div className="flex flex-col items-center justify-around w-6 md:w-8 border-r-2 border-t-2 border-b-2 border-primary/20 rounded-r-xl my-8 h-[50%]" />
              )}
            </div>
          ))}

          <div className="flex flex-col items-center justify-center min-w-[120px] pl-2 md:pl-4">
            <div className="text-5xl mb-3 animate-pulse-neon">🏆</div>
            <span className="font-display font-bold text-muted-foreground uppercase tracking-widest text-[10px] md:text-xs">Campeão</span>
            <div className="mt-3 w-12 md:w-16 h-1 bg-gradient-to-r from-primary/50 to-transparent rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}

function BracketMatchCard({ match, getTeam, isFinal }: { match: GameData | null, getTeam: Function, isFinal: boolean }) {
  if (!match) {
    return (
      <div className={`card-elevated overflow-hidden border-dashed border-border/50 opacity-40 bg-transparent ${isFinal ? "neon-border" : ""}`}>
        <MatchRow player={null} score={null} />
        <div className="border-t border-border/30" />
        <MatchRow player={null} score={null} />
      </div>
    );
  }

  const tHome = getTeam(match.team_house_id);
  const tOut = getTeam(match.team_out_id);
  const isFinished = match.status_game === "Finalizado";
  
  const homeWins = isFinished && match.goals_home > match.goals_out;
  const outWins = isFinished && match.goals_out > match.goals_home;

  return (
    <div className={`card-elevated overflow-hidden bg-background/80 backdrop-blur-sm ${isFinal ? "border-neon-blue shadow-[0_0_15px_rgba(0,191,255,0.2)]" : "border-border/50"}`}>
      <MatchRow player={tHome} score={isFinished ? match.goals_home : null} isWinner={homeWins} />
      <div className="border-t border-border/30" />
      <MatchRow player={tOut} score={isFinished ? match.goals_out : null} isWinner={outWins} />
    </div>
  );
}

function MatchRow({ player, score, isWinner = false }: { player: TeamData | null, score: number | null, isWinner?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 md:px-4 py-2.5 transition-colors ${isWinner ? "bg-primary/10" : ""}`}>
      <div className="flex items-center gap-2 md:gap-3">
        {player ? (
          <Shield className="h-4 w-4 md:h-5 md:w-5" style={{ color: player.color }} />
        ) : (
          <div className="h-4 w-4 md:h-5 md:w-5 rounded-full border border-dashed border-muted-foreground/50" />
        )}
        <div className="flex flex-col">
          <span className={`text-xs md:text-sm font-display font-bold leading-none ${isWinner ? "text-primary" : player ? "text-foreground" : "text-muted-foreground"}`}>
            {player?.name_player || "A Definir"}
          </span>
          {player && <span className="text-[8px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-[100px]">{player.team_player}</span>}
        </div>
      </div>
      <span className={`font-display font-black text-base md:text-lg ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
        {score !== null ? score : "-"}
      </span>
    </div>
  );
}