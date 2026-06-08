import fetch from "node-fetch";

const NSE_HOME = "https://www.nseindia.com";

const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.google.com",
};

let cachedCookie: string = "";
let lastCookieFetchTime = 0;
const COOKIE_TTL_MS = 5 * 60 * 1000; // Refresh cookie every 5 minutes

export async function fetchNseCookie(): Promise<string> {
  const now = Date.now();
  if (cachedCookie && (now - lastCookieFetchTime < COOKIE_TTL_MS)) {
    return cachedCookie;
  }

  console.log("NSE Cookie Jar: Fetching new session cookie...");
  try {
    const res = await fetch(NSE_HOME, {
      headers: NSE_HEADERS,
      timeout: 8000,
    });

    const cookies = res.headers.raw()["set-cookie"] || [];
    if (cookies.length === 0) {
      console.warn("NSE Cookie Jar: No Set-Cookie headers found on home page hit.");
    }

    // Extract cookie tokens (e.g. nsedna=..., nsit=...)
    const parsedCookies = cookies
      .map(c => c.split(";")[0])
      .filter(Boolean);

    if (parsedCookies.length > 0) {
      cachedCookie = parsedCookies.join("; ");
      lastCookieFetchTime = now;
      console.log("NSE Cookie Jar: Successfully established session cookie.");
    }
    
    return cachedCookie;
  } catch (err: any) {
    console.error("NSE Cookie Jar: Failed to fetch NSE session cookie:", err.message);
    return cachedCookie; // Return stale cookie as fallback
  }
}

export async function nseFetch(url: string): Promise<any> {
  const cookie = await fetchNseCookie();
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.nseindia.com",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": cookie,
  };

  console.log("    Calling NSE:", url);

  try {
    const res = await fetch(url, { headers, timeout: 8000 });
    
    if (res.status === 401 || res.status === 403) {
      console.warn(`NSE Fetch: Received status ${res.status}. Session might be expired. Retrying after clearing cookie...`);
      cachedCookie = ""; // Clear expired cookie
      
      const newCookie = await fetchNseCookie();
      headers["Cookie"] = newCookie;
      
      const retryRes = await fetch(url, { headers, timeout: 8000 });
      if (!retryRes.ok) {
        throw new Error(`NSE Fetch retry failed with status ${retryRes.status}`);
      }
      return await retryRes.json();
    }

    if (!res.ok) {
      throw new Error(`NSE Fetch failed with status ${res.status}`);
    }

    console.log("Calling NSE:", url);

    return await res.json();
  } catch (err: any) {
    console.error(`NSE Fetch error for URL [${url}]:`, err.message);
    throw err;
  }
}
