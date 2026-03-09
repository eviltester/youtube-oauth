import urllib.request
import xml.etree.ElementTree as ET
from typing import List, Dict, Any


def get_rss_feed(channel_id: str) -> Dict[str, Any]:
    """
    Fetch and parse RSS feed for a YouTube channel.
    
    Args:
        channel_id: YouTube channel ID
        
    Returns:
        Dictionary with channelTitle and videos list
    """
    feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    
    req = urllib.request.Request(
        feed_url,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    
    with urllib.request.urlopen(req, timeout=30) as response:
        xml_content = response.read().decode("utf-8")
    
    return _parse_rss_xml(xml_content)


def _parse_rss_xml(xml_content: str) -> Dict[str, Any]:
    """Parse RSS XML content and extract video information."""
    root = ET.fromstring(xml_content)
    
    ns = {
        "yt": "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
        "": "http://www.w3.org/2005/Atom"
    }
    
    channel_title = _get_element_text(root, "title", ns) or ""
    
    videos = []
    for entry in root.findall(".//entry", ns):
        video = _parse_entry(entry, ns)
        if video:
            videos.append(video)
    
    return {
        "channelTitle": channel_title,
        "videos": videos
    }


def _parse_entry(entry: ET.Element, ns: Dict[str, str]) -> Dict[str, Any] | None:
    """Parse a single RSS entry element."""
    video_id_el = entry.find("yt:videoId", ns)
    if video_id_el is None:
        return None
    
    video_id = video_id_el.text or ""
    
    title = _get_element_text(entry, "title", ns) or ""
    
    link_el = entry.find("link", ns)
    link = link_el.get("href") if link_el is not None else ""
    is_short = "/shorts/" in link
    
    published_at = _get_element_text(entry, "published", ns) or ""
    
    thumbnail = ""
    thumbnail_el = entry.find(".//media:thumbnail", ns)
    if thumbnail_el is not None:
        thumbnail = thumbnail_el.get("url", "")
    if not thumbnail and video_id:
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    
    description = _get_element_text(entry, "media:description", ns) or ""
    
    return {
        "videoId": video_id,
        "title": title,
        "description": description,
        "thumbnail": thumbnail,
        "publishedAt": published_at,
        "isShort": is_short
    }


def _get_element_text(element: ET.Element, tag: str, ns: Dict[str, str]) -> str | None:
    """Get text content from an element with namespace support."""
    el = element.find(tag, ns)
    return el.text if el is not None else None
