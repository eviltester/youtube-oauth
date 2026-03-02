A simple app for viewing youtube subscriptions:

- information (subscriptions, videos) is cached in the browser at the moment - this is to prevent the API calls running out of credits


TODO:

- [] split shorts and videos into a different view
- [] Use RSS feed to get back the list of new videos as the main approach, drop down to API if it fails - this would allow the app to function even if the API key is out of date but subscription cache still exists
- [] allow offline caching e.g. file based, from server - toggle when page is started
- [] single page is getting a little large, split the javascript into sensible included .js files from a /js directory


DONE:

- [x] create a simple server wrapper for running the single page app and manage Client Key as Environment variable
