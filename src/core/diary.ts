export type DiaryEntry = {
  date: string;
  emojis: string[];
  note: string;
};

export type DiaryState = {
  todayEntry: DiaryEntry;
  pastEntries: DiaryEntry[];
  emojiChoices: string[];
};

export type DiaryAccessLevel = "free" | "premium";

export type MonthEntryDay = {
  date: string;
  day: number;
  entry: DiaryEntry | null;
};

export type TodayEntryInput = {
  emojis: string[];
  note: string;
};

export type DiaryEntriesByDate = Record<string, DiaryEntry>;

export const diaryEntriesStorageKey = "diaryEntriesByDate";

const defaultEmojiChoices = ["😊", "😐", "😢", "🌤️", "🍙", "📚", "🎨", "🏃"];
const premiumEmojiChoices = ["🎵", "🧩", "🌈", "⭐", "🌱", "🚲", "🧸", "🏖️"];
const freeVisibleDays = 7;

function createBlankEntry(date: string): DiaryEntry {
  return {
    date,
    emojis: ["😊", "🌤️", "🍙"],
    note: "",
  };
}

function sortEntriesByDateDesc(entries: DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKeyDaysAgo(date: string, daysAgo: number): string {
  const baseDate = new Date(`${date}T00:00:00`);
  baseDate.setDate(baseDate.getDate() - daysAgo);

  return getLocalDateKey(baseDate);
}

export function entriesToDiaryEntriesByDate(entries: DiaryEntry[]): DiaryEntriesByDate {
  return entries.reduce<DiaryEntriesByDate>((entriesByDate, entry) => {
    entriesByDate[entry.date] = {
      date: entry.date,
      emojis: [...entry.emojis],
      note: entry.note,
    };

    return entriesByDate;
  }, {});
}

export function getEntriesFromDiaryEntriesByDate(entriesByDate: DiaryEntriesByDate | null): DiaryEntry[] {
  if (!entriesByDate) {
    return [];
  }

  return sortEntriesByDateDesc(Object.values(entriesByDate));
}

export function getVisibleEntriesForAccess(
  entries: DiaryEntry[],
  accessLevel: DiaryAccessLevel,
  date = getLocalDateKey(),
): DiaryEntry[] {
  if (accessLevel === "premium") {
    return sortEntriesByDateDesc(entries);
  }

  const oldestVisibleDate = getDateKeyDaysAgo(date, freeVisibleDays - 1);

  return sortEntriesByDateDesc(entries.filter((entry) => entry.date >= oldestVisibleDate));
}

export function upsertEntryByDate(entriesByDate: DiaryEntriesByDate | null, entry: DiaryEntry): DiaryEntriesByDate {
  return {
    ...(entriesByDate ?? {}),
    [entry.date]: {
      date: entry.date,
      emojis: [...entry.emojis],
      note: entry.note,
    },
  };
}

export function deleteEntryByDate(entriesByDate: DiaryEntriesByDate | null, date: string): DiaryEntriesByDate {
  const nextEntriesByDate = { ...(entriesByDate ?? {}) };
  delete nextEntriesByDate[date];

  return nextEntriesByDate;
}

const defaultTodayEntry: DiaryEntry = {
  date: getLocalDateKey(),
  emojis: ["😊", "🌤️", "🍙"],
  note: "",
};

export function createInitialDiaryState(date = getLocalDateKey()): DiaryState {
  return {
    todayEntry: createBlankEntry(date),
    pastEntries: [],
    emojiChoices: [...defaultEmojiChoices],
  };
}

export function createDiaryStateFromEntries(
  entriesByDate: DiaryEntriesByDate | null,
  date = getLocalDateKey(),
  accessLevel: DiaryAccessLevel = "free",
): DiaryState {
  const entries = getEntriesFromDiaryEntriesByDate(entriesByDate);
  const todayEntry = entriesByDate?.[date] ?? createBlankEntry(date);

  return {
    todayEntry: {
      date: todayEntry.date,
      emojis: [...todayEntry.emojis],
      note: todayEntry.note,
    },
    pastEntries: getVisibleEntriesForAccess(entries, accessLevel, date),
    emojiChoices: accessLevel === "premium" ? [...defaultEmojiChoices, ...premiumEmojiChoices] : [...defaultEmojiChoices],
  };
}

export function createTodayEntry(input: TodayEntryInput, date = defaultTodayEntry.date): DiaryEntry {
  return {
    date,
    emojis: [...new Set(input.emojis.filter((emoji) => emoji.length > 0))],
    note: input.note.trim().slice(0, 80),
  };
}

export function updateEntryByDate(
  entriesByDate: DiaryEntriesByDate | null,
  date: string,
  input: TodayEntryInput,
): DiaryEntriesByDate {
  return upsertEntryByDate(entriesByDate, createTodayEntry(input, date));
}

export function updateTodayEntry(state: DiaryState, input: TodayEntryInput): DiaryState {
  const todayEntry = createTodayEntry(input, state.todayEntry.date);

  return {
    ...state,
    todayEntry,
    pastEntries: getEntriesFromDiaryEntriesByDate(upsertEntryByDate(entriesToDiaryEntriesByDate(state.pastEntries), todayEntry)),
    emojiChoices: [...state.emojiChoices],
  };
}

export function hasEntryNote(entry: DiaryEntry): boolean {
  return entry.note.length > 0;
}

export function createMonthEntryDays(
  entriesByDate: DiaryEntriesByDate | null,
  yearMonth = getLocalDateKey().slice(0, 7),
): MonthEntryDay[] {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${yearMonth}-${String(day).padStart(2, "0")}`;
    const entry = entriesByDate?.[date] ?? null;

    return {
      date,
      day,
      entry: entry
        ? {
            date: entry.date,
            emojis: [...entry.emojis],
            note: entry.note,
          }
        : null,
    };
  });
}
