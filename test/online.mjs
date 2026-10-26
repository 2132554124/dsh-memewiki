/**
 * 在线补查实测：用假 ctx 加载插件本体，DSH_HOME 指向临时目录，
 * 打开 online 后真正调一次 search_meme_wiki，量网络耗时。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const plugin = path.join(here, '..', 'lib', 'index.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'memewiki-online-'));
process.env.DSH_HOME = home;
fs.mkdirSync(path.join(home, 'memewiki'), { recursive: true });
fs.writeFileSync(
  path.join(home, 'memewiki', 'settings.json'),
  JSON.stringify({ preload: true, guide: true, online: true, maxQueryChars: 10, guidance: '' }),
  'utf8',
);

const mod = await import(pathToFileURL(plugin).href);
let tool = null;
mod.apply(
  {
    tools: { register: (def) => { tool = def; return () => {}; } },
    systemPrompt: { section: () => () => {}, context: () => () => {} },
    webServer: { register: () => () => {} },
    effect: (fn) => fn(),
    on: () => () => {},
  },
  {},
);

if (!tool) throw new Error('工具没有注册');
console.log('插件已加载，online =', true, '| 词库目录', path.join(home, 'memewiki'));

for (const word of ['绷住', '偷感', '已取餐', '班味']) {
  const started = Date.now();
  const result = await tool.execute({ query: word }, {});
  const cost = Date.now() - started;
  const first = String(result?.text ?? '').split('\n').slice(0, 2).join(' / ');
  console.log(`\n[${word}] ${cost}ms found=${result?.found} source=${result?.source || '(本地无)'}`);
  console.log('  ' + first.replace(/\n/g, ' '));
}
