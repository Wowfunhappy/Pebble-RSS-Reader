/*

RSS Reader script for the Pebble Smartwatch. Grab an api key from rss2json.com, and edit the information below to add your own feeds. Then, load the script on your watch with the Simply.js app: http://simplyjs.io/releases/simply-js-v0.3.2-for-fw-v2.0.1.pbw

All Vox Media sites offer full text RSS feeds, just change "index.xml" to "full.xml" in the url. (Thank for being awesome, Vox Media!) For sites that don't offer full text feeds, you may be able to generate one via https://fivefilters.org/content-only

This script was written by Wowfunhappy, and is licensed under the GPLv3, or any later version: https://www.gnu.org/licenses/gpl-3.0.en.html. You can contact me at Wowfunhappy•gmail+com. I hate javascript.

*/



var rss2jsonApiKey = "YourApiKeyGoesHere";

var categories = [{
	title: "News",
	feeds: [{
			title: "Vox",
			url: "https://www.vox.com/rss/full.xml"
		}, {
			title: "NYT Headlines",
			url: "https://www.nytimes.com/services/xml/rss/nyt/HomePage.xml"
		}, {
			title: "Google News",
			url: "http://ftr.fivefilters.org/makefulltextfeed.php?url=https%3A%2F%2Fnews.google.com%2Fnews%2Frss"
		}]
	}, {
	title: "Technology",
	feeds: [{
			title: "The Verge",
			url: "https://www.theverge.com/rss/full.xml"
		}, {
			title: "Ars Technica",
			url: "http://feeds.arstechnica.com/arstechnica/index"
		}, {
			title: "Techcrunch",
			url: "http://feeds.feedburner.com/TechCrunch/"
		}]
	}, {
	title: "Errata",
	feeds: [{
			title: "SBNation",
			url: "http://feeds.feedburner.com/sportsblogs/sbnation.xml"
		}, {
			title: "The Onion",
			url: "http://ftr.fivefilters.org/makefulltextfeed.php?url=https%3A%2F%2Fwww.theonion.com%2Frss"
		}, {
			title: "Eater",
			url: "https://www.eater.com/rss/full.xml"
		}]
}];





/*-----------------------------------------------------------------------------*/



var articleList = [];
var articleNum = 0;
var pageNum = 0;
var getArticlesTimeout;

simply.body(categories[0].title + " ->\n\n" + categories[1].title + " ->\n\n" + categories[2].title + " ->");
simply.on('singleClick', function(e) {
	if (e.button === 'up' && articleList.length < 1) {
		categorySelected(categories[0]);
	}
	else if (e.button === 'select' && articleList.length < 1) {
		categorySelected(categories[1]);
	}
	else if (e.button === 'down' && articleList.length < 1) {
		categorySelected(categories[2]);
	}
});

function categorySelected(category) {
	simply.body(category.feeds[0].title + " ->\n\n" + category.feeds[1].title + " ->\n\n" + category.feeds[2].title + " ->");
	simply.on('singleClick', function(e) {
		if (e.button === 'up' && articleList.length < 1) {
			feedSelected(category.feeds[0].url);
		}
		else if (e.button === 'select' && articleList.length < 1) {
			feedSelected(category.feeds[1].url);
		}
		else if (e.button === 'down' && articleList.length < 1) {
			feedSelected(category.feeds[2].url);
		}
	});
}


function feedSelected(url) {
	getArticles(url, function() {
		displayArticle(articleNum, pageNum);
		simply.on('singleClick', function(e) {
			if (e.button === 'select' || e.button === 'down') {
				if (articleList[articleNum] && pageNum < articleList[articleNum].pages.length - 1) {
					goToNextpage();
				}
				else {
					goToNextArticle();
				}
			}
			else if (e.button === 'back' || e.button === 'up') {
				if (pageNum > 0) {
					goToPrevpage();
				}
				else if (articleNum > 0) {
					goToPrevArticle();
				}
			}
			else if (e.button === 'down') {
			}
		});
		simply.on('longClick', function(e) {
			goToNextArticle();
		});
	});
}

function getArticles(url, firstArticleReady) {
	simply.title(" ");
	simply.subtitle(" ");
	simply.body("        Loading...");
	jsonUrl = "https://api.rss2json.com/v1/api.json?rss_url="+url+"&api_key=" + rss2jsonApiKey;
	getArticlesTimeout = setTimeout(function(){
		/* This timeout is cancelled once a feed has been successfully retrieved. */
		simply.body("We're having trouble retrieving this feed. Please close and try again!");
	}, 5000);
	ajax({ url: jsonUrl }, function(json) {
		json = JSON.parse(json);
		if (json.status === "ok") {
			clearTimeout(getArticlesTimeout);
			var items = json.items;	
			items.forEach(function(item) {
				pages = item.content.split(/<\/p>|[\r\n\t\f\v]+/gim);
				for (var pageNum = 0; pageNum < pages.length; pageNum++) {
					pages[pageNum] = formatText(pages[pageNum]);
					if (pageNum === 0) {
						/* The first page is allowed be much longer. */
						maxCharsPerPage = 1900;
					}
					else {
						/* Whatever number you choose here, the length will never be ideal for all pages,
						due to line wrapping and variable width characters. */
						maxCharsPerPage = 80;
					}
					if (pages[pageNum].length > maxCharsPerPage) {
						firstPart = pages[pageNum].substring(0, maxCharsPerPage)
						laterPart = pages[pageNum].substring(maxCharsPerPage)
						
						/* Prevent page split from occurring mid-word. */
						firstPart = firstPart.split(" ");
						afterLastSpace = firstPart[firstPart.length -1 ];
						laterPart = afterLastSpace + laterPart;
						firstPart.pop(); /*remove afterLastSpace from firstPart*/
						firstPart = firstPart.join(' ');
						
						/* Prevent "widow" pages with very little text. Increases possibility of font shrinkage, but worth the risk. */
						if (laterPart.length > 20) {
							pages[pageNum] = firstPart;
							pages.splice(pageNum + 1, 0, laterPart);
						}
					}
				}
				var article = {
					title: formatText(item.title),
					author: formatText(item.author),
					pages: pages.filter(Boolean) /*filter function removes empty strings from array.*/
				}
				articleList.push(article);
				if (articleList.length === 1)
				{
					firstArticleReady();
				}
			});
		}
		else {
			simply.body("Oh no, The rss2json api isn't working!");
		}
	});
}

function formatText(text) {
	text = text.replace("<a href=\"https://blockads.fivefilters.org/\">Let's block ads!</a></strong> <a href=\"https://blockads.fivefilters.org/acceptable.html\">(Why?)</a>","");
	text = text.replace("<br>", "\n");
	text = text.replace(/<h[\d]>(.*?)<\/h[\d]>/g, String.call.bind("$1".toUpperCase));
	text = text.replace(/<b>(.*?)<\/b>/g, String.call.bind("$1".toUpperCase));
	text = text.replace(/<strong>(.*?)<\/strong>/g, String.call.bind("$1".toUpperCase));
	text = text.replace(/<[^>]*>/g, '');
	text = text.replace( /[ ]{2,}/g, ' ' );
	text = text.replace("&quot;", '"');
	text = text.replace( /&gt/g, '>' );
	text = text.replace( /&lt/g, '<' );
	text = text.replace("&amp;", "&");
	text = text.replace(/^Advertisement$/g,'');
	text = text.trim();
	return text;
}

function goToNextpage() {
	pageNum++;
	displayArticle(articleNum, pageNum);
}

function goToPrevpage() {
	pageNum--;
	displayArticle(articleNum, pageNum);
}

function goToNextArticle() {
	articleNum++;
	pageNum=0;
	displayArticle(articleNum, pageNum);
}

function goToPrevArticle() {
	articleNum--;
	pageNum = 0;
	displayArticle(articleNum, pageNum);
}

function displayArticle(articleNum, pageNum) {
	if (articleNum === articleList.length) {
		/* No more articles */
		simply.body("", true); /* clear screen */
		simply.scrollable(false);
		simply.title("All done!");
		simply.subtitle(" ");
		simply.body("You have reached the end of the feed.");
	}
	else if (articleNum > articleList.length) {
		goToPrevArticle();
	}
	else {
		simply.body(" ", true); /* Clear screen */
		article = articleList[articleNum];
		if (pageNum == 0) {
			simply.scrollable(true);
			simply.title(article.title);
			if (article.author) {
				simply.subtitle("by " + article.author);
			}
				simply.body(article.pages[pageNum]);
			if (articleNum == 0) {
				simply.buttonConfig({back: false});
			}
			else {
				simply.buttonConfig({back: true});
			}
		}
		else {
			simply.scrollable(false);
			simply.body(article.pages[pageNum]);
			simply.buttonConfig({back: true});
		}
	}
}