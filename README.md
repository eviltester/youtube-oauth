# youtube-oauth

Experiments using Youtube Oauth

## Subscribed videos view

Youtube have started rolling out changes to the subscription view.

I need a list view with more details.

Create a web server in the folder

`python -m http.server`

Start the page.

Instructions for creating an app in the Google console are shown on screen.

Make a note of your client id when you create the app in the console.

No details are stored by the app locally so you have to log in each time.

## server.py. Usage:

Or use `server.py` and store your client id in an environment variable.

```
YOUTUBE_OAUTH_CLIENT_ID=your-client-id python server.py
```

Then open http://localhost:8000 - the client ID will be pre-filled automatically.