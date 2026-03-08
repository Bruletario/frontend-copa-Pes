import { useState, useEffect } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchInput } from "@/components/MatchInput";
import { TournamentBracket } from "@/components/TournamentBracket";
import { Trophy, Shuffle, LayoutGrid, GitBranch, Settings, AlertTriangle, Loader2, Edit2, CheckCircle2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamData } from "./Teams";
import { API_URL } from "@/lib/api";

export interface GameData {
  match_id: number; team_house_id: number; team_out_id: number; goals_home: number;
  goals_out: number; status_game: string; round: number;
}

const Championship = () => {
  const [activeTab, setActiveTab] = useState<"standings" | "matches" | "bracket">("standings");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [cupName, setCupName] = useState(`Copa PES ${new Date().getFullYear()}`);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Controle da barra deslizável
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const [champType, setChampType] = useState("league"); 
  const [formatType, setFormatType] = useState("single"); 
  const [numGroups, setNumGroups] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [teamsRes, gamesRes] = await Promise.all([ fetch(`${API_URL}/TEAMS`), fetch(`${API_URL}/GAMES`) ]);
      setTeams(await teamsRes.json());
      setGames(await gamesRes.json());
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerateChampionship = async () => {
    if (!window.confirm("Gerar um novo campeonato apagará as rodadas atuais. Deseja continuar?")) return;

    setIsGenerating(true);
    try {
      await fetch(`${API_URL}/GAMES/RESET`, { method: "DELETE" });

      let endpoint = "/GAMES/GERAR";
      let bodyData: any = { formato: formatType };

      if (champType === "knockout") endpoint = "/GAMES/MATA-MATA";
      if (champType === "groups") {
        endpoint = "/GAMES/GERAR-GRUPOS";
        bodyData = { formato: formatType, numGrupos: numGroups };
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyData),
      });

      if (!response.ok) throw new Error("Erro ao gerar");

      toast({ title: "Sucesso!", description: "Novo campeonato gerado!" });
      setShowAdminPanel(false);
      fetchData();
      setActiveTab(champType === "knockout" ? "bracket" : "matches");
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao criar o calendário.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinishCup = async () => {
    if (teams.length === 0) return;
    const sortedTeams = [...teams].sort((a, b) => b.points - a.points);
    const championName = sortedTeams[0].name_player;

    if (!window.confirm(`Deseja encerrar definitivamente a ${cupName}? O campeão registrado será ${championName}.`)) return;

    setIsFinishing(true);
    try {
      const response = await fetch(`${API_URL}/COPAS/FINALIZAR`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome_copa: cupName, campeao: championName })
      });
      if (!response.ok) throw new Error("Erro ao finalizar");
      toast({ title: "🏆 Copa Finalizada!", description: "O histórico foi salvo e o campo está limpo." });
      setCupName(`Copa PES ${new Date().getFullYear() + 1}`);
      setShowAdminPanel(false);
      fetchData();
      setActiveTab("standings");
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao arquivar a copa.", variant: "destructive" });
    } finally {
      setIsFinishing(false);
    }
  };

  const tabs = [
    { key: "standings" as const, label: "Classificação", icon: LayoutGrid },
    { key: "matches" as const, label: "Rodadas", icon: Shuffle },
    { key: "bracket" as const, label: "Mata-mata", icon: GitBranch },
  ];

  const inputModernCSS = "w-full bg-background/50 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="space-y-6">
      {/* Título da Copa */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-3 rounded-lg"><Trophy className="h-8 w-8 text-primary" /></div>
        <div>
          {isEditingName ? (
            <input 
              type="text" value={cupName} onChange={(e) => setCupName(e.target.value)} 
              className="bg-background border border-primary/50 rounded-md px-3 py-1 text-2xl font-display font-bold outline-none w-64 focus:ring-2 focus:ring-primary/50 transition-all"
              autoFocus onBlur={() => setIsEditingName(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            />
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
              <h1 className="font-display text-3xl font-bold text-foreground">{cupName}</h1>
              <Edit2 className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </div>

      {/* Painel Deslizável (Configuração e Encerramento) */}
      <div className="card-elevated p-0 overflow-hidden border border-border/50">
        <button 
          onClick={() => setShowAdminPanel(!showAdminPanel)} 
          className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <Settings className="h-5 w-5" /> Painel de Controle do Campeonato
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showAdminPanel ? "rotate-180" : ""}`} />
        </button>
        
        <div className={`transition-all duration-500 ease-in-out ${showAdminPanel ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="p-6 space-y-6 border-t border-border/50 bg-muted/5">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-medium">Tipo de Competição</label>
                <select value={champType} onChange={(e) => setChampType(e.target.value)} className={`${inputModernCSS} cursor-pointer`}>
                  <option value="league">Liga (Todos contra Todos)</option>
                  <option value="groups">Fase de Grupos</option>
                  <option value="knockout">Mata-Mata Direto</option>
                </select>
              </div>
              {champType === "groups" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-2 font-medium">Quantos Grupos?</label>
                  <input type="number" min={2} max={8} value={numGroups} onChange={(e) => setNumGroups(Number(e.target.value))} className={inputModernCSS} />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-medium">Formato de Jogos</label>
                <select value={formatType} onChange={(e) => setFormatType(e.target.value)} className={`${inputModernCSS} cursor-pointer`}>
                  <option value="single">Jogo Único (Apenas Ida)</option>
                  <option value="homeaway">Ida e Volta</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/30">
              <button onClick={handleFinishCup} disabled={isFinishing || teams.length === 0} className="flex items-center gap-2 px-5 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/50 font-bold rounded-lg hover:bg-red-500/30 transition-all">
                {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Encerrar Campeonato
              </button>
              
              <button onClick={handleGenerateChampionship} disabled={isGenerating} className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 neon-glow">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                Zerar e Gerar Torneio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap items-center gap-1 bg-muted/30 p-1.5 rounded-lg w-fit border border-border/50">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
         <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {activeTab === "standings" && <div className="animate-fade-in"><StandingsTable teams={teams} /></div>}
          {activeTab === "matches" && <div className="animate-fade-in"><MatchInput games={games} teams={teams} onRefresh={fetchData} /></div>}
          {activeTab === "bracket" && <div className="animate-fade-in"><TournamentBracket games={games.filter(g => g.round >= 90)} teams={teams} onRefresh={fetchData} /></div>}
        </>
      )}
    </div>
  );
};

export default Championship;