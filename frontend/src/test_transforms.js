import { readFileSync } from 'fs';
import { buildGraphData } from './utils/transforms.js';

const data = JSON.parse(readFileSync('./test_data.json', 'utf8'));
const { links } = buildGraphData(data.files);
console.log('Links found:', links.length);
links.forEach(l => console.log(l.source, '->', l.target));
