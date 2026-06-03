import { subscribe } from "../state";
import { SECTOR_INDEX_MAP } from "../config";
import { AppState } from "../types";

export function initSectorHeatmap() {
  const heatmapGrid = document.getElementById("sector-heatmap-grid");

  if (!heatmapGrid) return;

  // Linear color interpolation helper
  function getHeatmapBgColor(pChange: number): string {
    const neutral = { r: 17, g: 24, b: 39 }; // #111827
    const maxGreen = { r: 26, g: 58, b: 42 }; // #1a3a2a (+3%)
    const maxRed = { r: 58, g: 26, b: 26 }; // #3a1a1a (-3%)

    if (pChange >= 0) {
      const ratio = Math.min(pChange / 3.0, 1.0); // Clamp to max 3.0%
      const r = Math.round(neutral.r + ratio * (maxGreen.r - neutral.r));
      const g = Math.round(neutral.g + ratio * (maxGreen.g - neutral.g));
      const b = Math.round(neutral.b + ratio * (maxGreen.b - neutral.b));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const ratio = Math.min(Math.abs(pChange) / 3.0, 1.0); // Clamp to max -3.0%
      const r = Math.round(neutral.r + ratio * (maxRed.r - neutral.r));
      const g = Math.round(neutral.g + ratio * (maxRed.g - neutral.g));
      const b = Math.round(neutral.b + ratio * (maxRed.b - neutral.b));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  subscribe((state: AppState) => {
    if (!state.market) return;

    heatmapGrid.innerHTML = "";

    const sectors = Object.keys(SECTOR_INDEX_MAP);

    sectors.forEach((sectorName) => {
      const indexName = SECTOR_INDEX_MAP[sectorName];
      const indexData = state.market?.indices.find(idx => idx.name === indexName);
      
      const pChange = indexData?.pChange ?? 0.0;
      const isUp = pChange >= 0;
      const bgColor = getHeatmapBgColor(pChange);

      const tile = document.createElement("div");
      tile.className = "heatmap-tile";
      tile.style.backgroundColor = bgColor;
      tile.style.border = `1px solid ${isUp ? "rgba(0, 212, 170, 0.1)" : "rgba(239, 68, 68, 0.1)"}`;

      tile.innerHTML = `
        <span class="tile-label">${sectorName}</span>
        <span class="tile-change" style="color: ${isUp ? "var(--accent-green)" : "var(--accent-red)"}">
          ${isUp ? "+" : ""}${pChange.toFixed(2)}%
        </span>
      `;

      heatmapGrid.appendChild(tile);
    });
  });
}
