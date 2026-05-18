import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; 
import { X as CloseIcon, Trophy, Edit, Trash2, Loader2 } from "lucide-react";
import { ApiPlayer } from "@/pages/Players";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api"; 

// Removemos totalmente o import do AlertDialog daqui para evitar o travamento de tela

interface PlayerModalProps {
  player: ApiPlayer;
  onClose: () => void;
  onRefresh: () => void;
}

interface CupHistoryData {
  cupName: string;
  position: number;
  team: string;
}

const PREDEFINED_COLORS = [
  "#FFFFFF", "#D1D5DB", "#1F2937", "#000000", "#DC2626", "#EA580C", "#D97706", "#CA8A04", "#65A30D", "#16A34A",
  "#059669", "#0D9488", "#0891B2", "#0284C7", "#2563EB", "#4F46E5", "#7C3AED", "#9333EA", "#C026D3", "#DB2777"
];

export function PlayerModal({ player, onClose, onRefresh }: PlayerModalProps) {
  const [history, setHistory] = useState<CupHistoryData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isVisible, setIsVisible] = useState(false); 
  const [isClosing, setIsClosing] = useState(false); 
  
  // Novo estado para substituir o AlertDialog por uma confirmação customizada livre de bugs
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  
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
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300); 
  };

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

  // Desativação limpa e direta
  const handleDeactivate = async () => {
    try {
      const response = await fetch(`${API_URL}/TEAMS/DESATIVAR/${player.id}`, { method: "PUT" });
      if (!response.ok) throw new Error("Falha ao desativar");
      toast({ title: "Desativado", description: "O jogador foi para o histórico." });
      handleClose();
      onRefresh();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível desativar.", variant: "destructive" });
    }
  };

  const getOvrColor = (ovr: number) => {
    if (ovr < 60) return "text-red-500";
    if (ovr < 70) return "text-orange-500";
    if (ovr < 80) return "text-yellow-500";
    if (ovr < 90) return "text-green-500";
    return "text-blue-500"; 
  };

  const sgHistorico = player.all_time_goals - player.all_time_goals_conceded;
  const isAtivo = player.team_player !== 'INATIVO';

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300 ease-out ${isVisible && !isClosing ? "bg-black/60 opacity-100" : "bg-black/0 opacity-0"}`}>
      
      {/* Container Principal */}
      <div className={`bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border/50 flex flex-col max-h-[90vh] relative transition-all duration-300 ease-out transform ${isVisible && !isClosing ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        
        {/* NOVA TELA DE CONFIRMAÇÃO DE DESATIVAÇÃO (Substitui o AlertDialog com 100% de segurança) */}
        {showConfirmDeactivate && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in px-4">
            <div className="bg-card border border-border/50 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">Desativar Jogador?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                O jogador <strong>{player.name_player}</strong> ficará inativo e não poderá ser selecionado para sorteios. O histórico dele será preservado.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <button 
                  onClick={() => setShowConfirmDeactivate(false)} 
                  className="px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeactivate} 
                  className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
                >
                  Desativar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CABEÇALHO */}
        <div className="relative h-auto min-h-[96px] bg-muted/30 border-b border-border/50 flex items-center px-6 py-4">
          
          <div 
             className="absolute top-1/2 -translate-y-1/2 left-6 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-card flex items-center justify-center font-display text-4xl font-bold text-black shadow-lg"
             style={{ backgroundColor: player.color || '#FFFFFF' }}
          >
             {player.name_player[0].toUpperCase()}
          </div>
          
          <div className="ml-24 md:ml-32 pr-10 flex-1 flex flex-col justify-center min-h-[80px]">
             
             <div className="flex items-center justify-between w-full pr-8 mb-0.5">
   
                {/* PASSO 1: Criamos uma caixa vertical (flex flex-col) para agrupar o lado esquerdo */}
                <div className="flex flex-col justify-center">
                  
                  {/* Esta é a linha horizontal original do Nome + Medalhas */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      {player.name_player}
                    </h2>
                    <div className="flex gap-1 mt-1">
                      {player.ouro > 0 && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-md border border-neon-yellow/30 text-neon-yellow shadow-sm">🥇 {player.ouro}</span>}
                      {player.prata > 0 && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-md border border-gray-400/30 text-gray-300 shadow-sm">🥈 {player.prata}</span>}
                      {player.bronze > 0 && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-md border border-amber-600/30 text-amber-500 shadow-sm">🥉 {player.bronze}</span>}
                    </div>
                  </div>
                  
                  {/* PASSO 2: Movemos o seu parágrafo para cá! */}
                  {/* Como ele está fora da linha do nome, mas dentro da coluna esquerda, ele quebra para baixo automaticamente */}
                  <p className="text-sm text-muted-foreground mt-1">{player.team_player} • {player.formation}</p>
                  
                </div>

                {/* O bloco da direita (OVR + Status) continua igual, fazendo o contraponto visual */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <span className={`font-display text-3xl md:text-4xl font-black leading-none tracking-tighter ${getOvrColor(player.ovr)}`}>
                    {player.ovr}
                  </span>
                  {isAtivo ? (
                    <span className="text-[9px] mt-1 text-[#00BFFF] border border-[#00BFFF]/50 bg-[#00BFFF]/10 px-1.5 py-0.5 rounded-sm tracking-widest font-black uppercase shadow-sm">ATIVO</span>
                  ) : (
                    <span className="text-[9px] mt-1 text-[#FF003F] border border-[#FF003F]/50 bg-[#FF003F]/10 px-1.5 py-0.5 rounded-sm tracking-widest font-black uppercase shadow-sm">INATIVO</span>
                  )}
                </div>
              </div>
        
          </div>

          <button onClick={handleClose} className="absolute top-4 right-4 p-2 bg-background/50 hover:bg-secondary hover:text-white rounded-full transition-colors">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          
          {isEditing ? (
            <div className="bg-muted/10 p-4 rounded-xl border border-border/50 space-y-4 animate-fade-in">
              <h3 className="font-display font-bold text-primary flex items-center gap-2"><Edit className="h-4 w-4"/> Editar Informações</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Nome</label>
                   <input type="text" value={editForm.name_player} onChange={(e) => setEditForm({...editForm, name_player: e.target.value})} className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm focus:border-primary outline-none" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Equipe Base</label>
                   <input type="text" value={editForm.team_player} onChange={(e) => setEditForm({...editForm, team_player: e.target.value})} className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm focus:border-primary outline-none" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Formação</label>
                   <input type="text" value={editForm.formation} onChange={(e) => setEditForm({...editForm, formation: e.target.value})} className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm focus:border-primary outline-none" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">OVR</label>
                   <input type="number" value={editForm.ovr} onChange={(e) => setEditForm({...editForm, ovr: Number(e.target.value)})} className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm focus:border-primary outline-none" />
                 </div>

                 <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Cor do Perfil</label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button" 
                          onClick={() => setEditForm({...editForm, color: c})}
                          title={c} 
                          className={`w-8 h-8 shrink-0 cursor-pointer transition-all duration-200 border-2 
                            ${editForm.color === c 
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
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="w-32 flex items-center justify-center px-4 py-2 text-sm bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-lg font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  disabled={isSaving} 
                  className="w-32 flex items-center justify-center px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-bold transition-all gap-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
              <StatBox label="Jogos" value={player.all_time_matches} className="text-white" />
              <StatBox label="Vitórias" value={player.all_time_wins} className="text-white" />
              <StatBox label="Empates" value={player.all_time_draws} className="text-white" />
              <StatBox label="Derrotas" value={player.all_time_losses} className="text-white" />
              <StatBox label="Gols" value={player.all_time_goals} className="text-white" />
              <StatBox label="Saldo (SG)" value={sgHistorico} className="text-white" />
            </div>
          )}

          <div>
             <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
               <Trophy className="h-5 w-5 text-white" /> Histórico em Copas
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
          
          {/* Botão de Desativar agora abre a nossa confirmação customizada em vez do AlertDialog */}
          <button 
             onClick={() => setShowConfirmDeactivate(true)} 
             className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-500/10 rounded transition-colors"
          >
             <Trash2 className="h-3.5 w-3.5" /> Desativar Jogador
          </button>

          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-black flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-gray-200 rounded-lg transition-colors border-0 shadow-sm">
              <Edit className="h-3.5 w-3.5" /> Editar Perfil
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

function StatBox({ label, value, className = "" }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/30">
      <div className={`font-display text-2xl font-bold ${className || "text-foreground"}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function HistoryRow({ history }: { history: CupHistoryData }) {
  const getTierStyle = (pos: number) => {
    if (pos === 1) return "text-neon-yellow drop-shadow-[0_0_4px_rgba(250,204,21,0.3)]";
    if (pos === 2) return "text-gray-300 drop-shadow-[0_0_4px_rgba(209,213,219,0.3)]";
    if (pos === 3) return "text-amber-600 drop-shadow-[0_0_4px_rgba(217,119,6,0.3)]";
    return "text-foreground";
  };

  const tierClass = getTierStyle(history.position);

  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        <Trophy className={`h-4 w-4 ${tierClass}`} />
        <div>
          <p className={`text-sm font-medium ${tierClass}`}>{history.cupName}</p>
          <p className="text-xs text-muted-foreground">{history.team}</p>
        </div>
      </div>
      <div className={`font-display font-bold text-lg ${tierClass}`}>
        {history.position}º
      </div>
    </div>
  );
}