const STORAGE_KEY = "academy-admin-course-state";
const ACTIVE_TEST_KEY = "academy-admin-active-test";
const ACTIVE_STUDENT_TEST_KEY = "academy-student-active-test";

const createId = () => `question-${Math.random().toString(36).slice(2, 9)}`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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

const findTest = (items, testId, parentSection = null) => {
  for (const item of items || []) {
    if (item.type === "test" && item.id === testId) return { test: item, parentSection };
    if (item.children) {
      const found = findTest(item.children, testId, item.type === "section" ? item : parentSection);
      if (found) return found;
    }
  }
  return null;
};

const findFirstTest = (items, parentSection = null) => {
  for (const item of items || []) {
    if (item.type === "test") return { test: item, parentSection };
    if (item.children) {
      const found = findFirstTest(item.children, item.type === "section" ? item : parentSection);
      if (found) return found;
    }
  }
  return null;
};

const ensureEditableTest = (state, activeTestId) => {
  const found = findTest(state.items || [], activeTestId) || findFirstTest(state.items || []);
  if (found) return found;

  state.items = Array.isArray(state.items) ? state.items : [];
  const test = {
    id: `item-${Math.random().toString(36).slice(2, 9)}`,
    type: "test",
    title: "Тест 1",
    hidden: false,
    required: true,
    questions: [],
  };
  state.items.push(test);
  localStorage.setItem(ACTIVE_TEST_KEY, test.id);
  saveState(state);
  return { test, parentSection: null };
};

const renderTestEditor = () => {
  const state = loadState();
  const activeTestId = localStorage.getItem(ACTIVE_TEST_KEY);
  const found = ensureEditableTest(state, activeTestId);

  const { test, parentSection } = found;
  test.questions = Array.isArray(test.questions) ? test.questions : [];

  const titleInput = document.querySelector("[data-test-title]");
  const breadcrumbTitle = document.querySelector("[data-test-breadcrumb-title]");
  const breadcrumbSection = document.querySelector("[data-test-section]");
  const questionsRoot = document.querySelector("[data-questions-root]");
  const emptyState = document.querySelector("[data-empty-state]");

  breadcrumbSection.textContent = parentSection?.title || "Курс";
  titleInput.value = test.title || "Новый тест";
  breadcrumbTitle.textContent = test.title || "Тест";

  const persist = () => saveState(state);

  const renderQuestions = () => {
    questionsRoot.innerHTML = "";
    emptyState.hidden = test.questions.length > 0;

    test.questions.forEach((question, questionIndex) => {
      question.answers = Array.isArray(question.answers) && question.answers.length
        ? question.answers
        : [
            { id: createId(), text: "Вариант ответа", correct: true },
            { id: createId(), text: "Вариант ответа", correct: false },
          ];

      const article = document.createElement("article");
      article.className = "content-block";
      article.dataset.questionId = question.id;
      article.innerHTML = `
        <div class="content-block__head">
          <div class="content-block__title">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5h10l2 3v11H5V8l2-3Z" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M8 12h8M8 16h5" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>
            <span>Вопрос ${questionIndex + 1}</span>
          </div>
          <div class="content-block__actions">
            <div class="block-chip">${question.type === "multiple" ? "несколько ответов" : "один ответ"}</div>
            <button class="icon-action" type="button" data-action="remove-question" data-id="${question.id}" aria-label="Удалить вопрос">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M7 7l1 12h8l1-12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
            </button>
          </div>
        </div>
        <label class="field">
          <span class="field-label">Текст вопроса</span>
          <span class="field-control">
            <input class="input" type="text" value="${escapeHtml(question.title || "")}" placeholder="Введите вопрос" data-question-title="${question.id}">
          </span>
        </label>
        <div class="answer-list" data-answer-list="${question.id}">
          ${question.answers
            .map(
              (answer) => `
                <label class="answer-row">
                  <input type="${question.type === "multiple" ? "checkbox" : "radio"}" name="correct-${question.id}" ${answer.correct ? "checked" : ""} data-answer-correct="${question.id}" data-answer-id="${answer.id}">
                  <input class="input" type="text" value="${escapeHtml(answer.text || "")}" placeholder="Вариант ответа" data-answer-text="${question.id}" data-answer-id="${answer.id}">
                  <button class="icon-action" type="button" data-action="remove-answer" data-question-id="${question.id}" data-answer-id="${answer.id}" aria-label="Удалить ответ">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>
                  </button>
                </label>
              `,
            )
            .join("")}
        </div>
        <button class="button button-outline admin-entity-button" type="button" data-action="add-answer" data-id="${question.id}">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>
          <span>Добавить ответ</span>
        </button>
      `;

      questionsRoot.appendChild(article);
    });
  };

  const addQuestion = (type) => {
    test.questions.push({
      id: createId(),
      type,
      title: "",
      answers: [
        { id: createId(), text: "Вариант ответа", correct: true },
        { id: createId(), text: "Вариант ответа", correct: false },
      ],
    });
    persist();
    renderQuestions();
  };

  titleInput.addEventListener("input", () => {
    test.title = titleInput.value || "Новый тест";
    breadcrumbTitle.textContent = test.title;
    persist();
  });

  document.querySelectorAll("[data-add-question]").forEach((button) => {
    button.addEventListener("click", () => addQuestion(button.dataset.addQuestion));
  });

  questionsRoot.addEventListener("input", (event) => {
    const titleInputNode = event.target.closest("[data-question-title]");
    if (titleInputNode) {
      const question = test.questions.find((item) => item.id === titleInputNode.dataset.questionTitle);
      if (!question) return;
      question.title = titleInputNode.value;
      persist();
      return;
    }

    const answerInput = event.target.closest("[data-answer-text]");
    if (answerInput) {
      const question = test.questions.find((item) => item.id === answerInput.dataset.answerText);
      const answer = question?.answers.find((item) => item.id === answerInput.dataset.answerId);
      if (!answer) return;
      answer.text = answerInput.value;
      persist();
    }
  });

  questionsRoot.addEventListener("change", (event) => {
    const correctInput = event.target.closest("[data-answer-correct]");
    if (!correctInput) return;
    const question = test.questions.find((item) => item.id === correctInput.dataset.answerCorrect);
    if (!question) return;

    if (question.type !== "multiple") {
      question.answers.forEach((answer) => {
        answer.correct = answer.id === correctInput.dataset.answerId;
      });
    } else {
      const answer = question.answers.find((item) => item.id === correctInput.dataset.answerId);
      if (answer) answer.correct = correctInput.checked;
    }

    persist();
  });

  questionsRoot.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    if (target.dataset.action === "remove-question") {
      test.questions = test.questions.filter((question) => question.id !== target.dataset.id);
      persist();
      renderQuestions();
      return;
    }

    if (target.dataset.action === "add-answer") {
      const question = test.questions.find((item) => item.id === target.dataset.id);
      if (!question) return;
      question.answers.push({ id: createId(), text: "Вариант ответа", correct: false });
      persist();
      renderQuestions();
      return;
    }

    if (target.dataset.action === "remove-answer") {
      const question = test.questions.find((item) => item.id === target.dataset.questionId);
      if (!question || question.answers.length <= 1) return;
      question.answers = question.answers.filter((answer) => answer.id !== target.dataset.answerId);
      if (!question.answers.some((answer) => answer.correct)) {
        question.answers[0].correct = true;
      }
      persist();
      renderQuestions();
    }
  });

  document.querySelector("[data-save-test]").addEventListener("click", () => {
    persist();
    const button = document.querySelector("[data-save-test]");
    button.textContent = "Сохранено";
    window.setTimeout(() => {
      button.textContent = "Сохранить";
    }, 1500);
  });

  document.querySelector("[data-preview-test]").addEventListener("click", () => {
    persist();
    localStorage.setItem(ACTIVE_STUDENT_TEST_KEY, test.id);
    window.location.href = "../../student/test/index.html";
  });

  renderQuestions();
};

renderTestEditor();
