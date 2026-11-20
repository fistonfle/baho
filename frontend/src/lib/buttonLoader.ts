// Shows a spinner on the button that started an API request, until it finishes.
// Requests that start soon after a click or form submit belong to that button.

let lastButton: HTMLElement | null = null;
let lastPressed = 0;
const pending = new Map<HTMLElement, number>();

const remember = (button: Element | null | undefined) => {
  if (!(button instanceof HTMLElement) || !button.matches('.btn')) return;
  lastButton = button;
  lastPressed = Date.now();
};

export function watchButtons() {
  document.addEventListener('click', (event) => {
    remember((event.target as Element | null)?.closest('button'));
  }, true);
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    remember(event.submitter ?? form.querySelector('button[type="submit"], button:not([type])'));
  }, true);
}

export function showLoading<T>(request: Promise<T>): Promise<T> {
  const button = lastButton;
  if (!button || !button.isConnected || Date.now() - lastPressed > 300) return request;

  pending.set(button, (pending.get(button) ?? 0) + 1);
  button.classList.add('is-loading');
  button.setAttribute('aria-busy', 'true');

  const done = () => {
    const left = (pending.get(button) ?? 1) - 1;
    if (left > 0) return pending.set(button, left);
    pending.delete(button);
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
  };
  request.then(done, done);
  return request;
}
