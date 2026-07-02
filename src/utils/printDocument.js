const PRINT_FRAME_ID = 'hrms-print-frame';

const BASE_PRINT_STYLES = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 10mm 12mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

function waitForImages(doc, callback) {
  const images = Array.from(doc.images || []);
  if (!images.length) {
    callback();
    return;
  }

  let loaded = 0;
  const done = () => {
    loaded += 1;
    if (loaded >= images.length) callback();
  };

  images.forEach((img) => {
    if (img.complete) done();
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

function removePrintFrame() {
  document.getElementById(PRINT_FRAME_ID)?.remove();
}

/**
 * Print only the target element via a hidden iframe (receipt/invoice only).
 * Does NOT print the main application shell.
 */
export function printElementById(elementId, options = {}) {
  const { title = ' ' } = options;
  const element = document.getElementById(elementId);
  if (!element) return;

  removePrintFrame();

  const iframe = document.createElement('iframe');
  iframe.id = PRINT_FRAME_ID;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = frameWindow?.document;
  if (!frameWindow || !doc) {
    removePrintFrame();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${BASE_PRINT_STYLES}</style>
  </head>
  <body>${element.outerHTML}</body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    frameWindow.onafterprint = removePrintFrame;
    setTimeout(removePrintFrame, 2000);
  };

  setTimeout(() => waitForImages(doc, triggerPrint), 250);
}
