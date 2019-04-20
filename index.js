'use strict'

const fp = require('fastify-plugin')
const normalizeRequest = require('./normalize-request')
const normalizeReply = require('./normalize-reply')
const createApp = require('./create-app')

function normalizeRequestReplyPlugin(fastify, options, next) {
  const app = createApp(options)

  const normalize = (req, reply) => {
    const rawParent = Object.getPrototypeOf(req.raw)
    Object.getOwnPropertyNames(rawParent).forEach((name) => {
        if (!req[name]) {
            try {
                req[name] = req.raw[name]
            } catch (e) {}
        }
    })
    Object.getOwnPropertyNames(req.raw).forEach((name) => {
        if (!req[name]) {
            try {
                req[name] = req.raw[name]
            } catch (e) {}
        }
    })
    const reqParent = Object.getPrototypeOf(req)
    Object.getOwnPropertyNames(reqParent).forEach((name) => {
        if (!req.raw[name]) {
            try {
                req.raw[name] = req[name]
            } catch (e) {}
        }
    })
    Object.getOwnPropertyNames(req).forEach((name) => {
        if (!req.raw[name]) {
            try {
                req.raw[name] = req[name]
            } catch (e) {}
        }
    })
    const resParent = Object.getPrototypeOf(reply.res)
    Object.getOwnPropertyNames(resParent).forEach((name) => {
        if (!reply[name]) {
            try {
                reply[name] = reply.res[name]
            } catch (e) {}
        }
    })
    Object.getOwnPropertyNames(reply.res).forEach((name) => {
        if (!reply[name]) {
            try {
                reply[name] = reply.res[name]
            } catch (e) {}
        }
    })
    const replyParent = Object.getPrototypeOf(reply)
    Object.getOwnPropertyNames(replyParent).forEach((name) => {
        if (!reply.res[name]) {
            try {
                reply.res[name] = reply[name]
            } catch (e) {}
        }
    })
    Object.getOwnPropertyNames(reply).forEach((name) => {
        if (!reply.res[name]) {
            try {
                reply.res[name] = reply[name]
            } catch (e) {}
        }
    })
  }

  fastify.addHook("onRequest", (req, reply, hookNext) => {
    normalizeRequest(req, reply, app)
    normalizeReply(reply, req, app)
    hookNext()
  })

  fastify.addHook('preParsing', (req, reply, hookNext) => {
    normalize(req, reply)
    hookNext()
  })

  fastify.addHook('preValidation', (req, reply, hookNext) => {
    normalize(req, reply)
    hookNext()
  })

  fastify.addHook('preHandler', (req, reply, hookNext) => {
    normalize(req, reply)
    hookNext()
  })

  next()
}

module.exports = fp(normalizeRequestReplyPlugin, {
  fastify : '^2.x.x',
  name : 'fastify-normalize-request-reply'
})