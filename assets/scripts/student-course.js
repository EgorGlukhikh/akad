const ACTIVE_STUDENT_LESSON_KEY = "academy-student-active-lesson";
const ACTIVE_STUDENT_TEST_KEY = "academy-student-active-test";

const course = window.AcademyStore.getActiveCourse();
const titleNode = document.querySelector("[data-course-title]");
const descriptionNode = document.querySelector("[data-course-description]");
const breadcrumbNode = document.querySelector("[data-course-breadcrumb]");
const summaryNode = document.querySelector("[data-course-summary]");
const structureNode = document.querySelector("[data-student-structure]");
const progressTitle = document.querySelector("[data-course-progress-title]");
const progressCopy = document.querySelector("[data-course-progress-copy]");
const progressBar = document.querySelector("[data-course-progress-bar]");
const heroCopyNode = document.querySelector(".student-course-hero > div");

const plural = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const iconForType = (type) => {
  if (type === "section") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16v12H4z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M8 10h8" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>`;
  }
  if (type === "test") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6h10M9 12h10M9 18h10M4 6h1M4 12h1M4 18h1" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><path d="m3 5 1 1 2-2M3 11l1 1 2-2M3 17l1 1 2-2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h8l4 4v12H7z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M15 4v4h4" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/></svg>`;
};

const renderCover = () => {
  if (!course.coverSrc || !heroCopyNode) return;
  const hero = document.querySelector(".student-course-hero");
  const cover = document.createElement("figure");
  cover.className = "student-course-cover";
  cover.innerHTML = `<img src="${escapeHtml(window.AcademyStore.resolveAssetUrl(course.coverSrc))}" alt="${escapeHtml(course.coverAlt || course.title)}">`;
  hero?.classList.add("student-course-hero--with-cover");
  hero?.appendChild(cover);
};

const openItem = (item) => {
  if (item.type === "lesson") {
    window.AcademyStore.storage.setItem(ACTIVE_STUDENT_LESSON_KEY, item.id);
    window.location.href = "../lesson/index.html";
  }
  if (item.type === "test") {
    window.AcademyStore.storage.setItem(ACTIVE_STUDENT_TEST_KEY, item.id);
    window.location.href = "../test/index.html";
  }
};

const renderRow = (item, isChild = false) => {
  const row = document.createElement("div");
  row.className = `student-row${isChild ? " student-row--child" : ""}${window.AcademyStore.isComplete(course.id, item.id) ? " student-row--complete" : ""}`;
  row.innerHTML = `
    <div class="student-row__main">
      <span class="student-row__icon">${iconForType(item.type)}</span>
      <div>
        <strong>${escapeHtml(item.title || (item.type === "test" ? "Тест" : "Урок"))}</strong>
        <span>${item.required ? "обязательный" : "дополнительный"}</span>
      </div>
    </div>
    ${item.type === "section" ? "" : `<button class="button button-outline" type="button">Открыть</button>`}
  `;
  if (item.type !== "section") row.querySelector("button").addEventListener("click", () => openItem(item));
  return row;
};

const renderStructure = () => {
  structureNode.innerHTML = "";
  (course.items || []).forEach((item) => {
    if (item.hidden) return;
    if (item.type === "section") {
      const group = document.createElement("article");
      group.className = "student-section";
      group.appendChild(renderRow(item));
      const children = document.createElement("div");
      children.className = "student-section__children";
      (item.children || []).forEach((child) => {
        if (!child.hidden) children.appendChild(renderRow(child, true));
      });
      group.appendChild(children);
      structureNode.appendChild(group);
    } else {
      structureNode.appendChild(renderRow(item));
    }
  });
};

if (!course) {
  titleNode.textContent = "Курс не выбран";
  descriptionNode.textContent = "Вернитесь в каталог и откройте нужный курс.";
  breadcrumbNode.textContent = "Курсы";
  summaryNode.textContent = "";
  progressTitle.textContent = "0%";
  progressCopy.textContent = "0 из 0 обязательных элементов";
  progressBar.style.width = "0%";
  structureNode.innerHTML = `<article class="content-block"><p class="section-copy">Откройте курс из каталога ученика.</p><a class="button button-fill" href="../index.html">Перейти к курсам</a></article>`;
} else {
const stats = window.AcademyStore.getCompletionStats(course);
const counts = window.AcademyStore.countItems(course.items || [], { visibleOnly: true });

titleNode.textContent = course.title;
descriptionNode.textContent = course.description || "Описание курса появится после заполнения программы.";
breadcrumbNode.textContent = course.title;
document.title = `${course.title} — Academy Realtors`;
summaryNode.textContent = `${counts.sections} ${plural(counts.sections, "раздел", "раздела", "разделов")} · ${counts.lessons} ${plural(counts.lessons, "урок", "урока", "уроков")} · ${counts.tests} ${plural(counts.tests, "тест", "теста", "тестов")}`;
progressTitle.textContent = `${stats.percent}%`;
progressCopy.textContent = `${stats.completed} из ${stats.total} обязательных элементов`;
progressBar.style.width = `${stats.percent}%`;

renderCover();
renderStructure();
}
