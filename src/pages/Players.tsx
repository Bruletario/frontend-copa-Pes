import { useState, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerModal } from "@/components/PlayerModal";
import { Plus, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ApiPlayer {
  id: number | string;
  name_player: string;
  team_player: string;
  color: string;
  ovr: number;
  formation: string;
  points: number;
  goals_score: number;
  goals_conceded: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
}

const Players = () => {
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<ApiPlayer | null>(null);
  
  // Estados do formulário
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [color, setColor] = useState("#39FF14");
  const [ovr, setOvr] = useState<number | string>(75);
  const [formation, setFormation] = useState("4-4-2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const fetchPlayers = async () => {
    try {
      const response = await fetch("http://localhost:3000/TEAMS");
      if (!response.ok) throw new Error("Erro ao buscar jogadores");
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar os jogadores.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleRegister = async () => {
    if (!name.trim()) {
      toast({ title: "Atenção", description: "O nome do jogador é obrigatório!", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    // Se o time estiver vazio, define como "Sem Time"
    const finalTeam = team.trim() === "" ? "Sem Time" : team;

    try {
      const response = await fetch("http://localhost:3000/TEAMS", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_player: name,
          team_player: finalTeam,
          color: color,
          ovr: Number(ovr),
          formation: formation,
          squad: [] // Garante compatibilidade com a Tela 2
        }),
      });

      if (!response.ok) throw new Error("Erro ao cadastrar");

      toast({ title: "Sucesso!", description: "Jogador cadastrado com sucesso." });

      // Limpa formulário e recarrega a lista
      setName("");
      setTeam("");
      setColor("#39FF14");
      setOvr(75);
      setFormation("4-4-2");
      setShowForm(false);
      fetchPlayers();

    } catch (error) {
      toast({ title: "Erro", description: "Falha ao registrar o jogador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSS moderno reutilizável para inputs
  const inputModernCSS = "w-full bg-background/50 border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="page-header">Jogadores</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-display font-semibold text-sm hover:opacity-90 transition-opacity neon-glow"
        >
          <Plus className="h-4 w-4" />
          Novo Jogador
        </button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <div className="card-elevated neon-border p-6 animate-fade-in bg-muted/5">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-primary">
            Cadastrar Jogador
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bruno" className={inputModernCSS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Time (Opcional)</label>
              <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Deixe vazio para 'Sem Time'" className={inputModernCSS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Cor do Perfil</label>
              <div className="flex items-center gap-3 h-[38px] px-2 bg-background/50 border border-border/50 rounded-lg">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-sm text-muted-foreground font-mono">{color}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Formação</label>
              <input type="text" value={formation} onChange={(e) => setFormation(e.target.value)} placeholder="Ex: 4-3-3" className={inputModernCSS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">OVR Base</label>
              <input type="number" value={ovr} onChange={(e) => setOvr(e.target.value)} className={`${inputModernCSS} [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-lg font-display text-sm bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleRegister}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-8 py-2 rounded-lg font-display font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 neon-glow"
            >
              {isSubmitting ? "Cadastrando..." : "Cadastrar"}
            </button>
          </div>
        </div>
      )}

      {/* Players Grid / Loading */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Nenhum jogador cadastrado. Adicione o primeiro!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map((player, i) => (
            <PlayerCard key={player.id} player={player} index={i} onClick={() => setSelectedPlayer(player)} />
          ))}
        </div>
      )}

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} onRefresh={fetchPlayers} />
      )}
    </div>
  );
};

export default Players;