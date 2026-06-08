export interface FeedDefinition {
  url: string;
  category: string;
  source: string;
}

export const FEEDS: FeedDefinition[] = [
  // Market News
  {
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    category: "market",
    source: "ET Markets",
  },
  {
    url: "https://www.moneycontrol.com/rss/MCtopnews.xml",
    category: "market",
    source: "Moneycontrol",
  },
  {
    url: "https://www.business-standard.com/rss/markets-106.rss",
    category: "market",
    source: "Business Standard",
  },
  {
    url: "https://www.livemint.com/rss/markets",
    category: "market",
    source: "LiveMint",
  },
  {
    url: "https://feeds.feedburner.com/ndtvprofit-latest",
    category: "market",
    source: "NDTV Profit",
  },

  // Regulatory
  // {
  //   url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3&smid=0&rss=yes",
  //   category: "sebi",
  //   source: "SEBI",
  // },
  // {
  //   url: "https://rbi.org.in/Scripts/RSSFeedPage.aspx",
  //   category: "rbi",
  //   source: "RBI",
  // },
  // {
  //   url: "https://www.nseindia.com/homepage/liveFeed/rss/nse_press_releases_rss.xml",
  //   category: "nse",
  //   source: "NSE",
  // },

  // Economy / Macro
  {
    url: "https://economictimes.indiatimes.com/economy/rssfeeds/1373380680.cms",
    category: "macro",
    source: "ET Economy",
  },
  {
    url: "https://www.business-standard.com/rss/economy-policy-102.rss",
    category: "macro",
    source: "BS Economy",
  },

  // Corporate / Earnings
  {
    url: "https://economictimes.indiatimes.com/markets/stocks/earnings/rssfeeds/2143429.cms",
    category: "earnings",
    source: "ET Earnings",
  },
  {
    url: "https://www.moneycontrol.com/rss/results.xml",
    category: "earnings",
    source: "MC Results",
  },

  // Global (macro context)
  // {
  //   url: "https://feeds.reuters.com/reuters/businessNews",
  //   category: "global",
  //   source: "Reuters",
  // },

  { url: "https://www.ft.com/rss/home/uk", category: "global", source: "FT" },

  // Forex
  {
    url: "https://www.fxstreet.com/rss/news",
    category: "forex",
    source: "FXStreet",
  },

  // Crypto
  {
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    category: "crypto",
    source: "CoinDesk",
  },

  // Global Markets
  {
    url: "https://www.marketwatch.com/rss/topstories",
    category: "global",
    source: "MarketWatch",
  },

  // Global Business
  {
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    category: "global",
    source: "CNBC",
  },

  {
    url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    category: "global",
    source: "WSJ Markets",
  },
  {
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    category: "global",
    source: "WSJ World",
  },
  {
    url: "https://www.investing.com/rss/news.rss",
    category: "global",
    source: "Investing.com",
  },

  // indian businesses
  {
    url: "https://www.thehindubusinessline.com/markets/feeder/default.rss",
    category: "market",
    source: "BusinessLine Markets",
  },
  {
    url: "https://www.thehindubusinessline.com/economy/feeder/default.rss",
    category: "macro",
    source: "BusinessLine Economy",
  },

  // tech, ai and markets
  {
    url: "https://techcrunch.com/feed/",
    category: "tech",
    source: "TechCrunch",
  },
  {
    url: "https://www.theverge.com/rss/index.xml",
    category: "tech",
    source: "The Verge",
  },

  {
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    category: "tech",
    source: "ZDNet AI",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    category: "tech",
    source: "Ars Technica",
  },
  {
    url: "https://www.barrons.com/xml/rss/3_7031.xml",
    category: "market",
    source: "Barrons",
  },
];
