import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthGate, Account } from "./src/AuthGate";
import { useLiveLocation } from "./src/useLiveLocation";
import {
  defaultQuotes,
  Personalization,
  readPersonalization,
  savePersonalization,
} from "./src/personalization";
import {
  LocationScreen,
  NotificationSettings,
  PartnerMap,
  useActivity,
} from "./src/Activity";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Switch,
  Image,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { HeartRain } from "./src/HeartRain";
import { Avatar, PetArt, Icon, IconName, LoveArt } from "./src/art";
import { petSpecies, PetSpecies } from "./src/PetArt";
import {
  Badge,
  Body,
  Button,
  Card,
  Field,
  IconButton,
  Label,
  Link,
  Progress,
  Theme,
  Title,
  colors,
  s,
  serif,
} from "./src/ui";
import {
  Screen,
  Story,
  initialStories,
  duration,
  daysUntil,
  niceDate,
  validDate,
  zodiac,
  quiz,
} from "./src/model";

const nav: { id: Screen; label: string; icon: IconName }[] = [
  { id: "home", label: "Beranda", icon: "home" },
  { id: "location", label: "Lokasi & kabar", icon: "pin" },
  { id: "stories", label: "Cerita kita", icon: "heart" },
  { id: "games", label: "Main berdua", icon: "game" },
  { id: "surprises", label: "Kejut layar", icon: "spark" },
  { id: "pet", label: "Pet berdua", icon: "paw" },
];
type Dialog =
  | null
  | "compose"
  | "meeting"
  | "battery"
  | "notifications"
  | "challenge"
  | "quiz"
  | "adopt"
  | "place"
  | "profile"
  | "badgeQuote"
  | "sidebarQuote"
  | "auth";
const moods = ["🥰", "😊", "☕", "😴", "🥺", "🤍"];

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.cream }}
        edges={Platform.OS === "web" ? [] : ["top", "bottom"]}
      >
        <AuthGate>
          {(account, logout) => (
            <TresNyaSession
              key={account.username}
              account={account}
              logout={logout}
            />
          )}
        </AuthGate>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TresNyaSession({
  account,
  logout,
}: {
  account: Account;
  logout: () => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const mobile = width < 760,
    compact = width < 1120;
  const activity = useActivity(account);
  const [screen, setScreen] = useState<Screen>(() =>
    Platform.OS === "web" &&
    new URLSearchParams(window.location.search).get("screen") === "location"
      ? "location"
      : "home",
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollView>(null);
  const [accent, setAccent] = useState(colors.rose);
  const name = account.name;
  const partner = account.partner;
  const [anniversary, setAnniversary] = useState("2025-09-20");
  const [meeting, setMeeting] = useState("2026-10-24");
  const [draftDate, setDraftDate] = useState(meeting);
  const [draftAnniversary, setDraftAnniversary] = useState(anniversary);
  const [personalization, setPersonalization] = useState(() =>
    readPersonalization(account.username),
  );
  const { profilePhoto, badgeQuote, sidebarQuote } = personalization;
  const live = useLiveLocation(account, profilePhoto);
  const [draftBadgeQuote, setDraftBadgeQuote] = useState(badgeQuote);
  const [draftSidebarQuote, setDraftSidebarQuote] = useState(sidebarQuote);
  const [stories, setStories] = useState(initialStories);
  const [storyText, setStoryText] = useState("");
  const [mood, setMood] = useState("🥰");
  const [photo, setPhoto] = useState<string>();
  const [storyFilter, setStoryFilter] = useState("Semua cerita");
  const [commentId, setCommentId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [points, setPoints] = useState(1240);
  const [challenge, setChallenge] = useState(false);
  const [challengeText, setChallengeText] = useState("");
  const [loveCount, setLoveCount] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizRewarded, setQuizRewarded] = useState(false);
  const [effect, setEffect] = useState("Hujan hati");
  const [message, setMessage] = useState(
    "Jangan lupa, ada aku yang sayang kamu. 🤍",
  );
  const [surpriseHistory, setSurpriseHistory] = useState([
    {
      message: "Semangat hari ini, kesayanganku!",
      effect: "Hujan hati",
      time: "Hari ini, 08.12",
    },
  ]);
  const [overlay, setOverlay] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [petName, setPetName] = useState("Mochi");
  const [species, setSpecies] = useState<PetSpecies>("Kucing");
  const [birthday, setBirthday] = useState("2026-09-28");
  const [draftPet, setDraftPet] = useState(petName);
  const [draftSpecies, setDraftSpecies] = useState(species);
  const [draftBirthday, setDraftBirthday] = useState(birthday);
  const [stats, setStats] = useState([72, 85, 64, 90]);
  const [xp, setXp] = useState(65);
  const [coins, setCoins] = useState(180);
  const [inventory, setInventory] = useState([3, 1, 2]);
  const [petHistory, setPetHistory] = useState([
    "Nana memberi Mochi makan · 1 jam lalu",
    "Alih bermain bersama Mochi · 3 jam lalu",
  ]);
  const [happy, setHappy] = useState(false);
  const [places, setPlaces] = useState([
    "Rumah Nana",
    "Kampus Nana",
    "Kedai favorit kita",
  ]);
  const [placeName, setPlaceName] = useState("");
  const [selectedPlace, setSelectedPlace] = useState("Rumah Nana");
  const [settings, setSettings] = useState({
    battery: true,
    saving: true,
    private: false,
    arrivals: true,
    lowBattery: true,
    surprises: true,
  });
  const [threshold, setThreshold] = useState(15);
  const [error, setError] = useState("");
  const [readStatusId, setReadStatusId] = useState<string | null>(null);
  const partnerStatuses =
    activity.data?.statuses.filter(
      (status) => status.username !== account.username,
    ) || [];
  const unreadStatus =
    !!partnerStatuses[0] && partnerStatuses[0].id !== readStatusId;

  useEffect(() => {
    const t = globalThis.setInterval(() => setNow(new Date()), 60000);
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => {
      clearInterval(t);
      sub.remove();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    setError("");
  }, [dialog]);
  function notify(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }
  function go(next: Screen) {
    setScreen(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  const together = duration(anniversary, now);
  const countdown = daysUntil(meeting, now);
  const hour = Number(
    now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }),
  );
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
        ? "Selamat siang"
        : hour < 18
          ? "Selamat sore"
          : "Selamat malam";
  const toggle = (key: keyof typeof settings) =>
    setSettings((v) => ({ ...v, [key]: !v[key] }));
  async function pickPhoto(profile = false) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: profile,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (profile) {
          let uri = asset.base64
            ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
            : asset.uri;
          if (Platform.OS !== "web") {
            const size = Math.min(asset.width, asset.height);
            const processed = await manipulateAsync(
              asset.uri,
              [
                {
                  crop: {
                    originX: (asset.width - size) / 2,
                    originY: (asset.height - size) / 2,
                    width: size,
                    height: size,
                  },
                },
                { resize: { width: 512, height: 512 } },
              ],
              { base64: true, compress: 0.75, format: SaveFormat.JPEG },
            );
            if (!processed.base64) throw new Error("Foto belum bisa disimpan.");
            uri = `data:image/jpeg;base64,${processed.base64}`;
          }
          if (
            Platform.OS === "web" &&
            !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(uri)
          ) {
            notify("Pilih foto PNG, JPEG, WebP, atau GIF.");
            return;
          }
          if (uri.length > 2_800_000) {
            notify("Foto terlalu besar. Pilih foto berukuran maksimal 2 MB.");
            return;
          }
          if (
            await updatePersonalization({
              ...personalization,
              profilePhoto: uri,
            })
          )
            notify("Foto profil diperbarui di seluruh tampilan.");
        } else setPhoto(asset.uri);
      }
    } catch {
      notify("Foto belum bisa dibuka. Coba pilih kembali.");
    }
  }
  async function updatePersonalization(next: Personalization) {
    try {
      await savePersonalization(account.username, next);
      setPersonalization(next);
      return true;
    } catch {
      notify(
        "Belum tersimpan. Penyimpanan perangkat penuh atau tidak tersedia; coba foto yang lebih kecil atau izinkan penyimpanan.",
      );
      return false;
    }
  }
  function openQuote(which: "badgeQuote" | "sidebarQuote") {
    if (which === "badgeQuote") setDraftBadgeQuote(badgeQuote);
    else setDraftSidebarQuote(sidebarQuote);
    setDialog(which);
  }
  function publishStory() {
    if (!storyText.trim() && !photo) {
      setError("Tulis cerita kecilmu atau pilih sebuah foto.");
      return;
    }
    setStories((v) => [
      {
        id: Date.now(),
        who: name,
        text: storyText.trim(),
        mood,
        time: "Baru saja",
        photo,
        liked: false,
        comments: [],
      },
      ...v,
    ]);
    setPoints((v) => v + 10);
    setStoryText("");
    setPhoto(undefined);
    setDialog(null);
    go("stories");
    notify("Cerita ditambahkan ke ruang demo · +10 afeksi");
  }
  function care(action: number) {
    if (action < 3 && inventory[action] < 1) {
      notify("Persediaan habis. Ambil kebutuhan Mochi di toko pet.");
      return;
    }
    if (action < 3)
      setInventory((v) => v.map((n, i) => (i === action ? n - 1 : n)));
    setStats((v) =>
      v.map((n, i) => (i === [0, 1, 3, 2][action] ? Math.min(100, n + 18) : n)),
    );
    setXp((v) => v + 12);
    setPoints((v) => v + 5);
    if (action === 3) setCoins((v) => v + 10);
    const actionText = [
      "memberi makan",
      "mengajak bermain",
      "memandikan",
      "melatih trik",
    ][action];
    setPetHistory((v) => [
      `${name} ${actionText} ${petName} · Baru saja`,
      ...v,
    ]);
    setHappy(true);
    notify(
      `${petName} senang kamu mampir! +5 afeksi${action === 3 ? " · +10 koin" : ""}`,
    );
  }
  function openProfile() {
    setDraftAnniversary(anniversary);
    setDialog("profile");
  }
  function openPet() {
    setDraftPet(petName);
    setDraftSpecies(species);
    setDraftBirthday(birthday);
    setDialog("adopt");
  }
  function openMeeting() {
    setDraftDate(meeting);
    setDialog("meeting");
  }
  function completeChallenge() {
    if (!challengeText.trim()) {
      setError("Tulis satu hal yang kamu syukuri tentang pasanganmu.");
      return;
    }
    setChallenge(true);
    setPoints((v) => v + 30);
    setStories((v) => [
      {
        id: Date.now(),
        who: name,
        text: challengeText.trim(),
        mood: "🤍",
        time: "Baru saja",
        liked: false,
        comments: [],
      },
      ...v,
    ]);
    setDialog(null);
    notify("Tantangan selesai. Cerita kecilmu tersimpan · +30 afeksi");
  }

  const MyAvatar = ({ size = 42 }: { size?: number }) =>
    profilePhoto ? (
      <Image
        accessibilityLabel={`Foto profil ${name}`}
        source={{ uri: profilePhoto }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    ) : (
      <Avatar girl={account.gender === "female"} size={size} />
    );
  function heading(title: string, subtitle: string, action?: React.ReactNode) {
    return (
      <View
        style={[
          s.between,
          { marginBottom: 25, alignItems: "flex-start", flexWrap: "wrap" },
        ]}
      >
        <View style={{ gap: 6, flexShrink: 1 }}>
          <Title style={{ fontSize: mobile ? 29 : 34, lineHeight: 44 }}>
            {title}
          </Title>
          <Body>{subtitle}</Body>
        </View>
        {action}
      </View>
    );
  }
  function SectionHead({
    title,
    link,
    onPress,
  }: {
    title: string;
    link?: string;
    onPress?: () => void;
  }) {
    return (
      <View style={[s.between, { marginBottom: 16 }]}>
        <Title style={{ fontSize: 20, lineHeight: 28 }}>{title}</Title>
        {link && onPress && <Link onPress={onPress}>{link}</Link>}
      </View>
    );
  }
  function SettingRow({
    title,
    detail,
    setting,
  }: {
    title: string;
    detail: string;
    setting: keyof typeof settings;
  }) {
    return (
      <View style={styles.settingRow}>
        <View style={{ flex: mobile ? undefined : 1, gap: 4 }}>
          <Label>{title}</Label>
          <Body style={{ fontSize: 12 }}>{detail}</Body>
        </View>
        <Switch
          accessibilityLabel={title}
          value={settings[setting]}
          onValueChange={() => toggle(setting)}
          trackColor={{ false: "#dedbd5", true: accent }}
          thumbColor="#fff"
        />
      </View>
    );
  }
  function StoryCard({ story }: { story: Story }) {
    return (
      <Card
        style={{
          flex: screen === "home" && !mobile ? 1 : undefined,
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <View style={s.between}>
          <View style={s.row}>
            {story.who === name ? (
              <MyAvatar size={38} />
            ) : (
              <Avatar girl={story.who === "Nana"} size={38} />
            )}
            <View style={{ gap: 4 }}>
              <Label>{story.who}</Label>
              <Body style={{ fontSize: 10, lineHeight: 14 }}>{story.time}</Body>
            </View>
          </View>
          <Text style={{ fontSize: 23 }}>{story.mood}</Text>
        </View>
        <Body style={{ color: "#71665f", marginTop: 17, minHeight: 60 }}>
          {story.text}
        </Body>
        {story.photo && (
          <Image
            accessibilityLabel="Foto cerita"
            source={{ uri: story.photo }}
            style={{ height: 210, borderRadius: 12, marginTop: 15 }}
            resizeMode="cover"
          />
        )}
        <View style={[s.row, { marginTop: 17, gap: 18 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              story.liked ? "Batalkan reaksi sayang" : "Beri reaksi sayang"
            }
            onPress={() =>
              setStories((v) =>
                v.map((x) =>
                  x.id === story.id ? { ...x, liked: !x.liked } : x,
                ),
              )
            }
            style={s.row}
          >
            <Icon
              name="heart"
              color={story.liked ? accent : "#b7ada4"}
              size={17}
            />
            <Body
              style={{
                fontSize: 11,
                color: story.liked ? accent : colors.muted,
              }}
            >
              {story.liked ? "Disayang kamu" : "Kirim sayang"}
            </Body>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setCommentId(story.id);
              setComment("");
            }}
          >
            <Body style={{ fontSize: 11 }}>
              Balas{story.comments.length ? ` · ${story.comments.length}` : ""}
            </Body>
          </Pressable>
        </View>
        {story.comments.map((c, i) => (
          <View key={i} style={styles.comment}>
            <Body style={{ fontSize: 12 }}>{c}</Body>
          </View>
        ))}
        {commentId === story.id && (
          <View style={{ marginTop: 15 }}>
            <Field
              label="Balasan kecilmu"
              value={comment}
              onChangeText={setComment}
              placeholder="Aku juga kangen…"
            />
            <Button
              small
              disabled={!comment.trim()}
              onPress={() => {
                setStories((v) =>
                  v.map((x) =>
                    x.id === story.id
                      ? { ...x, comments: [...x.comments, comment.trim()] }
                      : x,
                  ),
                );
                setCommentId(null);
              }}
            >
              Tambahkan balasan
            </Button>
          </View>
        )}
      </Card>
    );
  }

  function Home() {
    return (
      <>
        {heading(
          `${greeting}, ${name} ${hour >= 18 || hour < 5 ? "☾" : "☀"}`,
          "Jarak boleh jauh, hati tetap satu rumah.",
          <View style={[s.row, styles.dateChip]}>
            <Icon name="calendar" size={15} />
            <Body style={{ fontSize: 11 }}>
              {now.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Asia/Jakarta",
              })}
            </Body>
          </View>,
        )}
        <View style={[styles.hero, mobile && { padding: 25, minHeight: 235 }]}>
          <View style={{ zIndex: 1, flex: 1 }}>
            <View style={s.row}>
              <View style={styles.heroLine} />
              <Label
                style={{ color: "#9d706e", fontSize: 10, letterSpacing: 2 }}
              >
                SETIAP HARI, MEMILIH KAMU
              </Label>
            </View>
            <View
              style={[
                s.row,
                { alignItems: "baseline", marginTop: 15, gap: 10 },
              ]}
            >
              <Text style={[styles.dayNumber, mobile && { fontSize: 62 }]}>
                {together.days}
              </Text>
              <Title style={{ fontSize: mobile ? 22 : 29 }}>
                hari bersama.
              </Title>
            </View>
            <Body style={{ color: "#947b72", marginTop: 5 }}>
              Dan masih banyak cerita yang ingin kita tulis.
            </Body>
            <View style={[s.row, { marginTop: 23, gap: 14, flexWrap: "wrap" }]}>
              <Text style={{ fontSize: 11, color: "#a28177" }}>
                Sejak {niceDate(anniversary)}
              </Text>
              <View
                style={{ height: 12, width: 1, backgroundColor: "#d7bfb4" }}
              />
              <Text style={{ fontSize: 11, color: "#a28177" }}>
                {together.hours} jam · {together.minutes} menit
              </Text>
              <Badge>
                ♡{" "}
                {together.days >= 365
                  ? "1 tahun terlewati"
                  : together.days >= 100
                    ? "100 hari terlewati"
                    : "Cerita baru kita"}
              </Badge>
            </View>
          </View>
          <View
            style={[
              styles.heroArt,
              mobile && { width: 195, right: -62, opacity: 0.22 },
            ]}
          >
            <LoveArt />
          </View>
        </View>
        <View style={[styles.columns, mobile && styles.vertical]}>
          <View
            style={{ flex: mobile ? undefined : 1.65, gap: 21, minWidth: 0 }}
          >
            <Card>
              <SectionHead
                title="Dunianya, hari ini"
                link="Lihat lokasi"
                onPress={() => go("location")}
              />
              <View style={s.between}>
                <View style={s.row}>
                  <View>
                    <Avatar girl={account.gender === "male"} size={55} />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Label style={{ fontSize: 16 }}>
                      {partner} <Text style={{ fontSize: 13 }}>🌷</Text>
                    </Label>
                    <View style={[s.row, { gap: 5 }]}>
                      <Icon name="pin" size={12} />
                      <Body style={{ fontSize: 11 }}>
                        {activity.data?.partner[0]?.label ||
                          (activity.data?.partner.length
                            ? "Lokasi dibagikan"
                            : "Belum berbagi lokasi")}
                      </Body>
                    </View>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Lihat baterai pasangan"
                  onPress={() => setDialog("battery")}
                >
                  <Badge green>⚡ Baterai contoh</Badge>
                </Pressable>
              </View>
              <View style={styles.statusQuote}>
                <Body style={{ color: "#847468", fontStyle: "italic" }}>
                  {activity.data?.statuses.find(
                    (status) => status.username !== account.username,
                  )?.text ||
                    "Belum ada kabar baru. Kirim status dari Lokasi & kabar."}
                </Body>
                <Text style={{ fontSize: 19 }}>🥰</Text>
              </View>
              <PartnerMap point={activity.data?.partner[0]} />
            </Card>
            <Card
              style={{ backgroundColor: "#f1f3e9", borderColor: "#e5e9db" }}
            >
              <View style={s.between}>
                <View style={[s.row, { gap: 8 }]}>
                  <Icon name="spark" size={17} color="#7f8c67" />
                  <Label
                    style={{
                      color: "#7f8c67",
                      fontSize: 10,
                      letterSpacing: 1.7,
                    }}
                  >
                    SATU HAL KECIL HARI INI
                  </Label>
                </View>
                <Badge green>+30 afeksi</Badge>
              </View>
              <Title style={{ fontSize: 21, marginTop: 15 }}>
                Tiga hal yang kamu syukuri tentang kita.
              </Title>
              <Body style={{ marginTop: 5, fontSize: 12 }}>
                Kadang, hal paling sederhana punya arti paling besar.
              </Body>
              <View style={[s.between, { marginTop: 17 }]}>
                <View style={[s.row, { gap: 5 }]}>
                  <Icon name="clock" size={13} />
                  <Body style={{ fontSize: 11 }}>
                    Luangkan 2 menit untuk kita
                  </Body>
                </View>
                <Link
                  onPress={() =>
                    challenge ? go("stories") : setDialog("challenge")
                  }
                >
                  {challenge ? "Sudah selesai ✓" : "Mulai tantangan"}
                </Link>
              </View>
            </Card>
          </View>
          <View style={{ flex: mobile ? undefined : 1, gap: 21, minWidth: 0 }}>
            <Card
              style={{
                alignItems: "center",
                backgroundColor: "#fcf5ed",
                borderColor: "#efe4d6",
                paddingVertical: 24,
              }}
            >
              <View style={[s.row, { gap: 8 }]}>
                <Icon name="calendar" size={16} color="#b69774" />
                <Label
                  style={{ color: "#9a8269", fontSize: 10, letterSpacing: 1.8 }}
                >
                  SAMPAI PELUK BERIKUTNYA
                </Label>
              </View>
              <View style={[s.row, { alignItems: "baseline", marginTop: 11 }]}>
                <Text
                  style={{ fontFamily: serif, fontSize: 57, color: "#ab8966" }}
                >
                  {countdown}
                </Text>
                <Text
                  style={{ fontFamily: serif, color: "#ab8966", fontSize: 22 }}
                >
                  hari lagi
                </Text>
              </View>
              <Body style={{ fontSize: 12, color: "#a38b72" }}>
                {niceDate(meeting)} · Bandung
              </Body>
              <View style={{ marginTop: 12 }}>
                <Link onPress={openMeeting}>Rencana ketemu kita</Link>
              </View>
            </Card>
            <Card style={{ paddingBottom: 18 }}>
              <View style={s.between}>
                <Title style={{ fontSize: 20 }}>Si kecil kita</Title>
                <Badge green>Lv. {Math.floor(xp / 100) + 4}</Badge>
              </View>
              <View style={{ alignItems: "center", height: 135, marginTop: 7 }}>
                <PetArt size={157} species={species} happy={happy} />
              </View>
              <View style={[s.between, { marginTop: 5 }]}>
                <Label>
                  {petName} <Text style={{ fontSize: 12 }}>🍪</Text>
                </Label>
                <Body style={{ fontSize: 10 }}>
                  {stats[0] > 80
                    ? "Perut kenyang, hati senang"
                    : "Menunggu camilan darimu"}
                </Body>
              </View>
              <View style={{ marginTop: 13 }}>
                <Progress value={stats[0]} />
              </View>
              <View style={{ marginTop: 17 }}>
                <Button secondary small icon="paw" onPress={() => go("pet")}>
                  Mampir ke rumah {petName}
                </Button>
              </View>
            </Card>
          </View>
        </View>
        <View style={{ marginTop: 28 }}>
          <SectionHead
            title="Cerita kecil kita"
            link="Semua cerita"
            onPress={() => go("stories")}
          />
          <View
            style={[
              s.row,
              { alignItems: "stretch", gap: 19 },
              mobile && styles.vertical,
            ]}
          >
            {stories.slice(0, 2).map((story) => (
              <React.Fragment key={story.id}>
                {StoryCard({ story })}
              </React.Fragment>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <Icon name="heart" size={13} color="#ba9c94" />
          <Text
            style={{
              fontFamily: serif,
              color: "#aa9c90",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            Rumah bukan selalu tempat. Kadang, rumah itu kamu.
          </Text>
        </View>
      </>
    );
  }

  function Location() {
    return <LocationScreen account={account} activity={activity} live={live} />;
  }

  function Stories() {
    const visible = stories.filter(
      (x) =>
        storyFilter === "Semua cerita" ||
        (storyFilter === "Dariku" ? x.who === name : x.who === partner),
    );
    return (
      <>
        {heading(
          "Cerita kecil, rasa yang besar.",
          "Tempat semua kabar, rindu, dan hal-hal sederhana.",
          <Button icon="plus" onPress={() => setDialog("compose")}>
            Tulis cerita
          </Button>,
        )}
        <View style={[s.row, { marginBottom: 24, flexWrap: "wrap" }]}>
          {["Semua cerita", "Dariku", `Dari ${partner}`].map((f) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: storyFilter === f }}
              key={f}
              onPress={() => setStoryFilter(f)}
              style={[
                styles.chip,
                storyFilter === f && {
                  backgroundColor: "#f0e1df",
                  borderColor: "#e9d5d1",
                },
              ]}
            >
              <Label
                style={{ color: storyFilter === f ? accent : colors.muted }}
              >
                {f}
              </Label>
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 18, maxWidth: 760 }}>
          {visible.map((story) => (
            <React.Fragment key={story.id}>
              {StoryCard({ story })}
            </React.Fragment>
          ))}
          {!visible.length && (
            <Card>
              <Title>Belum ada cerita di sini.</Title>
              <Body style={{ marginVertical: 15 }}>
                Mulai dari satu kalimat sederhana untuk pasanganmu.
              </Body>
              <Button onPress={() => setDialog("compose")}>
                Tulis cerita pertama
              </Button>
            </Card>
          )}
        </View>
      </>
    );
  }

  function Games() {
    return (
      <>
        {heading(
          "Sedikit main, banyak sayang.",
          "Bikin kenangan kecil, satu permainan setiap waktu.",
        )}
        <View style={[styles.columns, mobile && styles.vertical]}>
          <Card
            style={{
              flex: mobile ? undefined : 1.5,
              backgroundColor: "#f3e6e3",
            }}
          >
            <Badge>PERMAINAN HARI INI</Badge>
            <Text style={{ fontSize: 46, marginTop: 25 }}>💌</Text>
            <Title style={{ marginTop: 17, fontSize: 30 }}>
              Seberapa kenal kamu denganku?
            </Title>
            <Body style={{ marginTop: 12, marginBottom: 26 }}>
              Tiga pertanyaan kecil. Mungkin ada hal baru yang bikin kamu jatuh
              cinta lagi.
            </Body>
            <Button
              icon="game"
              onPress={() => {
                setQuizStep(0);
                setQuizChoice(null);
                setQuizScore(0);
                setQuizDone(false);
                setDialog("quiz");
              }}
            >
              Main kuis pasangan
            </Button>
            <Body style={{ fontSize: 10, marginTop: 12 }}>
              Jawaban pasangan adalah contoh · hadiah satu kali
            </Body>
          </Card>
          <Card
            style={{
              flex: mobile ? undefined : 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Label style={{ letterSpacing: 1.3, fontSize: 10 }}>
              TABUNGAN SAYANG KITA
            </Label>
            <Icon name="heart" size={35} color={accent} />
            <Text
              style={{
                fontFamily: serif,
                color: accent,
                fontSize: 56,
                marginTop: 14,
              }}
            >
              {points.toLocaleString("id-ID")}
            </Text>
            <Body>poin afeksi bersama</Body>
            <View style={[s.divider, { width: "100%" }]} />
            <View style={[s.between, { width: "100%" }]}>
              <Label>{name}</Label>
              <Body>{points - 620} poin</Body>
            </View>
            <View style={[s.between, { width: "100%", marginTop: 12 }]}>
              <Label>{partner}</Label>
              <Body>620 poin</Body>
            </View>
          </Card>
        </View>
        <View
          style={[styles.columns, { marginTop: 22 }, mobile && styles.vertical]}
        >
          <Card style={{ flex: mobile ? undefined : 1 }}>
            <SectionHead title="Satu hati, banyak cinta" />
            <Body>
              Ketuk hati dan kumpulkan senyum. Setiap 10 hati menambah 5 poin
              afeksi.
            </Body>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim satu hati"
              onPress={() => {
                setLoveCount((v) => v + 1);
                if ((loveCount + 1) % 10 === 0) {
                  setPoints((v) => v + 5);
                  notify("10 hati kecil · +5 afeksi");
                }
              }}
              style={({ pressed }) => [
                styles.loveButton,
                { transform: [{ scale: pressed && !reducedMotion ? 0.9 : 1 }] },
              ]}
            >
              <Icon name="heart" size={45} color={accent} />
            </Pressable>
            <Body style={{ textAlign: "center" }}>
              {loveCount} hati di ruang demo ini
            </Body>
          </Card>
          <Card
            style={{ flex: mobile ? undefined : 1, backgroundColor: "#f0f2e8" }}
          >
            <Badge green>TANTANGAN HARIAN · +30</Badge>
            <Title style={{ marginTop: 22 }}>
              Tiga hal yang kamu syukuri tentang kita.
            </Title>
            <Body style={{ marginTop: 14, marginBottom: 24 }}>
              Kirim rasa terima kasih yang mungkin belum sempat kamu ucapkan
              hari ini.
            </Body>
            <Button
              secondary
              icon={challenge ? "check" : "spark"}
              disabled={challenge}
              onPress={() => setDialog("challenge")}
            >
              {challenge ? "Tantangan selesai" : "Tulis untuk pasangan"}
            </Button>
          </Card>
        </View>
      </>
    );
  }

  function Surprises() {
    return (
      <>
        {heading(
          "Titip kejutan untuknya.",
          "Karena senyum bisa sampai lebih dulu daripada pelukmu.",
        )}
        <View style={[styles.columns, mobile && styles.vertical]}>
          <Card style={{ flex: mobile ? undefined : 1.25 }}>
            <SectionHead title="Pilih sedikit keajaiban" />
            <View style={[s.row, { marginBottom: 26, flexWrap: "wrap" }]}>
              {[
                ["Hujan hati", "heart"],
                ["Getaran", "spark"],
                ["Suara", "bell"],
              ].map(([t, i]) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: effect === t }}
                  key={t}
                  onPress={() => setEffect(t)}
                  style={[
                    styles.effect,
                    effect === t && {
                      borderColor: accent,
                      backgroundColor: "#f8edeb",
                    },
                  ]}
                >
                  <Icon name={i as IconName} color={accent} size={28} />
                  <Label style={{ fontSize: 11 }}>{t}</Label>
                </Pressable>
              ))}
            </View>
            <Field
              label="Pesan kecilmu"
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <Label style={{ marginBottom: 10 }}>
              Atau, pinjam kata-kata ini
            </Label>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {[
                "Jangan lupa, ada aku yang sayang kamu. 🤍",
                "Istirahat sebentar, ya. Kamu sudah hebat hari ini.",
                "Sini, peluk jauh dulu! 🫂",
              ].map((t) => (
                <Pressable
                  accessibilityRole="button"
                  key={t}
                  onPress={() => setMessage(t)}
                  style={styles.quickMessage}
                >
                  <Body style={{ fontSize: 12, color: "#927a71" }}>{t}</Body>
                </Pressable>
              ))}
            </View>
            <Button
              icon="send"
              disabled={!message.trim()}
              onPress={() => {
                setSurpriseHistory((v) => [
                  { message: message.trim(), effect, time: "Baru saja" },
                  ...v,
                ]);
                setPoints((v) => v + 5);
                setOverlay(true);
              }}
            >
              Pratinjau kejutan
            </Button>
            <Body style={{ fontSize: 10, marginTop: 13 }}>
              Efek hanya ditampilkan di perangkat ini. Tidak ada notifikasi yang
              dikirim.
            </Body>
          </Card>
          <View style={{ flex: mobile ? undefined : 1, gap: 20 }}>
            <Card
              style={{
                backgroundColor: "#f5eae5",
                alignItems: "center",
                paddingVertical: 35,
              }}
            >
              <Icon name="gift" size={38} color={accent} />
              <Title
                style={{ marginTop: 20, textAlign: "center", fontSize: 23 }}
              >
                Hal kecil, hangatnya lama.
              </Title>
              <Body style={{ marginTop: 12, textAlign: "center" }}>
                Satu pesan darimu bisa mengubah seluruh harinya.
              </Body>
            </Card>
            <Card>
              <SectionHead title="Jejak kejutan" />
              {surpriseHistory.map((item, i) => (
                <View
                  key={i}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: i < surpriseHistory.length - 1 ? 1 : 0,
                    borderColor: colors.line,
                  }}
                >
                  <Body style={{ color: colors.ink }}>{item.message}</Body>
                  <Body style={{ fontSize: 10, marginTop: 6 }}>
                    {item.effect} · {item.time} · Pratinjau
                  </Body>
                </View>
              ))}
            </Card>
          </View>
        </View>
      </>
    );
  }

  function Pet() {
    return (
      <>
        {heading(
          `Rumah kecil ${petName}.`,
          "Satu teman kecil, dirawat dengan dua hati.",
          <Badge green>◉ {coins} koin bersama</Badge>,
        )}
        <View style={[styles.columns, mobile && styles.vertical]}>
          <Card
            style={{
              flex: mobile ? undefined : 1.25,
              backgroundColor: "#f5efe2",
              alignItems: "center",
            }}
          >
            <View style={[s.between, { width: "100%" }]}>
              <Badge>Lv. {Math.floor(xp / 100) + 4} · Sahabat kecil</Badge>
              <Link onPress={openPet}>Profil pet</Link>
            </View>
            <View style={{ marginVertical: 15 }}>
              <PetArt size={250} species={species} happy={happy} />
            </View>
            <Title style={{ fontSize: 31 }}>{petName}</Title>
            <Body style={{ marginTop: 4 }}>
              {species} · {zodiac(birthday)} · {duration(birthday, now).days}{" "}
              hari
            </Body>
            <Body style={{ fontStyle: "italic", marginTop: 13 }}>
              {happy
                ? "“Hari ini menyenangkan karena ada kamu!”"
                : "“Kamu datang! Aku kangen…”"}
            </Body>
            <View style={{ width: "100%", marginTop: 25 }}>
              <View style={[s.between, { marginBottom: 8 }]}>
                <Label style={{ fontSize: 10 }}>
                  Menuju level {Math.floor(xp / 100) + 5}
                </Label>
                <Body style={{ fontSize: 10 }}>{xp % 100}/100 XP</Body>
              </View>
              <Progress value={xp % 100} color="#bba07c" />
            </View>
          </Card>
          <Card style={{ flex: mobile ? undefined : 1 }}>
            <SectionHead title="Apa kabar si kecil?" />
            {["Kenyang", "Suasana hati", "Energi", "Kebersihan"].map((t, i) => (
              <View key={t} style={{ marginBottom: 24 }}>
                <View style={[s.between, { marginBottom: 10 }]}>
                  <Label>
                    {["🍪", "🤍", "⚡", "🫧"][i]} {t}
                  </Label>
                  <Body style={{ fontSize: 11 }}>{stats[i]}%</Body>
                </View>
                <Progress
                  value={stats[i]}
                  color={["#bc9b74", "#bd8f91", "#a7ad7e", "#8ca9a6"][i]}
                />
              </View>
            ))}
            <View style={{ gap: 10 }}>
              <View style={styles.careRow}>
                <Button small secondary onPress={() => care(0)}>
                  Beri makan ({inventory[0]})
                </Button>
                <Button small secondary onPress={() => care(1)}>
                  Main ({inventory[1]})
                </Button>
              </View>
              <View style={styles.careRow}>
                <Button small secondary onPress={() => care(2)}>
                  Mandikan ({inventory[2]})
                </Button>
                <Button small secondary onPress={() => care(3)}>
                  Latih trik +10 ◉
                </Button>
              </View>
            </View>
          </Card>
        </View>
        <View
          style={[styles.columns, { marginTop: 23 }, mobile && styles.vertical]}
        >
          <Card style={{ flex: mobile ? undefined : 1.25 }}>
            <SectionHead title="Toko kecil Mochi" />
            <Body style={{ fontSize: 12, marginBottom: 20 }}>
              Kebutuhan kecil untuk hari yang menyenangkan.
            </Body>
            {[
              { title: "Biskuit kesukaan", emoji: "🍪", price: 20 },
              { title: "Bola benang", emoji: "🧶", price: 35 },
              { title: "Sabun wangi", emoji: "🫧", price: 25 },
            ].map((item, i) => (
              <View key={item.title} style={styles.shopRow}>
                <Text style={{ fontSize: 29 }}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Label>{item.title}</Label>
                  <Body style={{ fontSize: 11 }}>
                    Persediaan: {inventory[i]}
                  </Body>
                </View>
                <Button
                  small
                  secondary
                  disabled={coins < item.price}
                  onPress={() => {
                    if (coins < item.price) return;
                    setCoins((v) => v - item.price);
                    setInventory((v) =>
                      v.map((n, index) => (index === i ? n + 1 : n)),
                    );
                    setPetHistory((v) => [
                      `${name} membeli ${item.title.toLowerCase()} · Baru saja`,
                      ...v,
                    ]);
                    notify(`${item.title} masuk persediaan.`);
                  }}
                >
                  {item.price} ◉
                </Button>
              </View>
            ))}
          </Card>
          <Card style={{ flex: mobile ? undefined : 1 }}>
            <SectionHead title="Dirawat, bergantian" />
            {petHistory.slice(0, 6).map((item, i) => (
              <View key={`${i}-${item}`} style={styles.historyRow}>
                <View style={styles.smallDot} />
                <Body style={{ flex: 1, fontSize: 12 }}>{item}</Body>
              </View>
            ))}
          </Card>
        </View>
      </>
    );
  }

  function Settings() {
    return (
      <>
        {heading(
          "Nyaman dengan cara kita.",
          "Atur ruang ini supaya terasa semakin seperti rumah.",
        )}
        <View style={[styles.columns, mobile && styles.vertical]}>
          <View style={{ flex: mobile ? undefined : 1, gap: 20 }}>
            <Card>
              <SectionHead
                title="Profil berdua"
                link="Edit profil"
                onPress={openProfile}
              />
              <View style={[s.row, { marginVertical: 15 }]}>
                <MyAvatar size={55} />
                <Icon name="heart" color={accent} size={18} />
                <Avatar girl={account.gender === "male"} size={55} />
                <View style={{ flex: 1 }}>
                  <Label>
                    {name} & {partner}
                  </Label>
                  <Body style={{ fontSize: 11 }}>
                    Sejak {niceDate(anniversary)}
                  </Body>
                </View>
              </View>
              <Button
                secondary
                small
                onPress={() => pickPhoto(true)}
                icon="image"
              >
                Ganti foto kamu
              </Button>
              <Body style={{ fontSize: 11, marginTop: 12 }}>
                Foto tersimpan untuk akunmu di perangkat ini dan digunakan pada
                penanda saat berbagi lokasi live.
              </Body>
            </Card>
            <Card>
              <SectionHead title="Kata-kata untuk ruang kita" />
              <View style={[s.between, { marginBottom: 8 }]}>
                <Label>Kutipan profil</Label>
                <IconButton
                  name="pencil"
                  label="Edit kutipan profil"
                  onPress={() => openQuote("badgeQuote")}
                />
              </View>
              <Body>{badgeQuote}</Body>
              <View style={s.divider} />
              <View style={[s.between, { marginBottom: 8 }]}>
                <Label>Kutipan kartu hati</Label>
                <IconButton
                  name="pencil"
                  label="Edit kutipan kartu hati"
                  onPress={() => openQuote("sidebarQuote")}
                />
              </View>
              <Text
                style={[styles.noteText, { marginTop: 0, textAlign: "left" }]}
              >
                {sidebarQuote}
              </Text>
              <Body style={{ fontSize: 11, marginTop: 12 }}>
                Kutipan tersimpan untuk akunmu di browser ini.
              </Body>
            </Card>
            <Card>
              <SectionHead title="Izin & kenyamanan" />
              <Label>Lokasi dengan izin</Label>
              <Body>
                Bagikan titik GPS atau hapus riwayat lokasimu di Lokasi & kabar.
              </Body>
              <Button secondary onPress={() => go("location")}>
                Kelola lokasi & kabar
              </Button>
              <SettingRow
                title="Berbagi baterai"
                detail="Biar pasangan tidak khawatir saat kamu offline."
                setting="battery"
              />
              <SettingRow
                title="Mode hemat baterai"
                detail="Kurangi pembaruan saat baterai menipis."
                setting="saving"
              />
              <Body style={{ fontSize: 10, marginTop: 12 }}>
                Baterai dan mode hemat adalah pratinjau. Lokasi GPS hanya dibaca
                saat kamu memilih Ambil lokasi saya.
              </Body>
            </Card>
            <Card>
              <SectionHead title="Suasana ruang kita" />
              <View style={s.row}>
                {[
                  { title: "Rose", color: "#ad7277" },
                  { title: "Sage", color: "#75886c" },
                  { title: "Lavender", color: "#8b7d9c" },
                ].map((t) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Tema ${t.title}`}
                    accessibilityState={{ selected: accent === t.color }}
                    key={t.title}
                    onPress={() => setAccent(t.color)}
                    style={[
                      styles.themeChoice,
                      {
                        borderColor: accent === t.color ? t.color : colors.line,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: t.color,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {accent === t.color && (
                        <Icon name="check" size={17} color="white" />
                      )}
                    </View>
                    <Label style={{ fontSize: 11 }}>{t.title}</Label>
                  </Pressable>
                ))}
              </View>
            </Card>
          </View>
          <View style={{ flex: mobile ? undefined : 1, gap: 20 }}>
            <Card>
              <SectionHead title="Kabar yang ingin kamu dengar" />
              <SettingRow
                title="Sampai tujuan"
                detail="Kabar saat pasangan tiba dengan aman."
                setting="arrivals"
              />
              <SettingRow
                title="Baterai lemah"
                detail={`Peringatan saat baterai di bawah ${threshold}%.`}
                setting="lowBattery"
              />
              <View style={[s.row, { marginBottom: 10 }]}>
                {[10, 15, 20].map((v) => (
                  <Button
                    key={v}
                    secondary={threshold !== v}
                    small
                    onPress={() => setThreshold(v)}
                  >
                    {v}%
                  </Button>
                ))}
              </View>
              <SettingRow
                title="Kejutan kecil"
                detail="Hujan hati dan pesan manis untukmu."
                setting="surprises"
              />
              <NotificationSettings activity={activity} />
            </Card>
            <Card>
              <SectionHead title="Privasi & akun" />
              <SettingRow
                title="Mode privat"
                detail="Pratinjau pilihan kunci aplikasi dengan PIN."
                setting="private"
              />
              {settings.private && (
                <Body style={{ fontSize: 11, color: accent, marginTop: 10 }}>
                  Mode privat dipilih. Penguncian perangkat belum aktif pada UI
                  demo.
                </Body>
              )}
              <View style={s.divider} />
              <View style={[s.row, { marginBottom: 15 }]}>
                <Icon name="shield" color="#879472" />
                <View>
                  <Label>Masuk dengan akun pribadi</Label>
                  <Body style={{ fontSize: 11 }}>Sesi aktif · {name}</Body>
                </View>
              </View>
              <Body style={{ marginBottom: 15 }}>
                Akun terdaftar: Alih (laki-laki) & Nana (perempuan).
              </Body>
              <Button
                secondary
                icon="logout"
                onPress={() => {
                  void logout();
                }}
              >
                Keluar dari TresNya
              </Button>
            </Card>
            <View style={{ paddingHorizontal: 12 }}>
              <Body style={{ fontSize: 11 }}>TresNya · UI preview 1.0</Body>
              <Body style={{ fontSize: 11, marginTop: 7 }}>
                Akun dan sesi masuk tersimpan di server lokal. Aktivitas
                pasangan lainnya masih berupa data demo dan kembali ke awal saat
                sesi dimuat ulang.
              </Body>
            </View>
          </View>
        </View>
      </>
    );
  }

  const dialogTitles: Record<NonNullable<Dialog>, string> = {
    compose: "Ada cerita apa hari ini?",
    meeting: "Sampai peluk berikutnya.",
    battery: `Kabar baterai ${partner}`,
    notifications: "Kabar kecil untukmu",
    challenge: "Terima kasih, karena kamu…",
    quiz: "Seberapa kenal kita?",
    adopt: "Kenalan dengan si kecil.",
    place: "Simpan tempat yang berarti.",
    profile: "Ini cerita tentang kita.",
    badgeQuote: "Edit kutipan profil",
    sidebarQuote: "Edit kutipan kartu hati",
    auth: "Akun TresNya",
  };
  function renderDialog() {
    switch (dialog) {
      case "badgeQuote":
      case "sidebarQuote": {
        const isBadge = dialog === "badgeQuote";
        const quoteKey = dialog;
        const limit = isBadge ? 80 : 200;
        const draft = isBadge ? draftBadgeQuote : draftSidebarQuote;
        const setDraft = isBadge ? setDraftBadgeQuote : setDraftSidebarQuote;
        return (
          <>
            <Body style={{ marginBottom: 20 }}>
              {isBadge
                ? "Tulisan kecil di bawah nama kalian."
                : "Pesan hangat pada kartu hati di menu samping."}
            </Body>
            <Field
              label={
                isBadge
                  ? "Kutipan profil (maks. 80 karakter)"
                  : "Kutipan kartu hati (maks. 200 karakter)"
              }
              value={draft}
              onChangeText={setDraft}
              multiline={!isBadge}
            />
            <View style={{ gap: 12 }}>
              <Button
                onPress={async () => {
                  const quote = draft.trim();
                  if (!quote || quote.length > limit) {
                    setError(`Isi kutipan, maksimal ${limit} karakter.`);
                    return;
                  }
                  if (
                    await updatePersonalization({
                      ...personalization,
                      [quoteKey]: quote,
                    })
                  ) {
                    setDialog(null);
                    notify("Kutipan diperbarui.");
                  }
                }}
              >
                Simpan kutipan
              </Button>
              <Button
                secondary
                onPress={() => {
                  setDraft(defaultQuotes[quoteKey]);
                  setError("");
                }}
              >
                Gunakan kutipan awal
              </Button>
            </View>
          </>
        );
      }
      case "compose":
        return (
          <>
            <Body style={{ marginBottom: 22 }}>
              Kabar sesederhana apa pun berarti untuknya.
            </Body>
            <Field
              label="Cerita kecilmu"
              value={storyText}
              onChangeText={setStoryText}
              multiline
              placeholder="Hari ini aku…"
            />
            <Label style={{ marginBottom: 12 }}>Bagaimana perasaanmu?</Label>
            <View style={[s.row, { marginBottom: 24, flexWrap: "wrap" }]}>
              {moods.map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  accessibilityLabel={`Suasana hati ${m}`}
                  accessibilityState={{ selected: mood === m }}
                  onPress={() => setMood(m)}
                  style={[
                    styles.mood,
                    mood === m && {
                      borderColor: accent,
                      backgroundColor: "#f7e8e5",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 25 }}>{m}</Text>
                </Pressable>
              ))}
            </View>
            {photo && (
              <View>
                <Image
                  source={{ uri: photo }}
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                />
                <Link onPress={() => setPhoto(undefined)}>Hapus foto</Link>
              </View>
            )}
            <View style={s.between}>
              <Button secondary icon="image" onPress={() => pickPhoto()}>
                Tambah foto
              </Button>
              <Button icon="send" onPress={publishStory}>
                Bagikan cerita
              </Button>
            </View>
          </>
        );
      case "meeting":
        return (
          <>
            <Body style={{ marginBottom: 24 }}>
              Satu tanggal kecil untuk dinanti bersama.
            </Body>
            <Field
              label="Tanggal ketemu (YYYY-MM-DD)"
              value={draftDate}
              onChangeText={setDraftDate}
              placeholder="2026-10-24"
            />
            <Button
              onPress={() => {
                if (
                  !validDate(draftDate) ||
                  new Date(draftDate + "T23:59:59+07:00").getTime() <
                    now.getTime()
                ) {
                  setError(
                    "Pilih tanggal hari ini atau setelahnya dengan format YYYY-MM-DD.",
                  );
                  return;
                }
                setMeeting(draftDate);
                setDialog(null);
                notify("Tanggal ketemu diperbarui. Ada yang bisa dinanti.");
              }}
            >
              Simpan rencana
            </Button>
          </>
        );
      case "battery":
        return (
          <>
            <Badge>Data perangkat contoh</Badge>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 76,
                color: "#829073",
                textAlign: "center",
                marginVertical: 25,
              }}
            >
              78%
            </Text>
            <Progress value={78} />
            <View style={[s.row, { justifyContent: "center", marginTop: 20 }]}>
              <Icon name="battery" color="#829073" />
              <Label>Sedang mengisi daya</Label>
            </View>
            <Body style={{ marginTop: 20, textAlign: "center" }}>
              Terakhir diperbarui 2 menit lalu.
              <BrText />
            </Body>
            <View style={s.divider} />
            <Label>Jika baterai hampir habis</Label>
            <View style={[styles.quickMessage, { marginVertical: 14 }]}>
              <Body>
                Contoh peringatan: “Baterai {partner} tinggal 12%. Mungkin
                sebentar lagi offline, ya.”
              </Body>
            </View>
            <Link
              onPress={() => {
                setDialog(null);
                go("settings");
              }}
            >
              Atur batas peringatan baterai
            </Link>
          </>
        );
      case "notifications":
        return (
          <>
            <Badge>Kabar pasangan</Badge>
            {!partnerStatuses.length && (
              <Body style={{ marginVertical: 18 }}>
                Belum ada status dari {partner}.
              </Body>
            )}
            {partnerStatuses.map((status) => (
              <View key={status.id} style={styles.notification}>
                <View style={styles.roundIcon}>
                  <Icon name="heart" color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body style={{ color: colors.ink }}>{status.text}</Body>
                  <Body style={{ fontSize: 10 }}>
                    {new Date(status.created).toLocaleString("id-ID")}
                  </Body>
                </View>
              </View>
            ))}
            <Button
              secondary
              onPress={() => {
                setReadStatusId(partnerStatuses[0]?.id || null);
                setDialog(null);
                notify("Semua kabar ditandai sudah dibaca.");
              }}
            >
              Tandai semua dibaca
            </Button>
          </>
        );
      case "challenge":
        return (
          <>
            <Badge green>TANTANGAN HARI INI · +30 AFEKSI</Badge>
            <Body style={{ marginVertical: 20 }}>
              Tuliskan tiga hal yang kamu syukuri tentang kalian. Sesederhana
              cara dia mendengarkan atau selalu mengingatkan makan.
            </Body>
            <Field
              label="Aku bersyukur karena…"
              value={challengeText}
              onChangeText={setChallengeText}
              multiline
              placeholder="1. Kamu selalu…"
            />
            <Button onPress={completeChallenge}>
              Selesaikan & bagikan sebagai cerita
            </Button>
          </>
        );
      case "quiz":
        return quizDone ? (
          <View style={{ alignItems: "center", gap: 20 }}>
            <Text style={{ fontSize: 55 }}>💌</Text>
            <Title>{quizScore} dari 3 jawaban cocok!</Title>
            <Body style={{ textAlign: "center" }}>
              Selalu ada hal baru untuk dikenali. Terus penasaran dengan
              dunianya, ya.
            </Body>
            <Badge green>
              {quizRewarded
                ? "Kuis selesai · hadiah sesi sudah tercatat"
                : "+30 poin afeksi"}
            </Badge>
            <Button onPress={() => setDialog(null)}>Simpan senyum ini</Button>
          </View>
        ) : (
          <>
            <Body>
              Pertanyaan {quizStep + 1} dari {quiz.length} · jawaban contoh
            </Body>
            <View style={{ marginVertical: 15 }}>
              <Progress
                value={((quizStep + 1) / quiz.length) * 100}
                color={accent}
              />
            </View>
            <Title style={{ fontSize: 23, marginBottom: 23 }}>
              {quiz[quizStep].question.replace("Nana", partner)}
            </Title>
            {quiz[quizStep].choices.map((c, i) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: quizChoice === i }}
                key={c}
                onPress={() => setQuizChoice(i)}
                style={[
                  styles.quizOption,
                  quizChoice === i && {
                    borderColor: accent,
                    backgroundColor: "#f6e9e6",
                  },
                ]}
              >
                <Label>{c}</Label>
                {quizChoice === i && (
                  <Icon name="check" color={accent} size={16} />
                )}
              </Pressable>
            ))}
            <View style={{ marginTop: 15 }}>
              <Button
                disabled={quizChoice === null}
                onPress={() => {
                  const score =
                    quizScore + (quizChoice === quiz[quizStep].answer ? 1 : 0);
                  setQuizScore(score);
                  if (quizStep === quiz.length - 1) {
                    setQuizDone(true);
                    if (!quizRewarded) {
                      setPoints((v) => v + 30);
                      setQuizRewarded(true);
                      notify("Kuis selesai · +30 afeksi");
                    }
                  } else {
                    setQuizStep((v) => v + 1);
                    setQuizChoice(null);
                  }
                }}
              >
                {quizStep === quiz.length - 1
                  ? "Lihat hasil kita"
                  : "Pertanyaan berikutnya"}
              </Button>
            </View>
          </>
        );
      case "adopt":
        return (
          <>
            <Body>Pilih teman kecil yang ingin kalian rawat bersama.</Body>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 10,
                marginVertical: 18,
              }}
            >
              {petSpecies.map((sp) => (
                <Pressable
                  key={sp}
                  accessibilityRole="button"
                  accessibilityLabel={sp}
                  accessibilityState={{ selected: draftSpecies === sp }}
                  aria-pressed={draftSpecies === sp}
                  onPress={() => setDraftSpecies(sp)}
                  style={{
                    width: "48%",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: draftSpecies === sp ? accent : colors.line,
                    backgroundColor:
                      draftSpecies === sp ? "#f7eae6" : "#fffdfa",
                  }}
                >
                  <PetArt size={105} species={sp} happy={draftSpecies === sp} />
                  <Body
                    style={{
                      fontWeight: "600",
                      color: draftSpecies === sp ? accent : colors.ink,
                    }}
                  >
                    {draftSpecies === sp ? "✓ " : ""}
                    {sp}
                  </Body>
                </Pressable>
              ))}
            </View>
            <Field
              label="Nama si kecil"
              value={draftPet}
              onChangeText={setDraftPet}
            />
            <Field
              label="Tanggal lahir (YYYY-MM-DD)"
              value={draftBirthday}
              onChangeText={setDraftBirthday}
            />
            <Body style={{ marginBottom: 22 }}>
              Zodiak: {zodiac(draftBirthday)}
            </Body>
            <Button
              onPress={() => {
                if (
                  !draftPet.trim() ||
                  !validDate(draftBirthday) ||
                  new Date(draftBirthday) > now
                ) {
                  setError(
                    "Isi nama dan tanggal lahir yang valid, tidak di masa depan.",
                  );
                  return;
                }
                setPetName(draftPet.trim());
                setSpecies(draftSpecies);
                setBirthday(draftBirthday);
                setDialog(null);
                notify("Profil teman kecil kalian diperbarui.");
              }}
            >
              Simpan profil pet
            </Button>
          </>
        );
      case "place":
        return (
          <>
            <Body style={{ marginBottom: 22 }}>
              Tambahkan tempat untuk dicoba di peta ilustrasi.
            </Body>
            <Field
              label="Nama tempat"
              value={placeName}
              onChangeText={setPlaceName}
              placeholder="Misalnya, kantor Nana"
            />
            <Button
              onPress={() => {
                if (!placeName.trim()) {
                  setError("Berikan nama untuk tempat ini.");
                  return;
                }
                if (
                  places.some(
                    (p) => p.toLowerCase() === placeName.trim().toLowerCase(),
                  )
                ) {
                  setError("Tempat ini sudah ada di daftar kalian.");
                  return;
                }
                setPlaces((v) => [...v, placeName.trim()]);
                setDialog(null);
                notify("Tempat favorit ditambahkan ke daftar contoh.");
              }}
            >
              Simpan tempat
            </Button>
          </>
        );
      case "profile":
        return (
          <>
            <Body style={{ marginBottom: 20 }}>
              {name} & {partner} · Profil akun terdaftar
            </Body>
            <Field
              label="Tanggal jadian (YYYY-MM-DD)"
              value={draftAnniversary}
              onChangeText={setDraftAnniversary}
            />
            <Button
              onPress={() => {
                if (
                  !validDate(draftAnniversary) ||
                  new Date(draftAnniversary) > now
                ) {
                  setError(
                    "Lengkapi nama dan tanggal jadian yang valid, tidak di masa depan.",
                  );
                  return;
                }
                setAnniversary(draftAnniversary);
                setDialog(null);
                notify("Profil berdua diperbarui.");
              }}
            >
              Simpan cerita kita
            </Button>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <Theme.Provider value={accent}>
      <View style={styles.app}>
        <StatusBar style="dark" />
        {!mobile && (
          <View
            style={[
              styles.sidebar,
              compact && { width: 208, paddingHorizontal: 20 },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Beranda TresNya"
              onPress={() => go("home")}
              style={[s.row, { gap: 11 }]}
            >
              <View style={[styles.brandIcon, { backgroundColor: accent }]}>
                <Icon name="heart" color="#fff8ee" size={22} />
              </View>
              <View>
                <Text style={styles.brand}>
                  TresNya<Text style={{ color: accent }}>.</Text>
                </Text>
                <Text style={styles.brandSub}>CERITA TENTANG KITA</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit kutipan profil"
              onPress={() => openQuote("badgeQuote")}
              style={styles.coupleBadge}
            >
              <View style={styles.quotePencil} pointerEvents="none">
                <Icon name="pencil" size={13} color={accent} />
              </View>
              <View style={s.row}>
                <MyAvatar size={34} />
                <View
                  style={{
                    marginLeft: -21,
                    borderWidth: 3,
                    borderColor: "#f5f0e9",
                    borderRadius: 30,
                  }}
                >
                  <Avatar girl={account.gender === "male"} size={34} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Label style={{ fontSize: 12 }}>
                    {name} & {partner}
                  </Label>
                  <Text
                    numberOfLines={2}
                    style={{ color: "#a69a8f", fontSize: 10, marginTop: 4 }}
                  >
                    {badgeQuote}
                  </Text>
                </View>
              </View>
            </Pressable>
            <Text style={styles.navLabel}>RUANG KITA</Text>
            <View style={{ gap: 8 }}>
              {nav.map((n) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: screen === n.id }}
                  key={n.id}
                  onPress={() => go(n.id)}
                  style={({ hovered }: any) => [
                    styles.navItem,
                    {
                      backgroundColor:
                        screen === n.id
                          ? "#f3e5e2"
                          : hovered
                            ? "#f5f0e9"
                            : "transparent",
                    },
                  ]}
                >
                  <Icon
                    name={n.icon}
                    size={20}
                    color={screen === n.id ? accent : "#948b80"}
                  />
                  <Text
                    style={{
                      color: screen === n.id ? accent : "#887e74",
                      fontSize: 12,
                      fontWeight: screen === n.id ? "600" : "400",
                    }}
                  >
                    {n.label}
                  </Text>
                  {n.id === "pet" && <View style={styles.newDot} />}
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1, minHeight: 28 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit kutipan kartu hati"
              onPress={() => openQuote("sidebarQuote")}
              style={styles.sidebarNote}
            >
              <View style={styles.quotePencil} pointerEvents="none">
                <Icon name="pencil" size={15} color={accent} />
              </View>
              <Icon name="heart" size={23} color="#b79b90" />
              <Text style={styles.noteText} numberOfLines={5}>
                {sidebarQuote}
              </Text>
              <View
                style={{
                  width: 24,
                  height: 1,
                  backgroundColor: "#d9c5b6",
                  marginTop: 10,
                }}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: screen === "settings" }}
              onPress={() => go("settings")}
              style={[
                styles.navItem,
                {
                  marginTop: 25,
                  backgroundColor:
                    screen === "settings" ? "#f3e5e2" : "transparent",
                },
              ]}
            >
              <Icon
                name="settings"
                color={screen === "settings" ? accent : "#948b80"}
              />
              <Body
                style={{
                  fontSize: 12,
                  color: screen === "settings" ? accent : "#887e74",
                }}
              >
                Pengaturan
              </Body>
            </Pressable>
            <View
              style={[s.row, { marginTop: 23, paddingHorizontal: 10, gap: 6 }]}
            >
              <View style={[styles.smallDot, { backgroundColor: "#bda98e" }]} />
              <Text style={{ color: "#aaa091", fontSize: 9 }}>
                SEBAGIAN FITUR MASIH DEMO
              </Text>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={[
              styles.topbar,
              mobile && { paddingHorizontal: 20, height: 72 },
            ]}
          >
            {mobile ? (
              <Pressable accessibilityRole="button" onPress={() => go("home")}>
                <Text style={[styles.brand, { fontSize: 22 }]}>
                  TresNya<Text style={{ color: accent }}>.</Text>
                </Text>
                <Text
                  style={{
                    fontSize: 8,
                    letterSpacing: 1.5,
                    marginTop: 4,
                    color: "#a49485",
                  }}
                >
                  SEBAGIAN FITUR MASIH DEMO
                </Text>
              </Pressable>
            ) : (
              <View style={[s.row, { gap: 7 }]}>
                <Icon name="home" size={14} color="#a69c91" />
                <Text
                  style={{
                    fontSize: 11,
                    color: "#b1a79d",
                    marginHorizontal: 5,
                  }}
                >
                  /
                </Text>
                <Text style={{ fontSize: 11, color: "#8d8177" }}>
                  {screen === "settings"
                    ? "Pengaturan"
                    : nav.find((n) => n.id === screen)?.label}
                </Text>
              </View>
            )}
            <View style={[s.row, { gap: mobile ? 10 : 20 }]}>
              {!mobile && (
                <View style={[s.row, { gap: 6 }]}>
                  <Icon name="shield" size={13} color="#9d9d8b" />
                  <Text style={{ fontSize: 10, color: "#9d978c" }}>
                    Hanya ada kamu & aku
                  </Text>
                </View>
              )}
              <View>
                <IconButton
                  name="bell"
                  label="Buka notifikasi"
                  onPress={() => setDialog("notifications")}
                />
                {unreadStatus && <View style={styles.bellDot} />}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka profil dan pengaturan"
                onPress={() => go("settings")}
              >
                <MyAvatar size={35} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: mobile ? 20 : compact ? 30 : 48,
              paddingTop: mobile ? 26 : 34,
              paddingBottom: 24,
            }}
          >
            <View
              style={{ maxWidth: 1190, width: "100%", alignSelf: "center" }}
            >
              {screen === "home"
                ? Home()
                : screen === "location"
                  ? Location()
                  : screen === "stories"
                    ? Stories()
                    : screen === "games"
                      ? Games()
                      : screen === "surprises"
                        ? Surprises()
                        : screen === "pet"
                          ? Pet()
                          : Settings()}
            </View>
          </ScrollView>
          {mobile && (
            <View nativeID="mobile-bottom-nav" style={styles.bottomNav}>
              {[
                nav[0],
                nav[1],
                nav[2],
                nav[3],
                nav[5],
                {
                  id: "surprises" as Screen,
                  icon: "spark" as IconName,
                  label: "Kejutan",
                },
              ].map((n) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: screen === n.id }}
                  accessibilityLabel={n.label}
                  key={n.id}
                  onPress={() => go(n.id)}
                  style={[
                    styles.bottomItem,
                    screen === n.id && { backgroundColor: "#f4e6e3" },
                  ]}
                >
                  <Icon
                    name={n.icon}
                    color={screen === n.id ? accent : "#a1978c"}
                    size={28}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: screen === n.id ? accent : "#786e65",
                      marginTop: 6,
                    }}
                  >
                    {n.id === "location"
                      ? "Lokasi"
                      : n.id === "games"
                        ? "Main"
                        : n.id === "stories"
                          ? "Cerita"
                          : n.id === "pet"
                            ? "Pet kita"
                            : n.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Modal
          visible={dialog !== null}
          transparent
          animationType={
            reducedMotion || Platform.OS === "web" ? "none" : "fade"
          }
          onRequestClose={() => setDialog(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              accessibilityLabel="Tutup dialog"
              onPress={() => setDialog(null)}
              style={StyleSheet.absoluteFill}
            />
            <View
              accessibilityViewIsModal
              style={[
                styles.modalCard,
                mobile && { width: "100%", padding: 22, borderRadius: 22 },
              ]}
            >
              <View style={[s.between, { marginBottom: 20 }]}>
                <Title style={{ fontSize: mobile ? 23 : 27, flex: 1 }}>
                  {dialog ? dialogTitles[dialog] : ""}
                </Title>
                <IconButton
                  name="close"
                  label="Tutup dialog"
                  onPress={() => setDialog(null)}
                />
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ flexShrink: 1 }}
              >
                {renderDialog()}
                {!!error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
          visible={overlay}
          transparent
          animationType={
            reducedMotion || Platform.OS === "web" ? "none" : "fade"
          }
          onRequestClose={() => setOverlay(false)}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(77, 51, 49, .76)" },
            ]}
          >
            <View
              style={[styles.surprisePreview, { width: mobile ? "92%" : 500 }]}
            >
              {effect === "Hujan hati" && (
                <HeartRain reducedMotion={reducedMotion} />
              )}
              <View style={s.between}>
                <Badge>PRATINJAU KEJUTAN</Badge>
                <IconButton
                  name="close"
                  label="Tutup pratinjau kejutan"
                  onPress={() => setOverlay(false)}
                />
              </View>
              <Text
                style={{
                  fontSize: 47,
                  textAlign: "center",
                  letterSpacing: 12,
                  marginTop: 30,
                }}
              >
                {effect === "Hujan hati"
                  ? "♡ ♥ ♡"
                  : effect === "Getaran"
                    ? "〰 ♡ 〰"
                    : "♫ ♡ ♫"}
              </Text>
              <Title
                style={{
                  textAlign: "center",
                  fontSize: 31,
                  lineHeight: 43,
                  marginVertical: 30,
                }}
              >
                {message}
              </Title>
              <Body style={{ textAlign: "center", marginBottom: 25 }}>
                Dari {name}, dengan semua sayangnya.
                <BrText />
                {effect === "Hujan hati"
                  ? "Peluk kecil dari jauh."
                  : effect === "Getaran"
                    ? "Pratinjau visual efek getaran."
                    : "Pratinjau visual efek suara."}
              </Body>
              <Button onPress={() => setOverlay(false)}>
                Simpan di hati ♡
              </Button>
            </View>
          </View>
        </Modal>
        {!!toast && (
          <View
            pointerEvents="none"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              mobile && { bottom: 125, left: 20, right: 20 },
            ]}
          >
            <Icon name="check" size={17} color="#d6dfc4" />
            <Text
              style={{
                color: "#fffaf1",
                fontSize: 12,
                lineHeight: 19,
                flexShrink: 1,
              }}
            >
              {toast}
            </Text>
          </View>
        )}
      </View>
    </Theme.Provider>
  );
}
function BrText() {
  return <Text>{"\n"}</Text>;
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.cream,
    minHeight: Platform.OS === "web" ? ("100vh" as any) : undefined,
  },
  sidebar: {
    width: 238,
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 27,
    backgroundColor: "#fdfbf7",
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  brandIcon: {
    height: 34,
    width: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  brand: {
    fontFamily: serif,
    fontSize: 20,
    color: "#5e4941",
    letterSpacing: -0.65,
  },
  brandSub: {
    fontSize: 6.5,
    letterSpacing: 1.7,
    color: "#b2a091",
    marginTop: 5,
  },
  coupleBadge: {
    padding: 12,
    paddingRight: 25,
    borderRadius: 12,
    backgroundColor: "#f5f0e9",
    marginTop: 35,
    marginBottom: 35,
  },
  navLabel: {
    fontSize: 8,
    letterSpacing: 1.8,
    color: "#b9aa9a",
    marginBottom: 17,
    marginLeft: 14,
  },
  navItem: {
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    paddingHorizontal: 15,
    minHeight: 46,
    borderRadius: 10,
  },
  newDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#b8c19c",
    marginLeft: "auto",
  },
  quotePencil: {
    position: "absolute",
    right: 7,
    top: 7,
  },
  sidebarNote: {
    borderWidth: 1,
    borderColor: "#eadfce",
    borderRadius: 14,
    paddingVertical: 23,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#f9f4ea",
  },
  noteText: {
    textAlign: "center",
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 15,
    color: "#a38b75",
    lineHeight: 25,
    marginTop: 10,
  },
  topbar: {
    height: 80,
    paddingHorizontal: 47,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fdfbf8",
  },
  bellDot: {
    position: "absolute",
    height: 5,
    width: 5,
    borderRadius: 4,
    right: 11,
    top: 9,
    backgroundColor: "#b47c79",
    borderWidth: 1,
    borderColor: "white",
  },
  dateChip: {
    borderWidth: 1,
    borderColor: "#ebe5dc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 7,
  },
  hero: {
    backgroundColor: "#f0e1dc",
    borderWidth: 1,
    borderColor: "#ebd8d1",
    borderRadius: 20,
    padding: 32,
    minHeight: 249,
    marginBottom: 25,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
  },
  heroLine: { width: 23, height: 1, backgroundColor: "#b4817b" },
  dayNumber: {
    fontFamily: serif,
    fontSize: 80,
    color: "#a2696d",
    letterSpacing: -4,
    lineHeight: 90,
  },
  heroArt: {
    position: "absolute",
    right: 5,
    top: 1,
    bottom: 0,
    width: "42%",
    opacity: 0.95,
  },
  columns: { flexDirection: "row", gap: 22, alignItems: "stretch" },
  vertical: { flexDirection: "column" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 1,
    height: 10,
    width: 10,
    borderWidth: 2,
    borderColor: "#fffefa",
    borderRadius: 6,
    backgroundColor: "#9dae8a",
  },
  statusQuote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginVertical: 18,
    padding: 13,
    backgroundColor: "#f7f4ef",
    borderRadius: 10,
  },
  mapTag: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#fffdf3ed",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  smallDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#9dac8a",
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 5,
    flexWrap: "wrap",
  },
  place: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 10,
    borderRadius: 11,
    marginTop: 8,
  },
  roundIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f3efe7",
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fffefa",
  },
  comment: {
    backgroundColor: "#f6f2ec",
    padding: 12,
    borderRadius: 9,
    marginTop: 12,
  },
  loveButton: {
    backgroundColor: "#f6e7e4",
    width: 102,
    height: 102,
    borderRadius: 51,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginVertical: 24,
    borderWidth: 7,
    borderColor: "#faf0ed",
  },
  effect: {
    flex: 1,
    minWidth: 85,
    gap: 12,
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickMessage: {
    backgroundColor: "#f9f5ef",
    borderWidth: 1,
    borderColor: "#eee6db",
    padding: 13,
    borderRadius: 9,
  },
  careRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  historyRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  settingRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  themeChoice: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    gap: 10,
  },
  bottomNav: {
    flexShrink: 0,
    backgroundColor: "#fffdf9",
    borderTopWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 4,
    gap: 2,
  },
  bottomItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    paddingVertical: 8,
    borderRadius: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(62, 48, 43, .35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: 540,
    maxHeight: "90%",
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 30,
    shadowColor: "#443328",
    shadowOpacity: 0.15,
    shadowRadius: 45,
    shadowOffset: { width: 0, height: 16 },
  },
  mood: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  error: {
    fontSize: 12,
    lineHeight: 20,
    color: "#ab5252",
    backgroundColor: "#fbebea",
    padding: 12,
    marginTop: 16,
    borderRadius: 9,
  },
  notification: {
    paddingVertical: 19,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  quizOption: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  surprisePreview: {
    padding: 30,
    backgroundColor: "#f6e5e1",
    borderRadius: 27,
  },
  toast: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
    left: "36%",
    right: "15%",
    backgroundColor: "#564c43",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#443328",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },
});
