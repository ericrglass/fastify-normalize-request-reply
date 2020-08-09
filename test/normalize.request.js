'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const plugin = require('../index')

test('Succesful get request with Request normalized', (t) => {
  t.plan(28)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(req.fastifyNormalized, true)
    t.is(req.res, res)
    t.is(req.query['foo'], 'bar')
    t.ok(req.header('accept-encoding'))
    t.match(req.get('host'), 'localhost:')
    t.is(req.accepts('html'), 'html')
    t.is(req.acceptsEncodings('gzip'), 'gzip')
    t.is(req.acceptsCharsets('UTF-8'), 'UTF-8')
    t.is(req.acceptsLanguages('en'), 'en')
    t.ok(req.range)
    t.ok(req.param)
    t.ok(req.is)
    t.ok(req.protocol)
    t.is(req.secure, false)
    t.ok(req.remoteip)
    t.ok(req.ip)
    t.ok(req.ips)
    t.ok(req.subdomains)
    t.ok(req.path)
    t.ok(req.trusthostname)
    t.ok(req.hostname)
    t.is(req.fresh, false)
    t.ok(req.stale)
    t.is(req.xhr, false)
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/?foo=bar',
    headers: {
      'Accept-Encoding': 'deflate, gzip;q=1.0, *;q=0.5',
      'Accept-Language': 'en;q=.5, en-us',
      'Range': 'bytes=0-50,51-100',
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request normalized already', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.addHook('onRequest', (request, reply, next) => {
    request.raw.fastifyNormalized = true
    next()
  })

  app.register(plugin)

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request with functionality already', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.addHook('onRequest', (request, reply, next) => {
    request.raw.query = () => {
      return '';
    }
    request.raw.protocol = () => {
      return 'http';
    }
    request.raw.secure = () => {
      return false;
    }
    request.raw.ips = () => {
      return '127.0.0.1';
    }
    request.raw.subdomains = () => {
      return '127.0.0.1';
    }
    request.raw.path = () => {
      return '/';
    }
    request.raw.fresh = () => {
      return false;
    }
    request.raw.stale = () => {
      return true;
    }
    request.raw.xhr = () => {
      return false;
    }
    next()
  })

  app.register(plugin)

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request header(name) or get(name)', (t) => {
  t.plan(7)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    try {
      req.get()
    } catch(err) {
      t.is(err.message, 'name argument is required to req.get')
    }
    try {
      req.get(1)
    } catch(err) {
      t.is(err.message, 'name must be a string to req.get')
    }
    t.is(req.get('referer'), undefined, 'request get header referer supported')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request range(size, options)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(JSON.stringify(req.range(120)), '[{"start":0,"end":50},{"start":51,"end":100}]', 'should return parsed ranges')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Range: 'bytes=0-50,51-100'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request no range(size, options)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(req.range(120), undefined, 'should return undefined if no range')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request param(name, defaultValue)', (t) => {
  t.plan(8)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.params = {hello: 'world'}
    req.body = {index: 1}
    t.is(req.param('name', 'tj'), 'tj', 'should use the default value unless defined')
    t.is(req.param('foo', 'tj'), 'bar', 'should check req.query')
    t.is(req.param('index', 'tj'), 1, 'should check req.body')
    t.is(req.param('hello', 'tj'), 'world', 'should check req.params')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/?foo=bar'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request param(name, defaultValue) with no req.params', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.params = null
    t.is(req.param('name', 'tj'), 'tj', 'should use the default value unless defined')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/?foo=bar'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request is(types)', (t) => {
  t.plan(6)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(req.is('html'), false, 'should return false when not matching')
    t.is(req.is('json'), 'json', 'should return the type when matching')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request is(types) with an array', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(req.is(['application', 'json']), 'json')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request protocol', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.app.set('trust proxy fn', () => { return true })
    t.is(req.protocol, 'https', 'should respect X-Forwarded-Proto')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'X-Forwarded-Proto': 'https'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request protocol with https', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.app.set('trust proxy fn', () => { return true })
    req.connection.encrypted = true
    req.headers['x-forwarded-proto'] = null
    t.is(req.protocol, 'https')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'X-Forwarded-Proto': 'https'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request protocol with https and http', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.app.set('trust proxy fn', () => { return true })
    t.is(req.protocol, 'https')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'X-Forwarded-Proto': 'https,http'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request subdomains', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.headers.host = null
    t.is(JSON.stringify(req.subdomains), JSON.stringify([]), 'should return an empty array')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request subdomains should work with IPv4 address', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(JSON.stringify(req.subdomains), JSON.stringify([]))
    next()
  })

  app.get('/', (req, reply) => {
    reply.send('hello')
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: { host: '127.0.0.1' }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
  })
})

test('Request trusthostname', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.app.set('trust proxy', true)
    t.is(req.trusthostname, 'example.com', 'should use the first value')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'Host': 'localhost',
      'X-Forwarded-Host': 'example.com, foobar.com'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request trusthostname with brackets', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.app.set('trust proxy', true)
    t.is(req.trusthostname, '[example.com]')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Host': 'localhost',
      'X-Forwarded-Host': '[example.com]'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
  })
})

test('Request fresh', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.set('ETag', '"123"')
    t.is(req.fresh, false, 'should return false when the resource is modified')
    next()
  })

  app.post('/', (req, reply) => {
    reply.send(req.body)
  })

  app.inject({
    method: 'POST',
    payload: { hello: 'world' },
    url: '/',
    headers: {
      'If-None-Match': '"12345"'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('Request fresh no response headers', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.headers = null
    res.status(301)
    t.is(req.fresh, false, 'should return false without response headers')
    next()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 301)
  })
})