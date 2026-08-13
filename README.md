# Asyntai AI Chatbot for Flarum

Puts an AI assistant on your forum. A chat button sits in the corner, visitors
ask a question in their own words, and the assistant answers from your own
content in more than 80 languages.

Useful on a support or product forum, where the same questions come round every
week and nobody is awake at 2am to answer them.

Tested on Flarum 1.3. Free, MIT licensed. You need an Asyntai account for the
widget ID; there is a free plan.

## Install

```
composer require asyntai/flarum-chatbot
```

Then enable it in **Administration → Extensions**, open its settings, and paste
your widget ID. You find the ID at [asyntai.com](https://asyntai.com) under
Setup & Integration.

## Settings

**Asyntai widget ID.** The chat is on while this holds a valid ID, off when it
is empty. You can paste the whole snippet from the dashboard; the extension
keeps only the ID and throws the rest away.

**Show only to guests.** Off by default. Turn it on and members who are logged
in never see the chat, which is handy if the assistant is there to answer
newcomers rather than regulars.

**Script address.** Leave empty unless you host the widget yourself.

## How it works

The extension adds one small script to the forum frontend. That script waits
for the page load event, then fetches the widget from asyntai.com. Flarum draws
first, so page speed is unchanged, and the widget loads once per tab.

Your server never talks to Asyntai. Only the visitor's browser does. The
extension publishes exactly three values to the page: the widget ID, the script
address and the guest-only switch. Nothing about your users or your posts.

## Notes

The JavaScript ships as plain, readable files rather than a webpack build, so
there is nothing to compile and you can read exactly what runs on your forum.

Flarum wraps each extension file with `var module = {}` and reads
`module.exports` afterwards, so both files end with an export. Without it the
whole forum fails to boot, not just this extension.

The chat is loaded on the page load event rather than from a Flarum
initializer. Initializers run at the start of boot, before Flarum fills its
store, so `app.forum` does not exist yet at that point.

## Support

hello@asyntai.com
