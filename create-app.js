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

  function tryRender(view, options, callback) {
    try {
      view.render(options, callback);
    } catch (err) {
      callback(err);
    }
  }

  app.get = function get(setting) {
    return app.settings[setting]
  }

  app.set = function set(setting, val) {
    if (arguments.length === 1) {
      return app.get(setting)
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

      // // trust proxy inherit back-compat
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
    if (typeof fn !== 'function') {
      throw new Error('callback function required')
    }

    // get file extension
    var extension = ext[0] !== '.'
      ? '.' + ext
      : ext

    // store engine
    app.engines[extension] = fn
    app.set('view engine', extension)
    app.set('view', fn)

    return app
  }

  app.render = function render(name, options, callback) {
    const cache = app.cache
    const engines = app.engines
    const renderOptions = {}
    let done = callback
    let opts = options
    let view

    // support callback function as second arg
    if (typeof options === 'function') {
      done = options
      opts = {}
    }

    // merge app.locals
    merge(renderOptions, app.locals)

    // merge options._locals
    if (opts._locals) {
      merge(renderOptions, opts._locals)
    }

    // merge options
    merge(renderOptions, opts)

    // set .cache unless explicitly provided
    if (renderOptions.cache == null) {
      renderOptions.cache = app.enabled('view cache')
    }

    // primed cache
    if (renderOptions.cache) {
      view = cache[name]
    }

    // view
    if (!view) {
      var View = app.get('view');

      view = new View(name, {
        defaultEngine: app.get('view engine'),
        root: app.get('views'),
        engines: engines
      });

// if (!view.path) {
// var dirs = Array.isArray(view.root) && view.root.length > 1
// ? 'directories "' + view.root.slice(0, -1).join('", "') + '" or "' +
// view.root[view.root.length - 1] + '"'
// : 'directory "' + view.root + '"'
// var err = new Error('Failed to lookup view "' + name + '" in views ' + dirs);
// err.view = view;
// return done(err);
// }

      // prime the cache
      if (renderOptions.cache) {
        cache[name] = view;
      }
    }

    // render
    tryRender(view, renderOptions, done)
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