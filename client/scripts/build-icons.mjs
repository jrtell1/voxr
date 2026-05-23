import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

mkdirSync(join(root, 'resources'), { recursive: true });

const svg = join(root, 'resources', 'voxr_icon.svg');

const png = await sharp(svg).resize(512, 512).png().toBuffer();
writeFileSync(join(root, 'resources', 'icon.png'), png);

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoBuffers = await Promise.all(
  icoSizes.map((size) => sharp(svg).resize(size, size).png().toBuffer())
);
const ico = await pngToIco(icoBuffers);
writeFileSync(join(root, 'resources', 'icon.ico'), ico);

console.log('Icons written to resources/');
