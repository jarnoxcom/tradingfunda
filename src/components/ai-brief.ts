import { setState, subscribe } from "../state";
import { AppState } from "../types";
import { relativeTime } from "../utils/format";

// We'll dispatch a custom event or define a callback that main.ts can override or trigger
let refreshCallback: (() => Promise<void>) | null = null;

export function registerAiBriefRefresh(callback: () => Promise<void>) {
  refreshCallback = callback;
}

export function initAiBrief() {
  const widgetContainer = document.getElementById("ai-brief-widget");

  if (!widgetContainer) return;

  subscribe((state: AppState) => {
    // 1. Loading state
    if (state.aiBriefLoading) {
      widgetContainer.innerHTML = `
        <div class="ai-header">
          <div class="ai-title">
            <span class="ai-glow-dot"></span>
            <span>INTELLIGENCE BRIEF (AI SYNTHESIS)</span>
          </div>
          <span class="ai-update-time">Analyzing feed...</span>
        </div>
        <div class="ai-bullets">
          <div class="skeleton-bullet"></div>
          <div class="skeleton-bullet"></div>
          <div class="skeleton-bullet"></div>
          <div class="skeleton-bullet"></div>
          <div class="skeleton-bullet"></div>
        </div>
      `;
      return;
    }

    // 2. Initial state if empty
    if (state.aiBrief.length === 0) {
      widgetContainer.innerHTML = `
        <div class="ai-header">
          <div class="ai-title">
            <span class="ai-glow-dot"></span>
            <span>INTELLIGENCE BRIEF (AI SYNTHESIS)</span>
          </div>
          <button class="btn-refresh" id="btn-ai-refresh">GENERATE BRIEF</button>
        </div>
        <div class="no-signals-msg" style="padding: 10px 0;">
          No synthesis available. Click Generate Brief to analyze recent news signals.
        </div>
      `;
      
      const btn = document.getElementById("btn-ai-refresh");
      if (btn) {
        btn.addEventListener("click", handleRefresh);
      }
      return;
    }

    // 3. Loaded state
    const timeStr = state.aiBriefLastUpdated 
      ? `Last updated ${relativeTime(new Date(state.aiBriefLastUpdated).toISOString())}`
      : "Brief Active";

    widgetContainer.innerHTML = `
      <div class="ai-header">
        <div class="ai-title">
          <span class="ai-glow-dot"></span>
          <span>INTELLIGENCE BRIEF (AI SYNTHESIS)</span>
        </div>
        <div class="ai-actions">
          <span class="ai-update-time">${timeStr}</span>
          <button class="btn-refresh" id="btn-ai-refresh">REFRESH</button>
        </div>
      </div>
      <ul class="ai-bullets">
        ${state.aiBrief.map(bullet => {
          // Parse the [TYPE] out of the bullet point to color-code it
          const match = bullet.match(/^[•\s\-]*\[(BULLISH|BEARISH|NEUTRAL|WATCH|ALERT)\](.*)$/i);
          if (match) {
            const type = match[1].toUpperCase();
            const text = match[2].trim();
            const typeClass = type.toLowerCase();
            return `
              <li class="ai-bullet-item">
                <strong class="${typeClass}">${type}</strong> ${text}
              </li>
            `;
          }
          // Default fallback
          const plainText = bullet.replace(/^[•\s\-]*/, "");
          return `
            <li class="ai-bullet-item">
              <strong class="neutral">INFO</strong> ${plainText}
            </li>
          `;
        }).join("")}
      </ul>
    `;

    const refreshBtn = document.getElementById("btn-ai-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", handleRefresh);
    }
  });

  async function handleRefresh() {
    setState({ aiBriefLoading: true });
    
    if (refreshCallback) {
      try {
        await refreshCallback();
      } catch (err) {
        console.error("AI Brief Refresh error:", err);
      } finally {
        setState({ aiBriefLoading: false });
      }
    } else {
      // Mock refresh trigger for Phase 1
      setTimeout(() => {
        setState({
          aiBriefLoading: false,
          aiBriefLastUpdated: Date.now()
        });
      }, 1000);
    }
  }
}
