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

const defaultEmojiChoices = ["😊", "😐", "😢", "🌤️", "🍙", "📚", "🎨", "🏃"];

const defaultTodayEntry: DiaryEntry = {
  date: "今日",
  emojis: ["😊", "🌤️", "🍙"],
  note: "",
};

export function createInitialDiaryState(): DiaryState {
  return {
    todayEntry: {
      ...defaultTodayEntry,
      emojis: [...defaultTodayEntry.emojis],
    },
    pastEntries: [],
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
  return {
    ...state,
    todayEntry: createTodayEntry(input, state.todayEntry.date),
    pastEntries: [...state.pastEntries],
    emojiChoices: [...state.emojiChoices],
  };
}

export function getEntryNoteText(entry: DiaryEntry): string {
  return entry.note || "ひとことはまだありません";
}
