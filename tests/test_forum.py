"""Checks a real Flarum forum: does the page hand the browser the right settings?

Runs against a Flarum in Docker. It reads the payload that Flarum puts into
every page, which is what the forum script reads. No password is typed
anywhere; the settings are changed in the database, the way the admin screen
would.
"""

import json
import os
import re
import subprocess
import sys
import urllib.request

BASE = os.environ.get("FLARUM_URL", "http://localhost:8097")
DB_CONTAINER = os.environ.get("FLARUM_DB", "flarum-mariadb-1")
DB_USER = os.environ.get("FLARUM_DB_USER", "flarum")
DB_PASS = os.environ.get("FLARUM_DB_PASS", "LocalTest2026")
DB_NAME = os.environ.get("FLARUM_DB_NAME", "flarum")

WIDGET_ID = "asyntai_000000000000"

failures = []


def check(name, ok):
    print(("  OK   " if ok else "  FAIL ") + name)
    if not ok:
        failures.append(name)


def sql(statement):
    return subprocess.run(
        ["docker", "exec", DB_CONTAINER, "mysql",
         "-u" + DB_USER, "-p" + DB_PASS, DB_NAME, "-N", "-e", statement],
        capture_output=True, text=True,
    ).stdout.strip()


def set_setting(key, value):
    if value is None:
        sql("delete from flarum_settings where `key`='%s';" % key)
        return
    sql("insert into flarum_settings (`key`,`value`) values ('%s','%s') "
        "on duplicate key update value='%s';" % (key, value, value))


def forum_payload():
    """The block of data Flarum writes into every page for the browser."""
    with urllib.request.urlopen(BASE + "/") as response:
        html = response.read().decode("utf-8", "replace")
    match = re.search(r"flarum\.core\.app\.load\((\{.*?\})\);\s*\n", html, re.S)
    if not match:
        raise SystemExit("could not find the forum payload in the page")
    data = json.loads(match.group(1))
    for resource in data.get("resources", []):
        if resource.get("type") == "forums":
            return resource.get("attributes", {})
    return {}


def script_is_in_bundle():
    with urllib.request.urlopen(BASE + "/") as response:
        html = response.read().decode("utf-8", "replace")
    bundle = re.search(r'src="([^"]*assets/forum\.js[^"]*)"', html)
    if not bundle:
        return False
    with urllib.request.urlopen(bundle.group(1)) as response:
        return "__asyntaiRequested" in response.read().decode("utf-8", "replace")


print("The extension is live on the forum")
set_setting("asyntai-chatbot.widget_id", WIDGET_ID)
set_setting("asyntai-chatbot.script_url", None)
set_setting("asyntai-chatbot.hide_for_members", None)

check("the forum script is in the compiled bundle", script_is_in_bundle())

attributes = forum_payload()
check("the widget ID reaches the browser", attributes.get("asyntaiWidgetId") == WIDGET_ID)
check("the guest-only switch reaches the browser", "asyntaiHideForMembers" in attributes)
check("the script address reaches the browser", "asyntaiScriptUrl" in attributes)
check("the switch is off by default", attributes.get("asyntaiHideForMembers") is False)

print("Changing the settings")
set_setting("asyntai-chatbot.hide_for_members", "1")
check("the switch turns on", forum_payload().get("asyntaiHideForMembers") is True)

set_setting("asyntai-chatbot.hide_for_members", "0")
check("the switch turns off again", forum_payload().get("asyntaiHideForMembers") is False)

set_setting("asyntai-chatbot.script_url", "https://cdn.example.com/w.js")
check("an address of your own reaches the browser",
      forum_payload().get("asyntaiScriptUrl") == "https://cdn.example.com/w.js")

set_setting("asyntai-chatbot.widget_id", None)
check("clearing the ID clears it for the browser too",
      not forum_payload().get("asyntaiWidgetId"))

print("The admin screen")


def asset(path):
    try:
        with urllib.request.urlopen(BASE + path) as response:
            return response.read().decode("utf-8", "replace")
    except Exception:
        return ""


admin_js = asset("/assets/admin.js")
admin_en = asset("/assets/admin-en.js")

if not admin_js:
    print("  SKIP admin bundle not built yet, see tests/README.md")
else:
    check("the settings screen is registered",
          "flarum.extensions['asyntai-chatbot']" in admin_js)
    for key in ("widget_id", "hide_for_members", "script_url"):
        check("the %s setting is registered" % key,
              "asyntai-chatbot." + key in admin_js)
    for label in ("Asyntai widget ID", "Show only to guests", "Script address (optional)"):
        check("the label %r is translated" % label, label in admin_en)

print("Nothing private leaks into the page")
set_setting("asyntai-chatbot.widget_id", WIDGET_ID)
set_setting("asyntai-chatbot.script_url", None)
attributes = forum_payload()
ours = [k for k in attributes if k.lower().startswith("asyntai")]
check("only the three known values are published", sorted(ours) == [
    "asyntaiHideForMembers", "asyntaiScriptUrl", "asyntaiWidgetId"])

print()
if failures:
    print("%d TEST(S) FAILED" % len(failures))
    sys.exit(1)
print("ALL TESTS PASSED")
