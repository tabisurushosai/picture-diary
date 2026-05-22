import {
  createMonthEntryDays,
  createInitialDiaryState,
  createDiaryStateFromEntries,
  deleteEntryByDate,
  diaryEntriesStorageKey,
  hasEntryNote,
  updateEntryByDate,
  updateTodayEntry,
  upsertEntryByDate,
  type DiaryEntriesByDate,
  type DiaryEntry,
  type DiaryState,
} from "./core/diary";
import {
  createInitialPremiumState,
  getPremiumStatus,
  premiumStorageKey,
  startTrial,
  stripeCheckoutUrl,
  type PremiumState,
} from "./core/premium";
import { store } from "./storage";

let diaryState = createInitialDiaryState();
let premiumState = createInitialPremiumState();
let entriesByDateState: DiaryEntriesByDate | null = null;
let statusMessage = "";
let editingEntryDate = "";

type MessageKey =
  | "appTitle"
  | "appDescription"
  | "todayHeading"
  | "pastHeading"
  | "emojiLegend"
  | "noteLabel"
  | "notePlaceholder"
  | "saveButton"
  | "editButton"
  | "deleteButton"
  | "cancelButton"
  | "emptyPastEntries"
  | "emptyNote"
  | "savedStatus"
  | "deletedStatus"
  | "updatedStatus"
  | "premiumHeading"
  | "premiumFreeStatus"
  | "premiumTrialStatus"
  | "premiumActiveStatus"
  | "premiumBenefits"
  | "startTrialButton"
  | "checkoutButton"
  | "monthHeading";

function t(key: MessageKey): string {
  return chrome.i18n.getMessage(key);
}

function getCurrentPremiumStatus() {
  return getPremiumStatus(premiumState);
}

function createDiaryState(entriesByDate: DiaryEntriesByDate | null, todayDate?: string): DiaryState {
  return createDiaryStateFromEntries(entriesByDate, todayDate, getCurrentPremiumStatus().accessLevel);
}

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

function renderEmojiPicker(emojiChoices: string[], selectedEmojis: string[]): HTMLElement {
  const fieldset = createElement("fieldset", "emoji-picker");
  const legend = createElement("legend", undefined, t("emojiLegend"));
  const selectedEmojiSet = new Set(selectedEmojis);

  fieldset.append(legend);

  for (const emoji of emojiChoices) {
    const label = createElement("label", "emoji-choice");
    const input = createElement("input");

    input.type = "checkbox";
    input.name = "emoji";
    input.value = emoji;
    input.checked = selectedEmojiSet.has(emoji);

    label.append(input, document.createTextNode(emoji));
    fieldset.append(label);
  }

  return fieldset;
}

function renderTodaySection(entry: DiaryEntry, emojiChoices: string[], message: string): HTMLElement {
  const section = createElement("section", "panel");
  const heading = createElement("h2", undefined, t("todayHeading"));
  const form = createElement("form", "entry-form");
  const noteLabel = createElement("label", "note-label", t("noteLabel"));
  const noteInput = createElement("textarea");
  const actionRow = createElement("div", "action-row");
  const saveButton = createElement("button", "primary-button", t("saveButton"));
  const preview = renderEntryCard(entry);

  noteInput.name = "note";
  noteInput.rows = 3;
  noteInput.maxLength = 80;
  noteInput.placeholder = t("notePlaceholder");
  noteInput.value = entry.note;

  saveButton.type = "submit";

  noteLabel.append(noteInput);
  actionRow.append(saveButton);
  form.append(renderEmojiPicker(emojiChoices, entry.emojis), noteLabel, actionRow);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const emojis = formData.getAll("emoji").filter((value): value is string => typeof value === "string");
    const note = formData.get("note");

    const nextState = updateTodayEntry(diaryState, {
      emojis,
      note: typeof note === "string" ? note : "",
    });
    const entriesByDate = upsertEntryByDate(
      await store.get<DiaryEntriesByDate>(diaryEntriesStorageKey),
      nextState.todayEntry,
    );

    await store.set(diaryEntriesStorageKey, entriesByDate);

    entriesByDateState = entriesByDate;
    diaryState = createDiaryState(entriesByDate, nextState.todayEntry.date);
    editingEntryDate = "";
    statusMessage = t("savedStatus");
    renderPopup(diaryState);
  });

  section.append(heading, form);

  if (message) {
    section.append(createElement("p", "form-status", message));
  }

  section.append(preview);

  return section;
}

async function persistEntriesByDate(entriesByDate: DiaryEntriesByDate): Promise<void> {
  if (Object.keys(entriesByDate).length === 0) {
    await store.remove(diaryEntriesStorageKey);
    return;
  }

  await store.set(diaryEntriesStorageKey, entriesByDate);
}

function renderEntryCard(entry: DiaryEntry, emojiChoices?: string[]): HTMLElement {
  const article = createElement("article", "entry-card");
  const date = createElement("time", "entry-date", entry.date);
  const emojis = createElement("div", "entry-emojis", entry.emojis.join(" "));
  const note = createElement("p", "entry-note", hasEntryNote(entry) ? entry.note : t("emptyNote"));

  article.append(date, emojis, note);

  if (emojiChoices) {
    const actions = createElement("div", "entry-actions");
    const editButton = createElement("button", "secondary-button", t("editButton"));
    const deleteButton = createElement("button", "danger-button", t("deleteButton"));

    editButton.type = "button";
    deleteButton.type = "button";

    editButton.addEventListener("click", () => {
      editingEntryDate = entry.date;
      statusMessage = "";
      renderPopup(diaryState);
    });

    deleteButton.addEventListener("click", async () => {
      const currentEntriesByDate = await store.get<DiaryEntriesByDate>(diaryEntriesStorageKey);
      const entriesByDate = deleteEntryByDate(currentEntriesByDate, entry.date);

      await persistEntriesByDate(entriesByDate);

      entriesByDateState = entriesByDate;
      diaryState = createDiaryState(entriesByDate);
      editingEntryDate = "";
      statusMessage = t("deletedStatus");
      renderPopup(diaryState);
    });

    actions.append(editButton, deleteButton);
    article.append(actions);
  }

  return article;
}

function renderEntryEditForm(entry: DiaryEntry, emojiChoices: string[]): HTMLElement {
  const form = createElement("form", "entry-form entry-edit-form");
  const noteLabel = createElement("label", "note-label", t("noteLabel"));
  const noteInput = createElement("textarea");
  const actions = createElement("div", "entry-actions");
  const saveButton = createElement("button", "primary-button", t("saveButton"));
  const cancelButton = createElement("button", "secondary-button", t("cancelButton"));

  noteInput.name = "note";
  noteInput.rows = 3;
  noteInput.maxLength = 80;
  noteInput.placeholder = t("notePlaceholder");
  noteInput.value = entry.note;

  saveButton.type = "submit";
  cancelButton.type = "button";

  cancelButton.addEventListener("click", () => {
    editingEntryDate = "";
    statusMessage = "";
    renderPopup(diaryState);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const emojis = formData.getAll("emoji").filter((value): value is string => typeof value === "string");
    const note = formData.get("note");
    const currentEntriesByDate = await store.get<DiaryEntriesByDate>(diaryEntriesStorageKey);
    const entriesByDate = updateEntryByDate(currentEntriesByDate, entry.date, {
      emojis,
      note: typeof note === "string" ? note : "",
    });

    await persistEntriesByDate(entriesByDate);

    entriesByDateState = entriesByDate;
    diaryState = createDiaryState(entriesByDate);
    editingEntryDate = "";
    statusMessage = t("updatedStatus");
    renderPopup(diaryState);
  });

  noteLabel.append(noteInput);
  actions.append(saveButton, cancelButton);
  form.append(renderEmojiPicker(emojiChoices, entry.emojis), noteLabel, actions);

  return form;
}

function renderEditableEntry(entry: DiaryEntry, emojiChoices: string[]): HTMLElement {
  if (entry.date === editingEntryDate) {
    const article = createElement("article", "entry-card entry-card-editing");
    const date = createElement("time", "entry-date", entry.date);

    article.append(date, renderEntryEditForm(entry, emojiChoices));

    return article;
  }

  return renderEntryCard(entry, emojiChoices);
}

function renderPastSection(entries: DiaryEntry[], emojiChoices: string[]): HTMLElement {
  const section = createElement("section", "panel");
  const heading = createElement("h2", undefined, t("pastHeading"));
  const list = createElement("div", "entry-list");

  if (entries.length === 0) {
    list.append(createElement("p", "empty-state", t("emptyPastEntries")));
  } else {
    for (const entry of entries) {
      list.append(renderEditableEntry(entry, emojiChoices));
    }
  }

  section.append(heading, list);

  return section;
}

function renderPremiumSection(): HTMLElement {
  const status = getCurrentPremiumStatus();
  const section = createElement("section", "panel premium-panel");
  const heading = createElement("h2", undefined, t("premiumHeading"));
  const statusText =
    status.kind === "premium"
      ? t("premiumActiveStatus")
      : status.kind === "trial"
        ? t("premiumTrialStatus").replace("$days$", String(status.trialDaysRemaining))
        : t("premiumFreeStatus");
  const statusNode = createElement("p", "premium-status", statusText);
  const benefits = createElement("p", "premium-benefits", t("premiumBenefits"));
  const actions = createElement("div", "entry-actions");
  const checkoutButton = createElement("button", "secondary-button", t("checkoutButton"));

  checkoutButton.type = "button";
  checkoutButton.addEventListener("click", () => {
    globalThis.open(stripeCheckoutUrl, "_blank", "noopener");
  });

  actions.append(checkoutButton);

  if (status.kind === "free") {
    const trialButton = createElement("button", "primary-button", t("startTrialButton"));

    trialButton.type = "button";
    trialButton.addEventListener("click", async () => {
      premiumState = startTrial(premiumState);
      await store.set(premiumStorageKey, premiumState);

      diaryState = createDiaryState(entriesByDateState);
      editingEntryDate = "";
      statusMessage = "";
      renderPopup(diaryState);
    });

    actions.prepend(trialButton);
  }

  section.append(heading, statusNode, benefits, actions);

  return section;
}

function renderMonthSection(entriesByDate: DiaryEntriesByDate | null): HTMLElement {
  const section = createElement("section", "panel");
  const heading = createElement("h2", undefined, t("monthHeading"));
  const monthGrid = createElement("div", "month-grid");

  for (const day of createMonthEntryDays(entriesByDate)) {
    const dayCell = createElement("div", day.entry ? "month-day has-entry" : "month-day");
    const dayNumber = createElement("span", "month-day-number", String(day.day));
    const emojis = createElement("span", "month-day-emojis", day.entry ? day.entry.emojis.slice(0, 3).join("") : "");

    dayCell.title = day.date;
    dayCell.append(dayNumber, emojis);
    monthGrid.append(dayCell);
  }

  section.append(heading, monthGrid);

  return section;
}

function applyStyles(): void {
  if (document.querySelector("#popup-style")) {
    return;
  }

  const style = createElement("style");
  style.id = "popup-style";

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

    .emoji-choice:has(input:checked) {
      border-color: #2f6f5e;
      background: #e8f2ee;
      box-shadow: inset 0 0 0 1px #2f6f5e;
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

    .secondary-button,
    .danger-button {
      min-width: 64px;
      border: 1px solid #c9cbc4;
      border-radius: 8px;
      padding: 7px 10px;
      background: #ffffff;
      color: #30362f;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .danger-button {
      border-color: #dbb9b2;
      color: #9b2d20;
    }

    .form-status {
      color: #2f6f5e;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
    }

    .premium-status,
    .premium-benefits {
      color: #4e564b;
      font-size: 12px;
      line-height: 1.5;
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

    .entry-card-editing {
      background: #fbfaf6;
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

    .entry-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    .entry-edit-form {
      grid-column: 1 / -1;
    }

    .empty-state {
      color: #73786f;
      font-size: 13px;
      line-height: 1.5;
    }

    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .month-day {
      display: grid;
      align-content: space-between;
      min-height: 34px;
      border: 1px solid #e4e2da;
      border-radius: 6px;
      padding: 4px;
      background: #fbfaf6;
      overflow: hidden;
    }

    .month-day.has-entry {
      border-color: #a9c7bd;
      background: #eaf4f0;
    }

    .month-day-number {
      color: #4e564b;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
    }

    .month-day-emojis {
      min-height: 14px;
      font-size: 12px;
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
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
  document.title = t("appTitle");

  const shell = createElement("main", "app-shell");
  const header = createElement("header", "app-header");
  const title = createElement("h1", undefined, t("appTitle"));
  const description = createElement("p", undefined, t("appDescription"));

  header.append(title, description);
  shell.append(header, renderPremiumSection(), renderTodaySection(state.todayEntry, state.emojiChoices, statusMessage));

  if (getCurrentPremiumStatus().accessLevel === "premium") {
    shell.append(renderMonthSection(entriesByDateState));
  }

  shell.append(renderPastSection(state.pastEntries, state.emojiChoices));
  root.replaceChildren(shell);
}

async function initializePopup(): Promise<void> {
  const entriesByDate = await store.get<DiaryEntriesByDate>(diaryEntriesStorageKey);
  const savedPremiumState = await store.get<PremiumState>(premiumStorageKey);

  entriesByDateState = entriesByDate;
  premiumState = savedPremiumState ?? createInitialPremiumState();
  diaryState = createDiaryState(entriesByDate);
  editingEntryDate = "";
  statusMessage = "";
  renderPopup(diaryState);
}

void initializePopup();
