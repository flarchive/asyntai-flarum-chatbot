<?php

/*
 * This file is part of the Asyntai AI Chatbot extension for Flarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    // The forum frontend needs these three values to decide what to load.
    // Nothing else about the settings is exposed.
    (new Extend\Settings())
        ->serializeToForum('asyntaiWidgetId', 'asyntai-chatbot.widget_id')
        ->serializeToForum('asyntaiScriptUrl', 'asyntai-chatbot.script_url')
        ->serializeToForum('asyntaiHideForMembers', 'asyntai-chatbot.hide_for_members', 'boolval'),
];
