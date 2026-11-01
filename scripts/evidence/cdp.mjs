// Minimal Chrome DevTools Protocol client used by the evidence scripts
// (screenshots, performance and compatibility runs). Needs Chrome started with
// --remote-debugging-port=9333 and Node 20+ run with --experimental-websocket.
export async function openPage({ port = 9333 } = {}) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  let id = 0;
  const listeners = new Set();
  ws.addEventListener('message', (event) => listeners.forEach((listener) => listener(JSON.parse(event.data))));
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const my = ++id;
    const on = (message) => {
      if (message.id !== my) return;
      listeners.delete(on);
      message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result);
    };
    listeners.add(on);
    ws.send(JSON.stringify({ id: my, method, params }));
  });
  const on = (method, handler) => listeners.add((message) => message.method === method && handler(message.params));
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed');
    return result.result.value;
  };
  const close = async () => {
    await send('Target.closeTarget', { targetId: target.id }).catch(() => undefined);
    ws.close();
  };
  return { send, on, evaluate, close };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
