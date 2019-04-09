/*!
 * Source modified from expressjs/express/lib/response.js
 */
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 *
 * @private
 */

var Buffer = require('safe-buffer').Buffer
var contentDisposition = require('content-disposition');
// var deprecate = require('depd')('express');
var encodeUrl = require('encodeurl');
var escapeHtml = require('escape-html');
// var http = require('http');
var isAbsolute = require('./express/utils').isAbsolute;
var onFinished = require('on-finished');
var path = require('path');
var statuses = require('statuses')
var merge = require('utils-merge');
var sign = require('cookie-signature').sign;
var normalizeType = require('./express/utils').normalizeType;
var normalizeTypes = require('./express/utils').normalizeTypes;
var setCharset = require('./express/utils').setCharset;
var cookie = require('cookie');
var send = require('send');
var extname = path.extname;
var mime = send.mime;
var resolve = path.resolve;
var vary = require('vary');

const normalizeReply = (res, req, app) => {
  if (!res || res.fastifyNormalized) {
    return res
  }

  res.fastifyNormalized = true
  res.req = req;
  res.app = app;

  var charsetRegExp = /;\s*charset\s*=/;

  /**
   * Set status `code`.
   *
   * @param {Number}
   *          code
   * @return {ServerResponse}
   * @public
   */

  res.status = res.status || function status(code) {
    if (code === undefined || code === null) {
      throw new TypeError('code argument is required to res.status')
    }

    res.statusCode = code;
    return res;
  };

  /**
   * Set Link header field with the given `links`.
   *
   * Examples:
   *
   * res.links({ next: 'http://api.example.com/users?page=2', last:
   * 'http://api.example.com/users?page=5' });
   *
   * @param {Object}
   *          links
   * @return {ServerResponse}
   * @public
   */

  res.links = res.links || function(links) {
    var link = res.get('Link') || '';
    if (link)
      link += ', ';
    return res.set('Link', link + Object.keys(links).map(function(rel) {
        return '<' + links[rel] + '>; rel="' + rel + '"';
      }).join(', '));
  };

  /**
   * Send a response.
   *
   * Examples:
   *
   * res.send(Buffer.from('wahoo')); res.send({ some: 'json' }); res.send('
   * <p>
   * some html
   * </p>
   * ');
   *
   * @param {string|number|boolean|object|Buffer}
   *          body
   * @public
   */

  res.send = res.send || function send(body) {
    var chunk = body;
    var encoding;
    // var req = res.req;
    var type;

    // settings
    // var app = res.app;

    // allow status / body
    if (arguments.length === 2) {
      // res.send(body, status) backwards compat
      if (typeof arguments[0] !== 'number' && typeof arguments[1] === 'number') {
        // deprecate('res.send(body, status): Use res.status(status).send(body)
        // instead');
        res.statusCode = arguments[1];
      } else {
        // deprecate('res.send(status, body): Use res.status(status).send(body)
        // instead');
        res.statusCode = arguments[0];
        chunk = arguments[1];
      }
    }

    // disambiguate res.send(status) and res.send(status, num)
    if (typeof chunk === 'number' && arguments.length === 1) {
      // res.send(status) will set status message as text string
      if (!res.get('Content-Type')) {
        res.type('txt');
      }

      // deprecate('res.send(status): Use res.sendStatus(status) instead');
      res.statusCode = chunk;
      chunk = statuses[chunk]
    }

    switch (typeof chunk) {
    // string defaulting to html
    case 'string':
      if (!res.get('Content-Type')) {
        res.type('html');
      }
      break;
    case 'boolean':
    case 'number':
    case 'object':
      if (chunk === null) {
        chunk = '';
      } else if (Buffer.isBuffer(chunk)) {
        if (!res.get('Content-Type')) {
          res.type('bin');
        }
      } else {
        return res.json(chunk);
      }
      break;
    }

    // write strings in utf-8
    if (typeof chunk === 'string') {
      encoding = 'utf8';
      type = res.get('Content-Type');

      // reflect this in content-type
      if (typeof type === 'string') {
        res.set('Content-Type', setCharset(type, 'utf-8'));
      }
    }

    // determine if ETag should be generated
    var etagFn = app.get('etag fn')
    var generateETag = !res.get('ETag') && typeof etagFn === 'function'

    // populate Content-Length
    var len
    if (chunk !== undefined) {
      if (Buffer.isBuffer(chunk)) {
        // get length of Buffer
        len = chunk.length
      } else if (!generateETag && chunk.length < 1000) {
        // just calculate length when no ETag + small chunk
        len = Buffer.byteLength(chunk, encoding)
      } else {
        // convert chunk to Buffer and calculate
        chunk = Buffer.from(chunk, encoding)
        encoding = undefined;
        len = chunk.length
      }

      res.set('Content-Length', len);
    }

    // populate ETag
    var etag;
    if (generateETag && len !== undefined) {
      if ( (etag = etagFn(chunk, encoding)) ) {
        res.set('ETag', etag);
      }
    }

    // freshness
    if (req.fresh)
      res.statusCode = 304;

    // strip irrelevant headers
    if (204 === res.statusCode || 304 === res.statusCode) {
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      res.removeHeader('Transfer-Encoding');
      chunk = '';
    }

    if (req.method === 'HEAD') {
      // skip body for HEAD
      res.end();
    } else {
      // respond
      res.end(chunk, encoding);
    }

    return res;
  };

  /**
   * Send JSON response.
   *
   * Examples:
   *
   * res.json(null); res.json({ user: 'tj' });
   *
   * @param {string|number|boolean|object}
   *          obj
   * @public
   */

  res.json = res.json || function json(obj) {
    var val = obj;

    // allow status / body
    if (arguments.length === 2) {
      // res.json(body, status) backwards compat
      if (typeof arguments[1] === 'number') {
        // deprecate('res.json(obj, status): Use res.status(status).json(obj)
        // instead');
        res.statusCode = arguments[1];
      } else {
        // deprecate('res.json(status, obj): Use res.status(status).json(obj)
        // instead');
        res.statusCode = arguments[0];
        val = arguments[1];
      }
    }

    // settings
    // var app = res.app;
    var escape = app.get('json escape')
    var replacer = app.get('json replacer');
    var spaces = app.get('json spaces');
    var body = stringify(val, replacer, spaces, escape)

    // content-type
    if (!res.get('Content-Type')) {
      res.set('Content-Type', 'application/json');
    }

    return res.send(body);
  };

  /**
   * Send JSON response with JSONP callback support.
   *
   * Examples:
   *
   * res.jsonp(null); res.jsonp({ user: 'tj' });
   *
   * @param {string|number|boolean|object}
   *          obj
   * @public
   */

  res.jsonp = res.jsonp || function jsonp(obj) {
    var val = obj;

    // allow status / body
    if (arguments.length === 2) {
      // res.json(body, status) backwards compat
      if (typeof arguments[1] === 'number') {
        // deprecate('res.jsonp(obj, status): Use res.status(status).json(obj)
        // instead');
        res.statusCode = arguments[1];
      } else {
        // deprecate('res.jsonp(status, obj): Use res.status(status).jsonp(obj)
        // instead');
        res.statusCode = arguments[0];
        val = arguments[1];
      }
    }

    // settings
    // var app = res.app;
    var escape = app.get('json escape')
    var replacer = app.get('json replacer');
    var spaces = app.get('json spaces');
    var body = stringify(val, replacer, spaces, escape)
    var callback = res.req.query[app.get('jsonp callback name')];

    // content-type
    if (!res.get('Content-Type')) {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Type', 'application/json');
    }

    // fixup callback
    if (Array.isArray(callback)) {
      callback = callback[0];
    }

    // jsonp
    if (typeof callback === 'string' && callback.length !== 0) {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Type', 'text/javascript');

      // restrict callback charset
      callback = callback.replace(/[^\[\]\w$.]/g, '');

      // replace chars not allowed in JavaScript that are in JSON
      body = body
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

      // the /**/ is a specific security mitigation for "Rosetta Flash JSONP
      // abuse"
      // the typeof check is just to reduce client error noise
      body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
    }

    return res.send(body);
  };

  /**
   * Send given HTTP status code.
   *
   * Sets the response status to `statusCode` and the body of the response to
   * the standard description from node's http.STATUS_CODES or the statusCode
   * number if no description.
   *
   * Examples:
   *
   * res.sendStatus(200);
   *
   * @param {number}
   *          statusCode
   * @public
   */

  res.sendStatus = res.sendStatus || function sendStatus(statusCode) {
    var body = statuses[statusCode] || String(statusCode)

    res.statusCode = statusCode;
    res.type('txt');

    return res.send(body);
  };

  /**
   * Transfer the file at the given `path`.
   *
   * Automatically sets the _Content-Type_ response header field. The callback
   * `callback(err)` is invoked when the transfer is complete or when an error
   * occurs. Be sure to check `res.sentHeader` if you wish to attempt
   * responding, as the header and some data may have already been transferred.
   *
   * Options: - `maxAge` defaulting to 0 (can be string converted by `ms`) -
   * `root` root directory for relative filenames - `headers` object of headers
   * to serve with file - `dotfiles` serve dotfiles, defaulting to false; can be
   * `"allow"` to send them
   *
   * Other options are passed along to `send`.
   *
   * Examples:
   *
   * The following example illustrates how `res.sendFile()` may be used as an
   * alternative for the `static()` middleware for dynamic situations. The code
   * backing `res.sendFile()` is actually the same code, so HTTP cache support
   * etc is identical.
   *
   * app.get('/user/:uid/photos/:file', function(req, res){ var uid =
   * req.params.uid , file = req.params.file;
   *
   * req.user.mayViewFilesFrom(uid, function(yes){ if (yes) {
   * res.sendFile('/uploads/' + uid + '/' + file); } else { res.send(403,
   * 'Sorry! you cant see that.'); } }); });
   *
   * @public
   */

  res.sendFile = res.sendFile || function sendFile(path, options, callback) {
    var done = callback;
    // var req = res.req;
    // var res = res;
    var next = req.next;
    var opts = options || {};

    if (!path) {
      throw new TypeError('path argument is required to res.sendFile');
    }

    if (typeof path !== 'string') {
      throw new TypeError('path must be a string to res.sendFile')
    }

    // support function as second arg
    if (typeof options === 'function') {
      done = options;
      opts = {};
    }

    if (!opts.root && !isAbsolute(path)) {
      throw new TypeError('path must be absolute or specify root to res.sendFile');
    }

    // create file stream
    var pathname = encodeURI(path);
    var file = send(req, pathname, opts);

    // transfer
    sendfile(res, file, opts, function(err) {
      if (done) return done(err);
      if (err && err.code === 'EISDIR') return next();

      // next() all but write errors
      if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
        next(err);
      }
    });
  };

  /**
   * Transfer the file at the given `path`.
   *
   * Automatically sets the _Content-Type_ response header field. The callback
   * `callback(err)` is invoked when the transfer is complete or when an error
   * occurs. Be sure to check `res.sentHeader` if you wish to attempt
   * responding, as the header and some data may have already been transferred.
   *
   * Options: - `maxAge` defaulting to 0 (can be string converted by `ms`) -
   * `root` root directory for relative filenames - `headers` object of headers
   * to serve with file - `dotfiles` serve dotfiles, defaulting to false; can be
   * `"allow"` to send them
   *
   * Other options are passed along to `send`.
   *
   * Examples:
   *
   * The following example illustrates how `res.sendfile()` may be used as an
   * alternative for the `static()` middleware for dynamic situations. The code
   * backing `res.sendfile()` is actually the same code, so HTTP cache support
   * etc is identical.
   *
   * app.get('/user/:uid/photos/:file', function(req, res){ var uid =
   * req.params.uid , file = req.params.file;
   *
   * req.user.mayViewFilesFrom(uid, function(yes){ if (yes) {
   * res.sendfile('/uploads/' + uid + '/' + file); } else { res.send(403,
   * 'Sorry! you cant see that.'); } }); });
   *
   * @public
   */

  res.sendfile = res.sendfile || function(path, options, callback) {
    var done = callback;
    // var req = res.req;
    // var res = res;
    var next = req.next;
    var opts = options || {};

    // support function as second arg
    if (typeof options === 'function') {
      done = options;
      opts = {};
    }

    // create file stream
    var file = send(req, path, opts);

    // transfer
    sendfile(res, file, opts, function(err) {
      if (done) return done(err);
      if (err && err.code === 'EISDIR') return next();

      // next() all but write errors
      if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
        next(err);
      }
    });
  };

  // res.sendfile = deprecate.function(res.sendfile,
  // 'res.sendfile: Use res.sendFile instead');

  /**
   * Transfer the file at the given `path` as an attachment.
   *
   * Optionally providing an alternate attachment `filename`, and optional
   * callback `callback(err)`. The callback is invoked when the data transfer is
   * complete, or when an error has ocurred. Be sure to check `res.headersSent`
   * if you plan to respond.
   *
   * Optionally providing an `options` object to use with `res.sendFile()`. This
   * function will set the `Content-Disposition` header, overriding any
   * `Content-Disposition` header passed as header options in order to set the
   * attachment and filename.
   *
   * This method uses `res.sendFile()`.
   *
   * @public
   */

  res.download = res.download || function download(path, filename, options, callback) {
    var done = callback;
    var name = filename;
    var opts = options || null

    // support function as second or third arg
    if (typeof filename === 'function') {
      done = filename;
      name = null;
      opts = null
    } else if (typeof options === 'function') {
      done = options
      opts = null
    }

    // set Content-Disposition when file is sent
    var headers = {
      'Content-Disposition' : contentDisposition(name || path)
    };

    // merge user-provided headers
    if (opts && opts.headers) {
      var keys = Object.keys(opts.headers)
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        if (key.toLowerCase() !== 'content-disposition') {
          headers[key] = opts.headers[key]
        }
      }
    }

    // merge user-provided options
    opts = Object.create(opts)
    opts.headers = headers

    // Resolve the full path for sendFile
    var fullPath = resolve(path);

    // send file
    return res.sendFile(fullPath, opts, done)
  };

  /**
   * Set _Content-Type_ response header with `type` through `mime.lookup()` when
   * it does not contain "/", or set the Content-Type to `type` otherwise.
   *
   * Examples:
   *
   * res.type('.html'); res.type('html'); res.type('json');
   * res.type('application/json'); res.type('png');
   *
   * @param {String}
   *          type
   * @return {ServerResponse} for chaining
   * @public
   */

  res.type = res.type || function contentType(type) {
    var ct = type.indexOf('/') === -1 ?
      mime.lookup(type) :
      type;

    return res.set('Content-Type', ct);
  };
  res.contentType = res.type;

  /**
   * Respond to the Acceptable formats using an `obj` of mime-type callbacks.
   *
   * This method uses `req.accepted`, an array of acceptable types ordered by
   * their quality values. When "Accept" is not present the _first_ callback is
   * invoked, otherwise the first match is used. When no match is performed the
   * server responds with 406 "Not Acceptable".
   *
   * Content-Type is set for you, however if you choose you may alter this
   * within the callback using `res.type()` or `res.set('Content-Type', ...)`.
   *
   * res.format({ 'text/plain': function(){ res.send('hey'); },
   *
   * 'text/html': function(){ res.send('
   * <p>
   * hey
   * </p>
   * '); },
   *
   * 'appliation/json': function(){ res.send({ message: 'hey' }); } });
   *
   * In addition to canonicalized MIME types you may also use extnames mapped to
   * these types:
   *
   * res.format({ text: function(){ res.send('hey'); },
   *
   * html: function(){ res.send('
   * <p>
   * hey
   * </p>
   * '); },
   *
   * json: function(){ res.send({ message: 'hey' }); } });
   *
   * By default Express passes an `Error` with a `.status` of 406 to `next(err)`
   * if a match is not made. If you provide a `.default` callback it will be
   * invoked instead.
   *
   * @param {Object}
   *          obj
   * @return {ServerResponse} for chaining
   * @public
   */

  res.format = res.format || function(obj) {
    // var req = res.req;
    var next = req.next;

    var fn = obj.default;
    if (fn)
      delete obj.default;
    var keys = Object.keys(obj);

    var key = keys.length > 0 ?
      req.accepts(keys) :
      false;

    res.vary("Accept");

    if (key) {
      res.set('Content-Type', normalizeType(key).value);
      obj[key](req, res, next);
    } else if (fn) {
      fn();
    } else {
      var err = new Error('Not Acceptable');
      err.status = err.statusCode = 406;
      err.types = normalizeTypes(keys).map(function(o) {
        return o.value
      });
      next(err);
    }

    return res;
  };

  /**
   * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
   *
   * @param {String}
   *          filename
   * @return {ServerResponse}
   * @public
   */

  res.attachment = res.attachment || function attachment(filename) {
    if (filename) {
      res.type(extname(filename));
    }

    res.set('Content-Disposition', contentDisposition(filename));

    return res;
  };

  /**
   * Append additional header `field` with value `val`.
   *
   * Example:
   *
   * res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
   * res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
   * res.append('Warning', '199 Miscellaneous warning');
   *
   * @param {String}
   *          field
   * @param {String|Array}
   *          val
   * @return {ServerResponse} for chaining
   * @public
   */

  res.append = res.append || function append(field, val) {
    var prev = res.get(field);
    var value = val;

    if (prev) {
      // concat the new and prev vals
      value = Array.isArray(prev) ? prev.concat(val) :
        Array.isArray(val) ? [ prev ].concat(val) : [ prev, val ];
    }

    return res.set(field, value);
  };

  /**
   * Set header `field` to `val`, or pass an object of header fields.
   *
   * Examples:
   *
   * res.set('Foo', ['bar', 'baz']); res.set('Accept', 'application/json');
   * res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * Aliased as `res.header()`.
   *
   * @param {String|Object}
   *          field
   * @param {String|Array}
   *          val
   * @return {ServerResponse} for chaining
   * @public
   */

  res.header = res.header || function header(field, val) {
    if (arguments.length === 2) {
      var value = Array.isArray(val) ?
        val.map(String) :
        String(val);

      // add charset to content-type
      if (field.toLowerCase() === 'content-type') {
        if (Array.isArray(value)) {
          throw new TypeError('Content-Type cannot be set to an Array');
        }
        if (!charsetRegExp.test(value)) {
          var charset = mime.charsets.lookup(value.split(';')[0]);
          if (charset)
            value += '; charset=' + charset.toLowerCase();
        }
      }

      res.setHeader(field, value);
    } else {
      for (var key in field) {
        res.set(key, field[key]);
      }
    }
    return res;
  };
  res.set = res.header;

  /**
   * Get value for header `field`.
   *
   * @param {String}
   *          field
   * @return {String}
   * @public
   */

  res.get = res.get || function(field) {
    return res.getHeader(field);
  };

  /**
   * Clear cookie `name`.
   *
   * @param {String}
   *          name
   * @param {Object}
   *          [options]
   * @return {ServerResponse} for chaining
   * @public
   */

  res.clearCookie = res.clearCookie || function clearCookie(name, options) {
    var opts = merge({
      expires : new Date(1),
      path : '/'
    }, options);

    return res.cookie(name, '', opts);
  };

  /**
   * Set cookie `name` to `value`, with the given `options`.
   *
   * Options: - `maxAge` max-age in milliseconds, converted to `expires` -
   * `signed` sign the cookie - `path` defaults to "/"
   *
   * Examples: // "Remember Me" for 15 minutes res.cookie('rememberme', '1', {
   * expires: new Date(Date.now() + 900000), httpOnly: true }); // save as above
   * res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
   *
   * @param {String}
   *          name
   * @param {String|Object}
   *          value
   * @param {Object}
   *          [options]
   * @return {ServerResponse} for chaining
   * @public
   */

  res.cookie = res.cookie || function(name, value, options) {
    var opts = merge({}, options);
    var secret = res.req.secret;
    var signed = opts.signed;

    if (signed && !secret) {
      throw new Error('cookieParser("secret") required for signed cookies');
    }

    var val = typeof value === 'object' ?
      'j:' + JSON.stringify(value) :
      String(value);

    if (signed) {
      val = 's:' + sign(val, secret);
    }

    if ('maxAge' in opts) {
      opts.expires = new Date(Date.now() + opts.maxAge);
      opts.maxAge /= 1000;
    }

    if (opts.path == null) {
      opts.path = '/';
    }

    res.append('Set-Cookie', cookie.serialize(name, String(val), opts));

    return res;
  };

  /**
   * Set the location header to `url`.
   *
   * The given `url` can also be "back", which redirects to the _Referrer_ or
   * _Referer_ headers or "/".
   *
   * Examples:
   *
   * res.location('/foo/bar').; res.location('http://example.com');
   * res.location('../login');
   *
   * @param {String}
   *          url
   * @return {ServerResponse} for chaining
   * @public
   */

  res.location = res.location || function location(url) {
    var loc = url;

    // "back" is an alias for the referrer
    if (url === 'back') {
      loc = res.req.get('Referrer') || '/';
    }

    // set location
    return res.set('Location', encodeUrl(loc));
  };

  /**
   * Redirect to the given `url` with optional response `status` defaulting to
   * 302.
   *
   * The resulting `url` is determined by `res.location()`, so it will play
   * nicely with mounted apps, relative paths, `"back"` etc.
   *
   * Examples:
   *
   * res.redirect('/foo/bar'); res.redirect('http://example.com');
   * res.redirect(301, 'http://example.com'); res.redirect('../login'); //
   * /blog/post/1 -> /blog/login
   *
   * @public
   */

  res.redirect = res.redirect || function redirect(url) {
    var address = url;
    var body;
    var status = 302;

    // allow status / url
    if (arguments.length === 2) {
      if (typeof arguments[0] === 'number') {
        status = arguments[0];
        address = arguments[1];
      } else {
        // deprecate('res.redirect(url, status): Use res.redirect(status, url)
        // instead');
        status = arguments[1];
      }
    }

    // Set location header
    address = res.location(address).get('Location');

    // Support text/{plain,html} by default
    res.format({
      text : function() {
        body = statuses[status] + '. Redirecting to ' + address
      },

      html : function() {
        var u = escapeHtml(address);
        body = '<p>' + statuses[status] + '. Redirecting to <a href="' + u + '">' + u + '</a></p>'
      },

      default : function() {
        body = '';
      }
    });

    // Respond
    res.statusCode = status;
    res.set('Content-Length', Buffer.byteLength(body));

    if (res.req.method === 'HEAD') {
      res.end();
    } else {
      res.end(body);
    }
  };

  /**
   * Add `field` to Vary. If already present in the Vary set, then this call is
   * simply ignored.
   *
   * @param {Array|String}
   *          field
   * @return {ServerResponse} for chaining
   * @public
   */

  res.vary = res.vary || function(field) {
    // checks for back-compat
    if (!field || (Array.isArray(field) && !field.length)) {
      // deprecate('res.vary(): Provide a field name');
      return res;
    }

    vary(res, field);

    return res;
  };

  /**
   * Render `view` with the given `options` and optional callback `fn`. When a
   * callback function is given a response will _not_ be made automatically,
   * otherwise a response of _200_ and _text/html_ is given.
   *
   * Options: - `cache` boolean hinting to the engine it should cache -
   * `filename` filename of the view being rendered
   *
   * @public
   */

  res.render = res.render || function render(view, options, callback) {
    // var app = res.req.app;
    var done = callback;
    var opts = options || {};
    // var req = res.req;
    var self = res;

    // support callback function as second arg
    if (typeof options === 'function') {
      done = options;
      opts = {};
    }

    // merge res.locals
    opts._locals = self.locals;

    // default callback to respond
    done = done || function(err, str) {
      if (err) return req.next(err);
      self.send(str);
    };

    // render
    app.render(view, opts, done);
  };

  // pipe the send file stream
  function sendfile(res, file, options, callback) {
    var done = false;
    var streaming;

    // request aborted
    function onaborted() {
      if (done) return;
      done = true;

      var err = new Error('Request aborted');
      err.code = 'ECONNABORTED';
      callback(err);
    }

    if (options && (options.simulateOnaborted || options.simulateOnabortedTwice)) {
      onaborted()
    }

    if (options && options.simulateOnabortedTwice) {
      onaborted()
    }

    // directory
    function ondirectory() {
      if (done) return;
      done = true;

      var err = new Error('EISDIR, read');
      err.code = 'EISDIR';
      callback(err);
    }

    if (options && (options.simulateOndirectory || options.simulateOndirectoryTwice)) {
      ondirectory()
    }

    if (options && options.simulateOndirectoryTwice) {
      ondirectory()
    }

    // errors
    function onerror(err) {
      if (done) return;
      done = true;
      callback(err);
    }

    // ended
    function onend() {
      if (done) return;
      done = true;
      callback();
    }

    if (options && (options.simulateOnend || options.simulateOnendTwice)) {
      onend()
    }

    if (options && options.simulateOnendTwice) {
      onend()
    }

    // file
    function onfile() {
      streaming = false;
    }

    // finished
    function onfinish(err) {
      if (err && err.code === 'ECONNRESET') return onaborted();
      if (err) return onerror(err);
      if (done) return;

      setImmediate(function() {
        if (streaming !== false && !done) {
          onaborted();
          return;
        }

        if (done) return;
        done = true;
        callback();
      });
    }

    if (options && options.simulateOnfinishDone) {
      done = false
      onfile()
      onfinish()
    }

    if (options && options.simulateOnfinishErr && options.simulateOnfinishErr.code) {
      onfinish(options.simulateOnfinishErr)
    }

    // streaming
    function onstream() {
      streaming = true;
    }

    if (options && (options.simulateOnstream || options.simulateOnstreamTwice)) {
      onstream()
      onfinish()
    }

    if (options && options.simulateOnstreamTwice) {
      onstream()
      onfinish()
    }

    file.on('directory', ondirectory);
    file.on('end', onend);
    file.on('error', onerror);
    file.on('file', onfile);
    file.on('stream', onstream);
    onFinished(res, onfinish);

    if (options.headers) {
      // set headers on successful transfer
      file.on('headers', function headers(res) {
        var obj = options.headers;
        var keys = Object.keys(obj);

        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          res.setHeader(k, obj[k]);
        }
      });
    }

    // pipe
    file.pipe(res);
  }

  /**
   * Stringify JSON, like JSON.stringify, but v8 optimized, with the ability to
   * escape characters that can trigger HTML sniffing.
   *
   * @param {*}
   *          value
   * @param {function}
   *          replaces
   * @param {number}
   *          spaces
   * @param {boolean}
   *          escape
   * @returns {string}
   * @private
   */

  function stringify(value, replacer, spaces, escape) {
    // v8 checks arguments.length for optimizing simple call
    // https://bugs.chromium.org/p/v8/issues/detail?id=4730
    var json = replacer || spaces ?
      JSON.stringify(value, replacer, spaces) :
      JSON.stringify(value);

    if (escape) {
      json = json.replace(/[<>&]/g, function(c) {
        switch (c.charCodeAt(0)) {
        case 0x3c:
          return '\\u003c'
        case 0x3e:
          return '\\u003e'
        case 0x26:
          return '\\u0026'
// default:
// return c
        }
      })
    }

    return json
  }

  return res
}

module.exports = normalizeReply