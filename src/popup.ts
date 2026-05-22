import { createInitialDiaryState, getEntryNoteText, type DiaryEntry, type DiaryState } from "./core/diary";

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

function renderEmojiPicker(emojiChoices: string[]): HTMLElement {
  const fieldset = createElement("fieldset", "emoji-picker");
  const legend = createElement("legend", undefined, "えもじ");

  fieldset.append(legend);

  for (const emoji of emojiChoices) {
    const label = createElement("label", "emoji-choice");
    const input = createElement("input");

    input.type = "checkbox";
    input.name = "emoji";
    input.value = emoji;

    label.append(input, document.createTextNode(emoji));
    fieldset.append(label);
  }

  return fieldset;
}

function renderTodaySection(entry: DiaryEntry, emojiChoices: string[]): HTMLElement {
  const section = createElement("section", "panel");
  const heading = createElement("h2", undefined, "今日の記録");
  const form = createElement("form", "entry-form");
  const noteLabel = createElement("label", "note-label", "ひとこと");
  const noteInput = createElement("textarea");
  const actionRow = createElement("div", "action-row");
  const saveButton = createElement("button", "primary-button", "保存");

  noteInput.name = "note";
  noteInput.rows = 3;
  noteInput.maxLength = 80;
  noteInput.placeholder = "きょうあったこと";
  noteInput.value = entry.note;

  saveButton.type = "button";

  noteLabel.append(noteInput);
  actionRow.append(saveButton);
  form.append(renderEmojiPicker(emojiChoices), noteLabel, actionRow);
  section.append(heading, form);

  return section;
}

function renderEntryCard(entry: DiaryEntry): HTMLElement {
  const article = createElement("article", "entry-card");
  const date = createElement("time", "entry-date", entry.date);
  const emojis = createElement("div", "entry-emojis", entry.emojis.join(" "));
  const note = createElement("p", "entry-note", getEntryNoteText(entry));

  article.append(date, emojis, note);

  return article;
}

function renderPastSection(entries: DiaryEntry[]): HTMLElement {
  const section = createElement("section", "panel");
  const heading = createElement("h2", undefined, "過去の記録");
  const list = createElement("div", "entry-list");

  if (entries.length === 0) {
    list.append(createElement("p", "empty-state", "まだ過去の記録はありません"));
  } else {
    for (const entry of entries) {
      list.append(renderEntryCard(entry));
    }
  }

  section.append(heading, list);

  return section;
}

function applyStyles(): void {
  const style = createElement("style");

  style.textContent = `
    :root {
      color: #242424;
      background: #f8f7f2;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      width: 320px;
      margin: 0;
      background: #f8f7f2;
    }

    .app-shell {
      display: grid;
      gap: 12px;
      padding: 14px;
    }

    .app-header h1,
    h2,
    p {
      margin: 0;
    }

    .app-header h1 {
      font-size: 20px;
      line-height: 1.2;
    }

    .app-header p {
      margin-top: 4px;
      color: #5f665b;
      font-size: 12px;
      line-height: 1.5;
    }

    .panel {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid #dfded6;
      border-radius: 8px;
      background: #ffffff;
    }

    h2 {
      font-size: 15px;
      line-height: 1.3;
    }

    .entry-form {
      display: grid;
      gap: 10px;
    }

    .emoji-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .emoji-picker legend,
    .note-label {
      width: 100%;
      color: #4e564b;
      font-size: 12px;
      font-weight: 700;
    }

    .emoji-choice {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #d8d7cf;
      border-radius: 8px;
      background: #fbfaf6;
      font-size: 18px;
      cursor: pointer;
    }

    .emoji-choice input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .note-label {
      display: grid;
      gap: 6px;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      resize: vertical;
      border: 1px solid #d8d7cf;
      border-radius: 8px;
      padding: 8px;
      color: #242424;
      font: inherit;
      font-size: 13px;
      line-height: 1.5;
    }

    .action-row {
      display: flex;
      justify-content: flex-end;
    }

    .primary-button {
      min-width: 72px;
      border: 0;
      border-radius: 8px;
      padding: 8px 12px;
      background: #2f6f5e;
      color: #ffffff;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .entry-list {
      display: grid;
      gap: 8px;
    }

    .entry-card {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 4px 8px;
      min-width: 0;
      padding: 10px;
      border-radius: 8px;
      background: #f4f6f3;
    }

    .entry-date {
      color: #4e564b;
      font-size: 12px;
      font-weight: 700;
    }

    .entry-emojis {
      min-width: 0;
      font-size: 18px;
      line-height: 1.2;
      text-align: right;
    }

    .entry-note {
      grid-column: 1 / -1;
      color: #30362f;
      font-size: 13px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .empty-state {
      color: #73786f;
      font-size: 13px;
      line-height: 1.5;
    }
  `;

  document.head.append(style);
}

function renderPopup(state: DiaryState): void {
  const root = document.querySelector<HTMLElement>("#app");

  if (!root) {
    return;
  }

  applyStyles();

  const shell = createElement("main", "app-shell");
  const header = createElement("header", "app-header");
  const title = createElement("h1", undefined, "えにっき");
  const description = createElement("p", undefined, "絵文字とひとことで、今日をのこす");

  header.append(title, description);
  shell.append(header, renderTodaySection(state.todayEntry, state.emojiChoices), renderPastSection(state.pastEntries));
  root.replaceChildren(shell);
}

renderPopup(createInitialDiaryState());
