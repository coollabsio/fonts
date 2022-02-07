import got from 'got';
import { promises as fs } from 'fs';
import { promisify } from 'node:util';
import stream from 'node:stream';
import 'dotenv/config'

const data = await got.get(`https://google-webfonts-helper.herokuapp.com/api/fonts/`).json()

const pipeline = promisify(stream.pipeline);

const families = data.map(d => d.id).filter(n => n)
const storageZoneName = 'coolfonts'

for (const family of families) {
    console.log('Doing: ', family)
    const { variants } = await got.get(`https://google-webfonts-helper.herokuapp.com/api/fonts/${family}`).json();
    for (const variant of variants) {
        const id = variant.fontWeight
        const dir = `./${family}/${variant.fontStyle}/`
        try {
            await pipeline(
                got.stream(`${variant.woff2}`),
                await got.stream.put(`https://storage.bunnycdn.com/${storageZoneName}/${dir}/${id}.woff2`, {
                    headers: {
                        AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
                    }
                }),
                new stream.PassThrough()
            );
        } catch (err) {
            console.log(err)
        }
    }
}
