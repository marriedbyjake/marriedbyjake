import matter from 'gray-matter';
import {load,dump} from 'js-yaml';

// Keep gray-matter's established fence/BOM/body handling while using the
// maintained YAML API. Its default safeLoad/safeDump engine predates YAML v4.
export function archiveFrontmatter(source){
 return matter(source,{engines:{yaml:{parse:value=>load(value),stringify:value=>dump(value)}}});
}
