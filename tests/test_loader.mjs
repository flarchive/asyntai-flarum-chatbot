/**
 * Checks the forum script on its own, with no browser and no forum.
 *
 * The file is loaded into a small fake page, so every rule can be driven
 * directly: which IDs are accepted, which addresses are accepted, and who ends
 * up with the chat.
 *
 * Run: node --test tests/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE = readFileSync(join(here, '..', 'asyntai-chatbot', 'js', 'dist', 'forum.js'), 'utf8')

/** Builds a fake page, loads the script into it, and returns the pieces. */
function loadScript({ readyState = 'complete' } = {}) {
	const appended = []
	const loadHandlers = []

	const documentStub = {
		readyState,
		head: { appendChild: (node) => appended.push(node) },
		createElement: () => {
			const attributes = {}
			return {
				setAttribute: (name, value) => {
					attributes[name] = value
				},
				getAttribute: (name) => attributes[name],
				get attributes() {
					return attributes
				},
			}
		},
	}

	const windowStub = {
		addEventListener: (name, handler) => {
			if (name === 'load') loadHandlers.push(handler)
		},
	}

	const context = {
		window: windowStub,
		document: documentStub,
		setTimeout: (fn) => fn(),
		module: {},
	}
	context.globalThis = context
	createContext(context)
	runInContext(SOURCE, context)

	return { api: windowStub.asyntaiFlarum, appended, loadHandlers, windowStub, context }
}

/** A stand-in for the Flarum app object, with the attributes we read. */
function fakeApp(attributes, user = null) {
	return {
		forum: { attribute: (name) => attributes[name] },
		session: { user },
	}
}

const VALID = 'asyntai_000000000000'
const DEFAULT_URL = 'https://widget.asyntai.com/static/js/chat-widget.js'

test('reads a bare widget ID', () => {
	const { api } = loadScript()
	assert.equal(api.readWidgetId(VALID), VALID)
	assert.equal(api.readWidgetId('   ' + VALID + '  '), VALID)
})

test('reads the ID out of a pasted dashboard snippet', () => {
	const { api } = loadScript()
	const snippet =
		'<script src="' + DEFAULT_URL + '" data-asyntai-id="' + VALID + '" async></script>'
	assert.equal(api.readWidgetId(snippet), VALID)
})

test('refuses anything that is not a widget ID', () => {
	const { api } = loadScript()
	assert.equal(api.readWidgetId(''), '')
	assert.equal(api.readWidgetId('not-an-id'), '')
	assert.equal(api.readWidgetId('other_000000000000'), '')
	assert.equal(api.readWidgetId('asyntai_12'), '')
	assert.equal(api.readWidgetId('<script data-asyntai-id="evil id"></script>'), '')
	assert.equal(api.readWidgetId(null), '')
	assert.equal(api.readWidgetId(undefined), '')
	assert.equal(api.readWidgetId(42), '')
})

test('falls back to the standard script address', () => {
	const { api } = loadScript()
	assert.equal(api.readScriptUrl(''), DEFAULT_URL)
	assert.equal(api.readScriptUrl(null), DEFAULT_URL)
	assert.equal(api.readScriptUrl('javascript:alert(1)'), DEFAULT_URL)
	assert.equal(api.readScriptUrl('  '), DEFAULT_URL)
})

test('keeps an address of your own', () => {
	const { api } = loadScript()
	assert.equal(api.readScriptUrl('https://cdn.example.com/w.js'), 'https://cdn.example.com/w.js')
})

test('a guest gets the chat', () => {
	const { api, appended, windowStub } = loadScript()
	api.start(fakeApp({ asyntaiWidgetId: VALID, asyntaiHideForMembers: false }))
	assert.equal(appended.length, 1)
	assert.equal(appended[0].getAttribute('data-asyntai-id'), VALID)
	assert.equal(appended[0].src, DEFAULT_URL)
	assert.equal(windowStub.__asyntaiRequested, true)
})

test('a member gets the chat when the guest-only switch is off', () => {
	const { api, appended } = loadScript()
	api.start(fakeApp({ asyntaiWidgetId: VALID, asyntaiHideForMembers: false }, { id: 1 }))
	assert.equal(appended.length, 1)
})

test('a member does not get the chat when the guest-only switch is on', () => {
	const { api, appended } = loadScript()
	api.start(fakeApp({ asyntaiWidgetId: VALID, asyntaiHideForMembers: true }, { id: 1 }))
	assert.equal(appended.length, 0)
})

test('a guest still gets the chat when the guest-only switch is on', () => {
	const { api, appended } = loadScript()
	api.start(fakeApp({ asyntaiWidgetId: VALID, asyntaiHideForMembers: true }))
	assert.equal(appended.length, 1)
})

test('no widget ID means no chat', () => {
	const { api, appended } = loadScript()
	api.start(fakeApp({ asyntaiWidgetId: null, asyntaiHideForMembers: false }))
	assert.equal(appended.length, 0)
})

test('a bad widget ID means no chat', () => {
	const { api, appended } = loadScript()
	api.start(fakeApp({ asyntaiWidgetId: 'rubbish', asyntaiHideForMembers: false }))
	assert.equal(appended.length, 0)
})

test('it never loads twice in one tab', () => {
	const { api, appended } = loadScript()
	const app = fakeApp({ asyntaiWidgetId: VALID, asyntaiHideForMembers: false })
	api.start(app)
	api.start(app)
	api.start(app)
	assert.equal(appended.length, 1)
})

test('it survives a missing forum', () => {
	const { api, appended } = loadScript()
	api.start(null)
	api.start({})
	assert.equal(appended.length, 0)
})

test('it waits for the page load event when the page is still loading', () => {
	const { loadHandlers, appended } = loadScript({ readyState: 'loading' })
	assert.equal(loadHandlers.length, 1, 'a load handler is registered')
	assert.equal(appended.length, 0, 'nothing is fetched before the page has loaded')
})

test('it exports what Flarum needs, or the forum will not boot', () => {
	const { context } = loadScript()
	assert.ok(context.module.exports, 'module.exports is set')
	assert.ok(Array.isArray(context.module.exports.extend))
})
