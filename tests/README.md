# Tests

Two suites. Both pass on Flarum 1.3.

`test_loader.mjs` runs the forum script inside a small fake page, with no
browser and no forum, so every rule can be driven directly. 15 checks.

```
node --test tests/test_loader.mjs
```

`test_forum.py` runs against a real Flarum in Docker. It checks that the
compiled bundle contains our script, that the three settings reach the browser,
and that nothing else does. 19 checks.

```
python tests/test_forum.py
```

No password is typed anywhere. Settings are changed in the database, which is
what the admin screen does.

## Setting up the forum

Start Flarum and MariaDB, then install the extension from a local path:

```
docker exec -w /flarum/app <flarum> composer config repositories.asyntai path ./local-asyntai
docker exec -w /flarum/app <flarum> composer require asyntai/flarum-chatbot:@dev
```

Flarum 1.3 has no command to enable an extension, so add its id to the enabled
list in the database:

```
select value from flarum_settings where `key`='extensions_enabled';
```

Append `"asyntai-chatbot"` to that JSON array, then:

```
docker exec -w /flarum/app <flarum> php flarum assets:publish
docker exec -w /flarum/app <flarum> php flarum cache:clear
```

The extension id is `asyntai-chatbot`, not `asyntai-flarum-chatbot`. Flarum
strips a leading `flarum-` from the package half of the composer name.

## Admin assets

Flarum only compiles `admin.js` when somebody opens the admin area, so on a
fresh forum the admin checks are skipped. To build it without signing in:

```php
require '/flarum/app/vendor/autoload.php';
$app = (require '/flarum/app/site.php')->bootApp();
$assets = $app->getContainer()->make('flarum.assets.admin');
$assets->makeJs()->commit();
$assets->makeCss()->commit();
foreach (array_keys($app->getContainer()->make(Flarum\Locale\LocaleManager::class)->getLocales()) as $locale) {
    $assets->makeLocaleJs($locale)->commit();
}
```

## Environment

```
FLARUM_URL=http://localhost:8097
FLARUM_DB=flarum-mariadb-1
FLARUM_DB_USER=flarum
FLARUM_DB_PASS=...
FLARUM_DB_NAME=flarum
```

## After changing the JavaScript

Copy the files in, then republish, or the forum keeps serving the old bundle:

```
php flarum assets:publish && php flarum cache:clear
```
