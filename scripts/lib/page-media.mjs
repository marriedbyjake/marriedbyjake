import {parse} from 'parse5';

export function pageMediaUrls(html, route) {
  const urls = new Set();
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(({name, value}) => [name, value]));
    const values = [];
    if (['img', 'video', 'audio', 'source'].includes(node.tagName) && 'src' in attrs) values.push(attrs.src);
    if (node.tagName === 'video' && 'poster' in attrs) values.push(attrs.poster);
    if (node.tagName === 'meta' && ['og:image', 'twitter:image'].includes(attrs.property || attrs.name)) values.push(attrs.content || '');
    for (const value of [...values, ...(attrs.srcset ? [attrs.srcset] : [])]) {
      let decoded;
      try { decoded = decodeURIComponent(value); } catch { throw Error(`${route}: malformed media URL: ${value}`); }
      if (!value.trim() || /\[object\s+[^\]]+\]/i.test(decoded)) throw Error(`${route}: malformed media URL: ${value}`);
    }
    values.forEach(value => urls.add(value));
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(html));
  return [...urls];
}
