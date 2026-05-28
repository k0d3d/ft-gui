import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

// ── Types ────────────────────────────────────────────────────────────────────

export type CookieBackend = 'chromium' | 'firefox';

export interface KeychainEntry {
  service: string;
  account: string;
}

export interface BrowserDef {
  id: string;
  displayName: string;
  cookieBackend: CookieBackend;
  /** macOS Keychain entries to try (chromium only). */
  keychainEntries: KeychainEntry[];
  /** Per-OS user-data directory paths, relative to homedir. */
  macPath?: string;
  linuxPath?: string;
  winPath?: string;
}

// ── Registry ─────────────────────────────────────────────────────────────────

const BROWSERS: BrowserDef[] = [
  {
    id: 'chrome',
    displayName: 'Google Chrome',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Chrome Safe Storage', account: 'Chrome' },
      { service: 'Chrome Safe Storage', account: 'Google Chrome' },
      { service: 'Google Chrome Safe Storage', account: 'Chrome' },
      { service: 'Google Chrome Safe Storage', account: 'Google Chrome' },
    ],
    macPath: 'Library/Application Support/Google/Chrome',
    linuxPath: '.config/google-chrome',
    winPath: 'AppData/Local/Google/Chrome/User Data',
  },
  {
    id: 'chromium',
    displayName: 'Chromium',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Chromium Safe Storage', account: 'Chromium' },
    ],
    macPath: 'Library/Application Support/Chromium',
    linuxPath: '.config/chromium',
    winPath: 'AppData/Local/Chromium/User Data',
  },
  {
    id: 'brave',
    displayName: 'Brave',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Brave Safe Storage', account: 'Brave' },
      { service: 'Brave Browser Safe Storage', account: 'Brave Browser' },
    ],
    macPath: 'Library/Application Support/BraveSoftware/Brave-Browser',
    linuxPath: '.config/BraveSoftware/Brave-Browser',
    winPath: 'AppData/Local/BraveSoftware/Brave-Browser/User Data',
  },
  {
    id: 'edge',
    displayName: 'Microsoft Edge',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Microsoft Edge Safe Storage', account: 'Microsoft Edge' },
      { service: 'Edge Safe Storage', account: 'Microsoft Edge' },
    ],
    macPath: 'Library/Application Support/Microsoft Edge',
    linuxPath: '.config/microsoft-edge',
    winPath: 'AppData/Local/Microsoft/Edge/User Data',
  },
  {
    id: 'helium',
    displayName: 'Helium',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Helium Storage Key', account: 'Helium' },
    ],
    macPath: 'Library/Application Support/net.imput.helium',
  },
  {
    id: 'comet',
    displayName: 'Comet',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Comet Safe Storage', account: 'Comet' },
    ],
    macPath: 'Library/Application Support/Comet',
  },
  {
    id: 'dia',
    displayName: 'Dia',
    cookieBackend: 'chromium',
    keychainEntries: [
      { service: 'Dia Safe Storage', account: 'Dia' },
    ],
    macPath: 'Library/Application Support/Dia/User Data',
  },
  {
    id: 'firefox',
    displayName: 'Firefox',
    cookieBackend: 'firefox',
    keychainEntries: [],
    macPath: 'Library/Application Support/Firefox',
    linuxPath: '.mozilla/firefox',
    winPath: 'AppData/Roaming/Mozilla/Firefox',
  },
];

// ── Public API ───────────────────────────────────────────────────────────────

export function getBrowser(id: string): BrowserDef {
  const normalized = id.trim().toLowerCase();
  const found = BROWSERS.find(b => b.id === normalized);
  if (!found) {
    const supported = BROWSERS.map(b => b.id).join(', ');
    throw new Error(
      `Unknown browser: "${id}"\n` +
      `Supported browsers: ${supported}`
    );
  }
  return found;
}

export function listBrowserIds(): string[] {
  return BROWSERS.map(b => b.id);
}

export function browserUserDataDir(browser: BrowserDef): string | undefined {
  const home = homedir();
  const os = platform();
  if (os === 'darwin' && browser.macPath) return join(home, browser.macPath);
  if (os === 'win32' && browser.winPath) return join(home, browser.winPath);
  
  if (os === 'linux') {
    const candidates: string[] = [];
    
    // 1. Standard config path
    if (browser.linuxPath) candidates.push(join(home, browser.linuxPath));
    
    // 2. Snap paths
    if (browser.id === 'chrome') candidates.push(join(home, 'snap/google-chrome/current/.config/google-chrome'));
    if (browser.id === 'chromium') candidates.push(join(home, 'snap/chromium/current/.config/chromium'));
    if (browser.id === 'brave') candidates.push(join(home, 'snap/brave/current/.config/BraveSoftware/Brave-Browser'));
    if (browser.id === 'edge') candidates.push(join(home, 'snap/microsoft-edge/current/.config/microsoft-edge'));
    if (browser.id === 'firefox') candidates.push(join(home, 'snap/firefox/common/.mozilla/firefox'));
    
    // 3. Flatpak paths
    if (browser.id === 'chrome') candidates.push(join(home, '.var/app/com.google.Chrome/config/google-chrome'));
    if (browser.id === 'chromium') candidates.push(join(home, '.var/app/org.chromium.Chromium/config/chromium'));
    if (browser.id === 'brave') candidates.push(join(home, '.var/app/com.brave.Browser/config/BraveSoftware/Brave-Browser'));
    if (browser.id === 'firefox') candidates.push(join(home, '.var/app/org.mozilla.firefox/.mozilla/firefox'));

    for (const cand of candidates) {
      if (existsSync(cand)) {
        // For chromium browsers, also check for Local State to avoid ghost folders
        if (browser.cookieBackend === 'chromium') {
          if (existsSync(join(cand, 'Local State'))) return cand;
        } else if (browser.id === 'firefox') {
          if (existsSync(join(cand, 'profiles.ini'))) return cand;
        } else {
          return cand;
        }
      }
    }
  }
  
  return undefined;
}

/** Return the first installed chromium-family browser, or 'chrome' as default. */
export function detectBrowser(): BrowserDef {
  const chromiumBrowsers = BROWSERS.filter(b => b.cookieBackend === 'chromium');
  for (const browser of chromiumBrowsers) {
    const dir = browserUserDataDir(browser);
    if (dir && existsSync(dir)) {
      // Robustness: some apps (like VS Code or 1Password) create folders under
      // ~/.config/google-chrome/ but don't actually install the browser.
      // Check for 'Local State' to confirm it's a real user data directory.
      if (existsSync(join(dir, 'Local State'))) return browser;
    }
  }
  // Fall back to chrome so error messages stay consistent
  return BROWSERS[0];
}

/** Return all installed browsers that have a valid user data directory. */
export function listInstalledBrowsers(): BrowserDef[] {
  return BROWSERS.filter(browser => {
    const dir = browserUserDataDir(browser);
    return !!dir && existsSync(dir);
  });
}

/** Get all keychain entries for a specific browser (for macOS). */
export function getKeychainEntries(browser: BrowserDef): KeychainEntry[] {
  return browser.keychainEntries;
}
