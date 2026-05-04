const ACTIVE_STUDENT_LESSON_KEY = "academy-student-active-lesson";
const course = window.AcademyStore.getActiveCourse();
const activeLessonId = window.AcademyStore.storage.getItem(ACTIVE_STUDENT_LESSON_KEY);
const found = course
  ? window.AcademyStore.findItemById(course.items || [], activeLessonId)
    || window.AcademyStore.flattenCompletableItems(course.items || [], { visibleOnly: true, requiredOnly: false }).find((item) => item.type === "lesson")
  : null;

const lesson = found?.item || found;
const parentSection = found?.parentSection;

const titleNode = document.querySelector("[data-lesson-title]");
const breadcrumbNode = document.querySelector("[data-lesson-breadcrumb]");
const sectionNode = document.querySelector("[data-lesson-section]");
const contentNode = document.querySelector("[data-lesson-content]");
const completeButton = document.querySelector("[data-complete-lesson]");

const escapeHtml = (value = "") =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const textFromTipTap = (node) => {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  return (node.content || []).map(textFromTipTap).join(" ");
};

const renderTextBlock = (block) => {
  if (block.html) return block.html;
  if (typeof block.content === "string") return block.content;
  if (block.content?.content) {
    return block.content.content.map((node) => `<p>${escapeHtml(textFromTipTap(node))}</p>`).join("");
  }
  return "<p>Материал урока появится после заполнения редактором.</p>";
};

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

const renderContent = () => {
  contentNode.innerHTML = "";
  const blocks = lesson?.content || [];

  if (!blocks.length) {
    contentNode.innerHTML = `
      <article class="content-block">
        <div class="content-block__title">Материал готовится</div>
        <p class="section-copy">Администратор ещё не добавил блоки в этот урок.</p>
      </article>
    `;
    return;
  }

  blocks.forEach((block) => {
    const article = document.createElement("article");
    article.className = "content-block student-material";
    if (block.type === "text") {
      article.innerHTML = `<div class="student-rich-text">${renderTextBlock(block)}</div>`;
    }
    if (block.type === "photo") {
      article.innerHTML = block.src
        ? `<img class="student-media" src="${block.src}" alt="${escapeHtml(block.alt || "Изображение урока")}">`
        : `<p class="section-copy">Изображение будет доступно после загрузки.</p>`;
    }
    if (block.type === "video") {
      const embedUrl = getRutubeEmbedUrl(block.url);
      article.innerHTML = embedUrl
        ? `<div class="student-video-frame"><iframe src="${escapeHtml(embedUrl)}" allow="clipboard-write; autoplay" allowfullscreen title="Видео урока"></iframe></div>`
        : `<p class="section-copy">${block.url ? `Не удалось встроить видео. Проверьте ссылку Rutube: <a href="${escapeHtml(block.url)}" target="_blank" rel="noreferrer">${escapeHtml(block.url)}</a>` : "Видео будет доступно после добавления ссылки."}</p>`;
    }
    if (block.type === "file") {
      article.innerHTML = block.src
        ? `
          <div class="student-attachment">
            <div>
              <strong>${escapeHtml(block.name || "Файл урока")}</strong>
              <span>${escapeHtml(block.mime || "файл")}${block.size ? ` · ${(block.size / (1024 * 1024)).toFixed(1)} MB` : ""}</span>
            </div>
            <a class="button button-fill" href="${block.src}" download="${escapeHtml(block.name || "academy-file")}">Скачать файл</a>
          </div>
        `
        : `<p class="section-copy">Файл будет доступен после загрузки.</p>`;
    }
    if (block.type === "audio") {
      article.innerHTML = block.src
        ? `
          <div class="student-audio">
            <div>
              <strong>${escapeHtml(block.name || "Аудио урока")}</strong>
              <span>${block.size ? `${(block.size / (1024 * 1024)).toFixed(1)} MB` : "MP3/WAV"}</span>
            </div>
            <audio controls preload="metadata" src="${block.src}"></audio>
          </div>
        `
        : `<p class="section-copy">Аудио будет доступно после загрузки.</p>`;
    }
    if (block.type === "test") {
      article.innerHTML = `<strong>Тест недоступен</strong><p class="section-copy">Тесты открываются отдельными пунктами в структуре курса.</p>`;
    }
    contentNode.appendChild(article);
  });
};

if (!course) {
  titleNode.textContent = "Курс не найден";
  breadcrumbNode.textContent = "Курс";
  sectionNode.textContent = "";
  contentNode.innerHTML = `<article class="content-block"><p class="section-copy">Вернитесь в каталог и выберите курс.</p></article>`;
  completeButton.hidden = true;
} else if (!lesson) {
  titleNode.textContent = "Урок не найден";
  contentNode.innerHTML = `<article class="content-block"><p class="section-copy">Вернитесь к структуре курса и выберите урок.</p></article>`;
} else {
  titleNode.textContent = lesson.title;
  breadcrumbNode.textContent = lesson.title;
  sectionNode.textContent = parentSection?.title || course.title;
  document.title = `${lesson.title} — Academy Realtors`;
  renderContent();
}

completeButton.addEventListener("click", () => {
  if (!lesson) return;
  window.AcademyStore.markComplete(course.id, lesson.id);
  completeButton.textContent = "Урок завершён";
  window.setTimeout(() => {
    window.location.href = "../course/index.html";
  }, 700);
});
