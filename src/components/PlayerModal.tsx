import { useState, useEffect } from "react";
import { X, Trophy, Target, Swords, Loader2, Edit, Trash2 } from "lucide-react";
import { ApiPlayer } from "@/pages/Players";
import { useToast } from "@/hooks/use-toast";

interface PlayerModalProps {
  player: ApiPlayer;
  onClose: () => void;
  onRefresh: () => void;
}

interface CupHistoryData {
  cupName: string;
  position: number;
  team: string;
  matches: number;
  goals: number;
}

export function PlayerModal({ player, onClose, onRefresh }: PlayerModalProps) {
  const [history, setHistory] = useState<CupHistoryData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name_player: player.name_player,
    team_player: player.team_player,
    color: player.color,
    ovr: player.ovr,
    formation: player.formation
  });
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("http://localhost:3000/COPAS");
        if (!response.ok) return;
        
        const copas = await response.json();
        const playerHistory: CupHistoryData[] = [];

        copas.forEach((copa: any) => {
          if (copa.classificacao_final) {
            const positionIndex = copa.classificacao_final.findIndex(
              (p: any) => p.name_player === player.name_player
            );
            if (positionIndex !== -1) {
              const playerData = copa.classificacao_final[positionIndex];
              playerHistory.push({ cupName: copa.nome_copa, position: positionIndex + 1, team: playerData.team_player, matches: playerData.matches_played, goals: playerData.goals_score });
            }
          }
        });
        
        setHistory(playerHistory);
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [player.name_player]);

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este jogador? Isso não pode ser desfeito.")) return;

    try {
      const response = await fetch(`http://localhost:3000/TEAMS/${player.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao excluir");

      toast({ title: "Excluído", description: "Jogador removido com sucesso." });
      onRefresh();
      onClose();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir o jogador.", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:3000/TEAMS/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Erro ao atualizar");

      toast({ title: "Atualizado!", description: "Informações salvas com sucesso." });
      onRefresh();
      setIsEditing(false);
      
      player.name_player = editForm.name_player;
      player.team_player = editForm.team_player;
      player.color = editForm.color;
      player.ovr = Number(editForm.ovr);
      player.formation = editForm.formation;

    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar o jogador.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const inputModernCSS = "w-full bg-background/50 border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card-elevated neon-border w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl font-bold text-primary-foreground shadow-lg" style={{ backgroundColor: isEditing ? editForm.color : player.color }}>
              {(isEditing ? editForm.name_player[0] : player.name_player[0])?.toUpperCase() || "?"}
            </div>
            
            {!isEditing && (
              <div>
                <h2 className="font-display text-2xl font-bold">{player.name_player}</h2>
                <p className="text-muted-foreground flex items-center gap-2">
                  {player.team_player} <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{player.formation}</span>
                  <span className="text-xs font-bold text-primary">OVR {player.ovr}</span>
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-2 hover:text-primary hover:bg-secondary rounded-lg transition-colors"><Edit className="h-5 w-5" /></button>
                <button onClick={handleDelete} className="p-2 hover:text-red-500 hover:bg-secondary rounded-lg transition-colors"><Trash2 className="h-5 w-5" /></button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors ml-2"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4 mb-6 bg-muted/10 p-5 rounded-lg border border-border/50">
            <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Editar Informações</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">Nome</label>
                <input type="text" value={editForm.name_player} onChange={(e) => setEditForm({...editForm, name_player: e.target.value})} className={inputModernCSS} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">Time</label>
                <input type="text" value={editForm.team_player} onChange={(e) => setEditForm({...editForm, team_player: e.target.value})} className={inputModernCSS} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">Formação</label>
                <input type="text" value={editForm.formation} onChange={(e) => setEditForm({...editForm, formation: e.target.value})} className={inputModernCSS} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">OVR Base</label>
                <input type="number" value={editForm.ovr} onChange={(e) => setEditForm({...editForm, ovr: Number(e.target.value)})} className={`${inputModernCSS} [&::-webkit-inner-spin-button]:appearance-none`} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="text-xs text-muted-foreground font-medium">Cor</label>
                <input type="color" value={editForm.color} onChange={(e) => setEditForm({...editForm, color: e.target.value})} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-sm bg-secondary rounded-lg hover:bg-secondary/80 font-medium">Cancelar</button>
              <button onClick={handleUpdate} disabled={isSaving} className="px-5 py-2 text-sm bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90">{isSaving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <StatBox label="Jogos" value={player.matches_played} />
              <StatBox label="Vitórias" value={player.wins} className="text-win" />
              <StatBox label="Gols" value={player.goals_score} className="text-primary" />
              <StatBox label="Pontos" value={player.points} className="text-neon-blue" />
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Histórico de Copas</h3>
              {isLoadingHistory ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((h, i) => <HistoryRow key={i} history={h} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">Primeira participação na Copa PES</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className={`font-display text-2xl font-bold ${className}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function HistoryRow({ history }: { history: CupHistoryData }) {
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        <Trophy className={`h-4 w-4 ${history.position === 1 ? "text-neon-yellow drop-shadow-md" : history.position === 2 ? "text-gray-300" : history.position === 3 ? "text-amber-600" : "text-muted-foreground"}`} />
        <div>
          <p className="text-sm font-medium">{history.cupName}</p>
          <p className="text-xs text-muted-foreground">{history.team}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1" title="Jogos"><Swords className="h-3 w-3" /> {history.matches}</span>
        <span className="flex items-center gap-1" title="Gols"><Target className="h-3 w-3" /> {history.goals}</span>
        <span className={`stat-badge ${history.position === 1 ? 'border-neon-yellow/50 text-neon-yellow' : ''}`}>#{history.position}</span>
      </div>
    </div>
  );
}