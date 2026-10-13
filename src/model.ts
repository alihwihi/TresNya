export type Screen =
  "home" | "location" | "stories" | "games" | "surprises" | "pet" | "settings";
export type Story = {
  id: number;
  who: string;
  text: string;
  mood: string;
  time: string;
  photo?: string;
  liked: boolean;
  comments: string[];
};
export const initialStories: Story[] = [
  {
    id: 1,
    who: "Nana",
    text: "Langit Bandung sore ini cantik banget. Tapi masih lebih suka lihat langit yang sama, sebelahan sama kamu. ☁️",
    mood: "🥰",
    time: "24 menit lalu",
    liked: false,
    comments: [],
  },
  {
    id: 2,
    who: "Alih",
    text: "Satu kopi, playlist favorit, dan kamu di pikiranku. Semangat untuk hari ini, ya!",
    mood: "☕",
    time: "2 jam lalu",
    liked: true,
    comments: ["Nanti kita ngopi bareng lagi ya 🤍"],
  },
];
export const quiz = [
  {
    question: "Kalau Nana punya satu hari libur, dia paling ingin…",
    choices: [
      "Jalan pagi & cari kopi enak",
      "Maraton film di rumah",
      "Pergi ke pantai",
      "Tidur seharian",
    ],
    answer: 0,
    note: "Jalan tanpa buru-buru, lalu mampir ke kedai kopi kecil.",
  },
  {
    question: "Hal kecil apa yang paling bikin Nana senang?",
    choices: [
      "Hadiah mahal",
      "Dikabari sudah sampai rumah",
      "Menang debat",
      "Bangun lebih pagi",
    ],
    answer: 1,
    note: "Kabar kecil bikin jarak terasa sedikit lebih dekat.",
  },
  {
    question: "Menu wajib saat kalian ketemu lagi?",
    choices: ["Sushi", "Pizza", "Mie ayam langganan", "Salad"],
    answer: 2,
    note: "Mie ayam di tempat pertama kali kalian makan bareng.",
  },
];
export function duration(date: string, now: Date) {
  const ms = Math.max(
    0,
    now.getTime() - new Date(`${date}T00:00:00+07:00`).getTime(),
  );
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    minutes: Math.floor(ms / 60000) % 60,
  };
}
export function daysUntil(date: string, now: Date) {
  return Math.max(
    0,
    Math.ceil(
      (new Date(`${date}T00:00:00+07:00`).getTime() - now.getTime()) / 86400000,
    ),
  );
}
export function validDate(date: string) {
  const d = new Date(date + "T00:00:00Z");
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === date
  );
}
export function zodiac(date: string) {
  if (!validDate(date)) return "—";
  const [, m, d] = date.split("-").map(Number);
  const signs = [
    "Capricorn",
    "Aquarius",
    "Pisces",
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
  ];
  const edges = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  return signs[m - 1 + (d >= edges[m - 1] ? 1 : 0)];
}
export function niceDate(date: string) {
  return new Date(date + "T00:00:00+07:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}
