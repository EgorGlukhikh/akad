const ACTIVE_STUDENT_TEST_KEY = "academy-student-active-test";
const course = window.AcademyStore.getActiveCourse();
const activeTestId = window.AcademyStore.storage.getItem(ACTIVE_STUDENT_TEST_KEY);
const found = course
  ? window.AcademyStore.findItemById(course.items || [], activeTestId)
    || window.AcademyStore.flattenCompletableItems(course.items || [], { visibleOnly: true, requiredOnly: false }).find((item) => item.type === "test")
  : null;

const test = found?.item || found;
const parentSection = found?.parentSection;

const titleNode = document.querySelector("[data-test-title]");
const breadcrumbNode = document.querySelector("[data-test-breadcrumb]");
const sectionNode = document.querySelector("[data-test-section]");
const formNode = document.querySelector("[data-test-form]");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escapeSelector = (value = "") =>
  window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");

const renderQuestions = () => {
  formNode.innerHTML = "";
  const questions = test?.questions || [];

  if (!questions.length) {
    formNode.innerHTML = `
      <article class="content-block">
        <div class="content-block__title">Вопросы ещё не добавлены</div>
        <p class="section-copy">Этот тест пока нельзя пройти. Вернитесь к курсу или откройте другой материал.</p>
        <a class="button button-outline" href="../course/index.html">Вернуться к курсу</a>
      </article>
    `;
    return;
  }

  questions.forEach((question, index) => {
    const article = document.createElement("article");
    article.className = "content-block";
    article.innerHTML = `
      <div class="content-block__head">
        <div class="content-block__title">Вопрос ${index + 1}</div>
        <span class="block-chip">${question.type === "multiple" ? "несколько ответов" : "один ответ"}</span>
      </div>
      <p class="student-question">${escapeHtml(question.title || "Вопрос без текста")}</p>
      <div class="student-answer-list">
        ${(question.answers || []).map((answer) => `
          <label class="student-answer">
            <input type="${question.type === "multiple" ? "checkbox" : "radio"}" name="${escapeHtml(question.id)}" value="${escapeHtml(answer.id)}">
            <span>${escapeHtml(answer.text || "Вариант ответа")}</span>
          </label>
        `).join("")}
      </div>
    `;
    formNode.appendChild(article);
  });

  const footer = document.createElement("div");
  footer.className = "student-test-actions";
  footer.innerHTML = `<button class="button button-dark" type="submit">Завершить тест</button><div class="builder-summary" data-test-result></div>`;
  formNode.appendChild(footer);
};

if (!course) {
  titleNode.textContent = "Курс не найден";
  breadcrumbNode.textContent = "Курс";
  sectionNode.textContent = "";
  formNode.innerHTML = `<article class="content-block"><p class="section-copy">Вернитесь в каталог и выберите курс.</p></article>`;
} else if (!test) {
  titleNode.textContent = "Тест не найден";
  breadcrumbNode.textContent = "Тест";
  sectionNode.textContent = course.title;
  formNode.innerHTML = `<article class="content-block"><p class="section-copy">Вернитесь к структуре курса и выберите тест.</p></article>`;
} else {
  titleNode.textContent = test.title;
  breadcrumbNode.textContent = test.title;
  sectionNode.textContent = parentSection?.title || course.title;
  document.title = `${test.title} — Academy Realtors`;
  renderQuestions();
}

formNode.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!course || !test) return;

  const questions = test.questions || [];
  const total = questions.length;
  const resultNode = formNode.querySelector("[data-test-result]");

  if (!total) {
    if (resultNode) resultNode.textContent = "В этом тесте ещё нет вопросов.";
    return;
  }

  let correctCount = 0;

  questions.forEach((question) => {
    const selected = [...formNode.querySelectorAll(`[name="${escapeSelector(question.id)}"]:checked`)]
      .map((input) => input.value)
      .sort();
    const correct = (question.answers || [])
      .filter((answer) => answer.correct)
      .map((answer) => answer.id)
      .sort();
    if (JSON.stringify(selected) === JSON.stringify(correct)) correctCount += 1;
  });

  const score = (correctCount / total) * 100;
  const passed = correctCount === total;
  window.AcademyStore.markTestProgress(course.id, test.id, { passed, score });

  if (resultNode) {
    resultNode.textContent = passed
      ? `Результат: ${correctCount} из ${total}. Тест пройден.`
      : `Результат: ${correctCount} из ${total}. Для зачёта нужны все правильные ответы.`;
  }

  if (!passed) return;

  window.setTimeout(() => {
    window.location.href = "../course/index.html";
  }, 1000);
});
