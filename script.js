const refreshState = document.getElementById('refresh-state');
const quoteStrip = document.getElementById('quote-strip');
const indexGrid = document.getElementById('index-grid');
const stockGrid = document.getElementById('stock-grid');
const widgetBoard = document.getElementById('widget-board');
const heroHeatmap = document.getElementById('hero-heatmap');
const newsTabs = document.getElementById('news-tabs');
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

function buildWidgetCard(title, subtitle) {
  const article = document.createElement('article');
  article.className = 'news-item widget-card';

  const header = document.createElement('header');
  const titleBlock = document.createElement('div');
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  const subtitleElement = document.createElement('p');
  subtitleElement.className = 'card-subtitle';
  subtitleElement.textContent = subtitle;
  titleBlock.append(titleElement, subtitleElement);
  header.append(titleBlock);

  const slot = document.createElement('div');
  slot.className = 'widget-slot widget-slot-large';

  article.append(header, slot);
  return { article, slot };
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

function renderHeroHeatmap() {
  if (!heroHeatmap) {
    return;
  }

  injectTradingViewWidget(heroHeatmap, 'stock-heatmap', {
    dataSource: 'SPX500',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    locale: 'en',
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '100%'
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
  const newsSources = [
    {
      id: 'india',
      label: 'India',
      subtitle: 'Nifty, Sensex and Indian stock movers',
      symbols: [
        { proName: 'NSE:NIFTY', title: 'Nifty 50' },
        { proName: 'BSE:SENSEX', title: 'Sensex' },
        { proName: 'NSE:RELIANCE', title: 'Reliance' },
        { proName: 'NSE:TCS', title: 'TCS' }
      ]
    },
    {
      id: 'global',
      label: 'Global',
      subtitle: 'US indices, FX and commodities',
      symbols: [
        { proName: 'NASDAQ:IXIC', title: 'Nasdaq' },
        { proName: 'SP:SPX', title: 'S&P 500' },
        { proName: 'DJ:DJI', title: 'Dow Jones' },
        { proName: 'FX:EURUSD', title: 'EUR/USD' }
      ]
    },
    {
      id: 'crypto',
      label: 'Crypto',
      subtitle: 'Bitcoin, Ether and market cap leaders',
      symbols: [
        { proName: 'BINANCE:BTCUSDT', title: 'Bitcoin' },
        { proName: 'BINANCE:ETHUSDT', title: 'Ether' },
        { proName: 'BINANCE:SOLUSDT', title: 'Solana' },
        { proName: 'CRYPTOCAP:TOTAL', title: 'Crypto market cap' }
      ]
    }
  ];

  newsTabs.innerHTML = '';
  newsFeed.innerHTML = '';

  newsSources.forEach((source, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab-button${index === 0 ? ' is-active' : ''}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.dataset.tabTarget = source.id;
    button.textContent = source.label;
    newsTabs.append(button);

    const panel = document.createElement('article');
    panel.className = `news-item news-panel${index === 0 ? ' is-active' : ''}`;
    panel.dataset.tabPanel = source.id;

    const header = document.createElement('header');
    const label = document.createElement('span');
    label.className = 'quote-label';
    label.textContent = source.label;
    const badge = document.createElement('span');
    badge.className = 'card-subtitle';
    badge.textContent = source.subtitle;
    header.append(label, badge);

    const slot = document.createElement('div');
    slot.className = 'widget-slot widget-slot-large';

    panel.append(header, slot);
    newsFeed.append(panel);

    injectTradingViewWidget(slot, 'timeline', {
      feedMode: 'all_symbols',
      symbols: source.symbols,
      isTransparent: true,
      displayMode: 'compact',
      colorTheme: 'dark',
      locale: 'en'
    });
  });

  newsTabs.addEventListener('click', (event) => {
    const button = event.target.closest('.tab-button');
    if (!button) {
      return;
    }

    const target = button.dataset.tabTarget;
    newsTabs.querySelectorAll('.tab-button').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    newsFeed.querySelectorAll('.news-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.tabPanel === target);
    });
  });
}

function renderWidgetBoard() {
  widgetBoard.innerHTML = '';

  const widgets = [
    {
      title: 'Global market overview',
      subtitle: 'Latest stock market widgets for indices, futures and currencies',
      widgetName: 'market-overview',
      config: {
        colorTheme: 'dark',
        isTransparent: true,
        locale: 'en',
        showChart: true,
        width: '100%',
        height: 650
      }
    },
    {
      title: 'Crypto market snapshot',
      subtitle: 'Reliable live crypto quotes for the majors',
      widgetName: 'single-quote-grid',
      config: null
    }
  ];

  widgets.forEach((item) => {
    const { article, slot } = buildWidgetCard(item.title, item.subtitle);
    if (item.widgetName === 'single-quote-grid') {
      const cryptoGrid = document.createElement('div');
      cryptoGrid.className = 'crypto-widget-grid';

      [
        { symbol: 'BINANCE:BTCUSDT', title: 'Bitcoin' },
        { symbol: 'BINANCE:ETHUSDT', title: 'Ether' },
        { symbol: 'BINANCE:SOLUSDT', title: 'Solana' },
        { symbol: 'BINANCE:BNBUSDT', title: 'BNB' }
      ].forEach((item) => {
        const cryptoCard = document.createElement('div');
        cryptoCard.className = 'widget-slot';
        cryptoGrid.append(cryptoCard);
        injectTradingViewWidget(cryptoCard, 'single-quote', {
          symbol: item.symbol,
          width: '100%',
          colorTheme: 'dark',
          isTransparent: true,
          locale: 'en'
        });
      });

      slot.append(cryptoGrid);
    } else {
      injectTradingViewWidget(slot, item.widgetName, item.config);
    }
    widgetBoard.append(article);
  });
}

function initializeDashboard() {
  renderHeroHeatmap();
  renderTickerTape();
  renderQuoteCards();
  renderWidgetBoard();
  renderNewsFeed();
  if (refreshState) {
    refreshState.textContent = 'Live widgets';
  }
}

initializeDashboard();