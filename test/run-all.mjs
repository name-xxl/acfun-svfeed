/*
 * 测试三段并行 runner（0.9.243）——npm test 的新入口：
 * check（静态六步链）/ 单测（node --test）/ harness（Playwright 65 场景）三者互不依赖
 * （harness 只读预构建产物；check 只读源码/产物；单测只读源码）——串行 ~54.6s 里三段
 * 各自独占等待，并行压到 ~44s（本机 20 核实测全绿；harness 内部并发池 5 不受影响，
 * 三进程同跑未见假红）。CI 仍按步分开跑（.github/workflows/build.yml 不动），本件只服务本地。
 * 输出按任务名加前缀逐行透传（直接 inherit 会交织成乱流）；任一非零 → exit 1。
 */
import { spawn } from 'node:child_process';

const tasks = [
  { name: 'check', cmd: 'npm run check' },
  { name: 'unit', cmd: 'npm run test:unit' },
  { name: 'harness', cmd: 'node test/run-harness.mjs' }
];

function run(t) {
  return new Promise((resolve) => {
    const p = spawn(t.cmd, { shell: true });
    let buf = '';
    const flush = (chunk) => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const l of lines) process.stdout.write('[' + t.name + '] ' + l + '\n');
    };
    p.stdout.on('data', (d) => flush(String(d)));
    p.stderr.on('data', (d) => flush(String(d)));
    p.on('close', (code) => {
      if (buf) process.stdout.write('[' + t.name + '] ' + buf + '\n');
      resolve({ name: t.name, code: code == null ? 1 : code });
    });
  });
}

const t0 = Date.now();
const results = await Promise.all(tasks.map(run));
for (const r of results) console.log('[' + r.name + '] exit=' + r.code);
const failed = results.filter((r) => r.code !== 0);
if (failed.length) {
  console.error('[run-all] 失败：' + failed.map((r) => r.name).join(', ')
    + '（' + ((Date.now() - t0) / 1000).toFixed(1) + 's）');
  process.exit(1);
}
console.log('[run-all] 三段并行全绿（' + ((Date.now() - t0) / 1000).toFixed(1) + 's）');
