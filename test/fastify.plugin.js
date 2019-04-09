'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const plugin = require('../index')

test('Should register the plugin correctly', t => {
  t.plan(1)

  const app = Fastify()
  t.tearDown(app.close.bind(app))

  app.register(plugin)
  app.ready(t.error)
})