import json
import websocket
import urllib.request
import time

req = urllib.request.urlopen("http://localhost:9333/json")
targets = json.loads(req.read().decode())
hud_target = next((t for t in targets if t["title"] == "Screenly"), None)

ws = websocket.create_connection(hud_target["webSocketDebuggerUrl"], timeout=15)
def ev(expr):
    ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True, "awaitPromise": True}}))
    return json.loads(ws.recv())

ev("Runtime.enable")
r = ev('''
(() => {
    const btn = document.querySelector('button[aria-label="Home"]') || document.querySelector('button[title="Home"]');
    if (btn) {
        btn.click();
        return "clicked home";
    }
    const allBtns = Array.from(document.querySelectorAll("button")).map(b => b.getAttribute("aria-label") || b.innerText);
    return { error: "no home btn", buttons: allBtns };
})()
''')
print("Click result:", r)
ws.close()

time.sleep(2)
req = urllib.request.urlopen("http://localhost:9333/json")
targets2 = json.loads(req.read().decode())
print("Targets now:", [(t["title"], t["id"]) for t in targets2])
