import { subscribe } from "../state";
import { formatINR, formatIST } from "../utils/format";
import { AppState, IndexData } from "../types";

export function initNavbar() {
  const tickersContainer = document.getElementById("index-tickers");
  const marketStatusBadge = document.getElementById("market-status");
  const clockContainer = document.getElementById("ist-clock");
  
  // Track previous prices to trigger flash animations
  const previousPrices: Record<string, number> = {};

  // 1. Setup the IST ticking clock
  setInterval(() => {
    if (clockContainer) {
      clockContainer.textContent = formatIST(new Date());
    }
  }, 1000);

  // 2. Subscribe to store changes to update tickers in-place
  subscribe((state: AppState) => {
    if (!state.market) return;
    
    // Update Market Status Badge
    if (marketStatusBadge) {
      const status = state.market.marketStatus;
      marketStatusBadge.className = `status-badge ${status.toLowerCase()}`;
      
      const badgeDot = marketStatusBadge.querySelector(".badge-dot") as HTMLElement;
      const badgeText = marketStatusBadge.querySelector(".badge-text") as HTMLElement;
      
      if (badgeText) {
        badgeText.textContent = `NSE ${status}`;
      }
    }

    // Render Tickers (Nifty 50, Sensex, BankNifty, India VIX)
    if (tickersContainer) {
      // We only care about major dashboard tickers in the navbar
      const majorIndices = ["NIFTY 50", "SENSEX", "NIFTY BANK", "INDIA VIX"];
      const indicesToRender = state.market.indices.filter(idx => majorIndices.includes(idx.name));
      
      // Keep track of active ticker elements in DOM to update them in-place
      indicesToRender.forEach((indexData) => {
        let tickerElem = tickersContainer.querySelector(`[data-ticker-name="${indexData.name}"]`) as HTMLElement;
        const prevPrice = previousPrices[indexData.name];
        const currentPrice = indexData.last;
        
        let hasPriceChanged = false;
        let isPriceUp = true;
        
        if (prevPrice !== undefined && prevPrice !== currentPrice) {
          hasPriceChanged = true;
          isPriceUp = currentPrice > prevPrice;
          previousPrices[indexData.name] = currentPrice;
        } else if (prevPrice === undefined) {
          previousPrices[indexData.name] = currentPrice;
        }

        const isUp = indexData.pChange >= 0;
        const sign = isUp ? "▲" : "▼";
        const cleanName = indexData.name.replace("NIFTY ", "");

        const tickerHTML = `
          <span class="ticker-name">${cleanName}</span>
          <span class="ticker-value">${formatINR(indexData.last)}</span>
          <span class="ticker-change">${sign} ${Math.abs(indexData.pChange).toFixed(2)}%</span>
        `;

        if (!tickerElem) {
          // Create new ticker element
          tickerElem = document.createElement("div");
          tickerElem.className = `ticker ${isUp ? "up" : "down"}`;
          tickerElem.setAttribute("data-ticker-name", indexData.name);
          tickerElem.innerHTML = tickerHTML;
          tickersContainer.appendChild(tickerElem);
        } else {
          // Update existing ticker element
          requestAnimationFrame(() => {
            tickerElem.className = `ticker ${isUp ? "up" : "down"}`;
            tickerElem.innerHTML = tickerHTML;

            // Trigger flash animation if price changed
            if (hasPriceChanged) {
              const flashClass = isPriceUp ? "ticker-flash-up" : "ticker-flash-down";
              tickerElem.classList.add(flashClass);
              setTimeout(() => {
                tickerElem.classList.remove(flashClass);
              }, 500);
            }
          });
        }
      });
      
      // Clean up skeleton loaders if any
      const skeletons = tickersContainer.querySelectorAll(".ticker-skeleton");
      skeletons.forEach(s => s.remove());
    }
  });
}
