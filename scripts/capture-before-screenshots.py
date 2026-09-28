import json
import base64
import time
import os
import websocket
import urllib.request

out_dir = "/Users/iamadarsha/Screenly/docs/visual-qa/before"
os.makedirs(out_dir, exist_ok=True)

def get_targets():
    req = urllib.request.urlopen("http://localhost:9333/json")
    return json.loads(req.read().decode())

def capture_target(ws_url, filename, eval_code=None, width=None, height=None):
    ws = websocket.create_connection(ws_url, timeout=15)
    id_counter = 1
    def send(method, params=None):
        nonlocal id_counter
        curr_id = id_counter
        id_counter += 1
        ws.send(json.dumps({"id": curr_id, "method": method, "params": params or {}}))
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == curr_id:
                return resp

    send("Runtime.enable")
    send("Page.enable")

    if eval_code:
        send("Runtime.evaluate", {"expression": eval_code, "returnByValue": True, "awaitPromise": True})
        time.sleep(0.5)

    if width and height:
        send("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 2,
            "mobile": False
        })
        time.sleep(0.5)

    shot = send("Page.captureScreenshot", {"format": "png"})
    data = shot.get("result", {}).get("data")
    if data:
        with open(os.path.join(out_dir, filename), "wb") as f:
            f.write(base64.b64decode(data))
        print(f"Captured: {filename}")
    else:
        print(f"Failed to capture {filename}: {shot}")
    ws.close()

targets = get_targets()
print("Targets found:", [(t['title'], t['id']) for t in targets])

hud_target = next((t for t in targets if t['title'] == "Screenly"), None)
if hud_target:
    capture_target(hud_target['webSocketDebuggerUrl'], "hud-default.png")

# Now let's open the project browser from HUD or open a project into Editor
# Let's see what happens if we call window.electronAPI.openProjectBrowser() or switchToEditor()
if hud_target:
    ws = websocket.create_connection(hud_target['webSocketDebuggerUrl'], timeout=15)
    def send_cmd(expr):
        ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True, "awaitPromise": True}}))
        return json.loads(ws.recv())
    send_cmd("Runtime.enable")
    # Open editor with an existing project
    res = send_cmd("""
    (async () => {
        const projects = await window.electronAPI.listProjects();
        if (projects && projects.length > 0) {
            await window.electronAPI.openProject(projects[0].path);
            return { opened: projects[0].path };
        }
        return { opened: false };
    })()
    """)
    print("Open project res:", res)
    ws.close()

time.sleep(2)
targets = get_targets()
print("Targets after open project:", [(t['title'], t['id']) for t in targets])
