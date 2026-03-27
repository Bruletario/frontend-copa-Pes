import { useState, useEffect } from "react";
import { X as CloseIcon, Trophy, Target, Swords, Loader2, Edit, Trash2 } from "lucide-react";
import { ApiPlayer } from "@/pages/Players";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api"; 

// 👇 IMPORTAÇÕES DO ALERT DIALOG
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PlayerModalProps {
  player: ApiPlayer;
  onClose: () => void;
  onRefresh: () => void;
}

// Interface revertida para o original
interface CupHistoryData {
  cupName: string;
  position: number;
  team: string;
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
        const response = await fetch(`${API_URL}/COPAS`);
        if (!response.ok) throw new Error("Erro");
        const data = await response.json();
        
        const playerHistory: CupHistoryData[] = [];
        data.forEach((cup: any) => {
          if (!cup.classificacao_final) return;
          const sorted = [...cup.classificacao_final].sort((a,b) => b.points - a.points);
          const index = sorted.findIndex(p => p.name_player === player.name_player);
          
          if (index !== -1) {
             const stat = sorted[index];
             let pos = index + 1;
             if (cup.campeao === stat.name_player) pos = 1;

             // Guardando apenas o original
             playerHistory.push({
               cupName: cup.nome_copa,
               position: pos,
               team: stat.team_player
             });
          }
        });
        setHistory(playerHistory);
      } catch (error) {
        console.error("Erro ao buscar histórico individual", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [player.name_player]);

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/TEAMS/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Falha ao editar");
      toast({ title: "Atualizado!", description: "Dados do jogador salvos." });
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível editar.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await fetch(`${API_URL}/TEAMS/DESATIVAR/${player.id}`, { method: "PUT" });
      if (!response.ok) throw new Error("Falha ao desativar");
      toast({ title: "Desativado", description: "O jogador foi para o histórico." });
      onClose();
      onRefresh();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível desativar.", variant: "destructive" });
    }
  };

  const sgHistorico = player.all_time_goals - player.all_time_goals_conceded;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border/50 flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="relative h-24 bg-muted/30 border-b border-border/50 flex items-center px-6">
          <div 
             className="absolute -bottom-10 left-6 w-24 h-24 rounded-full border-4 border-card flex items-center justify-center font-display text-4xl font-bold text-black shadow-lg"
             style={{ backgroundColor: player.color || '#FFFFFF' }}
          >
             {player.name_player[0].toUpperCase()}
          </div>
          <div className="ml-28 pt-2">
             <h2 className="font-display text-2xl font-bold text-foreground">{player.name_player}</h2>
             <p className="text-sm text-muted-foreground">{player.team_player}</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-background/50 hover:bg-secondary rounded-full transition-colors">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 pt-14 space-y-8 custom-scrollbar">
          
          {isEditing ? (
            <div className="bg-muted/10 p-4 rounded-xl border border-border/50 space-y-4">
              <h3 className="font-display font-bold text-primary flex items-center gap-2"><Edit className="h-4 w-4"/> Editar Informações</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Nome</label>
                   <input type="text" value={editForm.name_player} onChange={(e) => setEditForm({...editForm, name_player: e.target.value})} className="w-full bg-background border border-border rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Equipe Base</label>
                   <input type="text" value={editForm.team_player} onChange={(e) => setEditForm({...editForm, team_player: e.target.value})} className="w-full bg-background border border-border rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">OVR</label>
                   <input type="number" value={editForm.ovr} onChange={(e) => setEditForm({...editForm, ovr: Number(e.target.value)})} className="w-full bg-background border border-border rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Cor</label>
                   <input type="color" value={editForm.color} onChange={(e) => setEditForm({...editForm, color: e.target.value})} className="w-full h-[38px] bg-background border border-border rounded p-1 cursor-pointer" />
                 </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm bg-secondary rounded-lg font-bold">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-bold flex items-center gap-2">
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 👇 Todas as estatísticas agora usam o text-neon-blue como destaque 👇 */}
              <StatBox label="Jogos" value={player.all_time_matches} className="text-neon-blue" />
              <StatBox label="Gols" value={player.all_time_goals} className="text-neon-blue" />
              <StatBox label="Vitórias" value={player.all_time_wins} className="text-neon-blue" />
              <StatBox label="Empates" value={player.all_time_draws} className="text-neon-blue" />
              <StatBox label="Derrotas" value={player.all_time_losses} className="text-neon-blue" />
              <StatBox label="Saldo (SG)" value={sgHistorico} className="text-neon-blue" />
            </div>
          )}

          <div>
             <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
               <Trophy className="h-5 w-5 text-neon-yellow" /> Histórico em Copas
             </h3>
             
             {isLoadingHistory ? (
               <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : history.length === 0 ? (
               <p className="text-sm text-muted-foreground bg-muted/20 p-4 rounded-lg border border-dashed border-border/50 text-center">Nenhuma participação em copas finalizadas.</p>
             ) : (
               <div className="space-y-2">
                 {history.map((h, i) => (
                   <HistoryRow key={i} history={h} />
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-between items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
               <button className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-500/10 rounded transition-colors">
                 <Trash2 className="h-3.5 w-3.5" /> Desativar Jogador
               </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar Lenda?</AlertDialogTitle>
                <AlertDialogDescription>
                  O jogador <strong>{player.name_player}</strong> ficará inativo e não poderá ser selecionado para sorteios. O histórico dele será preservado na página de Copas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-0 hover:bg-secondary">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 text-white hover:bg-red-700">Sim, Desativar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors border border-primary/20">
              <Edit className="h-3.5 w-3.5" /> Editar Perfil
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

function StatBox({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/30">
      <div className={`font-display text-2xl font-bold ${className}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Componente revertido para o original limpo e direto
function HistoryRow({ history }: { history: CupHistoryData }) {
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        <Trophy className={`h-4 w-4 ${history.position === 1 ? "text-neon-yellow drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : history.position === 2 ? "text-gray-300" : history.position === 3 ? "text-amber-600" : "text-muted-foreground"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">{history.cupName}</p>
          <p className="text-xs text-muted-foreground">{history.team}</p>
        </div>
      </div>
      <div className="font-display font-bold text-muted-foreground text-lg">
        {history.position}º
      </div>
    </div>
  );
}