import os
import http.server
import socketserver
from urllib.parse import unquote

PORT = 8000
HTML_FILE = "youtube-subscriptions-oauth.html"

class InjectingHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == f"/{HTML_FILE}":
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
        else:
            super().do_GET()

if __name__ == "__main__":
    client_id = os.environ.get("YOUTUBE_OAUTH_CLIENT_ID", "")
    if not client_id:
        print("Warning: YOUTUBE_OAUTH_CLIENT_ID environment variable not set")
    else:
        print(f"Using client ID: {client_id[:20]}...")
    
    print(f"Serving at http://localhost:{PORT}")
    with socketserver.TCPServer(("", PORT), InjectingHTTPRequestHandler) as httpd:
        httpd.serve_forever()
