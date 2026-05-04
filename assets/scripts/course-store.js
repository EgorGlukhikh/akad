(function () {
  const COURSES_KEY = "academy-courses-state";
  const LEGACY_KEY = "academy-admin-course-state";
  const ACTIVE_LESSON_KEY = "academy-admin-active-lesson";
  const ACTIVE_TEST_KEY = "academy-admin-active-test";
  const STUDENT_PROGRESS_KEY = "academy-student-progress";

  const createId = (prefix = "item") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const BASE_REALTOR_COURSE_SLUG = "base-realtor-course-28-v1";
  const DATA_CONTRACT_VERSION = 1;

  const isQuotaError = (error) =>
    error?.name === "QuotaExceededError"
    || error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || error?.code === 22
    || error?.code === 1014;

  const storage = {
    getItem(key) {
      try {
        return window.localStorage?.getItem(key) ?? null;
      } catch (error) {
        console.warn(`Unable to read "${key}" from localStorage.`, error);
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage?.setItem(key, value);
        return true;
      } catch (error) {
        const reason = isQuotaError(error) ? "localStorage quota exceeded" : "localStorage write failed";
        console.warn(`${reason} for "${key}".`, error);
        return false;
      }
    },
    removeItem(key) {
      try {
        window.localStorage?.removeItem(key);
        return true;
      } catch (error) {
        console.warn(`Unable to remove "${key}" from localStorage.`, error);
        return false;
      }
    },
  };

  const lessonThemes = [
    ["Введение в профессию риэлтора", "Разберём, чем на практике занимается риэлтор: не только показывает объекты, а ведёт клиента через выбор, переговоры, документы и принятие решений. Важно сразу увидеть профессию целиком, чтобы не застрять в отдельных действиях без системы.", "В уроке можно зафиксировать свои ожидания от работы и понять, какие навыки понадобятся в первую очередь. Это точка входа: после неё проще читать следующие темы не как теорию, а как рабочую карту."],
    ["Самодиагностика и постановка целей", "Перед стартом полезно честно оценить текущую точку: опыт общения с клиентами, понимание рынка, юридическую базу, дисциплину и готовность регулярно делать продажи. Такая диагностика помогает не сравнивать себя с другими, а строить понятный личный маршрут.", "Вторая часть урока посвящена целям. Здесь важно сформулировать не абстрактное «хочу больше сделок», а конкретный план: какие сегменты интересны, сколько времени есть на обучение и какой результат нужен в ближайшие недели."],
    ["Основы коммуникации для риэлтора", "Коммуникация в недвижимости держится на ясности, спокойствии и умении задавать вопросы. Клиент должен понимать, что происходит, почему вы предлагаете следующий шаг и какую задачу он решает.", "В уроке разбираются базовые принципы разговора: как не давить, как уточнять запрос, как объяснять сложные вещи простым языком и как оставаться профессиональным даже в напряжённых ситуациях."],
    ["Первые контакты с клиентами", "Первый контакт часто определяет, будет ли человек готов продолжать диалог. Здесь важны не заученные фразы, а структура: кто вы, зачем пишете или звоните, какую пользу можете дать прямо сейчас.", "Урок помогает собрать короткий сценарий первого общения, чтобы не теряться в начале разговора. Отдельно стоит обратить внимание на фиксацию договорённостей после контакта: без этого лид быстро остывает."],
    ["Воронка продаж в недвижимости", "Воронка показывает, как потенциальный клиент проходит путь от первого контакта до сделки. Если её не видеть, легко путать активность с результатом: звонков много, а понятного движения нет.", "В этом уроке можно разложить процесс по этапам: лид, квалификация, встреча, подбор или продажа объекта, переговоры, документы, сделка и сопровождение. Так становится видно, где именно теряются клиенты."],
    ["Холодные звонки", "Холодный звонок не обязан быть агрессивным. Его задача — быстро понять, есть ли у человека актуальная потребность, и предложить следующий маленький шаг без давления.", "В уроке собрана базовая логика звонка: подготовка, открывающая фраза, вопрос, короткое предложение и корректное завершение. Чем проще сценарий, тем легче повторять его регулярно."],
    ["Работа с возражениями и аргументация", "Возражение не всегда означает отказ. Часто клиент просто просит больше ясности: по цене, срокам, безопасности, комиссии или формату работы.", "В этом уроке разбирается подход, при котором риэлтор сначала уточняет причину сомнения, а потом отвечает по сути. Такая аргументация звучит спокойнее и сильнее, чем попытка сразу переубедить."],
    ["Отработка возражений", "Знать ответы на возражения мало — их нужно проговорить вслух и довести до естественного звучания. Клиент быстро чувствует, когда фраза выучена, но не прожита.", "Урок можно использовать как тренировочный блок: выбрать частые возражения, записать варианты ответа и проверить, насколько они звучат по-человечески. Хороший ответ должен быть коротким, конкретным и уважительным."],
    ["Алгоритм проведения встречи с собственником", "Встреча с собственником требует подготовки: нужно понимать объект, район, конкурентные предложения и ожидания продавца. Без этого разговор быстро превращается в обмен мнениями.", "В уроке описывается последовательность встречи: установить контакт, уточнить мотивацию, обсудить цену, объяснить стратегию продажи и договориться о следующем шаге. Это помогает вести встречу уверенно и без хаоса."],
    ["Подготовка и проведение встречи с клиентом-покупателем", "Покупателю важно не просто показать варианты, а помочь разобраться в выборе. Для этого до встречи нужно понять бюджет, цель покупки, сроки, критерии и возможные ограничения.", "Урок помогает собрать структуру разговора с покупателем: выявление запроса, объяснение рынка, правила подбора и фиксация дальнейших действий. Так клиент видит, что работа идёт не случайно."],
    ["Алгоритм работы по договору на подбор", "Договор на подбор работает только тогда, когда клиент понимает его смысл. Это не формальность, а рамка сотрудничества: кто что делает, какие есть сроки и какой результат ожидается.", "В уроке разбирается, как объяснять договор без давления и лишней юридической тяжести. Отдельный акцент — на прозрачности: клиенту должно быть ясно, за что он платит и какую работу получает."],
    ["Аналитика рынка", "Риэлтору важно уметь читать рынок: видеть не только цены в объявлениях, но и динамику спроса, срок экспозиции, состояние конкурентов и реальные аргументы для переговоров.", "В уроке можно собрать базовый набор источников и показателей, которые помогают принимать решения. Аналитика нужна не для красивых таблиц, а чтобы уверенно объяснять клиенту ситуацию."],
    ["Анализ объекта и района", "Объект нельзя оценивать отдельно от района. На решение клиента влияют транспорт, инфраструктура, состояние дома, окружение, перспективы и ограничения локации.", "Урок показывает, как смотреть на объект глазами покупателя и собственника одновременно. Такой анализ помогает готовить презентацию, аргументы по цене и ответы на возможные вопросы."],
    ["Юридические основы сделок с недвижимостью", "Юридическая часть сделки требует внимательности даже на базовом уровне. Риэлтор должен понимать, какие документы нужны, где могут быть риски и когда необходимо подключать профильного специалиста.", "В уроке даётся рабочая рамка: право собственности, документы по объекту, участники сделки, обременения, согласия и проверки. Это не заменяет юриста, но помогает не пропустить очевидные сигналы."],
    ["Защита агентского договора", "Агентский договор нужно уметь объяснять и защищать спокойно. Если риэлтор сам не понимает ценность своей работы, клиенту тоже будет трудно её принять.", "Урок помогает сформулировать, что именно входит в услугу: анализ, продвижение, переговоры, сопровождение, контроль сроков и коммуникация. Чем конкретнее список работ, тем меньше разговоров «за что комиссия»."],
    ["Переговоры", "Переговоры в недвижимости строятся на подготовке и умении слышать интересы сторон. Сильная позиция появляется не из жёсткости, а из фактов, вариантов и понятных границ.", "В уроке разбирается базовая структура переговоров: цель, минимально приемлемые условия, аргументы, уступки и фиксация договорённостей. Это помогает не реагировать эмоционально на каждое давление."],
    ["Снижение цены", "Разговор о снижении цены часто самый чувствительный для собственника. Здесь нельзя просто сказать «дорого» — нужно показать рыночную логику и последствия завышенной цены.", "Урок помогает подготовить аргументы: сравнимые объекты, срок продажи, активность покупателей, просмотры и обратную связь. Снижение цены должно выглядеть не уступкой, а управляемым решением."],
    ["Основы маркетинга", "Маркетинг объекта начинается с понимания аудитории: кому подходит объект, какие у него сильные стороны и где будущий покупатель будет искать информацию.", "В уроке разбираются базовые элементы: упаковка объявления, фотографии, описание, каналы размещения и регулярная оценка отклика. Хороший маркетинг делает объект понятным, а не просто заметным."],
    ["Создание контента", "Контент помогает риэлтору быть видимым и объяснять свою экспертизу до личного контакта. Но он должен быть связан с реальными задачами клиентов, а не существовать ради публикаций.", "В уроке можно собрать темы для постов, коротких видео и разборов: ошибки покупателей, подготовка к продаже, документы, районы, переговоры. Важно говорить просто и на примерах из практики."],
    ["Сбор обратной связи после сделки", "После сделки работа не заканчивается. Обратная связь помогает понять, что было удобно клиенту, где возникали сложности и почему вас могут рекомендовать дальше.", "Урок показывает, как корректно запросить отзыв, зафиксировать выводы и поддержать контакт после завершения сделки. Это влияет не только на репутацию, но и на будущие рекомендации."],
    ["Этичность в работе риэлтора", "Этика в недвижимости — это не красивые слова, а ежедневные решения: как говорить о рисках, как обращаться с данными клиента и как не обещать того, что невозможно гарантировать.", "В уроке разбираются ситуации, где важно сохранить доверие: конфликт интересов, давление сторон, неполная информация, спорные условия. Репутация формируется именно в таких моментах."],
    ["Разбор этических кейсов и ситуаций", "Кейсы помогают увидеть, что в работе риэлтора не всегда есть один простой ответ. Иногда нужно выбирать между быстрым результатом и долгосрочным доверием.", "В уроке можно разобрать несколько типовых ситуаций и потренироваться принимать решение: что сказать клиенту, что зафиксировать письменно и когда лучше отказаться от сомнительной сделки."],
    ["Тайм-менеджмент и организация работы", "В работе агента легко утонуть в звонках, показах, переписках и документах. Без системы день выглядит загруженным, но результат двигается медленно.", "Урок помогает собрать базовый порядок: список задач, приоритеты, календарь, фиксация клиентов и регулярные повторные касания. Организация нужна не для контроля ради контроля, а чтобы не терять сделки."],
    ["Создание личного плана развития и обучения", "Профессиональный рост проще строить, когда понятно, какие навыки нужно подтянуть в ближайшее время. План помогает не хвататься за всё сразу.", "В уроке слушатель может определить 2–3 главные зоны развития: коммуникация, аналитика, юридическая база, переговоры, маркетинг или дисциплина. Дальше эти зоны превращаются в конкретные действия на неделю и месяц."],
    ["Создание структуры позиционирования и прайса", "Позиционирование отвечает на вопрос, почему клиенту стоит работать именно с вами. Это не выдуманный образ, а понятное описание опыта, подхода, сегмента и ценности.", "В уроке разбирается, как сформулировать свои услуги и прайс так, чтобы они не выглядели случайными. Клиенту важно видеть, что входит в работу и чем отличаются разные форматы сопровождения."],
    ["Восемь практических правил для устойчивой карьеры", "Устойчивая карьера строится на повторяемых действиях: регулярные контакты, честная коммуникация, работа с базой, обучение, контроль документов и бережное отношение к репутации.", "В уроке восемь правил собираются в короткий чек-лист, к которому можно возвращаться в работе. Это не мотивационный блок, а практичная памятка для ежедневного ритма."],
    ["Финал курса", "В финале важно собрать пройденные темы в одну картину: клиент, объект, рынок, договорённости, документы, переговоры и сопровождение сделки. Так курс превращается не в набор уроков, а в рабочую систему.", "Урок помогает зафиксировать, что уже понятно, какие материалы стоит повторить и какие действия нужно перенести в работу сразу после обучения. Хороший финал даёт не точку, а следующий шаг."],
    ["Немного вдохновения", "В работе риэлтора бывают сложные периоды: отказы, переносы встреч, сомнения клиентов и сделки, которые идут дольше ожидаемого. Важно помнить, что устойчивость появляется не сразу, а через регулярную практику.", "Этот бонусный урок нужен как спокойное напоминание: профессия растёт через опыт, ошибки и внимательное отношение к людям. Если держать ритм и разбирать свои действия, прогресс становится заметным."],
  ];

  const createLessonFromTheme = ([title, firstParagraph, secondParagraph], index) => ({
    id: createId("lesson"),
    type: "lesson",
    title: `Урок ${index + 1}. ${title}`,
    hidden: false,
    required: true,
    content: [
      {
        id: createId("block"),
        type: "text",
        html: `<h2>${title}</h2><p>${firstParagraph}</p><p>${secondParagraph}</p>`,
      },
    ],
  });

  const createBaseRealtorItems = () => [
    {
      id: createId("section"),
      type: "section",
      title: "Модуль 1. Базовый курс риэлтора",
      hidden: false,
      required: true,
      children: lessonThemes.map(createLessonFromTheme),
    },
  ];

  const createBaseRealtorCourse = (overrides = {}) => ({
    id: createId("course"),
    slug: BASE_REALTOR_COURSE_SLUG,
    title: "Базовый курс риэлтора",
    description: "28 уроков для старта в профессии: клиенты, встречи, возражения, договоры, аналитика, маркетинг и организация работы.",
    status: "published",
    coverSrc: "assets/images/base-course-cover.svg",
    coverAlt: "Обложка базового курса риэлтора",
    contentVersion: 1,
    items: createBaseRealtorItems(),
    updatedAt: now(),
    ...overrides,
  });

  const createSeedItems = () => [
    {
      id: createId("section"),
      type: "section",
      title: "Раздел 1",
      hidden: false,
      required: true,
      children: [
        {
          id: createId("lesson"),
          type: "lesson",
          title: "Урок 1",
          hidden: false,
          required: true,
          content: [
            {
              id: createId("block"),
              type: "text",
              html: "<h2>Первый урок</h2><p>Здесь будет основной материал урока. Администратор может заменить этот текст в редакторе.</p>",
            },
          ],
        },
        {
          id: createId("test"),
          type: "test",
          title: "Тест 1",
          hidden: false,
          required: true,
          questions: [
            {
              id: createId("question"),
              type: "single",
              title: "Что важно сделать перед первой встречей с клиентом?",
              answers: [
                { id: createId("answer"), text: "Подготовить вопросы и проверить вводные", correct: true },
                { id: createId("answer"), text: "Сразу отправить договор", correct: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: createId("lesson"),
      type: "lesson",
      title: "Урок 2",
      hidden: false,
      required: false,
      content: [],
    },
  ];

  const createCourse = (overrides = {}) => ({
    id: createId("course"),
    slug: "",
    title: "Новый курс",
    description: "",
    status: "draft",
    coverSrc: "",
    coverAlt: "",
    contentVersion: 0,
    items: createSeedItems(),
    updatedAt: now(),
    ...overrides,
  });

  const normalizeItem = (item) => {
    const next = item && typeof item === "object" ? item : {};
    next.id ||= createId(next.type || "item");
    next.type ||= "lesson";
    next.title ||= next.type === "section" ? "Раздел" : next.type === "test" ? "Тест" : "Урок";
    next.hidden = Boolean(next.hidden);
    next.required = Boolean(next.required);
    if (next.type === "section") next.children = Array.isArray(next.children) ? next.children.map(normalizeItem) : [];
    if (next.type === "lesson") next.content = Array.isArray(next.content) ? next.content : [];
    if (next.type === "test") next.questions = Array.isArray(next.questions) ? next.questions : [];
    return next;
  };

  const normalizeCourse = (course) => {
    const next = course && typeof course === "object" ? course : createCourse();
    next.id ||= createId("course");
    next.title ||= next.courseTitle || "Новый курс";
    next.description ||= next.courseDescription || "";
    next.status = next.status === "published" ? "published" : "draft";
    next.coverSrc ||= "";
    next.coverAlt ||= "";
    next.slug ||= "";
    next.contentVersion ||= 0;
    next.items = Array.isArray(next.items) ? next.items.map(normalizeItem) : [];
    next.updatedAt ||= now();
    delete next.courseTitle;
    delete next.courseDescription;
    return next;
  };

  const courseFromLegacy = (legacy) =>
    normalizeCourse({
      id: createId("course"),
      title: legacy?.courseTitle || "Новый курс",
      description: legacy?.courseDescription || "",
      status: "draft",
      items: Array.isArray(legacy?.items) ? legacy.items : createSeedItems(),
      updatedAt: now(),
    });

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(storage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  };

  const saveState = (state) => {
    const next = {
      dataContractVersion: DATA_CONTRACT_VERSION,
      courses: (state.courses || []).map(normalizeCourse),
      activeCourseId: state.activeCourseId,
      updatedAt: now(),
    };
    if (!next.activeCourseId && next.courses[0]) next.activeCourseId = next.courses[0].id;
    storage.setItem(COURSES_KEY, JSON.stringify(next));
    return next;
  };

  const loadState = () => {
    const stored = readJson(COURSES_KEY, null);
    let state = stored && typeof stored === "object" ? stored : null;

    if (!state) {
      const legacy = readJson(LEGACY_KEY, null);
      const firstCourse = legacy?.items ? courseFromLegacy(legacy) : createBaseRealtorCourse();
      state = {
        dataContractVersion: DATA_CONTRACT_VERSION,
        courses: [firstCourse],
        activeCourseId: firstCourse.id,
        updatedAt: now(),
      };
      saveState(state);
    }

    state.courses = Array.isArray(state.courses) && state.courses.length
      ? state.courses.map(normalizeCourse)
      : [createBaseRealtorCourse()];

    const baseCourseIndex = state.courses.findIndex((course) =>
      course.slug === BASE_REALTOR_COURSE_SLUG || course.title === "Базовый курс риэлтора",
    );
    if (baseCourseIndex >= 0) {
      const existing = state.courses[baseCourseIndex];
      if (existing.contentVersion !== 1) {
        state.courses[baseCourseIndex] = normalizeCourse({
          ...createBaseRealtorCourse({
            id: existing.id,
            status: existing.status || "published",
            coverSrc: existing.coverSrc || "assets/images/base-course-cover.svg",
            coverAlt: existing.coverAlt || "Обложка базового курса риэлтора",
            updatedAt: existing.updatedAt || now(),
          }),
        });
        saveState(state);
      } else if (!existing.coverSrc) {
        existing.coverSrc = "assets/images/base-course-cover.svg";
        existing.coverAlt ||= "Обложка базового курса риэлтора";
        saveState(state);
      }
    } else {
      state.courses.unshift(createBaseRealtorCourse());
      state.activeCourseId ||= state.courses[0].id;
      saveState(state);
    }

    if (!state.activeCourseId || !state.courses.some((course) => course.id === state.activeCourseId)) {
      state.activeCourseId = state.courses[0].id;
    }

    state.updatedAt ||= now();
    state.dataContractVersion = DATA_CONTRACT_VERSION;
    return state;
  };

  const exportState = () => JSON.stringify(loadState(), null, 2);

  const importState = (value) => {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const imported = parsed && typeof parsed === "object" ? parsed : {};
    const courses = Array.isArray(imported.courses) && imported.courses.length
      ? imported.courses.map(normalizeCourse)
      : [createBaseRealtorCourse()];
    const activeCourseId = courses.some((course) => course.id === imported.activeCourseId)
      ? imported.activeCourseId
      : courses[0].id;
    return saveState({ courses, activeCourseId });
  };

  const resetDemoData = () => {
    const course = createBaseRealtorCourse();
    return saveState({
      courses: [course],
      activeCourseId: course.id,
    });
  };

  const getActiveCourse = () => {
    const state = loadState();
    const course = state.courses.find((item) => item.id === state.activeCourseId) || state.courses[0];
    return course ? clone(course) : null;
  };

  const setActiveCourse = (courseId) => {
    const state = loadState();
    if (state.courses.some((course) => course.id === courseId)) {
      state.activeCourseId = courseId;
      saveState(state);
    }
  };

  const saveActiveCourse = (course) => {
    const state = loadState();
    const nextCourse = normalizeCourse({ ...course, updatedAt: now() });
    const index = state.courses.findIndex((item) => item.id === nextCourse.id);
    if (index >= 0) {
      state.courses[index] = nextCourse;
    } else {
      state.courses.push(nextCourse);
    }
    state.activeCourseId = nextCourse.id;
    return saveState(state);
  };

  const createNewCourse = () => {
    const state = loadState();
    const course = createCourse({
      title: `Новый курс ${state.courses.length + 1}`,
      description: "Кратко опишите, чему посвящён курс и для кого он нужен.",
      status: "draft",
      items: [],
    });
    state.courses.push(course);
    state.activeCourseId = course.id;
    saveState(state);
    return clone(course);
  };

  const deleteCourse = (courseId) => {
    const state = loadState();
    state.courses = state.courses.filter((course) => course.id !== courseId);
    if (!state.courses.length) state.courses.push(createBaseRealtorCourse({ status: "draft", items: [] }));
    if (state.activeCourseId === courseId) state.activeCourseId = state.courses[0].id;
    saveState(state);
  };

  const findItemById = (items, id, parentSection = null) => {
    for (const item of items || []) {
      if (item.id === id) return { item, parentSection };
      if (item.children) {
        const found = findItemById(item.children, id, item.type === "section" ? item : parentSection);
        if (found) return found;
      }
    }
    return null;
  };

  const countItems = (items, options = {}) => {
    const visibleOnly = options.visibleOnly ?? false;
    const requiredOnly = options.requiredOnly ?? false;
    let sections = 0;
    let lessons = 0;
    let tests = 0;

    for (const item of items || []) {
      if (visibleOnly && item.hidden) continue;
      if (item.type === "section") {
        sections += requiredOnly && !item.required ? 0 : 1;
        const childCounts = countItems(item.children || [], options);
        lessons += childCounts.lessons;
        tests += childCounts.tests;
      } else if (item.type === "lesson" && (!requiredOnly || item.required)) {
        lessons += 1;
      } else if (item.type === "test" && (!requiredOnly || item.required)) {
        tests += 1;
      }
    }
    return { sections, lessons, tests };
  };

  const flattenCompletableItems = (items, options = {}) => {
    const visibleOnly = options.visibleOnly ?? true;
    const requiredOnly = options.requiredOnly ?? true;
    const result = [];
    for (const item of items || []) {
      if (visibleOnly && item.hidden) continue;
      if (item.type === "section") result.push(...flattenCompletableItems(item.children || [], options));
      if ((item.type === "lesson" || item.type === "test") && (!requiredOnly || item.required)) result.push(item);
    }
    return result;
  };

  const getProgressState = () => readJson(STUDENT_PROGRESS_KEY, {});
  const saveProgressState = (progress) => storage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(progress));
  const getProgressEntry = (courseId, itemId) => getProgressState()?.[courseId]?.[itemId] || null;

  const isComplete = (courseId, itemId) => {
    const entry = getProgressEntry(courseId, itemId);
    if (!entry) return false;
    if (typeof entry === "object" && ("passed" in entry || "failed" in entry)) return entry.passed === true;
    return Boolean(entry.completedAt || entry);
  };

  const markComplete = (courseId, itemId) => {
    const progress = getProgressState();
    progress[courseId] ||= {};
    progress[courseId][itemId] = { completedAt: now() };
    saveProgressState(progress);
  };

  const markTestProgress = (courseId, testId, result = {}) => {
    const score = Number.isFinite(result.score) ? Math.max(0, Math.min(100, Math.round(result.score))) : 0;
    const passed = result.passed === true;
    const progress = getProgressState();
    progress[courseId] ||= {};
    progress[courseId][testId] = {
      passed,
      failed: !passed,
      score,
      completedAt: now(),
    };
    saveProgressState(progress);
  };

  const resolveAssetUrl = (src = "") => {
    if (!src || /^(data:|https?:|file:|blob:)/.test(src)) return src;
    const rootHref = window.location.href.split(/\/(?:admin|student|auth|concepts)\//)[0];
    return new URL(src, `${rootHref}/`).href;
  };

  const getCompletionStats = (course) => {
    if (!course) return { total: 0, completed: 0, percent: 0 };
    const items = flattenCompletableItems(course.items || [], { visibleOnly: true, requiredOnly: true });
    const completed = items.filter((item) => {
      if (item.type === "test") return getProgressEntry(course.id, item.id)?.passed === true;
      return isComplete(course.id, item.id);
    }).length;
    return {
      total: items.length,
      completed,
      percent: items.length ? Math.round((completed / items.length) * 100) : 0,
    };
  };

  window.AcademyStore = {
    COURSES_KEY,
    ACTIVE_LESSON_KEY,
    ACTIVE_TEST_KEY,
    loadState,
    saveState,
    exportState,
    importState,
    resetDemoData,
    getActiveCourse,
    setActiveCourse,
    saveActiveCourse,
    createNewCourse,
    deleteCourse,
    findItemById,
    countItems,
    flattenCompletableItems,
    getCompletionStats,
    getProgressEntry,
    markComplete,
    markTestProgress,
    isComplete,
    resolveAssetUrl,
    storage,
  };
})();
