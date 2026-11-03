import { pipeline } from '@xenova/transformers';
const e = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
const o = await e('verify your login now', { pooling: 'mean', normalize: true });
console.log(o.data.length);