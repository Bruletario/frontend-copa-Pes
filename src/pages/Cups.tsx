import { useState, useEffect, useRef } from "react";
import { Trophy, Crown, Download, Upload, ChevronDown, ChevronUp, Medal, Loader2, Shield, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { API_URL } from "@/lib/api";

interface CupHistoryData {
  id: number;
  nome_copa: string;
  campeao: string;
  classificacao_final: any[];
}

const Cups = () => {
  const [cups, setCups] = useState<CupHistoryData[]>([]);
  const [expandedCup, setExpandedCup] = useState<number | null>(null);
  const [showGeneral, setShowGeneral] = useState(true); // Controle da sanfona geral
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const fetchCups = async () => {
    try {
      const response = await fetch(`${API_URL}/COPAS`);
      if (!response.ok) throw new Error("Erro");
      const data = await response.json();
      setCups(data.reverse());
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar o histórico.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCups();
  }, []);

  const toggleExpand = (cupId: number) => {
    setExpandedCup((prev) => (prev === cupId ? null : cupId));
  };

  // --- Ações Globais ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("arquivo", file);

    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/COPAS/IMPORTAR`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("Erro na importação");
      toast({ title: "Sucesso!", description: "Histórico importado com sucesso." });
      fetchCups();
    } catch (error) {
      toast({ title: "Erro", description: "Verifique as colunas do seu Excel.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportGlobal = () => {
    window.open(`${API_URL}/COPAS/EXPORTAR`, "_blank");
    toast({ title: "Download Iniciado", description: "Sua planilha geral está sendo baixada." });
  };

  // --- Ações Individuais (Por Copa) ---
  const handleDeleteCup = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja APAGAR a ${nome} do histórico? Isso não pode ser desfeito.`)) return;
    try {
      await fetch(`${API_URL}/COPAS/${id}`, { method: "DELETE" });
      toast({ title: "Excluída", description: "Copa removida do histórico." });
      fetchCups();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir a copa.", variant: "destructive" });
    }
  };

const handleExportSingleCup = (cup: CupHistoryData) => {
  const sorted = [...(cup.classificacao_final || [])].sort((a, b) => b.points - a.points);

  const linhasExcel = sorted.map(s => ({
    nome_copa: cup.nome_copa,
    campeao: cup.campeao,
    name_player: s.name_player,
    team_player: s.team_player,
    points: s.points || 0,
    wins: s.wins || 0,
    draws: s.draws || 0,
    losses: s.losses || 0,
    goals_score: s.goals_score || 0,
    goals_conceded: s.goals_conceded || 0
  }));

  // cria planilha
  const worksheet = XLSX.utils.json_to_sheet(linhasExcel);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historico");

  // gera arquivo
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${cup.nome_copa.replace(/\s+/g, "_")}.xlsx`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  // --- Lógica da Tabelona Geral Histórica ---
  const generateHistoricalStandings = () => {
    const map = new Map<string, any>();

    cups.forEach(cup => {
      // Ordena a classificação daquela copa para saber quem foi 1º, 2º e 3º
      const sortedCup = [...(cup.classificacao_final || [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.goals_score - b.goals_conceded) - (a.goals_score - a.goals_conceded);
      });

      sortedCup.forEach((stat, index) => {
        if (!map.has(stat.name_player)) {
          map.set(stat.name_player, { 
            name_player: stat.name_player, color: stat.color, copas_jogadas: 0, 
            titulos: 0, vices: 0, terceiros: 0,
            points: 0, matches_played: 0, wins: 0, draws: 0, losses: 0, goals_score: 0, goals_conceded: 0
          });
        }
        
        const curr = map.get(stat.name_player);
        curr.points += stat.points;
        curr.matches_played += stat.matches_played;
        curr.wins += stat.wins;
        curr.draws += stat.draws;
        curr.losses += stat.losses;
        curr.goals_score += stat.goals_score;
        curr.goals_conceded += stat.goals_conceded;
        curr.copas_jogadas += 1;
        
        // Atribui as medalhas
        if (cup.campeao === stat.name_player || index === 0) curr.titulos += 1;
        else if (index === 1) curr.vices += 1;
        else if (index === 2) curr.terceiros += 1;
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.titulos !== a.titulos) return b.titulos - a.titulos; // Desempate 1: Mais títulos
      if (b.points !== a.points) return b.points - a.points;     // Desempate 2: Mais pontos
      return (b.goals_score - b.goals_conceded) - (a.goals_score - a.goals_conceded);
    });
  };

  const historicalData = generateHistoricalStandings();

  return (
    <div className="space-y-8">
      {/* Header Original */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="page-header">Copas & Histórico</h1>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-display font-semibold text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar
          </button>
          <button onClick={handleExportGlobal} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-display font-semibold text-sm hover:opacity-90 transition-opacity neon-glow">
            <Download className="h-4 w-4" /> Exportar Tudo
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* TABELONA GERAL (Sanfona) */}
          <div className="card-elevated p-0 overflow-hidden border border-border/50">
            <button onClick={() => setShowGeneral(!showGeneral)} className="w-full bg-muted/20 px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-neon-yellow" />
                <h3 className="font-display text-xl font-bold text-foreground">Classificação Geral de Todos os Tempos</h3>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showGeneral ? "rotate-180" : ""}`} />
            </button>
            
            <div className={`transition-all duration-500 ease-in-out ${showGeneral ? "max-h-[5000px] opacity-100 border-t border-border/50" : "max-h-0 opacity-0"}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-background/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-2">Lenda (Jogador)</th>
                      <th className="text-center py-3 px-2 text-neon-yellow" title="Títulos (1º Lugar)">🥇 1º</th>
                      <th className="text-center py-3 px-2 text-gray-400" title="Vices (2º Lugar)">🥈 2º</th>
                      <th className="text-center py-3 px-2 text-amber-600" title="Terceiros (3º Lugar)">🥉 3º</th>
                      <th className="text-center py-3 px-2 border-l border-border/30">J</th>
                      <th className="text-center py-3 px-2">V</th>
                      <th className="text-center py-3 px-2">E</th>
                      <th className="text-center py-3 px-2">D</th>
                      <th className="text-center py-3 px-2">SG</th>
                      <th className="text-center py-3 px-4 text-primary font-bold">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.map((player, i) => {
                      const sg = player.goals_score - player.goals_conceded;
                      return (
                        <tr key={i} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-4 font-display font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-3 px-2 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-background shadow-sm" style={{ backgroundColor: player.color || '#39FF14' }}>
                              {player.name_player[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-base">{player.name_player}</span>
                          </td>
                          <td className="text-center py-3 px-2 font-black text-neon-yellow text-lg">{player.titulos}</td>
                          <td className="text-center py-3 px-2 font-bold text-gray-400">{player.vices}</td>
                          <td className="text-center py-3 px-2 font-bold text-amber-600">{player.terceiros}</td>
                          <td className="text-center py-3 px-2 border-l border-border/30">{player.matches_played}</td>
                          <td className="text-center py-3 px-2 text-win">{player.wins}</td>
                          <td className="text-center py-3 px-2 text-draw">{player.draws}</td>
                          <td className="text-center py-3 px-2 text-loss">{player.losses}</td>
                          <td className="text-center py-3 px-2 font-medium">{sg > 0 ? `+${sg}` : sg}</td>
                          <td className="text-center py-3 px-4 font-display text-lg font-bold text-primary bg-primary/5">{player.points}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className="border-border/30" />

          {/* LISTA DE COPAS INDIVIDUAIS */}
          <h3 className="font-display text-xl font-bold text-muted-foreground">Edições Anteriores</h3>

          <div className="space-y-4">
            {cups.map((cup) => {
              const isExpanded = expandedCup === cup.id;
              const standings = [...(cup.classificacao_final || [])].sort((a, b) => b.points - a.points);
              const championTeam = standings.find(s => s.name_player === cup.campeao)?.team_player || "Desconhecido";

              return (
                <div key={cup.id} className="card-elevated overflow-hidden border-border/50">
                  
                  {/* Cabeçalho da Copa */}
                  <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-secondary/10 transition-colors text-left gap-4 cursor-pointer" onClick={() => toggleExpand(cup.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground">{cup.nome_copa}</h3>
                        <p className="text-sm text-muted-foreground">Edição Finalizada</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 mr-2">
                        <Crown className="h-4 w-4 text-yellow-400" />
                        <span className="font-display font-bold text-sm">{cup.campeao}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">({championTeam})</span>
                      </div>
                      
                      {/* Botões de Ação Individuais (Param a propagação do clique para não fechar a sanfona) */}
                      <button onClick={(e) => { e.stopPropagation(); handleExportSingleCup(cup); }} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors" title="Exportar esta copa">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCup(cup.id, cup.nome_copa); }} className="p-2 bg-secondary rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Excluir copa">
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="ml-2">
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* Tabela Expandida da Copa */}
                  {isExpanded && (
                    <div className="border-t border-border/50 animate-fade-in bg-background">
                      <div className="overflow-x-auto p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                              <th className="text-left py-3 px-4">#</th>
                              <th className="text-left py-3 px-2">Jogador</th>
                              <th className="text-left py-3 px-2">Time Base</th>
                              <th className="text-center py-3 px-2">V</th>
                              <th className="text-center py-3 px-2">E</th>
                              <th className="text-center py-3 px-2">D</th>
                              <th className="text-center py-3 px-2">GP</th>
                              <th className="text-center py-3 px-2">GC</th>
                              <th className="text-center py-3 px-2">SG</th>
                              <th className="text-center py-3 px-4 text-primary font-bold">PTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((s, i) => (
                              <tr key={i} className={`border-b border-border/30 transition-colors hover:bg-secondary/50 ${i === 0 ? "bg-primary/5" : ""}`}>
                                <td className="py-3 px-4 font-display font-bold text-muted-foreground">{i + 1}</td>
                                <td className="py-3 px-2 font-medium flex items-center gap-2">
                                  {s.name_player} {i === 0 && <Crown className="h-3 w-3 text-yellow-400 drop-shadow-md" />}
                                </td>
                                <td className="py-3 px-2 text-muted-foreground">
                                  <div className="flex items-center gap-1"><Shield className="h-3 w-3" style={{ color: s.color || '#555' }} /> {s.team_player}</div>
                                </td>
                                <td className="text-center py-3 px-2 text-win">{s.wins}</td>
                                <td className="text-center py-3 px-2 text-draw">{s.draws}</td>
                                <td className="text-center py-3 px-2 text-loss">{s.losses}</td>
                                <td className="text-center py-3 px-2 opacity-80">{s.goals_score}</td>
                                <td className="text-center py-3 px-2 opacity-80">{s.goals_conceded}</td>
                                <td className="text-center py-3 px-2 font-medium">{s.goals_score - s.goals_conceded > 0 ? "+" : ""}{s.goals_score - s.goals_conceded}</td>
                                <td className="text-center py-3 px-4 font-display text-lg font-bold text-primary">{s.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Cups;