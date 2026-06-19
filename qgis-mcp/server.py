"""
MCP server for QGIS.

WHAT THIS IS
------------
This is the program Claude talks to. It uses the official MCP (Model Context
Protocol) Python SDK. MCP is a standard way for an AI assistant like Claude to
call "tools" that you define here. Each tool below, when Claude calls it, opens
a TCP socket to the QGIS plugin (running inside QGIS on 127.0.0.1:9876), sends a
JSON command, and returns the JSON reply.

THE FLOW
--------
    Claude  ->  this MCP server  ->  TCP socket  ->  QGIS plugin  ->  PyQGIS

Run this file as the MCP server (see README.md). You do NOT run it by hand for
normal use; Claude Desktop / Claude Code launches it for you once registered.
"""

import json
import socket

from mcp.server.fastmcp import FastMCP

# Where the QGIS plugin is listening. Must match HOST/PORT in mcp_bridge.py.
QGIS_HOST = "127.0.0.1"
QGIS_PORT = 9876

# FastMCP is the simple, high-level way to build an MCP server. The name shows
# up in Claude's list of connected tools.
mcp = FastMCP("qgis-mcp")


def _send_command(cmd, **params):
    """
    Open a socket to the QGIS plugin, send one JSON command, and return the
    parsed JSON reply as a Python dict.

    Commands are newline-delimited JSON, matching what the plugin expects.
    """
    message = json.dumps({"cmd": cmd, "params": params}) + "\n"
    try:
        with socket.create_connection((QGIS_HOST, QGIS_PORT), timeout=65) as sock:
            sock.sendall(message.encode("utf-8"))

            # Read until we get a full newline-terminated reply.
            buffer = b""
            while b"\n" not in buffer:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                buffer += chunk
    except ConnectionRefusedError:
        return {
            "ok": False,
            "error": (
                "Could not connect to QGIS on {}:{}. "
                "Is QGIS running with the MCP Bridge plugin enabled?"
            ).format(QGIS_HOST, QGIS_PORT),
        }
    except socket.timeout:
        return {"ok": False, "error": "QGIS did not reply in time."}
    except OSError as exc:
        return {"ok": False, "error": "Socket error talking to QGIS: {}".format(exc)}

    line = buffer.split(b"\n", 1)[0].strip()
    if not line:
        return {"ok": False, "error": "Empty reply from QGIS."}
    try:
        return json.loads(line.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        return {"ok": False, "error": "Bad reply from QGIS: {}".format(exc)}


# ---------------------------------------------------------------------------- #
# MCP tools. Each @mcp.tool() function becomes a tool Claude can call.
# The docstrings matter: Claude reads them to know when/how to use each tool.
# ---------------------------------------------------------------------------- #


@mcp.tool()
def ping() -> dict:
    """Check that QGIS and the MCP Bridge plugin are reachable."""
    return _send_command("ping")


@mcp.tool()
def list_layers() -> dict:
    """List the names and types of all layers currently loaded in QGIS."""
    return _send_command("list_layers")


@mcp.tool()
def load_vector_layer(path: str, name: str = "layer") -> dict:
    """
    Load a vector layer (shapefile, GeoJSON, GeoPackage, etc.) into QGIS.

    Args:
        path: Full path to the vector data file on disk.
        name: A friendly name to show for the layer in QGIS.
    """
    return _send_command("load_vector_layer", path=path, name=name)


@mcp.tool()
def run_buffer(layer_name: str, distance: float, output_path: str) -> dict:
    """
    Create a buffer (a zone of a given width) around the features of a layer.

    Args:
        layer_name: Name of the layer already loaded in QGIS to buffer.
        distance: Buffer distance, in the layer's map units.
        output_path: Where to save the resulting buffered layer
            (e.g. a .gpkg or .shp path). The result is also loaded into QGIS.
    """
    return _send_command(
        "run_buffer",
        layer_name=layer_name,
        distance=distance,
        output_path=output_path,
    )


@mcp.tool()
def export_map_image(output_path: str, width: int = 800, height: int = 600) -> dict:
    """
    Render the current QGIS map view to a PNG image file.

    Args:
        output_path: Where to save the PNG (e.g. C:/Users/you/map.png).
        width: Image width in pixels.
        height: Image height in pixels.
    """
    return _send_command(
        "export_map_image",
        output_path=output_path,
        width=width,
        height=height,
    )


if __name__ == "__main__":
    # Run the server using stdio transport, which is how Claude Desktop and
    # Claude Code launch and talk to local MCP servers.
    mcp.run()
