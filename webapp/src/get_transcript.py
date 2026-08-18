import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def fetch_transcript(video_id):
    try:
        ytt = YouTubeTranscriptApi()
        try:
            snippets = ytt.fetch(video_id, languages=['pt', 'pt-BR'])
        except Exception:
            snippets = ytt.fetch(video_id)
        
        full_text = " ".join([s.text for s in snippets if s.text])
        full_text = " ".join(full_text.split())
        print(json.dumps({"success": True, "transcript": full_text}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "transcript": ""}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        fetch_transcript(sys.argv[1])
    else:
        print(json.dumps({"success": False, "error": "No video_id provided", "transcript": ""}))
