import {parse} from 'parse5';
import {decodeHTMLStrict} from 'entities';

// Parse once, like the browser. Repeated string replacements can silently turn
// broken &amp;#39; output into an apostrophe and make a regression look correct.
export function inspectPageTitles(html) {
  const document = parse(html);
  const head = document.childNodes.find(node => node.tagName === 'html')
    ?.childNodes.find(node => node.tagName === 'head');
  const elements = head?.childNodes || [];
  const titles = elements.filter(node => node.tagName === 'title');
  const title = titles[0]?.childNodes.map(node => node.value || '').join('') || '';
  const errors = [];
  if (titles.length !== 1 || !title.trim()) errors.push('Expected one non-empty page title');

  const values = [['Page title', title]];
  for (const name of ['og:title', 'twitter:title']) {
    const matches = elements.filter(node => node.tagName === 'meta' &&
      node.attrs.some(attr => ['name', 'property'].includes(attr.name) && attr.value === name));
    const value = matches[0]?.attrs.find(attr => attr.name === 'content')?.value || '';
    if (matches.length !== 1 || !value.trim()) errors.push(`Expected one non-empty ${name}`);
    if (value !== title) errors.push(`${name} differs from the page title`);
    values.push([name, value]);
  }
  for (const [name, value] of values) {
    if (decodeHTMLStrict(value) !== value) errors.push(`${name} displays an HTML entity: ${value}`);
  }
  return {title, errors};
}

export function assertPageTitles(html, route) {
  const {title, errors} = inspectPageTitles(html);
  if (errors.length) throw Error(`${route}: ${errors.join('; ')}`);
  return title;
}
