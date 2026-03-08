import { useState, useEffect } from "react";
import { TeamCard } from "@/components/TeamCard";
import { Shield, Shuffle, Sparkles, Loader2, Users, Target, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface SquadAthlete {
  id: string;
  name: string;
  position: string;
  ovr: number;
}

export interface TeamData {
  id: number | string;
  name_player: string;
  team_player: string;
  color: string;
  ovr: number;
  formation: string;
  squad: SquadAthlete[];
  // 👇 Estas são as propriedades que o TypeScript estava sentindo falta:
  points: number;
  goals_score: number;
  goals_conceded: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  grupo?: string; 
}

const Teams = () => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Painéis expansíveis
  const [showDrawPanel, setShowDrawPanel] = useState(false);
  const [showDraftPanel, setShowDraftPanel] = useState(false);
  
  // Estados do Sorteio de TIMES
  const [isDrawingTeams, setIsDrawingTeams] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [teamList, setTeamList] = useState<string[]>([]);

  // Estados do Draft de ATLETAS
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPos, setDraftPos] = useState("CA");
  const [draftOvr, setDraftOvr] = useState<number | string>(80);
  const [draftDestination, setDraftDestination] = useState<string>("RANDOM");

  const { toast } = useToast();

  const fetchTeams = async () => {
    try {
      const response = await fetch("http://localhost:3000/TEAMS");
      if (!response.ok) throw new Error("Erro ao buscar times");
      const data = await response.json();
      const formattedData = data.map((t: any) => ({ ...t, squad: t.squad || [] }));
      setTeams(formattedData);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar os times.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const playersWithoutTeam = teams.filter(t => t.team_player === "Sem Time" || !t.team_player);

  const handleAddTeamToList = () => {
    if (newTeamName.trim() && !teamList.includes(newTeamName)) {
      setTeamList([...teamList, newTeamName.trim()]);
      setNewTeamName("");
    }
  };

  const removeTeamFromList = (teamToRemove: string) => {
    setTeamList(teamList.filter(t => t !== teamToRemove));
  };

  const handleDrawTeams = async () => {
    if (playersWithoutTeam.length === 0) {
      toast({ title: "Atenção", description: "Não há técnicos 'Sem Time' para participar do sorteio.", variant: "destructive" });
      return;
    }
    if (teamList.length < playersWithoutTeam.length) {
      toast({ title: "Aviso", description: `Você tem ${playersWithoutTeam.length} técnicos na fila, mas adicionou apenas ${teamList.length} clubes. Adicione mais opções.`, variant: "destructive" });
      return;
    }

    setIsDrawingTeams(true);
    try {
      const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);

      const updatePromises = playersWithoutTeam.map((player, index) => {
        return fetch(`http://localhost:3000/TEAMS/${player.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_player: shuffledTeams[index] }),
        });
      });

      await Promise.all(updatePromises);

      toast({ title: "Sorteio Realizado!", description: "Os clubes foram definidos para os técnicos." });
      setTeamList([]);
      setShowDrawPanel(false);
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao sortear os times.", variant: "destructive" });
    } finally {
      setIsDrawingTeams(false);
    }
  };

  const handleDraftAthlete = async () => {
    if (!draftName.trim() || !draftOvr || teams.length === 0) {
      toast({ title: "Atenção", description: "Preencha o atleta ou garanta que existam times.", variant: "destructive" });
      return;
    }

    setIsDrafting(true);

    try {
      let selectedTeam: TeamData;

      if (draftDestination === "RANDOM") {
        const availableTeams = teams.filter(t => t.team_player !== "Sem Time");
        if (availableTeams.length === 0) throw new Error("Não há times válidos para sortear.");
        const randomTeamIndex = Math.floor(Math.random() * availableTeams.length);
        selectedTeam = availableTeams[randomTeamIndex];
      } else {
        selectedTeam = teams.find(t => t.id.toString() === draftDestination)!;
      }

      const newAthlete: SquadAthlete = { id: Date.now().toString(), name: draftName, position: draftPos, ovr: Number(draftOvr) };
      const newSquad = [...selectedTeam.squad, newAthlete];
      const newTeamOvr = Math.round(newSquad.reduce((acc, curr) => acc + curr.ovr, 0) / newSquad.length);

      const response = await fetch(`http://localhost:3000/TEAMS/${selectedTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad: newSquad, ovr: newTeamOvr }),
      });

      if (!response.ok) throw new Error("Erro ao salvar atleta");

      toast({ title: draftDestination === "RANDOM" ? "Sorteado! 🎰" : "Contratado! ✍️", description: `${newAthlete.name} foi para o time de ${selectedTeam.name_player}.` });

      setDraftName("");
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao processar o atleta.", variant: "destructive" });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleRemoveAthlete = async (teamId: number | string, athleteId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const newSquad = team.squad.filter(a => a.id !== athleteId);
    const newTeamOvr = newSquad.length > 0 ? Math.round(newSquad.reduce((acc, curr) => acc + curr.ovr, 0) / newSquad.length) : 75;

    try {
      await fetch(`http://localhost:3000/TEAMS/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad: newSquad, ovr: newTeamOvr }),
      });
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover.", variant: "destructive" });
    }
  };

  const handleClearTeam = async (teamId: number | string) => {
    if(!window.confirm("Deseja dispensar este clube? O técnico ficará 'Sem Time' e o elenco será apagado.")) return;
    try {
      await fetch(`http://localhost:3000/TEAMS/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_player: "Sem Time", squad: [], ovr: 75 }),
      });
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao dispensar clube.", variant: "destructive" });
    }
  };

  const inputModernCSS = "w-full bg-background/50 border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="page-header">Gerenciar Elencos</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowDrawPanel(!showDrawPanel); setShowDraftPanel(false); }} className={`px-4 py-2 rounded-lg font-display font-semibold text-sm transition-all flex items-center gap-2 ${showDrawPanel ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground neon-glow hover:opacity-90'}`}>
            <Users className="h-4 w-4" /> Sorteio de Times
          </button>
          <button onClick={() => { setShowDraftPanel(!showDraftPanel); setShowDrawPanel(false); }} className={`px-4 py-2 rounded-lg font-display font-semibold text-sm transition-all flex items-center gap-2 ${showDraftPanel ? 'bg-secondary text-foreground' : 'bg-neon-blue text-primary-foreground neon-glow hover:opacity-90'}`}>
            <Target className="h-4 w-4" /> Draft de Atletas
          </button>
        </div>
      </div>

      {showDrawPanel && (
        <div className="card-elevated neon-border p-6 bg-muted/5 animate-fade-in">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-primary">Sorteio de Times (Base)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Você tem <strong>{playersWithoutTeam.length} técnico(s)</strong> na fila. Adicione opções de clubes para sortear.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs text-muted-foreground self-center">Na Fila:</span> 
              {playersWithoutTeam.map((p, i) => <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-medium">{p.name_player}</span>)}
              {playersWithoutTeam.length === 0 && <span className="text-xs text-muted-foreground">Ninguém na fila.</span>}
            </div>

            <div className="flex gap-2">
              <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTeamToList()} placeholder="Digite o Clube e aperte Enter" className={inputModernCSS} disabled={playersWithoutTeam.length === 0} />
              <button onClick={handleAddTeamToList} disabled={playersWithoutTeam.length === 0} className="bg-secondary px-4 rounded-lg hover:bg-secondary/80 transition-colors font-bold disabled:opacity-50">+</button>
            </div>
            
             {teamList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">Na Urna ({teamList.length}):</span> 
                {teamList.map((t, i) => (
                  <span key={i} className="group flex items-center gap-1 text-xs bg-muted border border-border pl-2 pr-1 py-1 rounded-md transition-colors hover:border-red-500/50">
                    {t}
                    <button onClick={() => removeTeamFromList(t)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}

            <button onClick={handleDrawTeams} disabled={isDrawingTeams || playersWithoutTeam.length === 0 || teamList.length < playersWithoutTeam.length} className="w-full mt-4 bg-primary text-primary-foreground py-2.5 rounded-lg font-display font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all neon-glow flex justify-center items-center gap-2">
              {isDrawingTeams ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shuffle className="h-5 w-5" />}
              Distribuir Clubes Aleatoriamente
            </button>
          </div>
        </div>
      )}

      {showDraftPanel && (
        <div className="card-elevated neon-border p-6 bg-muted/5 animate-fade-in border-neon-blue/30 shadow-[0_0_15px_rgba(0,191,255,0.1)]">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-neon-blue">Adicionar / Sortear Jogador</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1 font-medium">Atleta</label>
              <input type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nome" className={inputModernCSS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-medium">Posição</label>
              <select value={draftPos} onChange={(e) => setDraftPos(e.target.value)} className={`${inputModernCSS} cursor-pointer appearance-none`}>
                <option value="GL">GL</option><option value="ZG">ZG</option><option value="LE">LE</option><option value="LD">LD</option><option value="VOL">VOL</option><option value="MC">MC</option><option value="MA">MA</option><option value="PE">PE</option><option value="PD">PD</option><option value="CA">CA</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-medium">OVR</label>
              <input type="number" value={draftOvr} onChange={(e) => setDraftOvr(e.target.value)} className={`${inputModernCSS} [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
            <div className="col-span-2 md:col-span-3">
               <label className="text-xs text-muted-foreground block mb-1 font-medium">Destino</label>
               <select value={draftDestination} onChange={(e) => setDraftDestination(e.target.value)} className={`${inputModernCSS} cursor-pointer appearance-none border-primary/30`}>
                  <option value="RANDOM">🎲 Sortear Aleatoriamente</option>
                  <optgroup label="Contrato Direto">
                    {teams.filter(t => t.team_player !== "Sem Time").map(t => (
                      <option key={t.id} value={t.id}>{t.team_player} ({t.name_player})</option>
                    ))}
                  </optgroup>
               </select>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end">
              <button onClick={handleDraftAthlete} disabled={isDrafting} className="w-full bg-neon-blue text-primary-foreground py-2.5 rounded-lg font-display font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all neon-glow flex justify-center items-center gap-2">
                {isDrafting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Cadastre técnicos na tela de Jogadores primeiro.</div>
      ) : (
        <div className="grid items-start grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teams.map((team, i) => (
            <TeamCard 
              key={team.id} 
              team={team} 
              index={i} 
              onRemoveAthlete={handleRemoveAthlete} 
              onClearTeam={handleClearTeam}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;