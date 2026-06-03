import { Article } from "../../types";

export interface PopupData {
  title: string;
  subtitle?: string;
  sectors?: Array<{ name: string; pChange: number; value: number }>;
  articles?: Article[];
  htmlContent?: string;
}

export class MapPopup {
  private element: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.element = document.createElement("div");
    this.element.className = "map-popup";
    container.appendChild(this.element);
  }

  show(x: number, y: number, data: PopupData) {
    this.element.innerHTML = "";
    
    // Header
    const header = document.createElement("div");
    header.className = "popup-header";
    
    const title = document.createElement("span");
    title.className = "popup-title";
    title.textContent = data.title;
    header.appendChild(title);

    if (data.subtitle) {
      const subtitle = document.createElement("span");
      subtitle.className = "popup-subtitle";
      subtitle.textContent = data.subtitle;
      header.appendChild(subtitle);
    }
    this.element.appendChild(header);

    // Body
    const body = document.createElement("div");
    body.className = "popup-body";

    // Custom HTML Content (if provided)
    if (data.htmlContent) {
      const customDiv = document.createElement("div");
      customDiv.className = "popup-custom-html";
      customDiv.innerHTML = data.htmlContent;
      body.appendChild(customDiv);
    }

    // Sectors Section
    if (data.sectors && data.sectors.length > 0) {
      const sectorsCont = document.createElement("div");
      sectorsCont.className = "popup-sectors";

      data.sectors.forEach((sec) => {
        const row = document.createElement("div");
        row.className = "popup-sector-row";

        const nameSpan = document.createElement("span");
        nameSpan.className = "popup-sector-name";
        nameSpan.textContent = sec.name;

        const chgSpan = document.createElement("span");
        const isUp = sec.pChange >= 0;
        chgSpan.className = `popup-sector-change ${isUp ? "perf-up" : "perf-down"}`;
        chgSpan.textContent = `${isUp ? "+" : ""}${sec.pChange.toFixed(2)}%`;

        row.appendChild(nameSpan);
        row.appendChild(chgSpan);
        sectorsCont.appendChild(row);
      });
      body.appendChild(sectorsCont);
    }

    // News Section
    if (data.articles && data.articles.length > 0) {
      const newsList = document.createElement("div");
      newsList.className = "popup-news-list";

      // Limit to 3 articles
      data.articles.slice(0, 3).forEach((art) => {
        const item = document.createElement("div");
        item.className = "popup-news-title";
        item.textContent = art.title.length > 55 ? art.title.slice(0, 55) + "..." : art.title;
        newsList.appendChild(item);
      });
      body.appendChild(newsList);
    }

    this.element.appendChild(body);

    this.element.classList.add("visible");
    this.updatePosition(x, y);
  }

  updatePosition(x: number, y: number) {
    // Avoid tooltip going off screen bounds
    const width = this.element.offsetWidth || 240;
    const height = this.element.offsetHeight || 150;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x + 15;
    let posY = y + 15;

    if (posX + width > viewportWidth) {
      posX = x - width - 15;
    }
    if (posY + height > viewportHeight) {
      posY = y - height - 15;
    }

    this.element.style.left = `${Math.max(10, posX)}px`;
    this.element.style.top = `${Math.max(10, posY)}px`;
  }

  hide() {
    this.element.classList.remove("visible");
  }

  destroy() {
    this.element.remove();
  }
}

