const passwordInput = document.querySelector("[data-password-input]");
const passwordToggle = document.querySelector("[data-password-toggle]");
const authForm = document.querySelector(".auth-form");

if (passwordInput && passwordToggle) {
  passwordToggle.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.setAttribute("aria-pressed", String(isHidden));
    passwordToggle.setAttribute("aria-label", isHidden ? "Скрыть пароль" : "Показать пароль");
  });
}

if (authForm) {
  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.location.href = "../student/index.html";
  });
}
