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

## Google Cloud Setup

1.  Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2.  Create a new project or select an existing one
3.  Enable the **YouTube Data API v3**
4.  Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5.  Choose "Web application" as the application type
6.  Add `http://localhost` and `http://127.0.0.1` to "Authorized JavaScript origins"
7.  Add `http://localhost` and `http://127.0.0.1` to "Authorized redirect URIs"
8.  Copy your Client ID and paste it into the form in the app, or setup the environment variable

`YOUTUBE_OAUTH_CLIENT_ID` for `server.py` usage

## `server.py` Usage

Or use `server.py` and store your client id in an environment variable.

```
YOUTUBE_OAUTH_CLIENT_ID=your-client-id python server.py
```

Then open http://localhost:8000 - the client ID will be pre-filled automatically.