# -*- coding: utf-8 -*-
"""
MCP Bridge plugin for QGIS.

WHAT THIS DOES (in plain English)
---------------------------------
When you enable this plugin inside QGIS, it opens a small "phone line" (a TCP
socket) on your own computer at address 127.0.0.1, port 9876. Another program
(our MCP server, which Claude talks to) can dial that number, send a short text
message describing a command, and get a text reply back.

Commands are sent as JSON, one command per line. For example:
    {"cmd": "list_layers"}\n
and the reply is also JSON, for example:
    {"ok": true, "layers": [...]}\n

THE TRICKY PART: THREADS AND THE MAIN THREAD
--------------------------------------------
QGIS (like most desktop apps) has ONE special thread called the "main thread"
or "GUI thread". Anything that touches the map, the project, or the user
interface MUST happen on that main thread. If we touch those things from a
different (background) thread, QGIS can crash or behave unpredictably.

But we also can't run our socket server ON the main thread, because waiting for
network connections would freeze QGIS's whole window.

So we do this:
  1. A BACKGROUND thread runs the socket server and waits for connections.
     (Waiting for the network is safe to do off the main thread.)
  2. When a command arrives, the background thread does NOT run PyQGIS directly.
     Instead it hands the command to the main thread using a Qt signal.
     Qt signals are the safe, built-in way to pass work between threads.
  3. The main thread runs the actual PyQGIS code, then hands the result back to
     the waiting background thread, which sends the reply down the socket.

The background thread waits (blocks) on a threading.Event until the main thread
has finished and stored the result. This keeps the request/response simple:
one command in, one reply out.
"""

import json
import socket
import threading
import traceback

# QGIS / Qt imports. qgis.PyQt is QGIS's own bundled copy of PyQt, so importing
# from here works regardless of whether the user has PyQt5 installed separately.
from qgis.PyQt.QtCore import QObject, pyqtSignal, Qt
from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsMapSettings,
    QgsMapRendererParallelJob,
)
from qgis.PyQt.QtCore import QSize
from qgis.PyQt.QtGui import QColor

HOST = "127.0.0.1"
PORT = 9876


class _CommandRunner(QObject):
    """
    Lives on the MAIN thread. The background socket thread emits the
    `run_requested` signal to ask this object to run a command. Because this
    object was created on the main thread, Qt guarantees the connected slot
    (`_on_run_requested`) runs on the main thread too. That is exactly what we
    need for safe PyQGIS access.
    """

    # The signal carries a single Python object: a small "job" dictionary that
    # holds the command and a way to report the result back.
    run_requested = pyqtSignal(object)

    def __init__(self, iface):
        super().__init__()
        self.iface = iface
        # Qt.QueuedConnection forces the slot to run on the receiver's thread
        # (the main thread) even when the signal is emitted from another thread.
        self.run_requested.connect(self._on_run_requested, Qt.QueuedConnection)

    def _on_run_requested(self, job):
        """Runs on the MAIN thread. Safe to call PyQGIS here."""
        try:
            job["result"] = self._dispatch(job["cmd"], job["params"])
        except Exception as exc:  # noqa: BLE001 - we want to report any error
            job["result"] = {
                "ok": False,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }
        finally:
            # Tell the waiting background thread the result is ready.
            job["done"].set()

    # ------------------------------------------------------------------ #
    # Command implementations. All of these run on the main thread.
    # ------------------------------------------------------------------ #
    def _dispatch(self, cmd, params):
        if cmd == "ping":
            return {"ok": True, "pong": True}
        if cmd == "list_layers":
            return self._list_layers()
        if cmd == "load_vector_layer":
            return self._load_vector_layer(params)
        if cmd == "run_buffer":
            return self._run_buffer(params)
        if cmd == "export_map_image":
            return self._export_map_image(params)
        if cmd == "zoom_to_layer":
            return self._zoom_to_layer(params)
        return {"ok": False, "error": "Unknown command: {}".format(cmd)}

    def _list_layers(self):
        layers = []
        for layer in QgsProject.instance().mapLayers().values():
            # layer.type() is an enum; str() gives a readable form.
            layers.append({"name": layer.name(), "type": str(layer.type())})
        return {"ok": True, "layers": layers}

    def _load_vector_layer(self, params):
        path = params.get("path")
        name = params.get("name") or "layer"
        if not path:
            return {"ok": False, "error": "Missing 'path' parameter."}
        # "ogr" is the generic vector data provider (handles shapefiles,
        # GeoJSON, GeoPackage, etc.).
        layer = QgsVectorLayer(path, name, "ogr")
        if not layer.isValid():
            return {"ok": False, "error": "Layer is not valid: {}".format(path)}
        QgsProject.instance().addMapLayer(layer)
        return {"ok": True, "loaded": name, "feature_count": layer.featureCount()}

    def _run_buffer(self, params):
        layer_name = params.get("layer_name")
        distance = params.get("distance")
        output_path = params.get("output_path")
        if not layer_name or distance is None or not output_path:
            return {
                "ok": False,
                "error": "Need 'layer_name', 'distance', and 'output_path'.",
            }

        # Find the input layer by name.
        matches = QgsProject.instance().mapLayersByName(layer_name)
        if not matches:
            return {"ok": False, "error": "No layer named '{}'.".format(layer_name)}
        input_layer = matches[0]

        # `processing` is QGIS's analysis framework. We import it lazily here
        # because it is only available once QGIS is fully started.
        import processing

        result = processing.run(
            "native:buffer",
            {
                "INPUT": input_layer,
                "DISTANCE": float(distance),
                "SEGMENTS": 5,
                "DISSOLVE": False,
                "OUTPUT": output_path,
            },
        )

        # Load the buffered result back into the project so the user can see it.
        out_layer = QgsVectorLayer(result["OUTPUT"], layer_name + "_buffer", "ogr")
        if out_layer.isValid():
            QgsProject.instance().addMapLayer(out_layer)

        return {"ok": True, "output": result["OUTPUT"]}

    def _zoom_to_layer(self, params):
        layer_name = params.get("layer_name")
        if not layer_name:
            return {"ok": False, "error": "Missing 'layer_name' parameter."}

        # Find the layer by name in the current project.
        matches = QgsProject.instance().mapLayersByName(layer_name)
        if not matches:
            return {"ok": False, "error": "No layer named '{}'.".format(layer_name)}
        layer = matches[0]

        # layer.extent() returns a QgsRectangle: the bounding box that contains
        # every feature in the layer. We point the map canvas at that box and
        # refresh() to redraw, which "zooms to" the layer.
        extent = layer.extent()
        canvas = self.iface.mapCanvas()
        canvas.setExtent(extent)
        canvas.refresh()

        return {
            "ok": True,
            "layer": layer_name,
            "extent": {
                "xmin": extent.xMinimum(),
                "ymin": extent.yMinimum(),
                "xmax": extent.xMaximum(),
                "ymax": extent.yMaximum(),
            },
        }

    def _export_map_image(self, params):
        output_path = params.get("output_path")
        width = int(params.get("width", 800))
        height = int(params.get("height", 600))
        if not output_path:
            return {"ok": False, "error": "Missing 'output_path' parameter."}

        canvas = self.iface.mapCanvas()

        # Build map settings that describe what to render: the same layers,
        # extent, and background as the current canvas, at the size we want.
        settings = QgsMapSettings()
        settings.setLayers(canvas.layers())
        settings.setExtent(canvas.extent())
        settings.setOutputSize(QSize(width, height))
        settings.setBackgroundColor(QColor(255, 255, 255))

        # Render the map. waitForFinished() blocks until the render is done.
        # We are already on the main thread inside a command handler, so a brief
        # synchronous wait here is fine and avoids any event-loop timing race.
        job = QgsMapRendererParallelJob(settings)
        job.start()
        job.waitForFinished()

        image = job.renderedImage()
        if not image.save(output_path, "PNG"):
            return {"ok": False, "error": "Failed to save image to {}".format(output_path)}
        return {"ok": True, "output": output_path, "width": width, "height": height}


class _SocketServerThread(threading.Thread):
    """
    Runs on a BACKGROUND thread. Owns the listening socket, accepts one
    connection at a time, reads newline-delimited JSON commands, and forwards
    each command to the main thread via the runner's signal.
    """

    def __init__(self, runner):
        super().__init__(daemon=True)  # daemon=True so it won't block QGIS exit
        self.runner = runner
        self._stop = threading.Event()
        self._server = None

    def run(self):
        self._server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # A short timeout lets us periodically check the stop flag so the thread
        # can shut down cleanly when the plugin is disabled.
        self._server.settimeout(1.0)
        self._server.bind((HOST, PORT))
        self._server.listen(1)

        while not self._stop.is_set():
            try:
                conn, _addr = self._server.accept()
            except socket.timeout:
                continue  # no client yet; loop and re-check the stop flag
            except OSError:
                break  # socket was closed
            with conn:
                self._handle_connection(conn)

        try:
            self._server.close()
        except OSError:
            pass

    def _handle_connection(self, conn):
        conn.settimeout(5.0)
        buffer = b""
        while not self._stop.is_set():
            try:
                chunk = conn.recv(4096)
            except socket.timeout:
                continue
            except OSError:
                break
            if not chunk:
                break  # client closed the connection
            buffer += chunk
            # Process every complete (newline-terminated) command in the buffer.
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                reply = self._process_line(line)
                try:
                    conn.sendall(reply.encode("utf-8") + b"\n")
                except OSError:
                    return

    def _process_line(self, line):
        line = line.strip()
        if not line:
            return json.dumps({"ok": False, "error": "Empty command."})
        try:
            message = json.loads(line.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            return json.dumps({"ok": False, "error": "Bad JSON: {}".format(exc)})

        cmd = message.get("cmd")
        params = message.get("params", {})
        if not cmd:
            return json.dumps({"ok": False, "error": "Missing 'cmd' field."})

        # Hand the work to the main thread and wait for the result.
        job = {"cmd": cmd, "params": params, "result": None, "done": threading.Event()}
        self.runner.run_requested.emit(job)
        # Wait up to 60 seconds for the main thread to finish the command.
        if not job["done"].wait(timeout=60.0):
            return json.dumps({"ok": False, "error": "Command timed out."})
        return json.dumps(job["result"])

    def stop(self):
        self._stop.set()


class McpBridgePlugin:
    """
    The plugin object QGIS keeps alive while the plugin is enabled. QGIS calls
    initGui() when the plugin loads and unload() when it is disabled.
    """

    def __init__(self, iface):
        self.iface = iface
        self.runner = None
        self.server_thread = None

    def initGui(self):
        # Create the main-thread runner first (we are on the main thread here),
        # then start the background socket server.
        self.runner = _CommandRunner(self.iface)
        self.server_thread = _SocketServerThread(self.runner)
        self.server_thread.start()
        self.iface.messageBar().pushInfo(
            "MCP Bridge", "Listening on {}:{}".format(HOST, PORT)
        )

    def unload(self):
        # Stop the background thread so the port is freed when disabled.
        if self.server_thread is not None:
            self.server_thread.stop()
            self.server_thread.join(timeout=3.0)
            self.server_thread = None
        self.runner = None
