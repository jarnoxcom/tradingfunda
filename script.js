const refreshState = document.getElementById('refresh-state');
const quoteStrip = document.getElementById('quote-strip');
const indexGrid = document.getElementById('index-grid');
const stockGrid = document.getElementById('stock-grid');
const newsFeed = document.getElementById('news-feed');

const quoteTargets = [
  { symbol: 'NSE:NIFTY', label: 'Nifty 50', market: 'India' },
  { symbol: 'BSE:SENSEX', label: 'Sensex', market: 'India' },
  { symbol: 'NSE:BANKNIFTY', label: 'Nifty Bank', market: 'India' },
  { symbol: 'NASDAQ:IXIC', label: 'Nasdaq Composite', market: 'US' }
];

const stockTargets = [
  { symbol: 'NSE:RELIANCE', label: 'Reliance Industries', market: 'NSE' },
  { symbol: 'NSE:TCS', label: 'Tata Consultancy Services', market: 'NSE' },
  { symbol: 'NSE:HDFCBANK', label: 'HDFC Bank', market: 'NSE' },
  { symbol: 'NSE:INFY', label: 'Infosys', market: 'NSE' },
  { symbol: 'NSE:ICICIBANK', label: 'ICICI Bank', market: 'NSE' },
  { symbol: 'NSE:SBIN', label: 'State Bank of India', market: 'NSE' },
  { symbol: 'NSE:ITC', label: 'ITC', market: 'NSE' },
  { symbol: 'NSE:LT', label: 'Larsen & Toubro', market: 'NSE' },
  { symbol: 'NSE:BHARTIARTL', label: 'Bharti Airtel', market: 'NSE' },
  { symbol: 'NSE:AXISBANK', label: 'Axis Bank', market: 'NSE' }
];

const tickerSymbols = [
  { proName: 'NSE:NIFTY', title: 'Nifty 50' },
  { proName: 'BSE:SENSEX', title: 'Sensex' },
  { proName: 'NSE:BANKNIFTY', title: 'Bank Nifty' },
  { proName: 'NASDAQ:IXIC', title: 'Nasdaq' },
  { proName: 'SP:SPX', title: 'S&P 500' },
  { proName: 'DJ:DJI', title: 'Dow Jones' }
];

function createWidgetContainer(title, subtitle) {
  const article = document.createElement('article');
  article.className = 'quote-card';

  const header = document.createElement('header');
  const textBlock = document.createElement('div');
  const titleElement = document.createElement('div');
  titleElement.className = 'card-title';
  titleElement.textContent = title;
  const subtitleElement = document.createElement('div');
  subtitleElement.className = 'card-subtitle';
  subtitleElement.textContent = subtitle;
  textBlock.append(titleElement, subtitleElement);
  header.append(textBlock);

  const slot = document.createElement('div');
  slot.className = 'widget-slot';

  article.append(header, slot);
  return { article, slot };
}

function injectTradingViewWidget(slot, widgetName, config) {
  const container = document.createElement('div');
  container.className = 'tradingview-widget-container';

  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container__widget';

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widgetName}.js`;
  script.type = 'text/javascript';
  script.textContent = JSON.stringify(config);

  container.append(widget, script);
  slot.append(container);
}

function renderTickerTape() {
  injectTradingViewWidget(quoteStrip, 'ticker-tape', {
    symbols: tickerSymbols,
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: true,
    displayMode: 'adaptive',
    locale: 'en'
  });
}

function renderQuoteCards() {
  indexGrid.innerHTML = '';
  quoteTargets.forEach((item) => {
    const { article, slot } = createWidgetContainer(item.label, item.market);
    injectTradingViewWidget(slot, 'single-quote', {
      symbol: item.symbol,
      width: '100%',
      colorTheme: 'dark',
      isTransparent: true,
      locale: 'en'
    });
    indexGrid.append(article);
  });

  stockGrid.innerHTML = '';
  stockTargets.forEach((item) => {
    const { article, slot } = createWidgetContainer(item.label, item.market);
    injectTradingViewWidget(slot, 'single-quote', {
      symbol: item.symbol,
      width: '100%',
      colorTheme: 'dark',
      isTransparent: true,
      locale: 'en'
    });
    stockGrid.append(article);
  });
}

function renderNewsFeed() {
  newsFeed.innerHTML = '';
  const article = document.createElement('article');
  article.className = 'news-item news-widget';

  const header = document.createElement('header');
  const label = document.createElement('span');
  label.className = 'quote-label';
  label.textContent = 'Market feed';
  const badge = document.createElement('span');
  badge.className = 'card-subtitle';
  badge.textContent = 'TradingView timeline';
  header.append(label, badge);

  const slot = document.createElement('div');
  slot.className = 'widget-slot widget-slot-large';

  article.append(header, slot);
  newsFeed.append(article);

  injectTradingViewWidget(slot, 'timeline', {
    feedMode: 'all_symbols',
    isTransparent: true,
    displayMode: 'compact',
    colorTheme: 'dark',
    locale: 'en'
  });
}

function initializeDashboard() {
  renderTickerTape();
  renderQuoteCards();
  renderNewsFeed();
  refreshState.textContent = 'Live widgets';
}

initializeDashboard();