import { useState, useEffect } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchInput } from "@/components/MatchInput";
import { TournamentBracket } from "@/components/TournamentBracket";
import { Trophy, Shuffle, LayoutGrid, GitBranch, Settings, Loader2, Edit2, CheckCircle2, ChevronDown, AlertCircle, Crown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamData } from "./Teams";
import { API_URL } from "@/lib/api";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface GameData {
  match_id: number; team_house_id: number; team_out_id: number; goals_home: number;
  goals_out: number; status_game: string; round: number;
  penalty_winner_id?: number; 
}

type TourneyType = 'LEAGUE' | 'LEAGUE_KNOCKOUT' | 'GROUPS_KNOCKOUT' | 'KNOCKOUT';

const Championship = () => {
  const [activeTab, setActiveTab] = useState<"standings" | "matches" | "bracket">("standings");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [cupName, setCupName] = useState(`Copa PES ${new Date().getFullYear()}`);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoConsolidating, setIsAutoConsolidating] = useState(false);

  const [showChampionPopup, setShowChampionPopup] = useState(false);
  const [hasSeenPopup, setHasSeenPopup] = useState(false);

  // Lê do Banco Globalmente
  const [config, setConfig] = useState({
    type: 'LEAGUE_KNOCKOUT' as TourneyType,
    baseFormat: 'single', knockoutFormat: 'single', groupsCount: 2, knockoutTeams: 4, seedingLogic: 'POSITIONAL', hasThirdPlace: false 
  });

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [teamsRes, gamesRes, configRes] = await Promise.all([ fetch(`${API_URL}/TEAMS`), fetch(`${API_URL}/GAMES`), fetch(`${API_URL}/CONFIGS`) ]);
      setTeams(await teamsRes.json());
      setGames(await gamesRes.json());
      if(configRes.ok) setConfig(await configRes.json());
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Salva no Banco de Dados
  const updateConfig = async (newConfig: any) => {
    setConfig(newConfig);
    try {
      await fetch(`${API_URL}/CONFIGS`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newConfig) });
    } catch(e) { console.error(e); }
  };

  const isTournamentRunning = games.length > 0;
  const activeTeams = teams.filter(t => t.team_player !== "Sem Time");
  const totalTeams = activeTeams.length;
  
  const sortedTeams = [...activeTeams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.goals_score - b.goals_conceded) - (a.goals_score - a.goals_conceded);
  });

  const leagueGames = games.filter(g => g.round < 90);
  const knockoutGames = games.filter(g => g.round >= 90);

  const hasLeague = leagueGames.length > 0;
  const isLeagueFinished = hasLeague && leagueGames.every(g => g.status_game === "Finalizado");

  const hasKnockout = knockoutGames.length > 0;
  const mainBracketGames = knockoutGames.filter(g => g.round < 99);
  
  const maxKnockoutRound = mainBracketGames.length > 0 ? Math.max(...mainBracketGames.map(g => g.round)) : 0;
  const finalMatch = mainBracketGames.find(g => g.round === maxKnockoutRound);
  const isKnockoutFinished = finalMatch ? finalMatch.status_game === "Finalizado" : false;

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

  // --- LÓGICA DO PÓDIO COM PÊNALTIS E AGREGADO ---
  let podium = { first: sortedTeams[0], second: sortedTeams[1], third: sortedTeams[2] };
  
  if (isFullyFinished && hasKnockout && finalMatch) {
    let homeWon = false;
    
    if (config.knockoutFormat === 'homeaway') {
        const idaGame = knockoutGames.find(g => g.round === finalMatch.round - 1 && g.team_house_id === finalMatch.team_out_id);
        if (idaGame) {
            const aggHome = finalMatch.goals_home + idaGame.goals_out;
            const aggOut = finalMatch.goals_out + idaGame.goals_home;
            const isTie = aggHome === aggOut;
            homeWon = aggHome > aggOut || (isTie && finalMatch.penalty_winner_id === finalMatch.team_house_id);
        }
    } else {
        const isTie = finalMatch.goals_home === finalMatch.goals_out;
        homeWon = finalMatch.goals_home > finalMatch.goals_out || (isTie && finalMatch.penalty_winner_id === finalMatch.team_house_id);
    }
    
    const winnerId = homeWon ? finalMatch.team_house_id : finalMatch.team_out_id;
    const loserId = homeWon ? finalMatch.team_out_id : finalMatch.team_house_id;
    
    podium.first = teams.find(t => t.id === winnerId) || sortedTeams[0];
    podium.second = teams.find(t => t.id === loserId) || sortedTeams[1];

    const thirdMatch = knockoutGames.find(g => g.round === 99);
    if (thirdMatch && thirdMatch.status_game === "Finalizado") {
      const isThirdTie = thirdMatch.goals_home === thirdMatch.goals_out;
      const thirdHomeWon = thirdMatch.goals_home > thirdMatch.goals_out || (isThirdTie && thirdMatch.penalty_winner_id === thirdMatch.team_house_id);
      
      const thirdWinnerId = thirdHomeWon ? thirdMatch.team_house_id : thirdMatch.team_out_id;
      podium.third = teams.find(t => t.id === thirdWinnerId) || sortedTeams[2];
    } else if (!config.hasThirdPlace) {
      const remaining = sortedTeams.filter(t => t.id !== podium.first?.id && t.id !== podium.second?.id);
      if (remaining.length > 0) podium.third = remaining[0];
    }
  }

  useEffect(() => {
    if (isFullyFinished && !hasSeenPopup) { setShowChampionPopup(true); setHasSeenPopup(true); }
  }, [isFullyFinished, hasSeenPopup]);

  // 👇 AUTO-GERAÇÃO DO MATA-MATA 👇
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
          fetchData();
        } catch (error) {
          console.error(error);
        } finally {
          setIsAutoConsolidating(false);
        }
      }
    };
    autoGenerateKnockout();
  }, [isLeagueFinished, knockoutGames.length, config.type, isAutoConsolidating, config, toast]);
  
  const getValidationError = () => {
    if (totalTeams < 2) return "É necessário pelo menos 2 equipas para jogar.";
    if (config.type.includes('GROUPS') && totalTeams < config.groupsCount * 2) return `Impossível formar ${config.groupsCount} grupos.`;
    if (config.type !== 'LEAGUE' && config.knockoutTeams > totalTeams) return `Mata-mata exige ${config.knockoutTeams} equipas, mas só existem ${totalTeams}.`;
    return null;
  };

  const validationError = getValidationError();

  const handleGenerateChampionship = async () => {
    if (validationError) return;
    setIsGenerating(true);
    try {
      await fetch(`${API_URL}/GAMES/RESET`, { method: "DELETE" });

      let res;
      if (config.type === 'LEAGUE' || config.type === 'LEAGUE_KNOCKOUT') {
        res = await fetch(`${API_URL}/GAMES/GERAR`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formato: config.baseFormat }) });
      } else if (config.type === 'GROUPS_KNOCKOUT') {
        res = await fetch(`${API_URL}/GAMES/GERAR-GRUPOS`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formato: config.baseFormat, numGrupos: config.groupsCount }) });
      }
      if (res && !res.ok) throw new Error("Falha ao gerar a fase inicial.");

      if (config.type === 'KNOCKOUT') {
         const resKnockout = await fetch(`${API_URL}/GAMES/MATA-MATA`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formato: config.knockoutFormat, size: config.knockoutTeams, logic: config.seedingLogic, hasThirdPlace: config.hasThirdPlace }) });
         if (!resKnockout.ok) throw new Error("Falha ao gerar árvore do Mata-Mata.");
      }

      toast({ title: "Sucesso!", description: "Novo campeonato gerado com os elencos atuais!" });
      setShowAdminPanel(false); setHasSeenPopup(false); 
      fetchData();
      setActiveTab(config.type === 'KNOCKOUT' ? "bracket" : "matches");
    } catch (error: any) {
      toast({ title: "Geração Cancelada", description: error.message || "Erro.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelCup = async () => {
    setIsCancelling(true);
    try {
      await fetch(`${API_URL}/GAMES/RESET?clearTeams=true`, { method: "DELETE" });
      toast({ title: "Torneio Cancelado", description: "O campeonato foi apagado." });
      setShowAdminPanel(false); setHasSeenPopup(false); fetchData();
    } catch (error) { console.error(error); } finally { setIsCancelling(false); }
  };

  const handleFinishCup = async () => {
    if (!podium.first) return;
    setIsFinishing(true);
    try {
      await fetch(`${API_URL}/COPAS/FINALIZAR`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome_copa: cupName, campeao: podium.first.name_player })
      });
      toast({ title: "🏆 Copa Finalizada!", description: "O histórico foi salvo." });
      setCupName(`Copa PES ${new Date().getFullYear() + 1}`);
      setShowAdminPanel(false); setShowChampionPopup(false); setHasSeenPopup(false);
      fetchData(); setActiveTab("standings");
    } catch (error) { console.error(error); } finally { setIsFinishing(false); }
  };

  const tabs = [
    { key: "standings" as const, label: "Classificação", icon: LayoutGrid, hide: config.type === 'KNOCKOUT' },
    { key: "matches" as const, label: "Rodadas", icon: Shuffle, hide: false },
    { key: "bracket" as const, label: "Mata-mata", icon: GitBranch, hide: config.type === 'LEAGUE' },
  ];

  const selectTriggerClass = "w-full bg-background border-border/50 rounded-lg h-[44px] hover:border-primary/50 focus:ring-1 focus:ring-primary focus:ring-offset-0";

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          {isEditingName ? (
            <input type="text" value={cupName} onChange={(e) => setCupName(e.target.value)} className="bg-transparent border-b-2 border-primary text-2xl md:text-3xl font-display font-bold text-foreground outline-none w-64 focus:border-neon-blue transition-colors pb-1" autoFocus onBlur={() => setIsEditingName(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)} />
          ) : (
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsEditingName(true)}>
              <h1 className="page-header">{cupName}</h1>
              <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary" />
            </div>
          )}
        </div>
      </div>

      {showChampionPopup && isFullyFinished && podium.first && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-background/95 border border-border/50 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] w-full max-w-2xl overflow-hidden relative">
            <div className="p-6 md:p-10 text-center relative z-10">
              <Crown className="h-14 w-14 text-neon-yellow drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] mx-auto mb-5 animate-bounce" />
              <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight mb-2">Fim de Jogo</h2>
              <p className="text-sm text-muted-foreground">O campeonato <strong>{cupName}</strong> foi concluído.</p>
              
              <div className="flex items-end justify-center gap-3 sm:gap-6 my-10 h-40 w-full overflow-hidden">
                {podium.second && (
                  <div className="flex flex-col items-center animate-fade-in opacity-80 flex-1 max-w-[140px]" style={{ animationDelay: '200ms' }}>
                    <span className="text-[10px] font-bold text-muted-foreground mb-2">2º LUGAR</span>
                    <span className="font-bold text-sm text-gray-300 text-center break-words w-full px-1">{podium.second.name_player}</span>
                    <div className="w-full h-16 border-t-2 border-l-2 border-r-2 border-gray-600/50 mt-2 rounded-t-lg bg-gray-800/20"></div>
                  </div>
                )}
                <div className="flex flex-col items-center animate-fade-in z-10 flex-1 max-w-[160px]" style={{ animationDelay: '600ms' }}>
                  <span className="text-xs font-black text-neon-yellow tracking-widest mb-2 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] bg-transparent">CAMPEÃO</span>
                  <span className="font-black text-lg sm:text-xl text-foreground uppercase text-center break-words w-full px-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{podium.first.name_player}</span>
                  <div className="w-full h-24 border-t-2 border-l-2 border-r-2 border-neon-yellow/50 mt-2 rounded-t-lg bg-yellow-900/10 shadow-[0_-5px_15px_rgba(250,204,21,0.15)]"></div>
                </div>
                {podium.third && (
                  <div className="flex flex-col items-center animate-fade-in opacity-80 flex-1 max-w-[140px]" style={{ animationDelay: '400ms' }}>
                    <span className="text-[10px] font-bold text-muted-foreground mb-2">3º LUGAR</span>
                    <span className="font-bold text-sm text-amber-600/80 text-center break-words w-full px-1">{podium.third.name_player}</span>
                    <div className="w-full h-12 border-t-2 border-l-2 border-r-2 border-amber-900/50 mt-2 rounded-t-lg bg-amber-900/10"></div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <button onClick={() => setShowChampionPopup(false)} className="px-6 py-2.5 rounded-lg font-bold text-sm bg-secondary text-foreground hover:bg-secondary/80 transition-colors border border-border/50">
                  Fechar (Ver Tabelas)
                </button>
                <button onClick={handleFinishCup} disabled={isFinishing} className="bg-neon-yellow text-black px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                  {isFinishing ? <Loader2 className="animate-spin h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>} Guardar Histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👇 BANNER RESTAURADO COM OPÇÃO DE GUARDAR HISTÓRICO DIRETO 👇 */}
      {isFullyFinished && podium.first && !showChampionPopup && (
        <div className="card-elevated border-neon-yellow/50 bg-neon-yellow/5 backdrop-blur-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-[0_0_15px_rgba(250,204,21,0.05)]">
          <div className="flex items-center gap-4">
            <Trophy className="h-10 w-10 text-neon-yellow drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Torneio Concluído</p>
              <p className="font-display text-base text-foreground">O campeão é <span className="font-bold text-neon-yellow drop-shadow-sm">{podium.first.name_player}</span>.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setShowChampionPopup(true)} className="w-full sm:w-auto px-6 py-2.5 bg-foreground text-background border-0 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              Ver Pódio
            </button>
            <button onClick={handleFinishCup} disabled={isFinishing} className="w-full sm:w-auto px-6 py-2.5 bg-neon-yellow text-black border-0 rounded-lg text-sm font-bold hover:bg-yellow-400 transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] flex items-center justify-center gap-2">
              {isFinishing ? <Loader2 className="animate-spin h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>} Guardar Histórico
            </button>
          </div>
        </div>
      )}

      <div className="card-elevated p-0 overflow-hidden border border-border/50 shadow-sm">
        <button onClick={() => setShowAdminPanel(!showAdminPanel)} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-2 font-display text-base font-bold text-primary">
            <Settings className="h-4 w-4" /> Configurações & Gerenciador
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showAdminPanel ? "rotate-180" : ""}`} />
        </button>
        
        <div className={`transition-all duration-500 ease-in-out ${showAdminPanel ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="p-6 space-y-8 border-t border-border/50 bg-muted/5">
            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Passo 1: Estrutura</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: 'LEAGUE', label: "Pontos Corridos", desc: "Todos contra Todos" },
                  { id: 'LEAGUE_KNOCKOUT', label: "Liga + Mata-Mata", desc: "Tabela p/ Finais" },
                  { id: 'GROUPS_KNOCKOUT', label: "Grupos + Mata-Mata", desc: "Estilo Champions" },
                  { id: 'KNOCKOUT', label: "Só Mata-Mata", desc: "Eliminação Direta" }
                ].map(t => (
                  <button key={t.id} disabled={isTournamentRunning} onClick={() => updateConfig({...config, type: t.id as TourneyType})} className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${config.type === t.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-primary/50 bg-background/50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <div className={`font-bold mb-1 ${config.type === t.id ? 'text-primary' : 'text-foreground'}`}>{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                    {config.type === t.id && <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-full flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-primary ml-1 mb-1" /></div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {config.type !== 'KNOCKOUT' && (
                <div className="space-y-4 bg-background/30 p-5 rounded-xl border border-border/30">
                  <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Fase Inicial</h3>
                  {config.type === 'GROUPS_KNOCKOUT' && (
                    <div className="relative">
                      <label className="text-xs text-muted-foreground block mb-1.5 font-medium ml-1">Quantidade de Grupos</label>
                      <Select disabled={isTournamentRunning} value={String(config.groupsCount)} onValueChange={(val) => updateConfig({...config, groupsCount: Number(val)})}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent><SelectItem value="2">2 Grupos</SelectItem><SelectItem value="4">4 Grupos</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="relative">
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium ml-1">Formato Base</label>
                    <Select disabled={isTournamentRunning} value={config.baseFormat} onValueChange={(val) => updateConfig({...config, baseFormat: val})}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent><SelectItem value="single">Jogo Único</SelectItem><SelectItem value="homeaway">Ida e Volta</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {config.type !== 'LEAGUE' && (
                <div className="space-y-4 bg-background/30 p-5 rounded-xl border border-border/30">
                  <h3 className="font-display text-sm font-bold text-neon-blue uppercase tracking-wider flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-neon-blue"></div> Mata-Mata</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="text-xs text-muted-foreground block mb-1.5 font-medium ml-1">Tamanho da Chave</label>
                      <Select disabled={hasKnockout} value={String(config.knockoutTeams)} onValueChange={(val) => updateConfig({...config, knockoutTeams: Number(val)})}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent><SelectItem value="2">2 Equipas (Final)</SelectItem><SelectItem value="4">4 Equipas (Semi)</SelectItem><SelectItem value="8">8 Equipas (Quartas)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <label className="text-xs text-muted-foreground block mb-1.5 font-medium ml-1">Formato</label>
                      <Select disabled={hasKnockout} value={config.knockoutFormat} onValueChange={(val) => updateConfig({...config, knockoutFormat: val})}>
                        <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent><SelectItem value="single">Jogo Único</SelectItem><SelectItem value="homeaway">Ida e Volta</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium ml-1">Lógica</label>
                    <Select disabled={hasKnockout} value={config.seedingLogic} onValueChange={(val) => updateConfig({...config, seedingLogic: val})}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent><SelectItem value="POSITIONAL">Vantagem</SelectItem><SelectItem value="RANDOM">Sorteio</SelectItem></SelectContent>
                    </Select>
                  </div>

                  {config.knockoutTeams > 2 && (
                    <div className="flex items-center gap-3 pt-3 mt-2 border-t border-border/30">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" disabled={hasKnockout} className="sr-only peer" checked={config.hasThirdPlace} onChange={() => updateConfig({...config, hasThirdPlace: !config.hasThirdPlace})} />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-blue"></div>
                      </label>
                      <span className="text-sm font-medium text-foreground">Disputa de 3º Lugar</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border/30">
              <div className="flex-1 w-full text-center md:text-left">
                {validationError ? (
                  <span className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg text-sm font-bold border border-red-500/20"><AlertCircle className="h-4 w-4 shrink-0" /> {validationError}</span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-primary bg-primary/10 px-4 py-2 rounded-lg text-sm font-bold border border-primary/20"><CheckCircle2 className="h-4 w-4 shrink-0" /> Prontos para gerar.</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {!isTournamentRunning ? (
                  <button onClick={handleGenerateChampionship} disabled={isGenerating || !!validationError} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 neon-glow disabled:opacity-50 transition-all">
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />} Gerar Campeonato
                  </button>
                ) : (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <button className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/50 text-sm font-bold rounded-lg hover:bg-red-500/20 transition-all">
                           {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Cancelar Torneio
                         </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar Campeonato?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação apaga tudo.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-red-600 text-white hover:bg-red-700 border-0">Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelCup} className="bg-white text-black hover:bg-gray-200">Apagar torneio</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 bg-muted/30 p-1.5 rounded-lg w-fit border border-border/50">
        {tabs.filter(t => !t.hide).map((tab) => (
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
          {activeTab === "matches" && <div className="animate-fade-in"><MatchInput config={config} games={games} teams={teams} onRefresh={fetchData} /></div>}
          {activeTab === "bracket" && <div className="animate-fade-in"><TournamentBracket config={config} games={games} teams={teams} onRefresh={fetchData} /></div>}
        </>
      )}
    </div>
  );
};

export default Championship;