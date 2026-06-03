import "./style.css";
import "./styles/map.css";
import { setState, getState, subscribe } from "./state";
import { initNavbar } from "./components/navbar";
import { initSidebar } from "./components/sidebar";
import { initNewsFeed } from "./components/news-feed";
import { initMarketPanel } from "./components/market-panel";
import { initSectorHeatmap } from "./components/sector-heatmap";
import { initSignalBar } from "./components/signal-bar";
import { initAiBrief, registerAiBriefRefresh } from "./components/ai-brief";
import { WorldMap } from "./components/map/Map";

import { fetchMarketSnapshot, fetchNewsArticles, generateAiBrief } from "./services/api";
import { analyzeSignalConvergence } from "./utils/signals";
import { CONFIG } from "./config";

// Import mock data for hard fallback if backend is unreachable on first load
import { MOCK_MARKET, MOCK_ARTICLES, MOCK_AI_BRIEF, MOCK_SIGNALS } from "./utils/mock-data";

async function updateMarketData() {
  try {
    const market = await fetchMarketSnapshot();
    const currentState = getState();
    
    // Perform convergent analysis based on new market data and current news
    const signals = analyzeSignalConvergence(market, currentState.articles);
    
    setState({
      market,
      signals,
      lastFetch: Date.now(),
    });
  } catch (err) {
    console.warn("Main: Failed to poll live market data. Retaining existing values.", err);
    // If absolutely no market data present (e.g. offline boot), inject mock
    const currentState = getState();
    if (!currentState.market) {
      setState({
        market: MOCK_MARKET,
        signals: MOCK_SIGNALS,
      });
    }
  }
}

async function updateNewsData() {
  try {
    const articles = await fetchNewsArticles();
    const currentState = getState();
    
    // Re-run convergent analysis with new articles
    const signals = analyzeSignalConvergence(currentState.market, articles);
    
    setState({
      articles,
      signals,
    });

    // Auto-trigger initial AI brief if empty
    if (currentState.aiBrief.length === 0 && articles.length > 0) {
      triggerAiBriefFetch(articles);
    }
  } catch (err) {
    console.warn("Main: Failed to poll live news feeds. Retaining existing values.", err);
    // If absolutely no news present (e.g. offline boot), inject mock
    const currentState = getState();
    if (currentState.articles.length === 0) {
      setState({
        articles: MOCK_ARTICLES,
        aiBrief: MOCK_AI_BRIEF,
      });
    }
  }
}

async function triggerAiBriefFetch(articlesList?: any[]) {
  const currentState = getState();
  const articles = articlesList ?? currentState.articles;
  
  if (articles.length === 0) {
    console.log("Main: No articles available for AI synthesis.");
    return;
  }

  setState({ aiBriefLoading: true });
  try {
    const brief = await generateAiBrief(articles);
    setState({
      aiBrief: brief,
      aiBriefLastUpdated: Date.now(),
      aiBriefLoading: false,
    });
  } catch (err) {
    console.error("Main: AI brief generation failed. Retaining current brief.", err);
    setState({ aiBriefLoading: false });
  }
}

// 1. Initialize DOM Components
function bootstrap() {
  console.log("India Market Monitor: Bootstrapping shell components...");

  initNavbar();
  initSidebar();
  initNewsFeed();
  initMarketPanel();
  initSectorHeatmap();
  initSignalBar();
  initAiBrief();

  // Initialize World D3 Map
  console.log("Main: Initializing 2D World map...");
  const map = new WorldMap("mapContainer");

  // Subscribe to state updates to update the map & badges
  subscribe((state) => {
    map.update(state.market, state.articles);

    // Update news count badge inside the news panel header
    const newsCountBadge = document.getElementById("news-count");
    if (newsCountBadge) {
      const category = state.activeCategory;
      const filteredArticles = category === "all"
        ? state.articles
        : state.articles.filter(a => a.category === category);
      newsCountBadge.textContent = String(filteredArticles.length);
    }
  });

  // Set up split width resizer behavior
  setupMapWidthResize(map);

  // Wire auxiliary AI brief refresh button in panel header
  const panelRefreshBtn = document.getElementById("btn-refresh-brief");
  if (panelRefreshBtn) {
    panelRefreshBtn.addEventListener("click", () => {
      const internalBtn = document.getElementById("btn-ai-refresh");
      if (internalBtn) {
        internalBtn.click();
      } else {
        const currentState = getState();
        triggerAiBriefFetch(currentState.articles);
      }
    });
  }

  // Register the AI Brief Refresh button callback
  registerAiBriefRefresh(async () => {
    const currentState = getState();
    await triggerAiBriefFetch(currentState.articles);
  });

  // 2. Load initial data immediately
  console.log("Main: Triggering initial data fetch...");
  updateMarketData();
  updateNewsData();

  // 3. Set up polling intervals per configuration specs
  setInterval(updateMarketData, CONFIG.POLL_INTERVALS.MARKET_MS); // 15s
  setInterval(updateNewsData, CONFIG.POLL_INTERVALS.NEWS_MS);     // 90s

  console.log("India Market Monitor: Active data polling established successfully!");
}

function setupMapWidthResize(map: WorldMap) {
  const mainContent = document.getElementById("dashboardShell");
  const widthHandle = document.getElementById("mapWidthResizeHandle");
  if (!mainContent || !widthHandle) return;

  const saved = localStorage.getItem("map-col-width");
  if (saved) mainContent.style.setProperty("--map-col-width", saved);

  let isResizing = false;
  let startX = 0;
  let startTotalWidth = 0;
  let startColPx = 0;

  const endResize = () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.classList.remove("map-width-resizing");
    widthHandle.classList.remove("resizing");
    const current = mainContent.style.getPropertyValue("--map-col-width");
    if (current) localStorage.setItem("map-col-width", current);
    
    // Trigger map redraw on resize
    map.resize();
  };

  widthHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startTotalWidth = mainContent.offsetWidth;
    const raw = mainContent.style.getPropertyValue("--map-col-width") || "60%";
    startColPx = startTotalWidth * (parseFloat(raw) / 100);
    document.body.classList.add("map-width-resizing");
    widthHandle.classList.add("resizing");
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const delta = e.clientX - startX;
    const newPct = Math.max(25, Math.min(75, ((startColPx + delta) / startTotalWidth) * 100));
    mainContent.style.setProperty("--map-col-width", `${newPct.toFixed(1)}%`);
    map.resize();
  });

  document.addEventListener("mouseup", endResize);
  window.addEventListener("blur", endResize);
}

// Start app
bootstrap();
