import { readFileSync } from 'fs';
import { buildGraphData } from './utils/transforms.js';

const data = JSON.parse(readFileSync('./test_data.json', 'utf8'));
const { links } = buildGraphData(data.files);
const fileIds = new Set(data.files.map(f => f.path));

let validLinks = 0;
links.forEach(l => {
    if (fileIds.has(l.source) && fileIds.has(l.target)) {
        validLinks++;
    } else {
        console.log('Invalid link:', l.source, '->', l.target);
    }
});
console.log('Valid links:', validLinks);
