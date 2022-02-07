import fastify from 'fastify'
import got from 'got'
const server = fastify()

const data = await got.get(`https://google-webfonts-helper.herokuapp.com/api/fonts/`).json()

const subsets = {
  devanagari: {
    'unicode-range': 'U+0900-097F, U+1CD0-1CF6, U+1CF8-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FB'
  },
  'latin-ext': {
    'unicode-range': 'U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF'
  },
  latin: {
    'unicode-range': 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
  },
  vietnamese: {
    'unicode-range': 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB'
  },
  cyrillic: {
    ' unicode-range': 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
  },
  'cyrillic-ext': {
    'unicode-range': 'U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F'
  },
  'thai': {
    'unicode-range': 'U+0E01-0E5B, U+200C-200D, U+25CC'
  },
  greek: {
    'unicode-range': 'U+0370-03FF'
  },
  'greek-ext': {
    'unicode-range': 'U+1F00-1FFF'
  }
}
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
  src: url(https://fontscdn.coollabs.io/${dashFamily}/${style}/${weight}.woff2) format('woff2');
  unicode-range: ${subsets[subset]['unicode-range']};
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