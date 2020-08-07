# fastify-normalize-request-reply

[![Build Status](https://travis-ci.org/ericrglass/fastify-normalize-request-reply.svg?branch=master)](https://travis-ci.org/ericrglass/fastify-normalize-request-reply)
[![Coverage Status](https://coveralls.io/repos/github/ericrglass/fastify-normalize-request-reply/badge.svg?branch=master)](https://coveralls.io/github/ericrglass/fastify-normalize-request-reply?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/ericrglass/fastify-normalize-request-reply/badge.svg)](https://snyk.io/test/github/ericrglass/fastify-normalize-request-reply)

## NOTE

This middleware does not support Express middleware that goes beyond simple request and response interaction. If the Express middleware has a UI with a template engine view; utilizes the Express routers; or starts its own instance of Express, then it is not supported.

## Description

A plugin for [Fastify](https://www.fastify.io/) version 3.x that utilizes the [Hook onRequest with addHook](https://github.com/fastify/fastify/blob/master/docs/Hooks.md) to normalize the Fastify request and reply to the [Express](https://expressjs.com/) version 4.x request and response. This allows middleware with interaction with the request and response that was originally written for Express to be be utilized within Fastify.

## Install

```
npm install --save fastify-normalize-request-reply
```

## Usage

Add it to you project with `register` and you are done!

```javascript
// Register the plugin
fastify.register(require('fastify-normalize-request-reply'));
```

## Options

This plugin allows specifying options that are normally available to the Express request and response through [Application Settings](https://expressjs.com/en/api.html#app.set):

+ `env`: String : Environment mode. Be sure to set to `production` in a production environment. (`process.env.NODE_ENV` or `development`, if NODE_ENV environment variable is not set, by default)
+ `etag`: Varied : Set the ETag response header. For possible values, see the [etag options table](https://expressjs.com/en/api.html#etag.options.table). (`weak` by default)
+ `json escape`: Boolean : Enable escaping JSON responses from the res.json, res.jsonp, and res.send APIs. This will escape the characters <, >, and & as Unicode escape sequences in JSON. (`N/A - undefined` by default)
+ `json replacer`: Varied : The `replacer` argument used by `JSON.stringify`. (`N/A - undefined` by default)
+ `json spaces`: Varied : The `space` argument used by `JSON.stringify`. This is typically set to the number of spaces to use to indent prettified JSON. (`N/A - undefined` by default)
+ `jsonp callback name`: String : Specifies the default JSONP callback name. (`callback` by default)
+ `query parser`: Varied : Disable query parsing by setting the value to `false`, or set the query parser to use either `simple` or `extended` or a custom query string parsing `function`. (`extended` by default)
+ `subdomain offset`: Number : The number of dot-separated parts of the host to remove to access subdomain. (`2` by default)
+ `trust proxy`: Varied : Indicates the server is behind a front-facing proxy, and to use the X-Forwarded-* headers to determine the connection and the IP address of the client. To enable it, use the values described in the [trust proxy options table](https://expressjs.com/en/api.html#trust.proxy.options.table). (`false - disabled` by default)

## License

Licensed under [MIT](./LICENSE)
