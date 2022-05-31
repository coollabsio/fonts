import fastify from 'fastify'
import got from 'got'
import 'dotenv/config'
import fs from 'fs/promises'
import etag from 'fastify-etag'
const domain = process.env.DOMAIN
const server = fastify()

const data = await got.get(`https://google-webfonts-helper.herokuapp.com/api/fonts/`).json()
const subsets = JSON.parse(await fs.readFile('./subsets.json', 'utf8'))
server.register(etag)
server.get('/', (response, reply) => {
  reply.redirect('https://fonts.coollabs.io')
})
server.get('/icon', async (request, reply) => {
  const css = `/* fallback */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url(https://cdn.fonts.coollabs.io/icons/material-icons/v125.woff2) format('woff2');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}`
reply.header('content-type', 'text/css')
reply.send(css)
return reply.end()
})
server.get('/css2', async (request, reply) => {
  try {
    let { family: families, display } = request.query
    if (families) {
      if (typeof families === 'string') {
        families = [families]
      }
      const payload = []
      for (let family of families) {
        let style = 'normal'
        let weights = ['400']
  
        let dashFamily = family.toLowerCase().replace(/ /g, '-')
        if (family.includes('wght') || family.includes('ital')) {
          weights = family.split(':')[1].split('@')[1].split(';').filter(n => n)
          dashFamily = family.toLowerCase().replace(/ /g, '-').split(':')[0]
        }
  
        family = family.split(':')[0]
        const properties = data.find(f => f.id === dashFamily)
        for (let weight of weights) {
          for (const subset of properties?.subsets) {
            if (weight.includes(',')) {
              style = weight.split(',')[0] === '0' ? 'normal' : 'italic'
            }
            weight = weight.includes(',') ? weight.split(',')[1] : weight
            let css = `
  /* ${subset} */
  @font-face {
    font-family: '${family}';
    font-style: ${style};
    font-weight: ${weight};`
            if (display) css += `
    font-display: swap;`
            css += `
    src: url(https://${domain}/${dashFamily}/${style}/${weight}.woff2) format('woff2');
    unicode-range: ${subsets[subset]};
  }`
            payload.push(css)
          }
        }
      }
      reply.header('content-type', 'text/css')
      return reply.send(payload.join(' ').trim())
    } else {
      throw { statusCode: 500, message: 'Wrong request' }
    }
  } catch(error) {
    throw { statusCode: 500, message: error.message }
  }
 

})

try {
  await server.listen(3000, '0.0.0.0')
  console.log(`Server listening on http://0.0.0.0:${server.server.address().port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}