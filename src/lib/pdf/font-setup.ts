import pdfmake from 'pdfmake';
import path from 'path';

// Disable external URL downloads and allow local font resolution
if (typeof (pdfmake as any).setUrlAccessPolicy === 'function') {
  (pdfmake as any).setUrlAccessPolicy(() => false);
}
if (typeof (pdfmake as any).setLocalAccessPolicy === 'function') {
  (pdfmake as any).setLocalAccessPolicy(() => true);
}

import fs from 'fs';

const fontNormal = path.resolve(process.cwd(), 'src/assets/fonts/DejaVuSans.ttf');
const fontBold = path.resolve(process.cwd(), 'src/assets/fonts/DejaVuSans-Bold.ttf');
const fontItalicPath = path.resolve(process.cwd(), 'src/assets/fonts/DejaVuSans-Oblique.ttf');
const fontBoldItalicPath = path.resolve(process.cwd(), 'src/assets/fonts/DejaVuSans-BoldOblique.ttf');

const fontItalic = fs.existsSync(fontItalicPath) ? fontItalicPath : fontNormal;
const fontBoldItalic = fs.existsSync(fontBoldItalicPath) ? fontBoldItalicPath : fontBold;

(pdfmake as any).fonts = {
  DejaVu: {
    normal: fontNormal,
    bold: fontBold,
    italics: fontItalic,
    bolditalics: fontBoldItalic,
  },
};

export { pdfmake };
