import { subscribe } from "../state";
import { AppState } from "../types";

export function initSignalBar() {
  const marqueeContainer = document.getElementById("signals-marquee");

  if (!marqueeContainer) return;

  subscribe((state: AppState) => {
    marqueeContainer.innerHTML = "";

    if (state.signals.length === 0) {
      marqueeContainer.innerHTML = `
        <div class="no-signals-msg">Monitoring news & indices for signal convergence...</div>
      `;
      return;
    }

    state.signals.forEach((sig) => {
      const pill = document.createElement("div");
      pill.className = `signal-badge ${sig.isRed ? "red-alert" : ""}`;
      pill.title = sig.description;

      pill.innerHTML = `
        <span class="signal-dot"></span>
        <span class="signal-text">${sig.label}: ${sig.description}</span>
      `;

      marqueeContainer.appendChild(pill);
    });
  });
}
