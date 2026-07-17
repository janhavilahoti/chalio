export const currentUser = {
  name: "Aarav Patil",
  city: "Latur",
  avatarInitials: "AP",
  coins: 1250,
  rankLatur: 4,
  todaySteps: 7420,
  stepGoal: 10000,
  distanceKm: 5.6,
  calories: 312,
  activeMinutes: 48,
  totalKm: 428.3,
  totalSteps: 612540,
  streakDays: 12,
  level: 7,
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  reward: number;
  status: "joined" | "discover" | "claimable";
  sponsored?: string;
  participants: number;
};

export const missions: Mission[] = [
  {
    id: "daily-10k",
    title: "Daily 10k",
    description: "Walk 10,000 steps today.",
    progress: 7420,
    goal: 10000,
    reward: 50,
    status: "joined",
    participants: 12480,
  },
  {
    id: "weekend-warrior",
    title: "Weekend Warrior",
    description: "Log 25 km across Saturday and Sunday.",
    progress: 12,
    goal: 25,
    reward: 200,
    status: "joined",
    participants: 3210,
  },
  {
    id: "decathlon-5k",
    title: "Decathlon 5k Challenge",
    description: "Complete a 5 km walk near a Decathlon store.",
    progress: 0,
    goal: 5,
    reward: 300,
    status: "discover",
    sponsored: "Decathlon",
    participants: 842,
  },
  {
    id: "streak-7",
    title: "7-Day Streak",
    description: "Hit your step goal 7 days in a row.",
    progress: 7,
    goal: 7,
    reward: 150,
    status: "claimable",
    participants: 5610,
  },
  {
    id: "cafe-coffee-day",
    title: "Café Walk",
    description: "Walk 3 km before noon on any weekday.",
    progress: 0,
    goal: 3,
    reward: 120,
    status: "discover",
    sponsored: "Café Coffee Day",
    participants: 1204,
  },
];

export type LeaderRow = {
  rank: number;
  name: string;
  score: number;
  isYou?: boolean;
};

export const leaderboard: LeaderRow[] = [
  { rank: 1, name: "Priya Deshmukh", score: 84210 },
  { rank: 2, name: "Rohan Kulkarni", score: 79340 },
  { rank: 3, name: "Sneha Jadhav", score: 74980 },
  { rank: 4, name: "Aarav Patil", score: 71230, isYou: true },
  { rank: 5, name: "Vikram Shinde", score: 68120 },
  { rank: 6, name: "Meera Rao", score: 64890 },
  { rank: 7, name: "Karan Iyer", score: 61540 },
  { rank: 8, name: "Ananya Bhat", score: 58720 },
  { rank: 9, name: "Dev Sharma", score: 55210 },
  { rank: 10, name: "Ishita Nair", score: 52480 },
];

export const badges = [
  { id: "first-steps", label: "First Steps", earned: true, color: "bg-brand-red" },
  { id: "week-streak", label: "7-Day Streak", earned: true, color: "bg-brand-yellow" },
  { id: "10k-club", label: "10k Club", earned: true, color: "bg-brand-blue" },
  { id: "marathoner", label: "Marathoner", earned: true, color: "bg-brand-green" },
  { id: "early-bird", label: "Early Bird", earned: true, color: "bg-brand-red" },
  { id: "night-owl", label: "Night Owl", earned: false, color: "bg-slate-300" },
  { id: "explorer", label: "Explorer", earned: false, color: "bg-slate-300" },
  { id: "champion", label: "Champion", earned: false, color: "bg-slate-300" },
];

export const rewards = [
  { id: "amzn-100", brand: "Amazon", label: "₹100 voucher", cost: 2000, progress: 1250 },
  { id: "swiggy-150", brand: "Swiggy", label: "₹150 credit", cost: 3000, progress: 1250 },
  { id: "starbucks", brand: "Starbucks", label: "Coffee on us", cost: 4500, progress: 1250 },
  { id: "decathlon-500", brand: "Decathlon", label: "₹500 gift card", cost: 8000, progress: 1250 },
];
