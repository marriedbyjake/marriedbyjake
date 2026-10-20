// Public visibility policy. These URLs remain reachable by direct link, but
// never belong in navigation, search, sitemaps or editorial discovery feeds.
const destinations = new Map([
  ['/serviceandprice', '/serviceandprice'],
  ['/celebrantcost', '/serviceandprice'],
]);

export function unlistedDestination(value) {
  try {
    const url = new URL(value, 'https://marriedbyjake.com');
    if (!['marriedbyjake.com', 'www.marriedbyjake.com'].includes(url.hostname)) return undefined;
    const path = url.pathname.replace(/\/+$/, '').replace(/\.html$/, '') || '/';
    return destinations.get(path);
  } catch { return undefined; }
}

export const isUnlistedPage = value => unlistedDestination(value) !== undefined;
