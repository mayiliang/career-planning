const readyEvent = 'career-atlas:material-reader-ready';

export function announceMaterialReady(path: string) {
  window.dispatchEvent(new CustomEvent(readyEvent, { detail: path }));
}

/** 等正文布局完成后再定位，避免后退时滚动到尚未装载的空页面。 */
export function waitForMaterialReady(path: string): Promise<void> {
  if (document.querySelector('[data-reader-ready]')?.getAttribute('data-material-path') === path) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      window.removeEventListener(readyEvent, onReady);
      resolve();
    };
    const onReady = (event: Event) => {
      if ((event as CustomEvent<string>).detail === path) finish();
    };
    const timer = setTimeout(finish, 5000);
    window.addEventListener(readyEvent, onReady);
  });
}
