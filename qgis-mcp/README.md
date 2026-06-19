# QGIS MCP

Let Claude control QGIS. This is a minimal, working vertical slice: Claude can
ping QGIS, list layers, load a vector layer, run a buffer, and export the map to
a PNG.

## How it works (the 30-second version)

```
Claude  ->  MCP server (server.py)  ->  TCP socket  ->  QGIS plugin  ->  PyQGIS
```

Claude calls a tool on the **MCP server**. The MCP server opens a tiny network
connection (a socket) to a **plugin running inside QGIS**. The plugin runs the
actual QGIS Python (PyQGIS) command and sends the answer back. That's the whole
trick.

There are two halves to install: the **QGIS plugin** (lives inside QGIS) and the
**MCP server** (a small Python program Claude launches). Set up both.

---

## Part 1 — Install QGIS

1. Download and install QGIS from <https://qgis.org/download/>. Pick the latest
   stable release for Windows.
2. Launch QGIS once to make sure it opens.

---

## Part 2 — Install the QGIS plugin

The plugin folder is `qgis_plugin` in this repo. QGIS looks for plugins in a
specific folder on your machine.

1. Open this folder in File Explorer by pasting this into the address bar:

   ```
   %APPDATA%\QGIS\QGIS3\profiles\default\python\plugins\
   ```

   (If the `plugins` folder doesn't exist yet, create it.)

2. Copy the **`qgis_plugin`** folder from this repo into that location, and
   **rename the copy to `mcp_bridge`**. You should end up with:

   ```
   %APPDATA%\QGIS\QGIS3\profiles\default\python\plugins\mcp_bridge\
       __init__.py
       metadata.txt
       mcp_bridge.py
   ```

3. Start (or restart) QGIS.

4. Enable the plugin: **Plugins → Manage and Install Plugins… → Installed**, then
   tick the box next to **"MCP Bridge"**.
   - Tip: if you don't see it, also check **Settings → Show also experimental
     plugins** in that dialog, since this plugin is marked experimental.

5. When it enables, you'll see a message bar note:
   `MCP Bridge: Listening on 127.0.0.1:9876`. That means the bridge is live.

---

## Part 3 — Set up the MCP server

You need Python installed (3.10+ recommended). Then, in this `qgis-mcp` folder,
open **PowerShell** and run:

```powershell
# Create a virtual environment (an isolated place for this project's packages)
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install the MCP SDK
pip install -r requirements.txt
```

> If `Activate.ps1` is blocked by an execution-policy error, run this once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and try again.

---

## Part 4 — Register the MCP server with Claude

You tell Claude where the server lives. The easiest way with Claude Code:

```powershell
claude mcp add qgis -- "C:\Users\adrie\My Second Agent\qgis-mcp\venv\Scripts\python.exe" "C:\Users\adrie\My Second Agent\qgis-mcp\server.py"
```

Or, for **Claude Desktop**, edit `claude_desktop_config.json` (found via
Claude Desktop → Settings → Developer → Edit Config) and add a `qgis` entry:

```json
{
  "mcpServers": {
    "qgis": {
      "command": "C:\\Users\\adrie\\My Second Agent\\qgis-mcp\\venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\adrie\\My Second Agent\\qgis-mcp\\server.py"]
    }
  }
}
```

> Note the double backslashes `\\` — JSON requires escaping backslashes on
> Windows paths. Restart Claude Desktop after editing.

---

## Part 5 — Quick test

1. Start **QGIS** and make sure the **MCP Bridge** plugin is enabled (Part 2).
2. In Claude, ask: **"ping qgis"**.
   - You should get back `{"ok": true, "pong": true}`.
3. Try more: **"list the layers in qgis"**, or load a file and buffer it.

If ping fails with *"Is QGIS running with the MCP Bridge plugin enabled?"*, then
QGIS isn't running or the plugin isn't enabled. Re-check Part 2.

---

## The available tools

| Tool                | What it does                                              |
| ------------------- | -------------------------------------------------------- |
| `ping`              | Confirms QGIS + plugin are reachable.                    |
| `list_layers`       | Lists layers currently loaded in the project.            |
| `load_vector_layer` | Loads a vector file (shapefile, GeoJSON, GeoPackage…).   |
| `run_buffer`        | Buffers a loaded layer and loads the result.             |
| `export_map_image`  | Renders the current map view to a PNG.                   |

---

## A note on safety / threads (for the curious)

QGIS has one "main thread" that owns the map and UI. Network waiting happens on a
background thread so QGIS never freezes, but every actual QGIS command is handed
back to the main thread (via a Qt signal) before it runs. See the long comment at
the top of `qgis_plugin/mcp_bridge.py` for the full explanation.
