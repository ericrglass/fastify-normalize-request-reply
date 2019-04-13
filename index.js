'use strict'

const fp = require('fastify-plugin')
const normalizeRequest = require('./normalize-request')
const normalizeReply = require('./normalize-reply')
const createApp = require('./create-app');

function normalizeRequestReplyPlugin(fastify, options, next) {
  const app = createApp(options);

  fastify.addHook("onRequest", (req, reply, hookNext) => {
    normalizeRequest(req, reply, app)
    normalizeReply(reply, req, app)
    hookNext()
  })
  next()
}

module.exports = fp(normalizeRequestReplyPlugin, {
  fastify : '^2.x.x',
  name : 'fastify-normalize-request-reply'
})