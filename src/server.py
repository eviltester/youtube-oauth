import os
import http.server
import socketserver
import json
from urllib.parse import urlparse, parse_qs
from youtube_service import get_rss_feed

PORT = 8000
HTML_FILE = "youtube-subscriptions-oauth.html"


class InjectingHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == f"/{HTML_FILE}":
            self._serve_html()
        elif self.path.startswith("/api/rss"):
            self._handle_rss_feed()
        else:
            super().do_GET()

    def _serve_html(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        
        with open(HTML_FILE, "r", encoding="utf-8") as f:
            html = f.read()
        
        client_id = os.environ.get("YOUTUBE_OAUTH_CLIENT_ID", "")
        
        if client_id:
            injection = f'<script>localStorage.setItem("youtube_oauth_client_id", "{client_id}");</script>'
            html = html.replace("<head>", f"<head>\n{injection}")
        
        self.wfile.write(html.encode("utf-8"))

    def _handle_rss_feed(self):
        parsed = urlparse(self.path)
        query_params = parse_qs(parsed.query)
        channel_id = query_params.get("channel_id", [None])[0]

        if not channel_id:
            self._send_json_error(400, "channel_id required")
            return

        try:
            result = get_rss_feed(channel_id)
            self._send_json(result)
        except Exception as e:
            self._send_json_error(500, str(e))

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _send_json_error(self, status: int, message: str):
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


if __name__ == "__main__":
    client_id = os.environ.get("YOUTUBE_OAUTH_CLIENT_ID", "")
    if not client_id:
        print("Warning: YOUTUBE_OAUTH_CLIENT_ID environment variable not set")
    else:
        print(f"Using client ID: {client_id[:20]}...")
    
    print(f"Serving at http://localhost:{PORT}")
    with socketserver.TCPServer(("", PORT), InjectingHTTPRequestHandler) as httpd:
        httpd.serve_forever()
