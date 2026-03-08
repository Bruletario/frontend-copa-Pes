export interface Player {
  id: string;
  name: string;
  color: string;
  team?: Team;
  stats: {
    goalsScored: number;
    goalsConceded: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
  };
  history: CupHistory[];
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  overall: number;
  formation: string;
  color: string;
}

export interface CupHistory {
  cupName: string;
  position: number;
  team: string;
  matches: number;
  goals: number;
}

export interface Match {
  id: string;
  round: number;
  player1: Player;
  player2: Player;
  score1: number | null;
  score2: number | null;
  isLive: boolean;
}

export const mockTeams: Team[] = [
  { id: "1", name: "Corinthians", logo: "🖤", overall: 85, formation: "4-3-3", color: "#000000" },
  { id: "2", name: "Palmeiras", logo: "💚", overall: 87, formation: "4-2-3-1", color: "#006400" },
  { id: "3", name: "São Paulo", logo: "❤️", overall: 84, formation: "4-4-2", color: "#FF0000" },
  { id: "4", name: "Flamengo", logo: "🔴", overall: 88, formation: "4-3-3", color: "#B22222" },
  { id: "5", name: "Santos", logo: "⚪", overall: 82, formation: "4-3-3", color: "#FFFFFF" },
  { id: "6", name: "Grêmio", logo: "💙", overall: 83, formation: "4-2-3-1", color: "#0050A0" },
  { id: "7", name: "Cruzeiro", logo: "⭐", overall: 81, formation: "4-4-2", color: "#0033A0" },
  { id: "8", name: "Atlético-MG", logo: "🏴", overall: 86, formation: "4-3-3", color: "#1C1C1C" },
];

export const mockPlayers: Player[] = [
  {
    id: "1", name: "Bruno", color: "#39FF14",
    team: mockTeams[0],
    stats: { goalsScored: 24, goalsConceded: 12, matchesPlayed: 10, wins: 7, draws: 1, losses: 2, points: 22 },
    history: [
      { cupName: "Copa PES 2024", position: 1, team: "Corinthians", matches: 8, goals: 18 },
      { cupName: "Copa PES 2023", position: 3, team: "Flamengo", matches: 7, goals: 12 },
    ],
  },
  {
    id: "2", name: "Lucas", color: "#00BFFF",
    team: mockTeams[1],
    stats: { goalsScored: 20, goalsConceded: 14, matchesPlayed: 10, wins: 6, draws: 2, losses: 2, points: 20 },
    history: [
      { cupName: "Copa PES 2024", position: 2, team: "Palmeiras", matches: 8, goals: 15 },
    ],
  },
  {
    id: "3", name: "Rafael", color: "#FF6347",
    team: mockTeams[3],
    stats: { goalsScored: 18, goalsConceded: 10, matchesPlayed: 10, wins: 5, draws: 3, losses: 2, points: 18 },
    history: [
      { cupName: "Copa PES 2024", position: 4, team: "São Paulo", matches: 8, goals: 10 },
    ],
  },
  {
    id: "4", name: "Felipe", color: "#FFD700",
    team: mockTeams[2],
    stats: { goalsScored: 15, goalsConceded: 16, matchesPlayed: 10, wins: 4, draws: 3, losses: 3, points: 15 },
    history: [],
  },
  {
    id: "5", name: "Diego", color: "#FF69B4",
    team: mockTeams[4],
    stats: { goalsScored: 12, goalsConceded: 18, matchesPlayed: 10, wins: 3, draws: 2, losses: 5, points: 11 },
    history: [
      { cupName: "Copa PES 2023", position: 1, team: "Santos", matches: 8, goals: 20 },
    ],
  },
  {
    id: "6", name: "Thiago", color: "#9B59B6",
    team: mockTeams[5],
    stats: { goalsScored: 10, goalsConceded: 20, matchesPlayed: 10, wins: 2, draws: 3, losses: 5, points: 9 },
    history: [],
  },
];

export interface CupStanding {
  playerName: string;
  teamName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
}

export interface Cup {
  id: string;
  name: string;
  date: string;
  champion: string;
  championTeam: string;
  standings: CupStanding[];
  status: "finished" | "in_progress";
}

export const mockCups: Cup[] = [
  {
    id: "cup1",
    name: "Copa PES 2024",
    date: "2024-12-15",
    champion: "Bruno",
    championTeam: "Corinthians",
    status: "finished",
    standings: [
      { playerName: "Bruno", teamName: "Corinthians", points: 22, wins: 7, draws: 1, losses: 2, goalsScored: 24, goalsConceded: 12 },
      { playerName: "Lucas", teamName: "Palmeiras", points: 20, wins: 6, draws: 2, losses: 2, goalsScored: 20, goalsConceded: 14 },
      { playerName: "Rafael", teamName: "Flamengo", points: 18, wins: 5, draws: 3, losses: 2, goalsScored: 18, goalsConceded: 10 },
      { playerName: "Felipe", teamName: "São Paulo", points: 15, wins: 4, draws: 3, losses: 3, goalsScored: 15, goalsConceded: 16 },
      { playerName: "Diego", teamName: "Santos", points: 11, wins: 3, draws: 2, losses: 5, goalsScored: 12, goalsConceded: 18 },
      { playerName: "Thiago", teamName: "Grêmio", points: 9, wins: 2, draws: 3, losses: 5, goalsScored: 10, goalsConceded: 20 },
    ],
  },
  {
    id: "cup2",
    name: "Copa PES 2023",
    date: "2023-11-20",
    champion: "Diego",
    championTeam: "Santos",
    status: "finished",
    standings: [
      { playerName: "Diego", teamName: "Santos", points: 25, wins: 8, draws: 1, losses: 1, goalsScored: 28, goalsConceded: 8 },
      { playerName: "Bruno", teamName: "Flamengo", points: 19, wins: 6, draws: 1, losses: 3, goalsScored: 20, goalsConceded: 14 },
      { playerName: "Rafael", teamName: "São Paulo", points: 16, wins: 5, draws: 1, losses: 4, goalsScored: 16, goalsConceded: 15 },
      { playerName: "Lucas", teamName: "Palmeiras", points: 12, wins: 3, draws: 3, losses: 4, goalsScored: 14, goalsConceded: 18 },
    ],
  },
];

export const mockMatches: Match[] = [
  { id: "1", round: 1, player1: mockPlayers[0], player2: mockPlayers[1], score1: 3, score2: 1, isLive: false },
  { id: "2", round: 1, player1: mockPlayers[2], player2: mockPlayers[3], score1: 2, score2: 2, isLive: false },
  { id: "3", round: 1, player1: mockPlayers[4], player2: mockPlayers[5], score1: 1, score2: 0, isLive: false },
  { id: "4", round: 2, player1: mockPlayers[0], player2: mockPlayers[2], score1: 2, score2: 1, isLive: false },
  { id: "5", round: 2, player1: mockPlayers[1], player2: mockPlayers[5], score1: null, score2: null, isLive: true },
  { id: "6", round: 2, player1: mockPlayers[3], player2: mockPlayers[4], score1: null, score2: null, isLive: false },
];
