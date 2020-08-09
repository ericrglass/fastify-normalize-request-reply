'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fs = require('fs')
const path = require('path')
const plugin = require('../index')

test('Should create the Express mock app with options', t => {
  t.plan(15)

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
    t.ok(res.app.locals)
    res.app.set('views', __dirname)
    res.app.engine('html')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
  })
})

test('app.render', (t) => {
  t.plan(1)

  const app = Fastify()
  t.tearDown(() => app.close())

  app.register(plugin)

  app.register(require('point-of-view'), {
    engine: {
      nunjucks: require('nunjucks'),
    },
    templates: path.join(__dirname, './', 'test/fixtures')
  })

  app.use((req, res, next) => {
    res.app.render('test.njk')
  })

  app.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  app.inject({
    method: 'HEAD',
    url: '/'
  }, (err, response) => {
    t.error(err)
  })
})