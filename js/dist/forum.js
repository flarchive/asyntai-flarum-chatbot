/**
 * Asyntai AI Chatbot for Flarum, forum frontend.
 *
 * Loads the chat widget once per tab, after the page has finished loading, so
 * the forum is drawn first and page speed does not change.
 *
 * This file is plain JavaScript on purpose. Flarum serves it as it is, so the
 * extension needs no build step and anybody can read what ships. Flarum wraps
 * this file with "var module = {}" before it and reads module.exports after
 * it, which is why the export at the bottom is required: without it the forum
 * fails to boot.
 */
(function () {
	'use strict';

	var DEFAULT_SCRIPT_URL = 'https://widget.asyntai.com/static/js/chat-widget.js';
	var ID_PATTERN = /^asyntai_[A-Za-z0-9]{6,64}$/;

	/**
	 * Accepts either a bare widget ID or the whole snippet from the Asyntai
	 * dashboard. Returns an empty string when there is no usable ID.
	 */
	function readWidgetId(raw) {
		if (typeof raw !== 'string') {
			return '';
		}

		var value = raw.trim();
		var attribute = value.match(/data-asyntai-id\s*=\s*["']([^"']+)["']/);

		if (attribute) {
			value = attribute[1].trim();
		}

		return ID_PATTERN.test(value) ? value : '';
	}

	function readScriptUrl(raw) {
		if (typeof raw !== 'string') {
			return DEFAULT_SCRIPT_URL;
		}

		var value = raw.trim();

		return /^https?:\/\//i.test(value) ? value : DEFAULT_SCRIPT_URL;
	}

	function load(widgetId, scriptUrl) {
		var script = document.createElement('script');
		script.src = scriptUrl;
		script.async = true;
		script.setAttribute('data-asyntai-id', widgetId);
		document.head.appendChild(script);
	}

	/** Decides whether this visitor should get the chat, and loads it. */
	function start(app) {
		if (window.__asyntaiRequested || !app || !app.forum) {
			return;
		}

		var widgetId = readWidgetId(app.forum.attribute('asyntaiWidgetId'));

		if (!widgetId) {
			return;
		}

		// The administrator can keep the chat for guests only.
		if (app.forum.attribute('asyntaiHideForMembers') && app.session && app.session.user) {
			return;
		}

		window.__asyntaiRequested = true;
		load(widgetId, readScriptUrl(app.forum.attribute('asyntaiScriptUrl')));
	}

	/**
	 * Runs after the page has finished loading.
	 *
	 * An initializer would be too early: Flarum runs initializers at the start
	 * of boot, before it fills the store, so app.forum does not exist yet. The
	 * page load event is well after that, and it is also when we want to fetch
	 * the widget anyway.
	 */
	function run() {
		start(typeof flarum !== 'undefined' && flarum.core ? flarum.core.app : null);
	}

	// Exposed so the tests can check the readers without a browser.
	if (typeof window !== 'undefined') {
		window.asyntaiFlarum = {
			readWidgetId: readWidgetId,
			readScriptUrl: readScriptUrl,
			start: start,
			DEFAULT_SCRIPT_URL: DEFAULT_SCRIPT_URL,
		};
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'complete') {
			setTimeout(run, 0);
		} else {
			window.addEventListener('load', run);
		}
	}

	if (typeof module !== 'undefined') {
		module.exports = { extend: [] };
	}
})();
