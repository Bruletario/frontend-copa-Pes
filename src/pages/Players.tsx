import { useState, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerModal } from "@/components/PlayerModal";
import { Plus, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

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
  ouro: number;
  prata: number;
  bronze: number;
  all_time_matches: number;
  all_time_goals: number;
  all_time_goals_conceded: number;
  all_time_wins: number;
  all_time_draws: number;
  all_time_losses: number;
}

const PREDEFINED_COLORS = [
  "#FFFFFF", "#D1D5DB", "#1F2937", "#000000", "#DC2626", "#EA580C", "#D97706", "#CA8A04", "#65A30D", "#16A34A",
  "#059669", "#0D9488", "#0891B2", "#0284C7", "#2563EB", "#4F46E5", "#7C3AED", "#9333EA", "#C026D3", "#DB2777"
];

const Players = () => {
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<ApiPlayer | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [color, setColor] = useState("#FFFFFF");
  const [ovr, setOvr] = useState<number | string>(75);
  const [formation, setFormation] = useState("4-4-2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API_URL}/PLAYERS/ALL-TIME`);
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
    const finalTeam = team.trim() === "" ? "Sem Time" : team;

    try {
      const response = await fetch(`${API_URL}/TEAMS`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_player: name,
          team_player: finalTeam,
          color: color,
          ovr: Number(ovr),
          formation: formation,
          squad: []
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.erro || "Erro ao cadastrar");
      }

      toast({ title: "Sucesso!", description: "O jogador foi cadastrado com sucesso.", className: "bg-white text-black border-white" });

      setName("");
      setTeam("");
      setColor("#FFFFFF");
      setOvr(75);
      setFormation("4-4-2");
      setShowForm(false);
      fetchPlayers();

    } catch (error: any) {
      toast({ title: "Atenção", description: error.message || "Falha ao registrar o jogador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Registration Form animado com transição de altura e opacidade */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showForm ? "max-h-[1000px] opacity-100 mb-6" : "max-h-0 opacity-0 m-0"}`}>
        <div className="card-elevated border border-border/50 bg-card p-6">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">
            Cadastrar Jogador
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bruno" className={inputModernCSS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Time</label>
              <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Deixe vazio para 'Sem Time'" className={inputModernCSS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Formação</label>
              <input type="text" value={formation} onChange={(e) => setFormation(e.target.value)} placeholder="Ex: 4-3-3" className={inputModernCSS} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1 font-medium">Overall</label>
              <input type="number" value={ovr} onChange={(e) => setOvr(e.target.value)} className={`${inputModernCSS} [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2 font-medium">Cor do Perfil</label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button" 
                    onClick={() => setColor(c)}
                    title={c} 
                    className={`w-8 h-8 shrink-0 cursor-pointer transition-all duration-200 border-2 
                      ${color === c 
                        ? 'border-primary scale-125 shadow-md z-10' 
                        : 'border-border/30 hover:scale-125 hover:-translate-y-1 hover:shadow-lg'
                      }
                    `}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            {/* Botão Cancelar agora com padrão vermelho para indicar ação de fechamento */}
            <button 
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-lg font-display font-bold text-sm bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleRegister}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-display font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? "Cadastrando..." : "Cadastrar"}
            </button>
          </div>
        </div>
      </div>

      {/* Players Grid / Loading */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Nenhum jogador ativo no momento.
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