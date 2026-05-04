const progressBar = document.querySelector(".page-progress-bar");
const modal = document.querySelector("#signup-modal");
const modalCloseButtons = document.querySelectorAll("[data-close-modal]");
const modalStorageKey = "academy-realtors-signup-modal-seen";

function updateProgressBar() {
  if (!progressBar) return;

  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

  progressBar.style.width = `${ratio * 100}%`;
}

updateProgressBar();
window.addEventListener("scroll", updateProgressBar, { passive: true });
window.addEventListener("resize", updateProgressBar);

function openModal() {
  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  localStorage.setItem(modalStorageKey, "1");
}

if (modal && !localStorage.getItem(modalStorageKey)) {
  window.setTimeout(openModal, 3000);
}

modalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) {
    closeModal();
  }
});
