import json
import base64
import time
import os
import websocket
import urllib.request

out_dir = "/Users/iamadarsha/Screenly/docs/visual-qa/after"
os.makedirs(out_dir, exist_ok=True)

def get_targets():
    req = urllib.request.urlopen("http://localhost:9333/json")
    return json.loads(req.read().decode())

targets = get_targets()
print("Targets:", [(t["title"], t["id"]) for t in targets])

editor_target = next((t for t in targets if t["title"] == "Screenly Editor"), None)
if not editor_target:
    print("Screenly Editor target not found! Current targets:", [(t["title"], t["id"]) for t in targets])
    exit(1)

print("Found Editor Target:", editor_target["id"])
ws = websocket.create_connection(editor_target["webSocketDebuggerUrl"], timeout=25)
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

def snap(filename, delay=0.6):
    time.sleep(delay)
    shot = send("Page.captureScreenshot", {"format": "png"})
    data = shot.get("result", {}).get("data")
    if data:
        with open(os.path.join(out_dir, filename), "wb") as f:
            f.write(base64.b64decode(data))
        print("Captured:", filename)
    else:
        print("Failed to capture:", filename, shot)

def ev(expr):
    return send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})

# 1. 1280x800 Dark Canvas-First Studio
send("Emulation.setDeviceMetricsOverride", {
    "width": 1280,
    "height": 800,
    "deviceScaleFactor": 2,
    "mobile": False
})
snap("editor-1280x800-dark.png")

# 2. 1920x1080 Full HD Dark Studio
send("Emulation.setDeviceMetricsOverride", {
    "width": 1920,
    "height": 1080,
    "deviceScaleFactor": 2,
    "mobile": False
})
snap("editor-1920x1080-dark.png")

# Reset to 1280x800 for detailed views
send("Emulation.setDeviceMetricsOverride", {
    "width": 1280,
    "height": 800,
    "deviceScaleFactor": 2,
    "mobile": False
})

# 3. Dedicated Inspector Modes
modes = [
    ("composition", "Composition"),
    ("motion", "Motion"),
    ("cursor", "Cursor"),
    ("camera", "Camera"),
    ("audio", "Audio"),
    ("captions", "Captions"),
    ("backgrounds", "Backgrounds"),
    ("settings", "Settings")
]

for mode_id, mode_label in modes:
    ev(f'''
    (() => {{
        const btn = document.querySelector('button[aria-label="{mode_label}"]');
        if (btn) btn.click();
    }})()
    ''')
    snap(f"editor-mode-{mode_id}.png")

# 4. Precision Mode Timeline Toggle
ev('''
(() => {
    const precisionBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Compact') || b.innerText.includes('Precision'));
    if (precisionBtn) precisionBtn.click();
})()
''')
snap("editor-timeline-precision.png")

# 5. Collapsible Inspector
ev('''
(() => {
    const collapseBtn = document.querySelector('button[aria-label="Collapse inspector"]');
    if (collapseBtn) collapseBtn.click();
})()
''')
snap("editor-inspector-collapsed.png")

# Re-expand inspector
ev('''
(() => {
    const expandBtn = document.querySelector('button[aria-label="Expand inspector"]');
    if (expandBtn) expandBtn.click();
})()
''')

# 6. Command Palette (Cmd+K)
ev('''
(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
})()
''')
snap("editor-command-palette.png")

# Close Command Palette
ev('''
(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
})()
''')

# 7. Clips / Library Open
ev('''
(() => {
    const libraryBtn = document.querySelector('button[aria-label="Library"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Library') || b.innerText.includes('Clips'));
    if (libraryBtn) libraryBtn.click();
})()
''')
snap("editor-clips-open.png")

# Close Clips
ev('''
(() => {
    const libraryBtn = document.querySelector('button[aria-label="Library"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Library') || b.innerText.includes('Clips'));
    if (libraryBtn) libraryBtn.click();
})()
''')

# 8. Export Menu
ev('''
(() => {
    const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Export') || b.innerText.includes('Publish'));
    if (exportBtn) exportBtn.click();
})()
''')
snap("editor-export-menu.png")

# Close Export Menu
ev('''
(() => {
    document.body.click();
})()
''')

# 9. Light Theme Studio
ev('''
(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
})()
''')
snap("editor-1280x800-light.png")

# Reset to Dark Theme
ev('''
(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
})()
''')

# 10. Dashboard / Project Browser
ev('''
(() => {
    const homeBtn = document.querySelector('button[aria-label="Home"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Screenly') || b.innerText.includes('Home'));
    if (homeBtn) homeBtn.click();
})()
''')
snap("dashboard-project-browser.png", delay=1.0)

ws.close()
print("All visual QA after-screenshots captured successfully!")
