import { useState, useEffect } from "react";
import { TeamCard } from "@/components/TeamCard";
import { Shield, Shuffle, Loader2, Users, Target, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  
  const [showDrawPanel, setShowDrawPanel] = useState(false);
  const [showDraftPanel, setShowDraftPanel] = useState(false);
  
  const [isDrawingTeams, setIsDrawingTeams] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [teamList, setTeamList] = useState<string[]>([]);

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPos, setDraftPos] = useState("CA");
  const [draftOvr, setDraftOvr] = useState<number | string>(80);
  const [draftDestination, setDraftDestination] = useState<string>("RANDOM");

  const [teamToClear, setTeamToClear] = useState<number | string | null>(null);

  const { toast } = useToast();

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/TEAMS`);
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
      toast({ title: "Aviso", description: `Você tem ${playersWithoutTeam.length} técnicos no sorteio, mas adicionou apenas ${teamList.length} times. Adicione mais opções.`, variant: "destructive" });
      return;
    }

    setIsDrawingTeams(true);
    try {
      const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);
      const updatePromises = playersWithoutTeam.map((player, index) => {
        return fetch(`${API_URL}/TEAMS/${player.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_player: shuffledTeams[index] }),
        });
      });

      await Promise.all(updatePromises);
      toast({ title: "Sorteio Realizado!", description: "Os times foram definidos." });
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
      toast({ title: "Atenção", description: "Adicione o jogador ou garanta que existam times.", variant: "destructive" });
      return;
    }

    // 👇 VALIDAÇÃO DO OVR ADICIONADA AQUI 👇
    const ovrValue = Number(draftOvr);
    if (ovrValue < 1 || ovrValue > 100) {
      toast({ title: "Atenção", description: "O Overall deve estar entre 1 e 100.", variant: "destructive" });
      return;
    }

    setIsDrafting(true);
    try {
      const response = await fetch(`${API_URL}/TEAMS/DRAFT`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          position: draftPos,
          ovr: ovrValue,
          destination: draftDestination
        }),
      });

      if (!response.ok) throw new Error("Erro ao salvar jogador");

      const respostaJson = await response.json();

      toast({ 
        title: draftDestination === "RANDOM" ? "Sorteado" : "Contratado", 
        description: `${respostaJson.atleta.name} foi para o time de ${respostaJson.time.name_player}.`,
        className: "bg-white text-black border-white"
      });
      
      setDraftName("");
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao processar o jogador.", variant: "destructive" });
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
      await fetch(`${API_URL}/TEAMS/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad: newSquad, ovr: newTeamOvr }),
      });
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover.", variant: "destructive" });
    }
  };

  const handleClearTeam = (teamId: number | string) => {
    setTeamToClear(teamId);
  };

  const confirmClearTeam = async () => {
    if (!teamToClear) return;
    try {
      await fetch(`${API_URL}/TEAMS/${teamToClear}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_player: "Sem Time", squad: [], ovr: 75 }),
      });
      toast({ title: "Sucesso", description: "Time excluido com sucesso." });
      fetchTeams();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir Time.", variant: "destructive" });
    } finally {
      setTeamToClear(null);
    }
  };

  const inputWhiteCSS = "w-full h-[44px] bg-background border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-white/30 focus:border-white outline-none transition-all placeholder:text-muted-foreground/50";
  
  const selectTriggerClass = "w-full bg-background border border-border/50 rounded-lg h-[44px] hover:border-white/50 focus:ring-2 focus:ring-white/30 focus:ring-offset-0 text-left px-4 flex items-center justify-between font-normal text-sm transition-all";

  const baseToggleBtn = "px-4 py-2 rounded-lg font-display font-semibold text-sm transition-all flex items-center gap-2 border w-full sm:w-auto justify-center";
  const activeToggleBtn = "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]";
  const inactiveToggleBtn = "bg-transparent text-white border-white/40 hover:border-white hover:bg-white/5 opacity-80 hover:opacity-100";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="page-header">Gerenciar Elencos</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => { setShowDrawPanel(!showDrawPanel); setShowDraftPanel(false); }} 
            className={`${baseToggleBtn} ${showDrawPanel ? activeToggleBtn : inactiveToggleBtn}`}
          >
            <Users className="h-4 w-4" /> Sorteio
          </button>
          <button 
            onClick={() => { setShowDraftPanel(!showDraftPanel); setShowDrawPanel(false); }} 
            className={`${baseToggleBtn} ${showDraftPanel ? activeToggleBtn : inactiveToggleBtn}`}
          >
            <Target className="h-4 w-4" /> Draft
          </button>
        </div>
      </div>

      {showDrawPanel && (
        <div className="card-elevated p-6 bg-muted/5 animate-fade-in border-0 shadow-sm">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            Sorteio
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Você tem <strong>{playersWithoutTeam.length} técnico(s)</strong> na fila. Adicione opções de times para sortear.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs text-muted-foreground self-center">Na Fila:</span> 
              {playersWithoutTeam.map((p, i) => <span key={i} className="text-xs bg-white/10 text-white px-2 py-1 rounded-md font-medium">{p.name_player}</span>)}
              {playersWithoutTeam.length === 0 && <span className="text-xs text-muted-foreground">Ninguém na fila.</span>}
            </div>

            <div className="flex gap-2">
              <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTeamToList()} placeholder="Digite o time e aperte Enter" className={inputWhiteCSS} disabled={playersWithoutTeam.length === 0} />
              <button onClick={handleAddTeamToList} disabled={playersWithoutTeam.length === 0} className="bg-white text-black px-4 rounded-lg font-bold disabled:opacity-50 hover:bg-gray-200 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.3)] h-[44px]">+</button>
            </div>
            
             {teamList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">Para sortear({teamList.length}):</span> 
                {teamList.map((t, i) => (
                  <span key={i} className="group flex items-center gap-1 text-xs bg-muted border border-border pl-2 pr-1 py-1 rounded-md transition-colors hover:border-red-500/50">
                    {t}
                    <button onClick={() => removeTeamFromList(t)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}

            <button onClick={handleDrawTeams} disabled={isDrawingTeams || playersWithoutTeam.length === 0 || teamList.length < playersWithoutTeam.length} className="w-full mt-4 bg-white text-black py-2.5 h-[44px] rounded-lg font-display font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)] flex justify-center items-center gap-2">
              {isDrawingTeams ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shuffle className="h-5 w-5" />}
              Distribuir times Aleatoriamente
            </button>
          </div>
        </div>
      )}

      {showDraftPanel && (
        <div className="card-elevated p-6 bg-muted/5 animate-fade-in border-0 shadow-none">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            Adicionar ou Sortear
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1 font-medium">Jogador</label>
              <input type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nome do jogador" className={inputWhiteCSS} />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-medium">Posição</label>
              <Select value={draftPos} onValueChange={setDraftPos}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GL">GL</SelectItem>
                  <SelectItem value="ZG">ZG</SelectItem>
                  <SelectItem value="LE">LE</SelectItem>
                  <SelectItem value="LD">LD</SelectItem>
                  <SelectItem value="VOL">VOL</SelectItem>
                  <SelectItem value="MC">MC</SelectItem>
                  <SelectItem value="MA">MA</SelectItem>
                  <SelectItem value="PE">PE</SelectItem>
                  <SelectItem value="PD">PD</SelectItem>
                  <SelectItem value="CA">CA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-medium">Overall</label>
              {/* 👇 ADICIONADO MIN E MAX NO INPUT HTML AQUI 👇 */}
              <input type="number" min="1" max="100" value={draftOvr} onChange={(e) => setDraftOvr(e.target.value)} className={`${inputWhiteCSS} [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
            
            <div className="col-span-2 md:col-span-3">
               <label className="text-xs text-muted-foreground block mb-1 font-medium">Time</label>
               <Select value={draftDestination} onValueChange={setDraftDestination}>
                 <SelectTrigger className={selectTriggerClass}>
                   <SelectValue placeholder="Selecione o Destino" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="RANDOM">Sortear</SelectItem>
                   <SelectGroup>
                     <SelectLabel className="text-xs text-muted-foreground px-2 py-1 font-semibold uppercase">Adicionar a um time</SelectLabel>
                     {teams.filter(t => t.team_player !== "Sem Time").map(t => (
                       <SelectItem key={t.id} value={String(t.id)}>{t.team_player} ({t.name_player})</SelectItem>
                     ))}
                   </SelectGroup>
                 </SelectContent>
               </Select>
            </div>
            
            <div className="col-span-2 md:col-span-1 flex items-end">
              <button onClick={handleDraftAthlete} disabled={isDrafting} className="w-full bg-white text-black h-[44px] rounded-lg font-display font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)] flex justify-center items-center gap-2">
                {isDrafting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Você precisa adicionar mais técnicos.</div>
      ) : (
        <>
          <div className="block space-y-4 md:hidden">
            {teams.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} onRemoveAthlete={handleRemoveAthlete} onClearTeam={handleClearTeam} />
            ))}
          </div>

          <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 items-start">
            {[0, 1].map(colIdx => (
              <div key={colIdx} className="flex flex-col gap-4">
                {teams.filter((_, i) => i % 2 === colIdx).map((team, i) => (
                  <TeamCard key={team.id} team={team} index={i} onRemoveAthlete={handleRemoveAthlete} onClearTeam={handleClearTeam} />
                ))}
              </div>
            ))}
          </div>

          <div className="hidden lg:grid xl:hidden grid-cols-3 gap-4 items-start">
            {[0, 1, 2].map(colIdx => (
              <div key={colIdx} className="flex flex-col gap-4">
                {teams.filter((_, i) => i % 3 === colIdx).map((team, i) => (
                  <TeamCard key={team.id} team={team} index={i} onRemoveAthlete={handleRemoveAthlete} onClearTeam={handleClearTeam} />
                ))}
              </div>
            ))}
          </div>

          <div className="hidden xl:grid grid-cols-4 gap-4 items-start">
            {[0, 1, 2, 3].map(colIdx => (
              <div key={colIdx} className="flex flex-col gap-4">
                {teams.filter((_, i) => i % 4 === colIdx).map((team, i) => (
                  <TeamCard key={team.id} team={team} index={i} onRemoveAthlete={handleRemoveAthlete} onClearTeam={handleClearTeam} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!teamToClear} onOpenChange={(open) => !open && setTeamToClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir time?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir este time? O técnico ficará 'Sem Time' e todo o elenco atual será apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-red-600 text-white hover:bg-red-700 hover:text-white border-0">
              Não, cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearTeam} className="bg-white text-black hover:bg-gray-200">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Teams;