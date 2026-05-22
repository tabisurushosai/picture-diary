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

export function getEntryNoteText(entry: DiaryEntry): string {
  return entry.note || "ひとことはまだありません";
}
