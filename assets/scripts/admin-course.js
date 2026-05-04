const STORAGE_KEY = "academy-admin-course-state";
const ACTIVE_LESSON_KEY = "academy-admin-active-lesson";
const ACTIVE_TEST_KEY = "academy-admin-active-test";
const ACTIVE_STUDENT_LESSON_KEY = "academy-student-active-lesson";
const ACTIVE_STUDENT_TEST_KEY = "academy-student-active-test";
const COURSE_COVER_MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const COURSE_COVER_WIDTH = 1920;
const COURSE_COVER_HEIGHT = 1080;

const createId = () => `item-${Math.random().toString(36).slice(2, 9)}`;

const createSeedState = () => ({
  courseTitle: "Новый курс",
  courseDescription:
    "Кратко опишите, чему посвящён курс, для кого он нужен и что слушатель поймёт после прохождения.",
  items: [
    {
      id: createId(),
      type: "section",
      title: "Раздел 1",
      hidden: false,
      required: true,
      children: [
        {
          id: createId(),
          type: "lesson",
          title: "Урок 1",
          hidden: false,
          required: true,
          content: [],
        },
        {
          id: createId(),
          type: "test",
          title: "Тест 1",
          hidden: false,
          required: true,
        },
      ],
    },
    {
      id: createId(),
      type: "lesson",
      title: "Урок 2",
      hidden: false,
      required: false,
      content: [],
    },
    {
      id: createId(),
      type: "test",
      title: "Тест 2",
      hidden: false,
      required: false,
    },
  ],
});

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const normalizeState = (state) => {
  const next = state && typeof state === "object" ? state : createSeedState();
  next.id ||= createId();
  next.status ||= "draft";
  next.courseTitle ||= "Новый курс";
  next.courseDescription ||= "";
  next.coverSrc ||= "";
  next.coverAlt ||= "";
  next.items = Array.isArray(next.items) ? next.items : [];

  const walk = (items) => {
    items.forEach((item) => {
      item.id ||= createId();
      item.hidden ||= false;
      item.required ||= false;
      if (item.type === "section") {
        item.children = Array.isArray(item.children) ? item.children : [];
        walk(item.children);
      }
      if (item.type === "lesson") {
        item.content = Array.isArray(item.content) ? item.content : [];
      }
    });
  };

  walk(next.items);
  return next;
};

const loadState = () => {
  const activeCourse = window.AcademyStore?.getActiveCourse();
  if (activeCourse) {
    return normalizeState({
      ...activeCourse,
      courseTitle: activeCourse.title,
      courseDescription: activeCourse.description,
    });
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createSeedState();
  }
};

const saveState = (state) => {
  if (window.AcademyStore) {
    window.AcademyStore.saveActiveCourse({
      id: state.id,
      title: state.courseTitle,
      description: state.courseDescription,
      status: state.status || "draft",
      coverSrc: state.coverSrc || "",
      coverAlt: state.coverAlt || "",
      items: state.items,
      updatedAt: new Date().toISOString(),
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const countItems = (items) => {
  let sections = 0;
  let lessons = 0;
  let tests = 0;

  for (const item of items) {
    if (item.type === "section") {
      sections += 1;
      const childCounts = countItems(item.children || []);
      lessons += childCounts.lessons;
      tests += childCounts.tests;
    } else if (item.type === "lesson") {
      lessons += 1;
    } else if (item.type === "test") {
      tests += 1;
    }
  }

  return { sections, lessons, tests };
};

const hasTextContent = (value) => {
  if (typeof value !== "string") return false;
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length > 0;
};

const isFilledLesson = (lesson) =>
  Array.isArray(lesson.content) &&
  lesson.content.some((block) => {
    if (block.type === "text") return hasTextContent(block.html) || hasTextContent(block.content);
    if (block.type === "photo") return Boolean(block.src);
    if (block.type === "video") return Boolean((block.url || "").trim());
    if (block.type === "file" || block.type === "audio") return Boolean(block.src);
    return false;
  });

const hasCorrectAnswer = (question) =>
  Array.isArray(question.answers) && question.answers.some((answer) => answer.correct);

const validateCourseForPublish = (state) => {
  const errors = [];
  const visibleLessons = [];
  const visibleTests = [];

  const walk = (items, hiddenByParent = false) => {
    for (const item of items || []) {
      const isHidden = hiddenByParent || Boolean(item.hidden);
      if (item.type === "section") {
        walk(item.children || [], isHidden);
      }
      if (!isHidden && item.type === "lesson") visibleLessons.push(item);
      if (!isHidden && item.type === "test") visibleTests.push(item);
    }
  };

  walk(state.items || []);

  if (!String(state.courseTitle || "").trim()) {
    errors.push("Добавьте название курса.");
  }

  if (!visibleLessons.length && !visibleTests.length) {
    errors.push("Добавьте хотя бы один видимый урок или тест.");
  }

  visibleLessons.forEach((lesson) => {
    if (!isFilledLesson(lesson)) {
      errors.push(`Заполните урок: ${lesson.title || "без названия"}.`);
    }
  });

  visibleTests.forEach((test) => {
    const questions = Array.isArray(test.questions) ? test.questions : [];
    if (!questions.length) {
      errors.push(`Добавьте вопросы в тест: ${test.title || "без названия"}.`);
      return;
    }
    questions.forEach((question, index) => {
      if (!hasCorrectAnswer(question)) {
        errors.push(`Отметьте правильный ответ в тесте "${test.title || "без названия"}", вопрос ${index + 1}.`);
      }
    });
  });

  return errors;
};

const duplicateItemTree = (item) => {
  const next = cloneDeep(item);
  const refreshIds = (node) => {
    node.id = createId();
    if (node.children) node.children.forEach(refreshIds);
  };
  refreshIds(next);
  next.title = `${item.title || placeholderTitle(item.type)} (копия)`;
  return next;
};

const iconForType = (type) => {
  if (type === "section") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16v12H4z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M8 10h8" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>`;
  }
  if (type === "lesson") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h8l4 4v12H7z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M15 4v4h4" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6h10M9 12h10M9 18h10M4 6h1M4 12h1M4 18h1" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><path d="m3 5 1 1 2-2M3 11l1 1 2-2M3 17l1 1 2-2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>`;
};

const closeStructureMenus = () => {
  document.querySelectorAll(".structure-menu[data-open='true']").forEach((node) => {
    node.dataset.open = "false";
    node.closest(".structure-row")?.classList.remove("structure-row--menu-open");
    node.closest(".structure-item")?.classList.remove("structure-item--menu-open");
  });
};

const dragHandleIcon = () =>
  `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="7" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="17" r="1.5" fill="currentColor"/><circle cx="15" cy="17" r="1.5" fill="currentColor"/></svg>`;

const labelForType = (type, count) => {
  if (type === "section") return count === 1 ? "раздел" : "раздела";
  if (type === "lesson") return count === 1 ? "урок" : "урока";
  return count === 1 ? "тест" : "теста";
};

const placeholderTitle = (type) => {
  if (type === "section") return "Новый раздел";
  if (type === "lesson") return "Новый урок";
  return "Новый тест";
};

const openContentItem = (item, state) => {
  if (item.type === "test") {
    localStorage.setItem(ACTIVE_TEST_KEY, item.id);
    localStorage.setItem(ACTIVE_STUDENT_TEST_KEY, item.id);
    saveState(state);
    window.location.href = "../test/index.html";
    return;
  }

  localStorage.setItem(ACTIVE_LESSON_KEY, item.id);
  localStorage.setItem(ACTIVE_STUDENT_LESSON_KEY, item.id);
  saveState(state);
  window.location.href = "../lesson/index.html";
};

const findItemById = (items, id, parentItems = items, parent = null) => {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.id === id) return { item, index, parentItems, parent };
    if (item.children) {
      const found = findItemById(item.children, id, item.children, item);
      if (found) return found;
    }
  }
  return null;
};

const removeItemById = (items, id) => {
  const found = findItemById(items, id);
  if (!found) return null;
  found.parentItems.splice(found.index, 1);
  return found.item;
};

const renderBuilder = () => {
  const state = loadState();
  const titleInput = document.querySelector("[data-course-title]");
  const descriptionInput = document.querySelector("[data-course-description]");
  const coverPreview = document.querySelector("[data-course-cover-preview]");
  const coverImage = document.querySelector("[data-course-cover-image]");
  const coverInput = document.querySelector("[data-course-cover-input]");
  const coverUploadButton = document.querySelector("[data-course-cover-upload]");
  const coverRemoveButton = document.querySelector("[data-course-cover-remove]");
  const summaryNode = document.querySelector("[data-structure-summary]");
  const listNode = document.querySelector("[data-structure-list]");
  const draftButton = document.querySelector("[data-save-draft]");
  const publishButton = document.querySelector("[data-publish-course]");
  const validationNode = document.createElement("div");
  validationNode.className = "builder-summary";
  validationNode.setAttribute("role", "status");
  validationNode.hidden = true;
  publishButton.insertAdjacentElement("afterend", validationNode);

  let editingId = null;
  let draggedId = null;
  let dragOverId = null;
  let dragRoot = false;

  titleInput.value = state.courseTitle;
  descriptionInput.value = state.courseDescription;

  const showCoverMessage = (message) => {
    validationNode.hidden = false;
    validationNode.textContent = message;
  };

  const updateCoverPreview = () => {
    if (!coverPreview || !coverImage || !coverRemoveButton) return;
    const hasCover = Boolean(state.coverSrc);
    coverPreview.classList.toggle("course-cover--empty", !hasCover);
    coverImage.hidden = !hasCover;
    coverRemoveButton.hidden = !hasCover;
    if (hasCover) {
      coverImage.src = window.AcademyStore.resolveAssetUrl(state.coverSrc);
      coverImage.alt = state.coverAlt || state.courseTitle || "Обложка курса";
    } else {
      coverImage.removeAttribute("src");
      coverImage.alt = "";
    }
  };

  const saveCoverFromFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showCoverMessage("Загрузите изображение в формате JPG, PNG, WEBP или SVG.");
      return;
    }
    if (file.size > COURSE_COVER_MAX_SOURCE_BYTES) {
      showCoverMessage("Файл слишком большой. Загрузите изображение до 8 МБ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const ratio = image.naturalWidth / image.naturalHeight;
        const targetRatio = COURSE_COVER_WIDTH / COURSE_COVER_HEIGHT;
        if (Math.abs(ratio - targetRatio) > 0.03) {
          showCoverMessage("Обложка должна быть в пропорции 16:9, например 1920x1080.");
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = COURSE_COVER_WIDTH;
        canvas.height = COURSE_COVER_HEIGHT;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, COURSE_COVER_WIDTH, COURSE_COVER_HEIGHT);
        state.coverSrc = canvas.toDataURL("image/jpeg", 0.86);
        state.coverAlt = file.name || state.courseTitle || "Обложка курса";
        saveState(state);
        updateCoverPreview();
        showCoverMessage("Обложка сохранена.");
      };
      image.onerror = () => showCoverMessage("Не удалось прочитать изображение. Попробуйте другой файл.");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const syncHeader = () => {
    document.title = `${titleInput.value || "Новый курс"} — Админка Academy Realtors`;
    const counts = countItems(state.items);
    summaryNode.textContent = `${counts.sections} ${labelForType("section", counts.sections)} · ${counts.lessons} ${labelForType("lesson", counts.lessons)} · ${counts.tests} ${labelForType("test", counts.tests)}`;
  };

  const updateState = () => {
    state.courseTitle = titleInput.value;
    state.courseDescription = descriptionInput.value || "";
    saveState(state);
    syncHeader();
  };

  const renderValidationChecklist = (errors) => {
    validationNode.hidden = false;
    if (!errors.length) {
      validationNode.innerHTML = "<strong>Проверка пройдена.</strong>";
      return;
    }
    validationNode.innerHTML = `
      <strong>Перед публикацией исправьте:</strong>
      <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
    `;
  };

  const focusRenameInput = () => {
    const input = listNode.querySelector("[data-rename-input]");
    if (!input) return;
    input.focus();
    input.select();
  };

  const commitRename = (id, nextTitle) => {
    const found = findItemById(state.items, id);
    if (!found) return;
    const trimmed = nextTitle.trim();
    found.item.title = trimmed || found.item.title || placeholderTitle(found.item.type);
    editingId = null;
    saveState(state);
    renderStructure();
  };

  const renderRow = (item, isChild = false) => {
    const row = document.createElement("div");
    const isDragged = draggedId === item.id;
    const isDropTarget = dragOverId === item.id;
    const showSectionDropHint =
      item.type === "section" &&
      !!draggedId &&
      draggedId !== item.id &&
      findItemById(state.items, draggedId)?.item?.type !== "section";

    row.className = `structure-row structure-row--${item.type}${isChild ? " structure-row--child" : ""}${item.hidden ? " structure-row--hidden" : ""}${isDragged ? " structure-row--dragging" : ""}${isDropTarget ? " structure-row--drag-over" : ""}${showSectionDropHint ? " structure-row--accepts-drop" : ""}`;
    row.dataset.id = item.id;
    row.dataset.type = item.type;
    row.draggable = true;

    const meta = [];
    if (item.required) meta.push("обязательный");
    if (item.hidden) meta.push("скрыт");

    const fillAction = item.type !== "section"
      ? `<button class="ghost-action" type="button" data-action="fill" data-id="${item.id}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 20 4-1 9-9-3-3-9 9-1 4Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="m12 5 3 3" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>Наполнить</button>`
      : "";

    const safeTitle = escapeHtml(item.title || placeholderTitle(item.type));
    const nameMarkup = editingId === item.id
      ? `<input class="structure-row__name-input" type="text" value="${safeTitle}" data-rename-input="${item.id}">`
      : `<button class="structure-row__name-button" type="button" data-action="rename" data-id="${item.id}">${safeTitle}</button>`;

    row.innerHTML = `
      <div class="structure-row__main">
        <span class="structure-row__drag-handle" aria-hidden="true">${dragHandleIcon()}</span>
        <span class="structure-row__icon">${iconForType(item.type)}</span>
        <div class="structure-row__label">
          ${nameMarkup}
          ${meta.length ? `<span class="structure-row__meta">${meta.join(" · ")}</span>` : ""}
        </div>
      </div>
      <div class="structure-row__actions">
        ${fillAction}
        <button class="ghost-action ${item.required ? "ghost-action--active" : ""}" type="button" data-action="required" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M12 5l4 4M12 5 8 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
          ${item.required ? "Обязательный" : "Сделать обязательным"}
        </button>
        <button class="ghost-action" type="button" data-action="toggle-hidden" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
          ${item.hidden ? "Показать" : "Скрыть"}
        </button>
        <div class="structure-menu" data-menu-id="${item.id}">
          <button class="icon-action" type="button" data-action="menu" data-id="${item.id}" aria-label="Открыть меню">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5.5a1.5 1.5 0 1 0 0 .01V5.5ZM12 12a1.5 1.5 0 1 0 0 .01V12ZM12 18.5a1.5 1.5 0 1 0 0 .01v-.01Z" fill="currentColor"/></svg>
          </button>
          <div class="structure-menu__panel">
            <button class="menu-item" type="button" data-action="duplicate" data-id="${item.id}">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 9h11v11H9z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M4 15V4h11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
              Дублировать
            </button>
            <button class="menu-item menu-item--danger" type="button" data-action="delete" data-id="${item.id}">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M7 7l1 12h8l1-12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
              Удалить
            </button>
          </div>
        </div>
      </div>
      ${showSectionDropHint ? '<div class="structure-row__drop-hint">Перетащите сюда урок или тест, чтобы вложить в раздел</div>' : ""}
    `;

    return row;
  };

  const renderStructure = () => {
    listNode.innerHTML = "";
    listNode.classList.toggle("structure-list--root-drop", dragRoot);

    state.items.forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = `structure-item${item.type === "section" ? " structure-item--section" : ""}`;
      wrapper.appendChild(renderRow(item));

      if (item.children?.length) {
        const childGroup = document.createElement("div");
        childGroup.className = "structure-item__children";
        item.children.forEach((child) => {
          childGroup.appendChild(renderRow(child, true));
        });
        wrapper.appendChild(childGroup);
      } else if (item.type === "section") {
        const empty = document.createElement("div");
        empty.className = "structure-item__empty";
        empty.textContent = draggedId ? "Перетащите сюда урок или тест" : "Добавьте в раздел урок или тест";
        wrapper.appendChild(empty);
      }

      listNode.appendChild(wrapper);
    });

    syncHeader();
    if (editingId) focusRenameInput();
  };

  const addItem = (type) => {
    const counts = countItems(state.items);
    const index =
      type === "section" ? counts.sections + 1 : type === "lesson" ? counts.lessons + 1 : counts.tests + 1;
    const title = type === "section" ? `Раздел ${index}` : type === "lesson" ? `Урок ${index}` : `Тест ${index}`;
    const item = { id: createId(), type, title, hidden: false, required: false };
    if (type === "section") item.children = [];
    if (type === "lesson") item.content = [];
    state.items.push(item);
    saveState(state);
    renderStructure();
  };

  const moveItem = (sourceId, targetId, mode) => {
    if (!sourceId || sourceId === targetId) return;

    const sourceInfo = findItemById(state.items, sourceId);
    if (!sourceInfo) return;
    const sourceItem = removeItemById(state.items, sourceId);
    if (!sourceItem) return;

    if (mode === "root") {
      state.items.push(sourceItem);
      saveState(state);
      renderStructure();
      return;
    }

    const targetInfo = findItemById(state.items, targetId);
    if (!targetInfo) {
      state.items.push(sourceItem);
      saveState(state);
      renderStructure();
      return;
    }

    if (mode === "inside-section") {
      if (sourceItem.type === "section" || targetInfo.item.type !== "section") {
        state.items.push(sourceItem);
      } else {
        targetInfo.item.children ||= [];
        targetInfo.item.children.push(sourceItem);
      }
      saveState(state);
      renderStructure();
      return;
    }

    const targetIsRootLevel = targetInfo.parentItems === state.items;
    if (sourceItem.type === "section" && !targetIsRootLevel) {
      state.items.push(sourceItem);
      saveState(state);
      renderStructure();
      return;
    }

    targetInfo.parentItems.splice(targetInfo.index + 1, 0, sourceItem);
    saveState(state);
    renderStructure();
  };

  listNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    const found = findItemById(state.items, id);
    if (!found) return;
    const { item, index, parentItems } = found;

    if (action === "fill") {
      if (item.type !== "section") {
        openContentItem(item, state);
      }
      return;
    }

    if (action === "rename") {
      editingId = id;
      renderStructure();
      return;
    }

    if (action === "required") {
      item.required = !item.required;
    }

    if (action === "toggle-hidden") {
      item.hidden = !item.hidden;
    }

    if (action === "duplicate") {
      parentItems.splice(index + 1, 0, duplicateItemTree(item));
    }

    if (action === "delete") {
      parentItems.splice(index, 1);
    }

    if (action === "menu") {
      const menu = target.closest(".structure-menu");
      const isOpen = menu.dataset.open === "true";
      closeStructureMenus();
      menu.dataset.open = String(!isOpen);
      menu.closest(".structure-row")?.classList.toggle("structure-row--menu-open", !isOpen);
      menu.closest(".structure-item")?.classList.toggle("structure-item--menu-open", !isOpen);
      return;
    }

    saveState(state);
    renderStructure();
  });

  listNode.addEventListener("keydown", (event) => {
    const input = event.target.closest("[data-rename-input]");
    if (!input) return;

    if (event.key === "Enter") {
      event.preventDefault();
      commitRename(input.dataset.renameInput, input.value);
    }

    if (event.key === "Escape") {
      editingId = null;
      renderStructure();
    }
  });

  listNode.addEventListener(
    "blur",
    (event) => {
      const input = event.target.closest("[data-rename-input]");
      if (!input) return;
      commitRename(input.dataset.renameInput, input.value);
    },
    true,
  );

  listNode.addEventListener("dragstart", (event) => {
    const row = event.target.closest(".structure-row");
    if (!row || editingId) return;
    draggedId = row.dataset.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedId);
    row.classList.add("structure-row--dragging");
  });

  listNode.addEventListener("dragend", () => {
    draggedId = null;
    dragOverId = null;
    dragRoot = false;
    renderStructure();
  });

  listNode.addEventListener("dragover", (event) => {
    if (!draggedId) return;
    event.preventDefault();
    const row = event.target.closest(".structure-row");
    dragRoot = !row;
    dragOverId = row?.dataset.id || null;
    listNode.classList.toggle("structure-list--root-drop", dragRoot);
    document.querySelectorAll(".structure-row--drag-over").forEach((node) => {
      if (node.dataset.id !== dragOverId) node.classList.remove("structure-row--drag-over");
    });
    if (row) row.classList.add("structure-row--drag-over");
  });

  listNode.addEventListener("dragleave", (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragRoot = false;
      dragOverId = null;
      listNode.classList.remove("structure-list--root-drop");
      document.querySelectorAll(".structure-row--drag-over").forEach((node) => {
        node.classList.remove("structure-row--drag-over");
      });
    }
  });

  listNode.addEventListener("drop", (event) => {
    if (!draggedId) return;
    event.preventDefault();
    const row = event.target.closest(".structure-row");

    if (!row) {
      moveItem(draggedId, null, "root");
      return;
    }

    const targetId = row.dataset.id;
    const targetInfo = findItemById(state.items, targetId);
    const sourceInfo = findItemById(state.items, draggedId);
    if (!targetInfo || !sourceInfo || targetId === draggedId) {
      renderStructure();
      return;
    }

    if (targetInfo.item.type === "section" && sourceInfo.item.type !== "section") {
      moveItem(draggedId, targetId, "inside-section");
      return;
    }

    moveItem(draggedId, targetId, "after-target");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".structure-menu")) {
      closeStructureMenus();
    }
  });

  titleInput.addEventListener("input", updateState);
  descriptionInput.addEventListener("input", updateState);

  coverUploadButton?.addEventListener("click", () => coverInput?.click());
  coverInput?.addEventListener("change", () => {
    saveCoverFromFile(coverInput.files?.[0]);
    coverInput.value = "";
  });
  coverRemoveButton?.addEventListener("click", () => {
    state.coverSrc = "";
    state.coverAlt = "";
    saveState(state);
    updateCoverPreview();
    showCoverMessage("Обложка удалена.");
  });

  draftButton.addEventListener("click", () => {
    state.status = "draft";
    updateState();
    draftButton.textContent = "Черновик сохранён";
    window.setTimeout(() => {
      draftButton.textContent = "Сохранить черновик";
    }, 1500);
  });

  publishButton.addEventListener("click", () => {
    updateState();
    const errors = validateCourseForPublish(state);
    renderValidationChecklist(errors);
    if (errors.length) {
      publishButton.textContent = "Проверьте курс";
      window.setTimeout(() => {
        publishButton.textContent = "Опубликовать";
      }, 1500);
      return;
    }

    state.status = "published";
    updateState();
    publishButton.textContent = "Курс опубликован";
    window.setTimeout(() => {
      publishButton.textContent = "Опубликовать";
    }, 1500);
  });

  document.querySelectorAll("[data-add-type]").forEach((button) => {
    button.addEventListener("click", () => addItem(button.dataset.addType));
  });

  renderStructure();
  updateCoverPreview();
  syncHeader();
};

renderBuilder();
