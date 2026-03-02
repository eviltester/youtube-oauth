import os
import http.server
import socketserver
import json
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urlparse, parse_qs

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
        
        elif self.path.startswith("/api/rss"):
            self.handle_rss_feed()
        
        else:
            super().do_GET()

    def handle_rss_feed(self):
        parsed = urlparse(self.path)
        query_params = parse_qs(parsed.query)
        channel_id = query_params.get("channel_id", [None])[0]

        if not channel_id:
            self.send_response(400)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "channel_id required"}).encode())
            return

        feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

        try:
            req = urllib.request.Request(
                feed_url,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                xml_content = response.read().decode("utf-8")

            root = ET.fromstring(xml_content)
            
            ns = {"yt": "http://www.youtube.com/xml/schemas/2015", 
                  "media": "http://search.yahoo.com/mrss/",
                  "": "http://www.w3.org/2005/Atom"}

            channel_title = root.find("title", ns) or root.find("title")
            if channel_title is None:
                channel_title = ""
            else:
                channel_title = channel_title.text or ""

            videos = []
            for entry in root.findall(".//entry", ns):
                video_id_el = entry.find("yt:videoId", ns)
                if video_id_el is None:
                    continue
                video_id = video_id_el.text or ""

                title_el = entry.find("title", ns)
                title = title_el.text if title_el is not None else ""

                link_el = entry.find("link", ns)
                link = link_el.get("href") if link_el is not None else ""
                is_short = "/shorts/" in link

                published_el = entry.find("published", ns)
                published_at = published_el.text if published_el is not None else ""

                thumbnail = ""
                thumbnail_el = entry.find("media:thumbnail", ns)
                if thumbnail_el is not None:
                    thumbnail = thumbnail_el.get("url", "")

                description = ""
                desc_el = entry.find("media:description", ns)
                if desc_el is not None:
                    description = desc_el.text or ""

                videos.append({
                    "videoId": video_id,
                    "title": title,
                    "description": description,
                    "thumbnail": thumbnail,
                    "publishedAt": published_at,
                    "isShort": is_short
                })

            result = {
                "channelTitle": channel_title,
                "videos": videos
            }

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

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
