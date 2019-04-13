'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const plugin = require('../index')
const Buffer = require('safe-buffer').Buffer
const fs = require('fs')
const path = require('path')
const fixtures = path.join(__dirname, 'fixtures')
const cookie = require('cookie')
const cookieParser = require('cookie-parser')

function testEng(viewName, options) {
  this.viewName = viewName;
  this.opts = options || {};
  this.render = function(options, fn) {
    if (options && options.throwErr) {
      throw new Error('Test engine throw error option is on')
    }
    fs.readFile(path.join(this.opts.root || '', this.viewName), 'utf8', function(err, str){
      if (err) return fn(err);
      str = str.replace('{{user.name}}', options.user.name);
      fn(null, str);
    });
  }
}

test('Succesful get request with Reply normalized', (t) => {
  t.plan(29)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    t.is(res.fastifyNormalized, true)
    t.is(res.req, req)
    t.ok(res.status)
    t.ok(res.links)
    t.ok(res.send)
    t.ok(res.json)
    t.ok(res.jsonp)
    t.ok(res.sendStatus)
    t.ok(res.sendFile)
    t.ok(res.sendfile)
    t.ok(res.download)
    t.ok(res.type)
    t.ok(res.contentType)
    t.ok(res.format)
    t.ok(res.attachment)
    t.ok(res.append)
    t.ok(res.header)
    t.ok(res.set)
    t.ok(res.get)
    t.ok(res.clearCookie)
    t.ok(res.cookie)
    t.ok(res.location)
    t.ok(res.redirect)
    t.ok(res.vary)
    t.ok(res.render)
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

test('Reply normalized already', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.addHook('onRequest', (request, reply, next) => {
    reply.res.fastifyNormalized = true
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

test('Reply status(code)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    try {
      res.status()
    } catch(err) {
      t.is(err.message, 'code argument is required to res.status')
    }
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

test('Reply links(linksObj) should set link header field', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.links({
      next: 'http://api.example.com/users?page=2',
      last: 'http://api.example.com/users?page=5'
    })
    res.end()
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
    t.strictEqual(response.headers['link'], '<http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last"')
  })
})

test('Reply links(linksObj) should set link header field for multiple calls', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.links({
      next: 'http://api.example.com/users?page=2',
      last: 'http://api.example.com/users?page=5'
    })

    res.links({
      prev: 'http://api.example.com/users?page=1'
    })

    res.end()
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
    t.strictEqual(response.headers['link'], '<http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last", <http://api.example.com/users?page=1>; rel="prev"')
  })
})

test('Reply send(body) should set body to ""', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send()
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
    t.strictEqual(response.body, '')
  })
})

test('Reply send(body) should be supported for backwards compat', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send('Bad!', 400)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 400)
    t.strictEqual(response.body, 'Bad!')
  })
})

test('Reply send(body) should set .statusCode', (t) => {
  t.plan(2)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send(201)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
  })
})

test('Reply send(body) should set .statusCode with type', (t) => {
  t.plan(2)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.type('json').send(304)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 304)
  })
})

test('Reply send(body) should send number as json', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send(200, 0.123)
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
    t.strictEqual(response.body, '0.123')
  })
})

test('Reply send(body) null should set body to ""', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send(null)
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
    t.strictEqual(response.body, '')
  })
})

test('Reply send(body) should respond with 304 Not Modified when fresh', (t) => {
  t.plan(2)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const etag = '"asdf"'

  app.use((req, res, next) => {
    const str = Array(1000).join('-')
    res.set('ETag', etag)
    res.send(str)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      'If-None-Match': etag
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 304)
  })
})

test('Reply send(body) should ignore etag', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const etagFn = () => {
    return false
  }

  app.use((req, res, next) => {
    res.app.set('etag fn', etagFn)
    res.send('yay')
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
    t.strictEqual(response.body, 'yay')
  })
})

test('Reply send(body) should send as octet-stream', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send(Buffer.from('hello'))
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
    t.strictEqual(response.headers['content-type'], 'application/octet-stream')
    t.strictEqual(response.body, 'hello')
  })
})

test('Reply send(body) should send as json', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.type('json').send(Buffer.from('hello'))
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
    t.strictEqual(response.body, 'hello')
  })
})

test('Reply send(body) method is HEAD should ignore the body', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send('yay')
  })

  app.head('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'HEAD',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.body, '')
  })
})

test('Reply send(body) should send boolean as json', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.send(200, true)
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
    t.strictEqual(response.body, 'true')
  })
})

test('Reply json(obj) should respond with json and set the .statusCode for backwards compat', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.json({ id: 1 }, 201)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.is(response.body, '{"id":1}')
  })
})

test('Reply json(obj) should respond with json and set the .statusCode', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.json(201, { id: 1 })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.is(response.body, '{"id":1}')
  })
})

test('Reply json(obj) should respond with json and type', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.type('html').json({ id: 1 })
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
    t.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
    t.is(response.body, '{"id":1}')
  })
})

test('Reply json(obj) "json escape", "json spaces" setting', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.app.set('json escape', true)
    req.app.set('json spaces', 2)
    res.json({ '&': '<script>' })
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
    t.is(JSON.stringify(response.body), '"{\\n  \\"\\\\u0026\\": \\"\\\\u003cscript\\\\u003e\\"\\n}"')
  })
})

test('Reply jsonp(obj) should respond with jsonp', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.jsonp({ count: 1 })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/?callback=something'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.is(response.body, '{"count":1}')
  })
})

test('Reply jsonp(obj) should respond with jsonp and type', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.type('html').jsonp({ count: 1 })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/?callback=something'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
    t.is(response.body, '{"count":1}')
  })
})

test('Reply jsonp(obj) should respond with json and set the .statusCode for backwards compat', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.jsonp({ id: 1 }, 201)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.is(response.body, '{"id":1}')
  })
})

test('Reply jsonp(obj) should respond with json and set the .statusCode', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.jsonp(201, { id: 1 })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.is(response.body, '{"id":1}')
  })
})

test('Reply jsonp(obj) should allow renaming callback', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.app.set('jsonp callback name', 'clb')
    res.jsonp(201, { id: 1 })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/?clb[0]=clb'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
    t.strictEqual(response.headers['content-type'], 'text/javascript; charset=utf-8')
    t.is(response.body, '/**/ typeof clb === \'function\' && clb({"id":1});')
  })
})

test('Reply sendStatus(statusCode) should send the status code and message as body', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.sendStatus(201)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 201)
    t.is(response.body, 'Created')
  })
})

test('Reply sendStatus(statusCode) should work with unknown code', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.sendStatus(599)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 599)
    t.is(response.body, '599')
  })
})

test('Reply sendFile(path, options, callback)', (t) => {
  t.plan(6)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    try {
      res.sendFile()
    } catch(err) {
      t.is(err.message, 'path argument is required to res.sendFile')
    }
    try {
      res.sendFile(1)
    } catch(err) {
      t.is(err.message, 'path must be a string to res.sendFile')
    }
    try {
      res.sendFile('../')
    } catch(err) {
      t.is(err.message, 'path must be absolute or specify root to res.sendFile')
    }
    res.sendFile(path.resolve(fixtures, 'name.txt'))
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
    t.strictEqual(response.body, 'tobi')
  })
})

test('Reply sendFile(path, options, callback) should invoke the callback', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.error(err)
  }

  app.use((req, res, next) => {
    res.sendFile(path.resolve(fixtures, 'name.txt'), cb)
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
    t.strictEqual(response.body, 'tobi')
  })
})

test('Reply sendFile(path, options, callback) should 404 for directory', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.next = function(err) {
      t.error(err)
      res.sendStatus(404)
    }
    res.sendFile(path.resolve(fixtures))
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 404)
  })
})

test('Reply sendFile(path, options, callback) should 404 when not found', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.next = function(err) {
      t.match(err.message, 'no such file or directory')
      res.sendStatus(404)
    }
    res.sendFile(path.resolve(fixtures, 'does-no-exist'))
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 404)
  })
})

test('Reply .sendfile(path, fn)', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.error(err)
  }

  app.use((req, res, next) => {
    res.sendfile('test/fixtures/user.html', cb)
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
    t.strictEqual(response.body, '<p>{{user.name}}</p>')
  })
})

test('Reply .sendfile(path, fn) with no callback', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.sendfile('test/fixtures/user.html')
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
    t.strictEqual(response.body, '<p>{{user.name}}</p>')
  })
})

test('Reply .sendfile(path) should 404 for directory', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.next = function(err) {
      t.error(err)
      res.sendStatus(404)
    }
    res.sendfile('test/fixtures')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 404)
  })
})

test('Reply .sendfile(path) should 404 when not found', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.next = function(err) {
      t.match(err.message, 'no such file or directory')
      res.sendStatus(404)
    }
    res.sendfile('test/fixtures/does-no-exist')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 404)
  })
})

test('Reply sendFile(path, options, callback) should invoke the callback when client aborts', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.ok(err)
    t.is(err.code, 'ECONNABORTED')
  }

  app.use((req, res, next) => {
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnaborted: true }, cb)
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnabortedTwice: true }, () => {})
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
  })
})

test('Reply sendFile(path, options, callback) should invoke the callback when directory', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.ok(err)
    t.is(err.code, 'EISDIR')
  }

  app.use((req, res, next) => {
    res.sendFile(path.resolve(fixtures), { simulateOndirectory: true }, cb)
    res.sendFile(path.resolve(fixtures), { simulateOndirectoryTwice: true }, () => {})
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
  })
})

test('Reply sendFile(path, options, callback) should only invoke onend once', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.error(err)
  }

  app.use((req, res, next) => {
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnend: true }, cb)
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnendTwice: true }, () => {})
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
  })
})

test('Reply sendFile(path, options, callback) should invoke onfinish with err', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.ok(err)
    t.is(err.code, 'ECONNABORTED')
  }

  app.use((req, res, next) => {
    var err = new Error()
    err.code = 'ECONNRESET'
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnfinishErr: err }, cb)
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnfinishDone: true }, () => {})
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
  })
})

test('Reply sendFile(path, options, callback) should invoke onfinish with custom err', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.ok(err)
    t.is(err.code, 'ETEST')
  }

  app.use((req, res, next) => {
    var err = new Error()
    err.code = 'ETEST'
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnfinishErr: err }, cb)
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
  })
})

test('Reply sendFile(path, options, callback) should invoke the callback with onstream', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.ok(err)
    t.is(err.code, 'ECONNABORTED')
  }

  app.use((req, res, next) => {
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnstream: true }, cb)
    res.sendFile(path.resolve(fixtures, 'name.txt'), { simulateOnstreamTwice: true }, () => {})
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
  })
})

test('Reply .download(path)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.download('test/fixtures/user.html')
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
    t.strictEqual(response.headers['content-disposition'], 'attachment; filename="user.html"')
    t.strictEqual(response.headers['content-type'], 'text/html; charset=UTF-8')
    t.strictEqual(response.body, '<p>{{user.name}}</p>')
  })
})

test('Reply .download(path, fn)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.error(err)
  }

  app.use((req, res, next) => {
    res.download('test/fixtures/user.html', cb)
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
    t.strictEqual(response.headers['content-disposition'], 'attachment; filename="user.html"')
    t.strictEqual(response.headers['content-type'], 'text/html; charset=UTF-8')
  })
})

test('Reply .download(path, filename, fn)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  const cb = function(err) {
    t.error(err)
  }

  app.use((req, res, next) => {
    res.download('test/fixtures/user.html', 'document', cb)
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
    t.strictEqual(response.headers['content-disposition'], 'attachment; filename="document"')
    t.strictEqual(response.headers['content-type'], 'text/html; charset=UTF-8')
  })
})

test('Reply .download() options.headers should ignored case-insensitively', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.download('test/fixtures/user.html', 'document', {
      headers: {
        'content-type': 'text/x-custom',
        'content-disposition': 'inline'
      }
    })
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
    t.strictEqual(response.headers['content-disposition'], 'attachment; filename="document"')
    t.strictEqual(response.headers['content-type'], 'text/x-custom')
  })
})

test('Reply type(type)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.type('application/vnd.amazon.ebook').end('var name = "tj";')
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
    t.strictEqual(response.headers['content-type'], 'application/vnd.amazon.ebook')
  })
})

test('Reply format(obj)', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.format({
      'text/html': function(){
        res.send('<p>hey</p>');
      },

      default: function(){ res.send('default') }
    })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'text/html'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
    t.strictEqual(response.body, '<p>hey</p>')
  })

})

test('Reply format(obj) should work when only .default is provided', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.format({
      default: function(){ res.send('default') }
    })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: '*/*'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
    t.strictEqual(response.body, 'default')
  })

})

test('Reply format(obj) when no match is made', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.next = function(err) {
      res.send(err.status, 'Supports: ' + err.types.join(', '))
    }
    res.format({
      text: function(){ res.send('hey') },
      html: function(){ res.send('<p>hey</p>') },
      json: function(){ res.send({ message: 'hey' }) }
    })
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'foo/bar'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 406)
    t.strictEqual(response.body, 'Supports: text/plain, text/html, application/json')
  })

})

test('Reply attachment(filename)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.attachment().send('foo')
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
    t.strictEqual(response.headers['content-disposition'], 'attachment')
  })

})

test('Reply attachment(filename) should add the filename param', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.attachment('/path/to/image.png').send('foo')
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
    t.strictEqual(response.headers['content-disposition'], 'attachment; filename="image.png"')
  })

})

test('Reply append(field, val)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use(function (req, res, next) {
    res.append('Link', '<http://localhost/>')
    next()
  })

  app.use(function (req, res) {
    res.append('Link', '<http://localhost:80/>')
    res.end()
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
    t.strictEqual(JSON.stringify(response.headers['link']), '["<http://localhost/>","<http://localhost:80/>"]')
  })

})

test('Reply append(field, val) should accept array of values', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use(function (req, res, next) {
    res.append('Set-Cookie', ['foo=bar', 'fizz=buzz'])
    next()
  })

  app.use(function (req, res, next) {
    res.append('Set-Cookie', 'bar=baz')
    res.end()
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
    t.strictEqual(JSON.stringify(response.headers['set-cookie']), '["foo=bar","fizz=buzz","bar=baz"]')
  })

})

test('Reply append(field, val) should work with cookies', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use(function (req, res, next) {
    res.cookie('foo', 'bar')
    next()
  })

  app.use(function (req, res, next) {
    res.append('Set-Cookie', ['fizz=buzz', 'bar=baz'])
    res.end()
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
    t.strictEqual(JSON.stringify(response.headers['set-cookie']), '["foo=bar; Path=/","fizz=buzz","bar=baz"]')
  })

})

test('Reply header(field, val)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    try {
      res.header('Content-Type', ['application/json', 'charset=utf-8'])
    } catch(err) {
      t.is(err.message, 'Content-Type cannot be set to an Array')
    }
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
  })
})

test('Reply .set(object)', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.set({
      'X-Foo': 'bar',
      'X-Bar': 'baz'
    }).end()
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
    t.strictEqual(response.headers['x-foo'], 'bar')
    t.strictEqual(response.headers['x-bar'], 'baz')
  })
})

test('Reply clearCookie(name, options)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.clearCookie('sid').end()
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
    t.strictEqual(response.headers['set-cookie'], 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
  })
})

test('Reply cookie(name, value, options)', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    try {
      res.cookie('name', 'tobi', { signed: true })
    } catch(err) {
      t.is(err.message, 'cookieParser("secret") required for signed cookies')
    }
    res.cookie('name', 'tobi', { maxAge: 1000 }).end()
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
    t.match(response.headers['set-cookie'], 'name=tobi; Max-Age=1; Path=/;')
  })
})

test('Reply cookie(name, value, options) should generate a signed JSON cookie', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use(cookieParser('foo bar baz'))

  app.use((req, res, next) => {
    res.cookie('user', { name: 'tobi' }, { signed: true }).end()
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
    t.match(response.headers['set-cookie'], 'user=')
    t.match(response.headers['set-cookie'], '; Path=/')
  })
})

test('Reply location(url)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.location('http://google.com').end()
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
    t.strictEqual(response.headers['location'], 'http://google.com')
  })
})

test('Reply location(url) when url is "back"', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.location('back').end()
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
    t.strictEqual(response.headers['location'], '/')
  })
})

test('Reply redirect(url)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.redirect('http://google.com')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 302)
    t.strictEqual(response.headers['location'], 'http://google.com')
  })
})

test('Reply redirect(url) should set the response status', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.redirect(303, 'http://google.com')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 303)
    t.strictEqual(response.headers['location'], 'http://google.com')
  })
})

test('Reply redirect(url) should set the response status 303', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.redirect('http://google.com', 303)
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 303)
    t.strictEqual(response.headers['location'], 'http://google.com')
  })
})

test('Reply redirect(url) should respond with html', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.redirect('http://google.com')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'text/html'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 302)
    t.strictEqual(response.headers['location'], 'http://google.com')
    t.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
    t.strictEqual(response.body, '<p>Found. Redirecting to <a href="http://google.com">http://google.com</a></p>')
  })
})

test('Reply redirect(url) should respond with an empty body', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.redirect('http://google.com')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'application/octet-stream'
    }
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 302)
    t.strictEqual(response.headers['location'], 'http://google.com')
    t.strictEqual(response.headers['content-length'], '0')
    t.strictEqual(response.body, '')
  })
})

test('Reply redirect(url) should ignore the body', (t) => {
  t.plan(4)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.redirect('http://google.com')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'HEAD',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 302)
    t.strictEqual(response.headers['location'], 'http://google.com')
    t.strictEqual(response.body, '')
  })
})

test('Reply vary(field)', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.vary().end()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'HEAD',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.notOk(response.headers['vary'])
  })
})

test('Reply vary(field) with an empty array', (t) => {
  t.plan(3)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.vary([]).end()
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'HEAD',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.notOk(response.headers['vary'])
  })
})

test('Reply render(view, options, callback)', (t) => {
  t.plan(8)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.app.set('views', path.join(__dirname, 'fixtures'))
    res.app.engine('html', testEng)
    res.render('user.html', {
      user: {
        name: 'tobi'
      }
    }, function(err, str) {
      t.error(err)
      t.is(str, '<p>tobi</p>')
      res.app.locals.user = { name: 'tobi' }
      res.render('user.html', function(err, str) {
        t.error(err)
        t.is(str, '<p>tobi</p>')
        res.render('user.html')
      })
    })
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
    t.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
    t.strictEqual(response.body, '<p>tobi</p>')
  })
})

test('Reply render(view, options, callback) should next(err)', (t) => {
  t.plan(5)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    req.next = (err) => {
      t.is(err.message, 'Test engine throw error option is on')
      next()
    }
    res.app.set('views', path.join(__dirname, 'fixtures'))
    res.app.engine('html', testEng)
    res.app.locals.user = { name: 'tobi' }
    try {
      res.render('bad.html', {
        throwErr: true
      })
    } catch(err) {
    }
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
