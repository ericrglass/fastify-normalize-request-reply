'use strict'

const t = require('tap')
const test = t.test
const Buffer = require('safe-buffer').Buffer
const utils = require('../express/utils');

test('utils.etag(body, encoding)', t => {
  t.plan(4)
  t.is(utils.etag('express!'), '"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"', 'should support strings')
  t.is(utils.etag('express❤', 'utf8'), '"a-JBiXf7GyzxwcrxY4hVXUwa7tmks"', 'should support utf8 strings')
  t.is(utils.etag(Buffer.from('express!')), '"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"', 'should support buffer')
  t.is(utils.etag(''), '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"', 'should support empty string')
})

test('utils.setCharset(type, charset)', t => {
  t.plan(5)
  t.is(utils.setCharset(), undefined, 'should do anything without type')
  t.is(utils.setCharset('text/html'), 'text/html', 'should return type if not given charset')
  t.is(utils.setCharset('text/html; charset=utf-8'), 'text/html; charset=utf-8', 'should keep charset if not given charset')
  t.is(utils.setCharset('text/html', 'utf-8'), 'text/html; charset=utf-8', 'should set charset')
  t.is(utils.setCharset('text/html; charset=iso-8859-1', 'utf-8'), 'text/html; charset=utf-8', 'should override charset')
});

test('utils.wetag(body, encoding)', t => {
  t.plan(4)
  t.is(utils.wetag('express!'), 'W/"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"', 'should support strings')
  t.is(utils.wetag('express❤', 'utf8'), 'W/"a-JBiXf7GyzxwcrxY4hVXUwa7tmks"', 'should support utf8 strings')
  t.is(utils.wetag(Buffer.from('express!')), 'W/"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"', 'should support buffer')
  t.is(utils.wetag(''), 'W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"', 'should support empty string')
})

test('utils.isAbsolute()', t => {
  t.plan(6)
  t.ok(utils.isAbsolute('c:\\'), 'should support windows')
  t.ok(utils.isAbsolute('c:/'), 'should support windows')
  t.ok(!utils.isAbsolute(':\\'), 'should support windows')
  t.ok(utils.isAbsolute('\\\\foo\\bar'), 'should support windows unc')
  t.ok(utils.isAbsolute('/foo/bar'), 'should support unices')
  t.ok(!utils.isAbsolute('foo/bar'), 'should support unices')
})

test('utils.compileQueryParser(val)', t => {
  t.plan(6)
  t.ok(typeof (utils.compileQueryParser(false))() === 'object', 'should return a object')
  t.is(JSON.stringify(utils.compileQueryParser(true)('foo=bar')), JSON.stringify({ 'foo': 'bar' }), 'should return object with query params')
  t.is(JSON.stringify(utils.compileQueryParser('simple')('foo=bar')), JSON.stringify({ 'foo': 'bar' }), 'should return object with query params')
  t.is(JSON.stringify(utils.compileQueryParser('extended')('foo=bar')), JSON.stringify({ 'foo': 'bar' }), 'should return object with query params')
  const parserDummy = (val) => {
    return
  }
  t.is(utils.compileQueryParser(parserDummy), parserDummy, 'should return the parser function supplied')
  try {
    utils.compileQueryParser('bad')
  } catch(err) {
    t.is(err.message, 'unknown value for query parser function: bad')
  }
})

test('utils.normalizeType(type)', t => {
  t.plan(1)
  t.is(utils.normalizeType('html').value, 'text/html', 'should normalize the type')
})

test('utils.normalizeTypes(...types)', t => {
  t.plan(4)
  t.is(utils.normalizeTypes(['html'])[0].value, 'text/html', 'should normalize the type')
  t.is(utils.normalizeTypes(['text/html'])[0].value, 'text/html', 'should normalize the type from accept params')
  t.is(utils.normalizeTypes(['text/x-dvi; q=.8'])[0].quality, .8, 'should normalize the type with quality from accept params')
  t.is(utils.normalizeTypes(['text/html; mxb=100000'])[0].params['mxb'], '100000', 'should normalize the type with params from accept params')
})

test('utils.compileETag(val)', t => {
  t.plan(4)
  const etagDummy = (val) => {
    return
  }
  t.is(utils.compileETag(etagDummy), etagDummy, 'should return the ETag function supplied')
  t.is(utils.compileETag(false), undefined, 'should return the ETag as turned off or undefined')
  t.is(utils.compileETag('strong'), utils.etag, 'should return the strong ETag function')
  try {
    utils.compileETag('bad')
  } catch(err) {
    t.is(err.message, 'unknown value for etag function: bad')
  }
})

test('utils.compileTrust(val)', t => {
  t.plan(4)
  const trustDummy = (val) => {
    return val
  }
  t.is(utils.compileTrust(trustDummy), trustDummy, 'should return the proxy trust function supplied')
  t.is(utils.compileTrust(true)(), true, 'should return proxy trust true function')
  t.is(utils.compileTrust(2)('127.0.0.0', 1), true, 'should return proxy trust hop count function')
  t.is(utils.compileTrust('127.0.0.0,127.0.0.1')('127.0.0.1'), true, 'should return proxy trust array function')
})
