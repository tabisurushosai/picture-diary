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

export type TodayEntryInput = {
  emojis: string[];
  note: string;
};

export type DiaryEntriesByDate = Record<string, DiaryEntry>;

export const diaryEntriesStorageKey = "diaryEntriesByDate";

const defaultEmojiChoices = ["😊", "😐", "😢", "🌤️", "🍙", "📚", "🎨", "🏃"];

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

export function createDiaryStateFromEntries(entriesByDate: DiaryEntriesByDate | null, date = getLocalDateKey()): DiaryState {
  const entries = getEntriesFromDiaryEntriesByDate(entriesByDate);
  const todayEntry = entriesByDate?.[date] ?? createBlankEntry(date);

  return {
    todayEntry: {
      date: todayEntry.date,
      emojis: [...todayEntry.emojis],
      note: todayEntry.note,
    },
    pastEntries: entries,
    emojiChoices: [...defaultEmojiChoices],
  };
}

export function createTodayEntry(input: TodayEntryInput, date = defaultTodayEntry.date): DiaryEntry {
  return {
    date,
    emojis: [...new Set(input.emojis.filter((emoji) => emoji.length > 0))],
    note: input.note.trim().slice(0, 80),
  };
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

export function getEntryNoteText(entry: DiaryEntry): string {
  return entry.note || "ひとことはまだありません";
}
