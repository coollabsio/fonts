import fastify from 'fastify'
import got from 'got'
import 'dotenv/config'
import fs from 'fs/promises'
const domain = process.env.DOMAIN
const server = fastify()

const data = await got.get(`https://google-webfonts-helper.herokuapp.com/api/fonts/`).json()
const subsets = JSON.parse(await fs.readFile('./subsets.json', 'utf8'))

server.get('/', (response, reply) => {
  reply.redirect('https://fonts.coollabs.io')
})
server.get('/css2', async (request, reply) => {
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
      if (family.includes('wght')) {
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
          payload.push(`
/* ${subset} */
@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  ${display ? 'font-display: swap;' : 'font-display: auto;'}
  src: url(https://${domain}/${dashFamily}/${style}/${weight}.woff2) format('woff2');
  unicode-range: ${subsets[subset]};
}
`)
        }
      }
    }
    reply.raw.writeHead(200, { 'Content-Type': 'text/css;charset=UTF-8' })
    reply.raw.write(payload.join(' ').trim())
    return reply.raw.end()
  } else {
    throw { statusCode: 500, message: 'Wrong request' }
  }

})

try {
  await server.listen(3000, '0.0.0.0')
} catch (err) {
  server.log.error(err)
  process.exit(1)
}