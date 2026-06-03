import { setState, subscribe } from "../state";
import { AppState } from "../types";

export function initSidebar() {
  const filterButtons = document.querySelectorAll(".news-tab-btn");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-category") ?? "all";
      setState({ activeCategory: category });
    });
  });

  // Subscribe to changes to highlight active category button
  subscribe((state: AppState) => {
    filterButtons.forEach((btn) => {
      const category = btn.getAttribute("data-category") ?? "all";
      if (category === state.activeCategory) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  });
}
