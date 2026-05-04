const STORAGE_KEY = "academy-admin-course-state";
const ACTIVE_LESSON_KEY = "academy-admin-active-lesson";
const ACTIVE_STUDENT_LESSON_KEY = "academy-student-active-lesson";
const PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;
const FILE_MAX_BYTES = 6 * 1024 * 1024;
const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

const loadState = () => {
  const activeCourse = window.AcademyStore?.getActiveCourse();
  if (activeCourse) return activeCourse;

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveState = (state) => {
  if (window.AcademyStore) {
    window.AcademyStore.saveActiveCourse(state);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const createId = (prefix = "item") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const findLesson = (items, lessonId, parentSection = null) => {
  for (const item of items || []) {
    if (item.type === "lesson" && item.id === lessonId) return { lesson: item, parentSection };
    if (item.children) {
      const found = findLesson(item.children, lessonId, item.type === "section" ? item : parentSection);
      if (found) return found;
    }
  }
  return null;
};

const findFirstLesson = (items, parentSection = null) => {
  for (const item of items || []) {
    if (item.type === "lesson") return { lesson: item, parentSection };
    if (item.children) {
      const found = findFirstLesson(item.children, item.type === "section" ? item : parentSection);
      if (found) return found;
    }
  }
  return null;
};

const ensureEditableLesson = (state, activeLessonId) => {
  const found = findLesson(state.items || [], activeLessonId) || findFirstLesson(state.items || []);
  if (found) return found;

  state.items = Array.isArray(state.items) ? state.items : [];
  const lesson = {
    id: createId(),
    type: "lesson",
    title: "Урок 1",
    hidden: false,
    required: true,
    content: [],
  };

  state.items.push(lesson);
  localStorage.setItem(ACTIVE_LESSON_KEY, lesson.id);
  saveState(state);
  return { lesson, parentSection: null };
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatFileSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getRutubeEmbedUrl = (url = "") => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("rutube.ru")) return "";
    const match = parsed.pathname.match(/\/(?:video|play\/embed)\/(?:private\/)?([^/]+)/);
    if (!match?.[1]) return "";
    if (match[1].length < 12) return "";
    const embed = new URL(`https://rutube.ru/play/embed/${match[1]}/`);
    const privateKey = parsed.searchParams.get("p");
    if (privateKey) embed.searchParams.set("p", privateKey);
    return embed.href;
  } catch {
    return "";
  }
};

const iconForBlock = (type) => {
  if (type === "text") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6h14M12 6v12M8 18h8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>`;
  }
  if (type === "photo") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14v10H5z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="m8 13 2-2 4 4 2-2 3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/></svg>`;
  }
  if (type === "video") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h11v10H5z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="m16 10 4-2v8l-4-2V10Z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/></svg>`;
  }
  if (type === "file") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h7l5 5v11H7z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M14 4v5h5M9 15h6M9 18h4" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>`;
  }
  if (type === "audio") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V6l10-2v12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><circle cx="7" cy="18" r="3" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="16" r="3" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5h10l2 3v11H5V8l2-3Z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M8 12h8M8 16h5" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>`;
};

const labelForBlock = (type) => {
  if (type === "text") return "Текстовый блок";
  if (type === "photo") return "Фото";
  if (type === "video") return "Видео";
  if (type === "file") return "Файл";
  if (type === "audio") return "Аудио";
  return "Тест";
};

const defaultTextHtml = `
  <p>Этот блок помогает раскрыть тему урока. Здесь можно вставить вводный текст, основные мысли и короткие пояснения.</p>
  <p>Текст сохраняется как контент урока и потом выводится на странице ученика.</p>
`;

const normalizeTextHtml = (block) => {
  if (block.html) return block.html;
  if (typeof block.content === "string") return block.content;
  return defaultTextHtml;
};

const textTools = [
  { id: "bold", label: "B", title: "Жирный", command: "bold" },
  { id: "italic", label: "I", title: "Курсив", command: "italic" },
  { id: "underline", label: "U", title: "Подчеркнуть", command: "underline" },
  { id: "strike", label: "S", title: "Зачеркнуть", command: "strikeThrough" },
  { id: "h1", label: "H1", title: "Заголовок H1", block: "H1" },
  { id: "h2", label: "H2", title: "Заголовок H2", block: "H2" },
  { id: "h3", label: "H3", title: "Заголовок H3", block: "H3" },
  { id: "paragraph", label: "¶", title: "Обычный текст", block: "P" },
  { id: "bulletList", label: "•", title: "Маркированный список", command: "insertUnorderedList" },
  { id: "orderedList", label: "1.", title: "Нумерованный список", command: "insertOrderedList" },
  { id: "blockquote", label: "“”", title: "Цитата", block: "BLOCKQUOTE" },
  { id: "codeBlock", label: "</>", title: "Код", block: "PRE" },
];

const getSelectionParent = (host) => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  let node = selection.anchorNode;
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return node instanceof Element && host.contains(node) ? node.closest("h1,h2,h3,p,blockquote,pre,li") : null;
};

const createTextEditor = ({ block, host, persist }) => {
  const toolbar = document.createElement("div");
  toolbar.className = "rich-editor-toolbar";
  toolbar.setAttribute("aria-label", "Панель форматирования текста");

  const editable = document.createElement("div");
  editable.className = "editor-host tiptap";
  editable.contentEditable = "true";
  editable.spellcheck = true;
  editable.innerHTML = normalizeTextHtml(block);

  const saveContent = () => {
    block.html = editable.innerHTML;
    block.content = editable.innerHTML;
    persist();
  };

  const runCommand = (tool) => {
    editable.focus();

    if (tool.block) {
      document.execCommand("formatBlock", false, tool.block);
      saveContent();
      refreshActiveState();
      return;
    }

    document.execCommand(tool.command, false);
    saveContent();
    refreshActiveState();
  };

  const refreshActiveState = () => {
    const parent = getSelectionParent(editable);
    toolbar.querySelectorAll("[data-rich-tool]").forEach((button) => {
      const tool = textTools.find((item) => item.id === button.dataset.richTool);
      const activeByCommand = tool?.command && document.queryCommandState(tool.command);
      const activeByBlock = tool?.block && parent?.tagName === tool.block;
      button.classList.toggle("rich-editor-tool--active", Boolean(activeByCommand || activeByBlock));
    });
  };

  textTools.forEach((tool) => {
    const button = document.createElement("button");
    button.className = `rich-editor-tool rich-editor-tool--${tool.id}`;
    button.type = "button";
    button.dataset.richTool = tool.id;
    button.title = tool.title;
    button.setAttribute("aria-label", tool.title);
    button.textContent = tool.label;
    button.addEventListener("click", () => runCommand(tool));
    toolbar.appendChild(button);
  });

  const linkButton = document.createElement("button");
  linkButton.className = "rich-editor-tool rich-editor-tool--link";
  linkButton.type = "button";
  linkButton.title = "Гиперссылка";
  linkButton.setAttribute("aria-label", "Гиперссылка");
  linkButton.textContent = "↗";
  linkButton.addEventListener("click", () => {
    editable.focus();
    const href = window.prompt("Вставьте ссылку", "https://");
    if (!href) return;
    document.execCommand("createLink", false, href.trim());
    saveContent();
  });
  toolbar.appendChild(linkButton);

  const divider = document.createElement("span");
  divider.className = "rich-editor-divider";
  toolbar.appendChild(divider);

  [
    { id: "undo", label: "↶", title: "Отменить", command: "undo" },
    { id: "redo", label: "↷", title: "Повторить", command: "redo" },
  ].forEach((tool) => {
    const button = document.createElement("button");
    button.className = `rich-editor-tool rich-editor-tool--${tool.id}`;
    button.type = "button";
    button.title = tool.title;
    button.setAttribute("aria-label", tool.title);
    button.textContent = tool.label;
    button.addEventListener("click", () => {
      editable.focus();
      document.execCommand(tool.command, false);
      saveContent();
    });
    toolbar.appendChild(button);
  });

  editable.addEventListener("input", saveContent);
  editable.addEventListener("keyup", refreshActiveState);
  editable.addEventListener("mouseup", refreshActiveState);
  editable.addEventListener("blur", saveContent);

  host.append(toolbar, editable);
  queueMicrotask(refreshActiveState);
};

const renderLessonEditor = () => {
  const state = loadState();
  const activeLessonId = localStorage.getItem(ACTIVE_LESSON_KEY);
  const { lesson, parentSection } = ensureEditableLesson(state, activeLessonId);

  const titleInput = document.querySelector("[data-lesson-title]");
  const breadcrumbTitle = document.querySelector("[data-lesson-breadcrumb-title]");
  const breadcrumbSection = document.querySelector("[data-lesson-section]");
  const blocksRoot = document.querySelector("[data-blocks-root]");
  const emptyState = document.querySelector("[data-empty-state]");
  const saveButton = document.querySelector("[data-save-lesson]");
  const previewButton = document.querySelector("[data-preview-lesson]");
  const noticeNode = document.createElement("div");
  noticeNode.className = "builder-summary";
  noticeNode.setAttribute("role", "status");
  noticeNode.hidden = true;
  saveButton.insertAdjacentElement("afterend", noticeNode);

  breadcrumbSection.textContent = parentSection?.title || "Курс";
  titleInput.value = lesson.title || "Новый урок";
  breadcrumbTitle.textContent = lesson.title || "Урок";
  lesson.content = Array.isArray(lesson.content) ? lesson.content : [];

  const persist = () => saveState(state);

  const showNotice = (message) => {
    noticeNode.textContent = message;
    noticeNode.hidden = false;
  };

  const scrollToBlock = (blockId) => {
    window.requestAnimationFrame(() => {
      Array.from(blocksRoot.querySelectorAll("[data-block-id]"))
        .find((node) => node.dataset.blockId === blockId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const renderBlocks = () => {
    blocksRoot.innerHTML = "";
    emptyState.hidden = lesson.content.length > 0;
    let removedVideoFiles = false;

    lesson.content.forEach((block) => {
      const article = document.createElement("article");
      article.className = "content-block";
      article.dataset.blockId = block.id;
      article.innerHTML = `
        <div class="content-block__head">
          <div class="content-block__title">${iconForBlock(block.type)}<span>${labelForBlock(block.type)}</span></div>
          <div class="content-block__actions">
            <button class="icon-action" type="button" data-action="remove-block" data-id="${block.id}" aria-label="Удалить блок">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M7 7l1 12h8l1-12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
            </button>
          </div>
        </div>
      `;

      if (block.type === "text") {
        const chip = document.createElement("div");
        chip.className = "block-chip";
        chip.textContent = "Редактор";
        article.querySelector(".content-block__actions").prepend(chip);

        const editorShell = document.createElement("div");
        editorShell.className = "rich-editor";
        article.appendChild(editorShell);
        createTextEditor({ block, host: editorShell, persist });
      }

      if (block.type === "photo") {
        article.insertAdjacentHTML("beforeend", `
          <div class="upload-zone">
            <strong>Загрузите изображение для урока</strong>
            <span class="section-copy">Поддерживается локальный файл. После загрузки картинка появится внутри урока.</span>
            <label class="button button-outline" for="photo-${block.id}">Выбрать файл</label>
            <input class="visually-hidden" id="photo-${block.id}" type="file" accept="image/*" data-photo-input="${block.id}">
          </div>
          ${block.src ? `<div class="upload-preview"><img src="${block.src}" alt="${escapeHtml(block.alt || "Изображение урока")}"></div>` : ""}
        `);
      }

      if (block.type === "video") {
        block.mode = "url";
        if (block.fileSrc) {
          delete block.fileSrc;
          removedVideoFiles = true;
        }
        const embedUrl = getRutubeEmbedUrl(block.url);
        article.insertAdjacentHTML("beforeend", `
          <div class="video-source">
            <div class="block-chip">Вставьте ссылку Rutube. Видео откроется плеером в уроке.</div>
            <div class="video-source__panel" data-panel="${block.id}-url">
              <label class="field">
                <span class="field-label">Ссылка на Rutube</span>
                <span class="field-control">
                  <input class="input" type="url" placeholder="https://rutube.ru/..." value="${escapeHtml(block.url || "")}" data-video-url="${block.id}">
                </span>
              </label>
            </div>
            ${embedUrl ? `<div class="student-video-frame student-video-frame--editor"><iframe src="${escapeHtml(embedUrl)}" allow="clipboard-write; autoplay" allowfullscreen title="Предпросмотр видео"></iframe></div>` : ""}
            ${block.url && !embedUrl ? `<div class="block-chip">Не удалось собрать плеер. Проверьте ссылку Rutube.</div>` : ""}
          </div>
        `);
      }

      if (block.type === "file") {
        article.insertAdjacentHTML("beforeend", `
          <div class="upload-zone">
            <strong>Загрузите файл для скачивания</strong>
            <span class="section-copy">Можно загрузить презентацию, документ, таблицу или архив. Ученик увидит кнопку скачивания.</span>
            <label class="button button-outline" for="file-${block.id}">Выбрать файл</label>
            <input class="visually-hidden" id="file-${block.id}" type="file" data-file-input="${block.id}">
          </div>
          ${block.src ? `
            <div class="attachment-preview">
              ${iconForBlock("file")}
              <div>
                <strong>${escapeHtml(block.name || "Файл урока")}</strong>
                <span>${escapeHtml(block.mime || "файл")} · ${block.size ? formatFileSize(block.size) : "размер не указан"}</span>
              </div>
              <a class="button button-outline" href="${block.src}" download="${escapeHtml(block.name || "academy-file")}">Скачать</a>
            </div>
          ` : ""}
        `);
      }

      if (block.type === "audio") {
        article.insertAdjacentHTML("beforeend", `
          <div class="upload-zone">
            <strong>Загрузите аудиодорожку</strong>
            <span class="section-copy">Поддерживаются MP3 и WAV. После загрузки аудио будет воспроизводиться прямо в уроке.</span>
            <label class="button button-outline" for="audio-${block.id}">Выбрать аудио</label>
            <input class="visually-hidden" id="audio-${block.id}" type="file" accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav" data-audio-input="${block.id}">
          </div>
          ${block.src ? `
            <div class="audio-preview">
              <div class="attachment-preview attachment-preview--compact">
                ${iconForBlock("audio")}
                <div>
                  <strong>${escapeHtml(block.name || "Аудио урока")}</strong>
                  <span>${block.size ? formatFileSize(block.size) : "аудиофайл"}</span>
                </div>
              </div>
              <audio controls preload="metadata" src="${block.src}"></audio>
            </div>
          ` : ""}
        `);
      }

      if (block.type === "test") {
        article.insertAdjacentHTML("beforeend", `
          <div class="test-placeholder">
            <strong>Тест внутри урока</strong>
            <p>Блок теста внутри урока временно недоступен. Добавьте тест отдельным пунктом в структуре курса.</p>
          </div>
        `);
      }

      blocksRoot.appendChild(article);
    });

    if (removedVideoFiles) persist();
  };

  const addBlock = (type) => {
    if (type === "test") {
      showNotice("Тест внутри урока временно недоступен. Добавьте тест отдельным пунктом в структуре курса.");
      return;
    }

    const block = { id: createId("block"), type };
    if (type === "text") {
      block.html = defaultTextHtml;
      block.content = defaultTextHtml;
    }
    if (type === "photo") block.src = "";
    if (type === "video") block.mode = "url";
    if (type === "file") block.name = "";
    if (type === "audio") block.name = "";
    lesson.content.push(block);
    persist();
    renderBlocks();
    const noticeByType = {
      text: "Текстовый блок добавлен.",
      photo: "Блок фото добавлен.",
      video: "Блок видео добавлен.",
      file: "Блок файла добавлен.",
      audio: "Блок аудио добавлен.",
    };
    showNotice(noticeByType[type] || "Блок добавлен.");
    scrollToBlock(block.id);
  };

  titleInput.addEventListener("input", () => {
    lesson.title = titleInput.value || "Новый урок";
    breadcrumbTitle.textContent = lesson.title;
    persist();
  });

  document.querySelectorAll("[data-add-block]").forEach((button) => {
    if (button.dataset.addBlock === "test") {
      button.setAttribute("aria-disabled", "true");
      button.title = "Тест внутри урока временно недоступен";
    }
    button.addEventListener("click", () => addBlock(button.dataset.addBlock));
  });

  blocksRoot.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const id = target.dataset.id;
    const index = lesson.content.findIndex((block) => block.id === id);
    if (index === -1) return;

    if (target.dataset.action === "remove-block") {
      lesson.content.splice(index, 1);
      persist();
      renderBlocks();
      return;
    }

    if (target.dataset.action === "video-mode") {
      if (target.dataset.mode === "file") {
        showNotice("Загрузка видеофайлов отключена: используйте ссылку Rutube.");
        lesson.content[index].mode = "url";
        delete lesson.content[index].fileSrc;
        persist();
        renderBlocks();
        return;
      }
      lesson.content[index].mode = target.dataset.mode;
      persist();
      renderBlocks();
    }
  });

  blocksRoot.addEventListener("input", (event) => {
    const urlInput = event.target.closest("[data-video-url]");
    if (!urlInput) return;
    const block = lesson.content.find((item) => item.id === urlInput.dataset.videoUrl);
    if (!block) return;
    block.url = urlInput.value;
    persist();
  });

  blocksRoot.addEventListener("change", async (event) => {
    const photoInput = event.target.closest("[data-photo-input]");
    if (photoInput) {
      const block = lesson.content.find((item) => item.id === photoInput.dataset.photoInput);
      const file = photoInput.files?.[0];
      if (!block || !file) return;
      if (file.size > PHOTO_MAX_BYTES) {
        photoInput.value = "";
        showNotice(`Фото слишком большое: ${formatFileSize(file.size)}. Максимум ${formatFileSize(PHOTO_MAX_BYTES)}.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        block.src = reader.result;
        block.alt = file.name;
        persist();
        renderBlocks();
      };
      reader.readAsDataURL(file);
      return;
    }

    const fileInput = event.target.closest("[data-file-input]");
    if (fileInput) {
      const block = lesson.content.find((item) => item.id === fileInput.dataset.fileInput);
      const file = fileInput.files?.[0];
      if (!block || !file) return;
      if (file.size > FILE_MAX_BYTES) {
        fileInput.value = "";
        showNotice(`Файл слишком большой для локального хранения: ${formatFileSize(file.size)}. Максимум ${formatFileSize(FILE_MAX_BYTES)}.`);
        return;
      }
      block.src = await readFileAsDataUrl(file);
      block.name = file.name || "Файл урока";
      block.mime = file.type || "application/octet-stream";
      block.size = file.size;
      persist();
      renderBlocks();
      return;
    }

    const audioInput = event.target.closest("[data-audio-input]");
    if (audioInput) {
      const block = lesson.content.find((item) => item.id === audioInput.dataset.audioInput);
      const file = audioInput.files?.[0];
      if (!block || !file) return;
      const isSupportedAudio = file.type === "audio/mpeg" || file.type === "audio/wav" || /\.(mp3|wav)$/i.test(file.name);
      if (!isSupportedAudio) {
        audioInput.value = "";
        showNotice("Загрузите аудио в формате MP3 или WAV.");
        return;
      }
      if (file.size > AUDIO_MAX_BYTES) {
        audioInput.value = "";
        showNotice(`Аудио слишком большое для локального хранения: ${formatFileSize(file.size)}. Максимум ${formatFileSize(AUDIO_MAX_BYTES)}.`);
        return;
      }
      block.src = await readFileAsDataUrl(file);
      block.name = file.name || "Аудио урока";
      block.mime = file.type || "audio/mpeg";
      block.size = file.size;
      persist();
      renderBlocks();
      return;
    }

    const videoFileInput = event.target.closest("[data-video-file]");
    if (videoFileInput) {
      const block = lesson.content.find((item) => item.id === videoFileInput.dataset.videoFile);
      if (!block) return;
      videoFileInput.value = "";
      block.mode = "url";
      delete block.fileSrc;
      persist();
      showNotice("Загрузка видеофайлов отключена: используйте ссылку Rutube.");
      renderBlocks();
    }
  });

  saveButton.addEventListener("click", () => {
    persist();
    saveButton.textContent = "Сохранено";
    window.setTimeout(() => { saveButton.textContent = "Сохранить"; }, 1500);
  });

  previewButton.addEventListener("click", () => {
    persist();
    localStorage.setItem(ACTIVE_STUDENT_LESSON_KEY, lesson.id);
    window.location.href = "../../student/lesson/index.html";
  });

  renderBlocks();
};

renderLessonEditor();
