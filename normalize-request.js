/*!
 * Source modified from expressjs/express/lib/request.js
 */
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 *
 * @private
 */

var accepts = require('accepts');
// var deprecate = require('depd')('express');
var isIP = require('net').isIP;
var typeis = require('type-is');
// var http = require('http');
var fresh = require('fresh');
var parseRange = require('range-parser');
var parse = require('parseurl');
var proxyaddr = require('proxy-addr');

var qs = require('qs');

const normalizeRequest = (req, res, app) => {
  if (!req || req.fastifyNormalized) {
    return req
  }

  req.fastifyNormalized = true
  req.res = res;
  req.app = app;

  /**
   * Extracted from expressjs/express/lib/middleware/query.js
   */
  /**
   * Parses the query string from the URL; and returns them as key/value
   * properties of an Object.
   *
   * @return {Object}
   * @public
   */
  if (!req.query) {
    defineGetter(req, 'query', function query() {
      const opts = {
        allowPrototypes : true
      };
      const queryparse = qs.parse;
      const val = parse(req).query;
      return queryparse(val, opts);
    });
  }

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased, both `Referrer` and `Referer`
   * are interchangeable.
   *
   * Examples:
   *
   * req.get('Content-Type'); // => "text/plain"
   *
   * req.get('content-type'); // => "text/plain"
   *
   * req.get('Something'); // => undefined
   *
   * Aliased as `req.header()`.
   *
   * @param {String}
   *          name
   * @return {String}
   * @public
   */

  req.header = req.header || function header(name) {
    if (!name) {
      throw new TypeError('name argument is required to req.get');
    }

    if (typeof name !== 'string') {
      throw new TypeError('name must be a string to req.get');
    }

    var lc = name.toLowerCase();

    switch (lc) {
    case 'referer':
    case 'referrer':
      return req.headers.referrer ||
        req.headers.referer;
    default:
      return req.headers[lc];
    }
  };
  req.get = req.header;

  /**
   * To do: update docs.
   *
   * Check if the given `type(s)` is acceptable, returning the best match when
   * true, otherwise `undefined`, in which case you should respond with 406 "Not
   * Acceptable".
   *
   * The `type` value may be a single MIME type string such as
   * "application/json", an extension name such as "json", a comma-delimited
   * list such as "json, html, text/plain", an argument list such as `"json",
   * "html", "text/plain"`, or an array `["json", "html", "text/plain"]`. When a
   * list or array is given, the _best_ match, if any is returned.
   *
   * Examples: // Accept: text/html req.accepts('html'); // => "html" // Accept:
   * text/*, application/json req.accepts('html'); // => "html"
   * req.accepts('text/html'); // => "text/html" req.accepts('json, text'); // =>
   * "json" req.accepts('application/json'); // => "application/json" // Accept:
   * text/*, application/json req.accepts('image/png'); req.accepts('png'); // =>
   * undefined // Accept: text/*;q=.5, application/json req.accepts(['html',
   * 'json']); req.accepts('html', 'json'); req.accepts('html, json'); // =>
   * "json"
   *
   * @param {String|Array}
   *          type(s)
   * @return {String|Array|Boolean}
   * @public
   */

  req.accepts = req.accepts || function() {
    var accept = accepts(req);
    return accept.types.apply(accept, arguments);
  };

  /**
   * Check if the given `encoding`s are accepted.
   *
   * @param {String}
   *          ...encoding
   * @return {String|Array}
   * @public
   */

  req.acceptsEncodings = req.acceptsEncodings || function() {
    var accept = accepts(req);
    return accept.encodings.apply(accept, arguments);
  };

  // req.acceptsEncoding = deprecate.function(req.acceptsEncodings,
  // 'req.acceptsEncoding: Use acceptsEncodings instead');

  /**
   * Check if the given `charset`s are acceptable, otherwise you should respond
   * with 406 "Not Acceptable".
   *
   * @param {String}
   *          ...charset
   * @return {String|Array}
   * @public
   */

  req.acceptsCharsets = req.acceptsCharsets || function() {
    var accept = accepts(req);
    return accept.charsets.apply(accept, arguments);
  };

  // req.acceptsCharset = deprecate.function(req.acceptsCharsets,
  // 'req.acceptsCharset: Use acceptsCharsets instead');

  /**
   * Check if the given `lang`s are acceptable, otherwise you should respond
   * with 406 "Not Acceptable".
   *
   * @param {String}
   *          ...lang
   * @return {String|Array}
   * @public
   */

  req.acceptsLanguages = req.acceptsLanguages || function() {
    var accept = accepts(req);
    return accept.languages.apply(accept, arguments);
  };

  // req.acceptsLanguage = deprecate.function(req.acceptsLanguages,
  // 'req.acceptsLanguage: Use acceptsLanguages instead');

  /**
   * Parse Range header field, capping to the given `size`.
   *
   * Unspecified ranges such as "0-" require knowledge of your resource length.
   * In the case of a byte range this is of course the total number of bytes. If
   * the Range header field is not given `undefined` is returned, `-1` when
   * unsatisfiable, and `-2` when syntactically invalid.
   *
   * When ranges are returned, the array has a "type" property which is the type
   * of range that is required (most commonly, "bytes"). Each array element is
   * an object with a "start" and "end" property for the portion of the range.
   *
   * The "combine" option can be set to `true` and overlapping & adjacent ranges
   * will be combined into a single range.
   *
   * NOTE: remember that ranges are inclusive, so for example "Range: users=0-3"
   * should respond with 4 users when available, not 3.
   *
   * @param {number}
   *          size
   * @param {object}
   *          [options]
   * @param {boolean}
   *          [options.combine=false]
   * @return {number|array}
   * @public
   */

  req.range = req.range || function range(size, options) {
    var range = req.get('Range');
    if (!range) return;
    return parseRange(size, range, options);
  };

  /**
   * Return the value of param `name` when present or `defaultValue`. - Checks
   * route placeholders, ex: _/user/:id_ - Checks body params, ex: id=12,
   * {"id":12} - Checks query string params, ex: ?id=12
   *
   * To utilize request bodies, `req.body` should be an object. This can be done
   * by using the `bodyParser()` middleware.
   *
   * @param {String}
   *          name
   * @param {Mixed}
   *          [defaultValue]
   * @return {String}
   * @public
   */

  req.param = req.param || function param(name, defaultValue) {
    var params = req.params || {};
    var body = req.body || {};
    var query = req.query;

    // var args = arguments.length === 1 ?
    // 'name' :
    // 'name, default';
    // deprecate('req.param(' + args + '): Use req.params, req.body, or
    // req.query instead');

    if (null != params[name] && params.hasOwnProperty(name)) return params[name];
    if (null != body[name]) return body[name];
    if (null != query[name]) return query[name];

    return defaultValue;
  };

  /**
   * Check if the incoming request contains the "Content-Type" header field, and
   * it contains the give mime `type`.
   *
   * Examples: // With Content-Type: text/html; charset=utf-8 req.is('html');
   * req.is('text/html'); req.is('text/*'); // => true // When Content-Type is
   * application/json req.is('json'); req.is('application/json');
   * req.is('application/*'); // => true
   *
   * req.is('html'); // => false
   *
   * @param {String|Array}
   *          types...
   * @return {String|false|null}
   * @public
   */

  req.is = req.is || function is(types) {
    var arr = types;

    // support flattened arguments
    if (!Array.isArray(types)) {
      arr = new Array(arguments.length);
      for (var i = 0; i < arr.length; i++) {
        arr[i] = arguments[i];
      }
    }

    return typeis(req, arr);
  };

  /**
   * Return the protocol string "http" or "https" when requested with TLS. When
   * the "trust proxy" setting trusts the socket address, the
   * "X-Forwarded-Proto" header field will be trusted and used if present.
   *
   * If you're running behind a reverse proxy that supplies https for you this
   * may be enabled.
   *
   * @return {String}
   * @public
   */

  if (!req.protocol) {
    defineGetter(req, 'protocol', function protocol() {
      var proto = req.connection.encrypted ?
        'https' :
        'http';
      var trust = req.app.get('trust proxy fn');

      if (!trust(req.connection.remoteAddress, 0)) {
        return proto;
      }

      // Note: X-Forwarded-Proto is normally only ever a
      // single value, but this is to be safe.
      var header = req.get('X-Forwarded-Proto') || proto
      var index = header.indexOf(',')

      return index !== -1 ?
        header.substring(0, index).trim() :
        header.trim()
    });
  }

  /**
   * Short-hand for:
   *
   * req.protocol === 'https'
   *
   * @return {Boolean}
   * @public
   */

  if (!req.secure) {
    defineGetter(req, 'secure', function secure() {
      return req.protocol === 'https';
    });
  }

  /**
   * Return the remote address from the trusted proxy.
   *
   * The is the remote address on the socket unless "trust proxy" is set.
   *
   * @return {String}
   * @public
   */

  defineGetter(req, 'remoteip', function remoteip() {
    var trust = req.app.get('trust proxy fn');
    return proxyaddr(req, trust);
  });

  /**
   * When "trust proxy" is set, trusted proxy addresses + client.
   *
   * For example if the value were "client, proxy1, proxy2" you would receive
   * the array `["client", "proxy1", "proxy2"]` where "proxy2" is the furthest
   * down-stream and "proxy1" and "proxy2" were trusted.
   *
   * @return {Array}
   * @public
   */

  if (!req.ips) {
    defineGetter(req, 'ips', function ips() {
      var trust = req.app.get('trust proxy fn');
      var addrs = proxyaddr.all(req, trust);

      // reverse the order (to farthest -> closest)
      // and remove socket address
      addrs.reverse().pop()

      return addrs
    });
  }

  /**
   * Return subdomains as an array.
   *
   * Subdomains are the dot-separated parts of the host before the main domain
   * of the app. By default, the domain of the app is assumed to be the last two
   * parts of the host. This can be changed by setting "subdomain offset".
   *
   * For example, if the domain is "tobi.ferrets.example.com": If "subdomain
   * offset" is not set, req.subdomains is `["ferrets", "tobi"]`. If "subdomain
   * offset" is 3, req.subdomains is `["tobi"]`.
   *
   * @return {Array}
   * @public
   */

  if (!req.subdomains) {
    defineGetter(req, 'subdomains', function subdomains() {
      var hostname = req.trusthostname;

      if (!hostname) return [];

      var offset = req.app.get('subdomain offset');
      var subdomains = !isIP(hostname) ?
        hostname.split('.').reverse() : [ hostname ];

      return subdomains.slice(offset);
    });
  }

  /**
   * Short-hand for `url.parse(req.url).pathname`.
   *
   * @return {String}
   * @public
   */

  if (!req.path) {
    defineGetter(req, 'path', function path() {
      return parse(req).pathname;
    });
  }

  /**
   * Parse the "Host" header field to a hostname.
   *
   * When the "trust proxy" setting trusts the socket address, the
   * "X-Forwarded-Host" header field will be trusted.
   *
   * @return {String}
   * @public
   */

  defineGetter(req, 'trusthostname', function trusthostname() {
    var trust = req.app.get('trust proxy fn');
    var host = req.get('X-Forwarded-Host');

    if (!host || !trust(req.connection.remoteAddress, 0)) {
      host = req.get('Host');
    } else if (host.indexOf(',') !== -1) {
      // Note: X-Forwarded-Host is normally only ever a
      // single value, but this is to be safe.
      host = host.substring(0, host.indexOf(',')).trimRight()
    }

    if (!host) return;

    // IPv6 literal support
    var offset = host[0] === '[' ?
      host.indexOf(']') + 1 :
      0;
    var index = host.indexOf(':', offset);

    return index !== -1 ?
      host.substring(0, index) :
      host;
  });

  // TODO: change req.host to return host in next major

  // defineGetter(req, 'host', deprecate.function(function host() {
  // return req.hostname;
  // }, 'req.host: Use req.hostname instead'));

  /**
   * Check if the request is fresh, aka Last-Modified and/or the ETag still
   * match.
   *
   * @return {Boolean}
   * @public
   */

  if (!req.fresh) {
    defineGetter(req, 'fresh', function() {
      var method = req.method;
      // var res = req.res
      var status = res.statusCode

      // GET or HEAD for weak freshness validation only
      if ('GET' !== method && 'HEAD' !== method) return false;

      // 2xx or 304 as per rfc2616 14.26
      if ((status >= 200 && status < 300) || 304 === status) {
        return fresh(req.headers, {
          'etag' : res.get('ETag'),
          'last-modified' : res.get('Last-Modified')
        })
      }

      return false;
    });
  }

  /**
   * Check if the request is stale, aka "Last-Modified" and / or the "ETag" for
   * the resource has changed.
   *
   * @return {Boolean}
   * @public
   */

  if (!req.stale) {
    defineGetter(req, 'stale', function stale() {
      return !req.fresh;
    });
  }

  /**
   * Check if the request was an _XMLHttpRequest_.
   *
   * @return {Boolean}
   * @public
   */

  if (!req.xhr) {
    defineGetter(req, 'xhr', function xhr() {
      var val = req.get('X-Requested-With') || '';
      return val.toLowerCase() === 'xmlhttprequest';
    });
  }

  /**
   * Helper function for creating a getter on an object.
   *
   * @param {Object}
   *          obj
   * @param {String}
   *          name
   * @param {Function}
   *          getter
   * @private
   */
  function defineGetter(obj, name, getter) {
    Object.defineProperty(obj, name, {
      configurable : true,
      enumerable : true,
      get : getter
    });
  }

  return req
}

module.exports = normalizeRequest