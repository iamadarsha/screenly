import json
import base64
import time
import os
import websocket
import urllib.request

out_dir = "/Users/iamadarsha/Screenly/docs/visual-qa/before"
os.makedirs(out_dir, exist_ok=True)

req = urllib.request.urlopen("http://localhost:9333/json")
targets = json.loads(req.read().decode())
editor_target = next((t for t in targets if t["title"] == "Screenly Editor"), None)
print("Editor target:", editor_target["id"] if editor_target else "None")

if not editor_target:
    exit(1)

ws = websocket.create_connection(editor_target["webSocketDebuggerUrl"], timeout=20)
id_counter = 1
def send(method, params=None):
    global id_counter
    curr_id = id_counter
    id_counter += 1
    ws.send(json.dumps({"id": curr_id, "method": method, "params": params or {}}))
    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == curr_id:
            return resp

send("Runtime.enable")
send("Page.enable")
send("Emulation.setDeviceMetricsOverride", {
    "width": 1280,
    "height": 800,
    "deviceScaleFactor": 2,
    "mobile": False
})

def snap(filename):
    time.sleep(0.5)
    shot = send("Page.captureScreenshot", {"format": "png"})
    data = shot.get("result", {}).get("data")
    if data:
        with open(os.path.join(out_dir, filename), "wb") as f:
            f.write(base64.b64decode(data))
        print("Captured:", filename)
    else:
        print("Failed:", filename)

def ev(expr):
    return send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})

# 1. 1280x800 Dark
snap("editor-1280x800-dark.png")

# 2. 1920x1080 Dark
send("Emulation.setDeviceMetricsOverride", {
    "width": 1920,
    "height": 1080,
    "deviceScaleFactor": 2,
    "mobile": False
})
snap("editor-1920x1080-dark.png")

# Switch to 1280x800 for tabs
send("Emulation.setDeviceMetricsOverride", {
    "width": 1280,
    "height": 800,
    "deviceScaleFactor": 2,
    "mobile": False
})

# Click each tab in the sidebar
tabs = ["scene", "cursor", "webcam", "captions", "settings"]
for tab in tabs:
    ev(f'''
    (() => {{
        const btn = document.querySelector('button#{tab}') || document.querySelector('[data-key="{tab}"]');
        if (btn) btn.click();
    }})()
    ''')
    snap(f"editor-tab-{tab}.png")

# Open clips/library
ev('''
(() => {
    const clipsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Clips'));
    if (clipsBtn) clipsBtn.click();
})()
''')
snap("editor-clips-open.png")
# Close clips
ev('''
(() => {
    const clipsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Clips'));
    if (clipsBtn) clipsBtn.click();
})()
''')

# Open Export dropdown
ev('''
(() => {
    const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Export'));
    if (exportBtn) exportBtn.click();
})()
''')
snap("editor-export-menu.png")

# Close export dropdown
ev('''
(() => {
    document.body.click();
})()
''')

# Now switch to Light theme if supported
ev('''
(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    const themeBtn = document.querySelector('[aria-label*="theme"]');
    if (themeBtn) themeBtn.click();
})()
''')
snap("editor-1280x800-light.png")

# Reset to dark
ev('''
(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
})()
''')

# Open Project Browser / Dashboard
ev('''
(() => {
    const homeBtn = document.querySelector('button[title="Home"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Home'));
    if (homeBtn) homeBtn.click();
})()
''')
snap("dashboard-project-browser.png")

ws.close()
print("Done capturing before-screenshots!")
