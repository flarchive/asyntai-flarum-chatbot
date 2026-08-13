/**
 * Asyntai AI Chatbot for Flarum, admin frontend.
 *
 * Registers the three settings on the extension page in the admin area.
 * Plain JavaScript on purpose, so the extension needs no build step. See the
 * note in forum.js about the module.exports line at the bottom.
 */
(function () {
	'use strict';

	function register(app) {
		app.extensionData
			.for('asyntai-chatbot')
			.registerSetting({
				setting: 'asyntai-chatbot.widget_id',
				label: app.translator.trans('asyntai-chatbot.admin.settings.widget_id_label'),
				help: app.translator.trans('asyntai-chatbot.admin.settings.widget_id_help'),
				type: 'text',
				placeholder: 'asyntai_xxxxxxxxxxxx',
			})
			.registerSetting({
				setting: 'asyntai-chatbot.hide_for_members',
				label: app.translator.trans('asyntai-chatbot.admin.settings.hide_for_members_label'),
				help: app.translator.trans('asyntai-chatbot.admin.settings.hide_for_members_help'),
				type: 'boolean',
			})
			.registerSetting({
				setting: 'asyntai-chatbot.script_url',
				label: app.translator.trans('asyntai-chatbot.admin.settings.script_url_label'),
				help: app.translator.trans('asyntai-chatbot.admin.settings.script_url_help'),
				type: 'text',
				placeholder: 'https://widget.asyntai.com/static/js/chat-widget.js',
			});
	}

	if (typeof flarum !== 'undefined' && flarum.core && flarum.core.app) {
		flarum.core.app.initializers.add('asyntai-chatbot', register);
	}

	if (typeof module !== 'undefined') {
		module.exports = { extend: [] };
	}
})();
