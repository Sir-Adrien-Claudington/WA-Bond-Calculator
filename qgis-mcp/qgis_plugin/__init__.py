# This file is what QGIS looks for first when it loads a plugin.
# QGIS calls the classFactory() function below and expects it to return
# an instance of our plugin class. The "iface" argument QGIS passes in is a
# handle to the QGIS application interface (menus, the map canvas, etc.).


def classFactory(iface):
    # Import here (not at the top of the file) so that any import errors show
    # up only when the plugin is actually loaded, which makes debugging easier.
    from .mcp_bridge import McpBridgePlugin

    return McpBridgePlugin(iface)
