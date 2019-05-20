# Pebble-RSS-Reader
A full-text RSS Reader for the Pebble Smartwatch. Uses SimplyJS, because CloudPebble is gone and I couldn't get pebble.js to work in the SDK.

To use:
1. Install the SimplyJS app on your Pebble, from the Pebble/Rebble app store.
2. Copy and paste the contents of pebble-rss-reader.js into a new [Gist](https://gist.github.com).
3. Grab an API key from rss2json.com, and paste it into the script where it says `YourApiKeyGoesHere`
4. Replace the existing categories and RSS feeds in the file with your own. This should be self explanatory, but please feel free to ask for help if you need it.
5. Save the Gist and click "View Raw". Paste that URL into the SimplyJS app's settings.

I made this because seemingly none of the existing RSS readers for the Pebble work as of 2019, except for xNews, which only displays the first few sentences. By contrast, if you feed this script a full-text RSS feed, you will be able to read the entire thing on your smartwatch. This is very useful in social situations where pulling out your phone would be rude, but furtively looking at your watch will go unnoticed. ;)

Finding full-text feeds can be a bit tricky in 2019. They're available on all Vox Media sites by changing "index.xml" to "full.xml" in the url, and a few others as well, like TechCrunch. For sites without full-text feeds, you may be able to use https://fivefilters.org/content-only to generate one. If you'd prefer only headlines, those types of feeds should work fine as well!

Feel free to create an issue if something isn't working, or if you need help.
