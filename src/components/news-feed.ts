import { subscribe } from "../state";
import { relativeTime } from "../utils/format";
import { AppState, Article } from "../types";

export function initNewsFeed() {
  const feedListContainer = document.getElementById("news-feed-list");
  
  if (!feedListContainer) return;

  let cachedArticlesList: Article[] = [];
  let cachedCategory = "all";

  subscribe((state: AppState) => {
    // Check if articles list or category has actually changed before complete re-render
    const articlesChanged = JSON.stringify(state.articles) !== JSON.stringify(cachedArticlesList);
    const categoryChanged = state.activeCategory !== cachedCategory;

    if (!articlesChanged && !categoryChanged) return;

    cachedArticlesList = state.articles;
    cachedCategory = state.activeCategory;

    // Filter articles based on active category
    const filteredArticles = state.articles.filter(
      (art) => state.activeCategory === "all" || art.category === state.activeCategory
    );

    // Limit to max 200 articles
    const limitedArticles = filteredArticles.slice(0, 200);

    if (limitedArticles.length === 0) {
      feedListContainer.innerHTML = `
        <div class="no-signals-msg" style="text-align: center; padding: 40px 0; font-size: 13px;">
          No articles found in this category. Monitoring incoming news feeds...
        </div>
      `;
      return;
    }

    // Direct DOM manipulation
    feedListContainer.innerHTML = "";

    limitedArticles.forEach((article) => {
      const card = document.createElement("div");
      card.className = "article-card";
      card.setAttribute("data-id", article.id);
      card.setAttribute("data-category", article.category);

      const timeAgo = relativeTime(article.pubDate);
      
      card.innerHTML = `
        <div class="article-meta">
          <span class="source-badge">${article.source}</span>
          <span class="category-badge ${article.category}">${article.category}</span>
          <span class="time-ago">${timeAgo}</span>
        </div>
        <h3 class="article-title">${article.title}</h3>
        <p class="article-summary">${article.summary}</p>
      `;

      // Click to open in new tab
      card.addEventListener("click", () => {
        window.open(article.link, "_blank", "noopener,noreferrer");
      });

      feedListContainer.appendChild(card);
    });
  });
}
