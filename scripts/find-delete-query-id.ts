/**
 * Auto-discovers the current DeleteBookmark GraphQL query ID from X's live JS bundle.
 * X rotates these IDs periodically; this script finds the current one without
 * needing browser DevTools.
 *
 * Usage: pnpm exec tsx scripts/find-delete-query-id.ts
 */

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function main() {
  // 1. Fetch homepage to find the main bundle URL
  console.log('Fetching x.com to locate main JS bundle…');
  const homeRes = await fetch('https://x.com/', {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
  });
  const html = await homeRes.text();

  // Look for the main chunk — either absolute or relative URL
  const bundlePatterns = [
    /https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main\.[a-z0-9]+\.js/,
    /\/responsive-web\/client-web\/main\.[a-z0-9]+\.js/,
  ];

  let bundleUrl: string | null = null;
  for (const pat of bundlePatterns) {
    const m = html.match(pat);
    if (m) {
      bundleUrl = m[0].startsWith('http') ? m[0] : `https://abs.twimg.com${m[0]}`;
      break;
    }
  }

  if (!bundleUrl) {
    // Fallback: look for any abs.twimg.com JS file and infer the main one
    const anyJs = html.match(/https:\/\/abs\.twimg\.com\/[^"]+\.js/g);
    if (anyJs) {
      const mainish = anyJs.find(u => u.includes('main'));
      bundleUrl = mainish ?? null;
      console.log('Found JS files:', anyJs.slice(0, 3).join('\n  '));
    }
  }

  if (!bundleUrl) {
    throw new Error('Could not find main JS bundle URL in x.com HTML. X may have changed their HTML structure.');
  }

  console.log(`Bundle: ${bundleUrl}`);

  // 2. Fetch the bundle (can be large — stream and search chunk-by-chunk)
  console.log('Downloading bundle (this may take a moment)…');
  const bundleRes = await fetch(bundleUrl, { headers: { 'user-agent': UA } });
  if (!bundleRes.ok) throw new Error(`Bundle fetch failed: ${bundleRes.status}`);

  // Read in chunks and search for the queryId pattern near "DeleteBookmark"
  // Pattern in bundle: queryId:"<id>",operationName:"DeleteBookmark"
  // Or:                {id:"<id>",operationName:"DeleteBookmark"
  const reader = bundleRes.body!.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  const CHUNK_OVERLAP = 200; // keep tail of last chunk to catch split patterns
  let found: string | null = null;

  const PATTERNS = [
    /queryId:"([A-Za-z0-9_-]{20,30})",operationName:"DeleteBookmark"/,
    /id:"([A-Za-z0-9_-]{20,30})",operationName:"DeleteBookmark"/,
    /"DeleteBookmark"[^{]{0,100}id:"([A-Za-z0-9_-]{20,30})"/,
    /operationName:"DeleteBookmark"[^}]{0,100}queryId:"([A-Za-z0-9_-]{20,30})"/,
  ];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer = buffer.slice(-CHUNK_OVERLAP) + decoder.decode(value, { stream: true });

    for (const pat of PATTERNS) {
      const m = buffer.match(pat);
      if (m) { found = m[1]; break; }
    }
    if (found) break;
  }
  reader.cancel();

  if (found) {
    console.log(`\n✓  Found DeleteBookmark queryId: ${found}\n`);
    console.log(`Update src/bookmark-delete.ts:`);
    console.log(`  const DELETE_BOOKMARK_QUERY_ID = '${found}';`);
  } else {
    console.log('\n⚠  Could not find DeleteBookmark in the bundle via pattern matching.');
    console.log('   X may have changed the bundle format. Use DevTools instead:');
    console.log('   1. Open x.com → DevTools (F12) → Network tab');
    console.log('   2. Un-bookmark any tweet manually');
    console.log('   3. Find the "DeleteBookmark" network request');
    console.log('   4. Copy the queryId from the request URL or body');
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
