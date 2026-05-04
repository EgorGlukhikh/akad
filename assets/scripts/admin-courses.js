const root = document.querySelector("[data-courses-root]");
const createButton = document.querySelector("[data-create-course]");
const exportButton = document.querySelector("[data-export-courses]");
const importButton = document.querySelector("[data-import-courses]");
const importInput = document.querySelector("[data-import-courses-input]");
const resetButton = document.querySelector("[data-reset-courses]");

const escapeHtml = (value = "") =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const coverTemplate = (course) => {
  if (!course.coverSrc) return "";
  const coverSrc = window.AcademyStore.resolveAssetUrl(course.coverSrc);
  return `
    <div class="course-admin-card__cover">
      <img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(course.coverAlt || course.title)}" loading="lazy">
    </div>
  `;
};

const formatDate = (value) => {
  if (!value) return "только что";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const labelForStatus = (status) => (status === "published" ? "Опубликован" : "Черновик");

const plural = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const renderCourses = () => {
  const state = window.AcademyStore.loadState();
  root.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "course-grid";

  state.courses.forEach((course) => {
    const counts = window.AcademyStore.countItems(course.items || []);
    const card = document.createElement("article");
    card.className = "course-admin-card";
    card.innerHTML = `
      ${coverTemplate(course)}
      <div class="course-admin-card__head">
        <span class="status-pill status-pill--${course.status}">${labelForStatus(course.status)}</span>
        <span class="course-admin-card__date">Изменён ${formatDate(course.updatedAt)}</span>
      </div>
      <div>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.description || "Добавьте описание курса в редакторе.")}</p>
      </div>
      <div class="course-admin-card__stats">
        <span>${counts.sections} ${plural(counts.sections, "раздел", "раздела", "разделов")}</span>
        <span>${counts.lessons} ${plural(counts.lessons, "урок", "урока", "уроков")}</span>
        <span>${counts.tests} ${plural(counts.tests, "тест", "теста", "тестов")}</span>
      </div>
      <div class="course-admin-card__actions">
        <button class="button button-fill" type="button" data-action="edit" data-id="${course.id}">Редактировать</button>
        <button class="button button-outline" type="button" data-action="preview" data-id="${course.id}">Предпросмотр</button>
        <button class="button button-outline" type="button" data-action="delete" data-id="${course.id}">Удалить</button>
      </div>
    `;
    grid.appendChild(card);
  });

  root.appendChild(grid);
};

createButton.addEventListener("click", () => {
  window.AcademyStore.createNewCourse();
  window.location.href = "../course/index.html";
});

exportButton?.addEventListener("click", () => {
  const blob = new Blob([window.AcademyStore.exportState()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `academy-courses-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

importButton?.addEventListener("click", () => importInput?.click());

importInput?.addEventListener("change", () => {
  const file = importInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      window.AcademyStore.importState(String(reader.result || ""));
      renderCourses();
    } catch {
      window.alert("Не удалось импортировать файл. Проверьте, что это JSON экспорта курсов.");
    } finally {
      importInput.value = "";
    }
  };
  reader.readAsText(file);
});

resetButton?.addEventListener("click", () => {
  if (!window.confirm("Восстановить базовый курс и заменить текущий список курсов?")) return;
  window.AcademyStore.resetDemoData();
  renderCourses();
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const courseId = button.dataset.id;

  if (button.dataset.action === "delete") {
    window.AcademyStore.deleteCourse(courseId);
    renderCourses();
    return;
  }

  window.AcademyStore.setActiveCourse(courseId);

  if (button.dataset.action === "preview") {
    window.location.href = "../../student/course/index.html";
    return;
  }

  window.location.href = "../course/index.html";
});

renderCourses();
