'use strict'

const compileETag = require('./express/utils').compileETag
const compileQueryParser = require('./express/utils').compileQueryParser
const compileTrust = require('./express/utils').compileTrust
const merge = require('utils-merge')

const trustProxyDefaultSymbol = '@@symbol:trust_proxy_default'

const createApp = (opts) => {
  const app = {}
  app.cache = {}
  app.engines = {}
  app.settings = {}
  app.locals = {}

  app.get = function get(setting) {
    return app.settings[setting]
  }

  app.set = function set(setting, val) {
    if (arguments.length === 1) {
      return app.get(setting)
    }

    if (setting === 'views') {
      console.log('>>>>>> WARNING <<<<<< fastify-normalize-request-reply - Does not support the Express "set(\'views\')", try to use the fastify point-of-view middleware to setup templates for: ' + val)
    }

    // set value
    app.settings[setting] = val

    // trigger matched settings
    switch (setting) {
    case 'etag':
      app.set('etag fn', compileETag(val))
      break
    case 'query parser':
      app.set('query parser fn', compileQueryParser(val))
      break
    case 'trust proxy':
      app.set('trust proxy fn', compileTrust(val))

      // trust proxy inherit back-compat
      Object.defineProperty(app.settings, trustProxyDefaultSymbol, {
        configurable : true,
        value : false
      })

      break
    }

    return app
  }

  app.enabled = function enabled(setting) {
    return Boolean(app.set(setting))
  }

  app.engine = function engine(ext, fn) {
    console.log('>>>>>> WARNING <<<<<< fastify-normalize-request-reply - Does not support the Express "engine(\'ext\', fn)", try to use the fastify point-of-view middleware to setup the engine for: ' + ext)
    return app
  }

  const env = process.env.NODE_ENV || 'development'

  // default settings
  app.set('etag', 'weak')
  app.set('env', env)
  app.set('query parser', 'extended')
  app.set('subdomain offset', 2)
  app.set('trust proxy', false)

  // add supplied settings
  Object.keys(opts).forEach(key => app.set(key, opts[key]))

  return app
}

module.exports = createApp