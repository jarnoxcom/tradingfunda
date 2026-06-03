import { subscribe } from "../state";
import { formatINR, formatCr } from "../utils/format";
import { AppState, Mover } from "../types";

export function initMarketPanel() {
  const btnGainers = document.getElementById("btn-gainers");
  const btnLosers = document.getElementById("btn-losers");
  const moversListContainer = document.getElementById("movers-list");
  
  const breadthAdvTxt = document.getElementById("breadth-adv-txt");
  const breadthUncTxt = document.getElementById("breadth-unc-txt");
  const breadthDecTxt = document.getElementById("breadth-dec-txt");
  const breadthBar = document.getElementById("breadth-bar-container");

  const fiiNetVal = document.getElementById("fii-net-val");
  const diiNetVal = document.getElementById("dii-net-val");

  let activeTab: "gainers" | "losers" = "gainers";
  let lastMarketState: AppState["market"] = null;

  // 1. Hook Gainers/Losers Tab Switchers
  if (btnGainers && btnLosers) {
    btnGainers.addEventListener("click", () => {
      activeTab = "gainers";
      btnGainers.classList.add("active");
      btnLosers.classList.remove("active");
      renderMovers();
    });

    btnLosers.addEventListener("click", () => {
      activeTab = "losers";
      btnLosers.classList.add("active");
      btnGainers.classList.remove("active");
      renderMovers();
    });
  }

  function renderMovers() {
    if (!moversListContainer || !lastMarketState) return;

    const movers: Mover[] = activeTab === "gainers" 
      ? lastMarketState.topGainers 
      : lastMarketState.topLosers;

    moversListContainer.innerHTML = "";

    if (movers.length === 0) {
      moversListContainer.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px 0;">
            No movers data available.
          </td>
        </tr>
      `;
      return;
    }

    movers.forEach((mover) => {
      const isUp = mover.pChange >= 0;
      const row = document.createElement("tr");
      row.className = `mover-row ${isUp ? "up" : "down"}`;

      row.innerHTML = `
        <td class="mover-symbol">${mover.symbol}</td>
        <td class="mover-ltp text-right">${formatINR(mover.ltp)}</td>
        <td class="mover-pchange text-right">${isUp ? "+" : ""}${mover.pChange.toFixed(2)}%</td>
      `;

      moversListContainer.appendChild(row);
    });
  }

  // 2. Subscribe to market changes
  subscribe((state: AppState) => {
    if (!state.market) return;
    lastMarketState = state.market;

    // Render Movers Table
    renderMovers();

    // Render Market Breadth
    const adv = state.market.advances;
    const dec = state.market.declines;
    const unc = state.market.unchanged;
    const total = adv + dec + unc;

    if (breadthAdvTxt) breadthAdvTxt.textContent = `${adv} Adv`;
    if (breadthUncTxt) breadthUncTxt.textContent = `${unc} Unch`;
    if (breadthDecTxt) breadthDecTxt.textContent = `${dec} Dec`;

    if (breadthBar && total > 0) {
      const advPct = (adv / total) * 100;
      const uncPct = (unc / total) * 100;
      const decPct = (dec / total) * 100;

      breadthBar.innerHTML = `
        <div class="segment advance" style="width: ${advPct}%" title="Advances: ${adv}"></div>
        <div class="segment unchanged" style="width: ${uncPct}%" title="Unchanged: ${unc}"></div>
        <div class="segment decline" style="width: ${decPct}%" title="Declines: ${dec}"></div>
      `;
    }

    // Render FII / DII net activity
    if (fiiNetVal) {
      const fiiVal = state.market.fiiNet ?? 0;
      const fiiClass = fiiVal > 0 ? "buy" : fiiVal < 0 ? "sell" : "neutral";
      const fiiSign = fiiVal > 0 ? "+" : "";
      fiiNetVal.className = `value ${fiiClass}`;
      fiiNetVal.textContent = `${fiiSign}${formatCr(fiiVal)}`;
    }

    if (diiNetVal) {
      const diiVal = state.market.diiNet ?? 0;
      const diiClass = diiVal > 0 ? "buy" : diiVal < 0 ? "sell" : "neutral";
      const diiSign = diiVal > 0 ? "+" : "";
      diiNetVal.className = `value ${diiClass}`;
      diiNetVal.textContent = `${diiSign}${formatCr(diiVal)}`;
    }
  });
}
