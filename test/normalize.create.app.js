'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fs = require('fs')
const path = require('path')
const plugin = require('../index')

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

test('Should create the Express mock app with options', t => {
  t.plan(23)

  const app = Fastify()
  t.tearDown(() => app.close())

  const replacer = (key, value) => {
    if (key === 'foo') {
      return 'bar'
    }
    return value
  }

  const pluginOptions = {
    env: 'production',
    etag: true,
    'json escape': true,
    'json replacer': replacer,
    'json spaces': 2,
    'jsonp callback name': 'jsonpCallback',
    'query parser': 'simple',
    'subdomain offset': 1,
    'trust proxy': true
  }

  app.register(plugin, pluginOptions)

  app.use((req, res, next) => {
    t.ok(req.app)
    t.ok(res.app)
    t.is(req.app, res.app)
    t.is(req.app.get('env'), 'production')
    t.is(req.app.get('etag'), true)
    t.is(req.app.get('json escape'), true)
    t.is(req.app.get('json replacer'), replacer)
    t.is(req.app.get('json spaces'), 2)
    t.is(req.app.get('jsonp callback name'), 'jsonpCallback')
    t.is(req.app.get('query parser'), 'simple')
    t.is(req.app.get('subdomain offset'), 1)
    t.is(req.app.get('trust proxy'), true)
    res.app.set('json spaces', 0)
    t.is(req.app.set('json spaces'), 0)
    res.app.set('view cache', false)
    t.is(res.app.enabled('view cache'), false)
    res.app.set('views', path.join(__dirname, 'fixtures'))
    t.ok(res.app.engine)
    res.app.engine('html', testEng)
    t.ok(res.app.locals)
    res.app.locals.user = { name: 'tobi' }
    t.ok(res.app.render)
    res.app.render('user.html', function(err, str) {
      t.error(err)
      t.is(str, '<p>tobi</p>')
      next()
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
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('engine(ext, fn) and render(name, options, callback)', (t) => {
  t.plan(10)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    try {
      res.app.engine('html')
    } catch(err) {
      t.is(err.message, 'callback function required')
    }
    res.app.set('views', path.join(__dirname, 'fixtures'))
    res.app.engine('html', testEng)
    try {
      res.app.render('bad.html', {
        throwErr: true
      }, function(err, str) {
        t.is(err.message, 'Test engine throw error option is on')
      })
    } catch(err) {
    }
    res.app.render('user.html', {
      cache: true,
      '_locals': {
        user: {
          name: 'tobi'
        }
      }
    }, function(err, str) {
      t.error(err)
      t.is(str, '<p>tobi</p>')
      res.app.render('user.html', {
        cache: true,
        '_locals': {
          user: {
            name: 'tobi'
          }
        }
      }, function(err, str) {
        t.error(err)
        t.is(str, '<p>tobi</p>')
        next()
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
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})

test('engine(dotext, fn) and render(name)', (t) => {
  t.plan(6)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.use((req, res, next) => {
    res.app.set('views', path.join(__dirname, 'fixtures'))
    res.app.engine('.html', testEng)
    res.app.render('user.html', {
      cache: true,
      '_locals': {
        user: {
          name: 'tobi'
        }
      }
    }, function(err, str) {
      t.error(err)
      t.is(str, '<p>tobi</p>')
      next()
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
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.body), {
      hello: 'world'
    })
  })
})
