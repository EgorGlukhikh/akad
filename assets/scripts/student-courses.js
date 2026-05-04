const root = document.querySelector("[data-student-courses]");

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

const plural = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const getNextItem = (course) => {
  const items = window.AcademyStore.flattenCompletableItems(course.items || [], {
    visibleOnly: true,
    requiredOnly: true,
  });
  return items.find((item) => {
    if (item.type === "test") return window.AcademyStore.getProgressEntry(course.id, item.id)?.passed !== true;
    return !window.AcademyStore.isComplete(course.id, item.id);
  }) || null;
};

const renderCourses = () => {
  const state = window.AcademyStore.loadState();
  const publishedCourses = state.courses.filter((course) => course.status === "published");
  root.innerHTML = "";

  if (!publishedCourses.length) {
    root.innerHTML = `
      <article class="empty-dashboard">
        <span class="eyebrow"><span class="eyebrow-mark">!</span> Каталог готовится</span>
        <h2>Нет опубликованных курсов</h2>
        <p>Откройте админку, опубликуйте курс, и он появится здесь.</p>
        <a class="button button-fill" href="../admin/courses/index.html">Перейти в админку</a>
      </article>
    `;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "course-grid";

  publishedCourses.forEach((course) => {
    const counts = window.AcademyStore.countItems(course.items || [], { visibleOnly: true });
    const progress = window.AcademyStore.getCompletionStats(course);
    const nextItem = getNextItem(course);
    const primaryLabel = progress.completed > 0 && nextItem ? "Продолжить обучение" : "Открыть курс";
    const card = document.createElement("article");
    card.className = "course-admin-card course-admin-card--student";
    card.innerHTML = `
      ${coverTemplate(course)}
      <div class="course-admin-card__head">
        <span class="status-pill status-pill--published">Доступ открыт</span>
        <span class="course-admin-card__date">${progress.completed} из ${progress.total} обязательных</span>
      </div>
      <div>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.description || "Описание курса появится после заполнения программы.")}</p>
      </div>
      <div class="progress-track progress-track--student"><span style="width:${progress.percent}%"></span></div>
      <div class="course-admin-card__stats">
        <span>${counts.sections} ${plural(counts.sections, "раздел", "раздела", "разделов")}</span>
        <span>${counts.lessons} ${plural(counts.lessons, "урок", "урока", "уроков")}</span>
        <span>${counts.tests} ${plural(counts.tests, "тест", "теста", "тестов")}</span>
      </div>
      <div class="course-admin-card__actions">
        <button class="button button-fill" type="button" data-open-course="${course.id}" data-next-item="${nextItem?.id || ""}" data-next-type="${nextItem?.type || ""}">${primaryLabel}</button>
      </div>
    `;
    grid.appendChild(card);
  });

  root.appendChild(grid);
};

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-course]");
  if (!button) return;
  window.AcademyStore.setActiveCourse(button.dataset.openCourse);
  if (button.dataset.nextItem && button.dataset.nextType === "lesson") {
    window.AcademyStore.storage.setItem("academy-student-active-lesson", button.dataset.nextItem);
    window.location.href = "./lesson/index.html";
    return;
  }
  if (button.dataset.nextItem && button.dataset.nextType === "test") {
    window.AcademyStore.storage.setItem("academy-student-active-test", button.dataset.nextItem);
    window.location.href = "./test/index.html";
    return;
  }
  window.location.href = "./course/index.html";
});

renderCourses();
