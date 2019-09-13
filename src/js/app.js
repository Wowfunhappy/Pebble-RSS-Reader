// require('pebblejs');
var UI = require('ui');
var ajax = require('ajax');
var Settings = require('settings');

var blackStatusBar = {
	color: "white",
	backgroundColor: "black",
	separator: 'none'
}

var defaultFeeds = [{
	title: "Vox",
	url: "https://www.vox.com/rss/full.xml"
	},{
	title: "The Atlantic",
	url: "https://www.theatlantic.com/feed/all"
	},{
	title: "Vice News",
	url: "http://news.vice.com/rss"
	},{
	title: "Time Magazine",
	url: "http://feeds2.feedburner.com/time/topstories"
	},{
	title: "The Verge",
	url: "https://www.theverge.com/rss/full.xml"
	},{
	title: "Techcrunch",
	url: "http://feeds.feedburner.com/TechCrunch/"
	},{
	title: "SBNation",
	url: "http://feeds.feedburner.com/sportsblogs/sbnation.xml"
	},{
	title: "Eater",
	url: "https://www.eater.com/rss/full.xml"
	}];

Settings.config({url: 'https://wowfunhappy.github.io/Pebble-RSS-Reader/', hash: true}, function(){
	console.log("opened configurable");
	if (Settings.option().feeds.length < 1) {
		Settings.option("feeds", defaultFeeds);
	}
}, function(){
	console.log("closed configurable");
});

/*-----------------------------------------------------------------------------*/

selectFeed();

function selectFeed()
{
	/*Overwrite default feeds with what user input in Settings.*/
	if (Settings.option().feeds.length > 0) {
		feeds = Settings.option().feeds;
		console.log()
	}
	else {
		feeds = defaultFeeds;
	}

	feedSelectMenu = new UI.Menu({
		status: false,
		sections: [{
			title: "Select Feed:",
			items: feeds
		}]
	});

	feedSelectMenu.show();

	feedSelectMenu.on('select', function(e) {
		getArticles(feeds[e.itemIndex]);
	});
}

function getArticles(feed) {
	var shouldCancel = false;
	loadingCard = new UI.Card({status: blackStatusBar});
	loadingCard.title(" ");
	loadingCard.subtitle(" ");
	loadingCard.body("        Loading...");
	loadingCard.show();
	articleList = [];
	jsonUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + feed.url;
	rss2jsonApiKey = Settings.option().rss2jsonApiKey;
	if (rss2jsonApiKey !== "") {
		jsonUrl = jsonUrl + "&api_key=" + rss2jsonApiKey + "&count=100";
	}
	ajax({ url: jsonUrl }, function(json) {
		json = JSON.parse(json);
		if (json.status === "ok" && !shouldCancel) {
			items = json.items; 
			items.forEach(function(item) {
				article = {
					title: formatText(item.title),
					author: formatText(item.author),
					pages: makePages(item.content)
				};
				articleList.push(article);
				if (articleList.length === json.items.length) {
					if (! shouldCancel) {
						selectArticle(articleList, feed.title);
					}
					loadingCard.hide();
					return;
				}
			});
		}
		else {
			if (rss2jsonApiKey === "") {
				problemCard.body("Cannot retrieve articles. Try generating an api key at rss2json.com, and adding it in Settings.");
			}
			else {
				problemCard.body("Cannot retrieve articles. The rss2json api isn't working.");
			}
			problemCard.show();
		}
	});
	loadingCard.on('click', 'back', function() {
		/* User returned to menu while article was loading. */
		shouldCancel = true;
	});
}

function makePages(content) {
	paragraphs = content.split(/<\/p>|[\r\n\t\f\v]+/gim);
	for (paragraphNum = 0; paragraphNum < paragraphs.length; paragraphNum++) {
		paragraphs[paragraphNum] = formatText(paragraphs[paragraphNum]);
	}
	paragraphs = paragraphs.filter(Boolean); //remove empty strings from array

	pages = [];
	for (paragraphNum = 0; paragraphNum < paragraphs.length; paragraphNum++) {
		if (paragraphNum === 0) {
			// The first page is allowed be much longer. However, PebbleJS exhibits odd behavior once page length nears ~2,000 characters.
			pages = processParagraphs(pages, 1800, paragraphs[paragraphNum]);
		}
		else {
			// Whatever number you choose for maxCharsPerPage will never be ideal for all pages, due to line wrapping and variable width characters.
			pages = processParagraphs(pages, 80, paragraphs[paragraphNum]);
		}
	}
	return pages;
}

function processParagraphs(pageArr, maxCharsPerPage, content) {
	firstPart = content.substring(0, maxCharsPerPage);
	laterPart = content.substring(maxCharsPerPage);

	if (laterPart.length > 45) { //Not "0" to prevent short widow pages at the end of paragraphs, at the cost of greatly increasing likelihood of font shrinkage.

		//Prevent page split from occurring mid-word.
		firstPart = firstPart.split(" ");
		afterLastSpace = firstPart[ firstPart.length - 1 ];
		laterPart = afterLastSpace + laterPart;
		firstPart.pop(); //remove afterLastSpace from firstPart
		firstPart = firstPart.join(' ');

		firstPart = firstPart + String.fromCharCode(160) + "›";
		laterPart = "‹" + String.fromCharCode(160) + laterPart;

		pageArr.push(firstPart);
		pageArr.concat(processParagraphs(pageArr, maxCharsPerPage, laterPart));
	}
  	else {
  		pageArr.push(content);
    }
    return pageArr;
}


function formatText(text) {
	/* Useful: https://www.i18nqa.com/debug/utf8-debug.html */
	if(!text) {
		return "";
	}
	else {
		//text = text.replace(/<p><strong><a href="https:\/\/blockads\.fivefilters\.org\/">Let's block ads!<\/a><\/strong> <a href="https:\/\/blockads\.fivefilters\.org\/acceptable\.html">\(Why\?\)<\/a><\/p>/g,"");
		text = text.replace(/<br>/g, "\n");
		text = text.replace(/<caption.*?>.*?<\/caption>/g, "");
		text = text.replace(/<figcaption.*?>.*?<\/figcaption>/g, "");
		text = text.replace(/<small.*?>.*?<\/small>/g, "");
		text = text.replace(/<cite.*?>.*?<\/cite>/g, "");
		text = text.replace(/<.*? .*?class=".*?caption.*?".*?>.*?<\/.*?>/g, "");
		text = text.replace(/<.*? .*?class=".*?credit.*?".*?>.*?<\/.*?>/g, "");
		text = text.replace(/<.*? .*?data-id="injected-recirculation-link".*?>.*?<\/.*?>/g, "");
		// text = text.replace(/<\/{0,1}blockquote.*?>/g, "\"");
		text = text.replace(/<[^>]*>/g, '');
		text = text.replace(/[ ]{2,}/g, ' '); //Remove multiple spaces
		text = text.replace(/&nbsp;/g, " ");

		//text = text.replace(/[“”]/g, '"');
		text = text.replace(/&quot;/g, '"');
		text = text.replace(/&[lr]dquo;/g, '"');
		//text = text.replace(/&#822[0-1];/g, '"');

		// text = text.replace(/[‘’]/g, "'");
		// text = text.replace(/â€(™|˜)/, "'");
		text = text.replace(/&[lr]squo;/g, "'");
		text = text.replace(/&#821[6-9];/g, "'");

		text = text.replace(/&mdash;/g, "—");
		//text = text.replace(/&#8212;/g, "—");
		text = text.replace(/&ndash;/g, "–");
		//text = text.replace(/&#8211;/g, "—");

		text = text.replace(/&hellip;/g, "…");
		//text = text.replace(/&#8230;/g, "…");

		text = text.replace(/&gt;/g, '>');
		text = text.replace(/&lt;/g, '<');

		text = text.replace(/&amp;/g, "&");
		text = text.replace(/^[<>[\]]*$/g,'');
		text = text.replace(/^Advertisement$/g,'');
		text = text.replace(/^Let's block ads! \(Why\?\)$/g,'');
		text = text.replace(/^Read More[:]{0,1}[ ]{0,1}$/g,'');
		text = text.trim();
		return text;
	}
}

var articleSelectMenu = {};
function selectArticle(articleList, heading) {
	articleSelectMenu = new UI.Menu({
		status: false,
		sections: [{
			title: heading,
			items: articleList
		},
		{
			title: " –––––––––––––––",
			items: [{
				title: "  ‹  Change Feed",
			}]
		}]
	});

	articleSelectMenu.show();

	articleSelectMenu.on("select", function(e) {
		removeOldPages();
		if (e.sectionIndex === 0) {
			displayArticlePage(articleList, e.itemIndex, 0);
		}
		else {
			articleSelectMenu.hide();
		}
	});
}

var articlePageHistory = [];
function displayArticlePage(articleList, articleNum, pageNum) {
	article = articleList[articleNum];
	articleCard = new UI.Card({status: blackStatusBar});
	if (pageNum === 0) {
		articleCard.scrollable(true);
		articleCard.title(article.title);
		if (article.author) {
			articleCard.subtitle("by " + article.author);
		}
		articleCard.body(article.pages[pageNum]);
		if (pageNum < article.pages.length - 1) {
			articleCard.action({
				up: 'images/action_up.png',
				select: "images/action_next.png",
				down: 'images/action_down.png'
			});
		}
		else {
			articleCard.action({
				up: 'images/action_up.png',
				select: "images/action_check.png",
				down: 'images/action_down.png'
			});
		}
	}
	else {
		articleCard.scrollable(false);
		articleCard.body(article.pages[pageNum]);
		articleCard.action(false);
	}

	articleCard.show();
	articlePageHistory.push(articleCard);

	articleCard.on('click', function(e) {
		if (e.button === 'select' || e.button === 'down') {
			if (pageNum < article.pages.length - 1) {
				displayArticlePage(articleList, articleNum, pageNum + 1);
			}
			else {
				articleSelectMenu.show();
				articleSelectMenu.selection(0, articleNum + 1);
			}
		}
		else if (e.button === 'up' || e.button === 'back') {
			articleCard.hide();
		}
	});
	articleCard.on('longClick', 'select', function() {
		articleSelectMenu.show();
	});
}

function removeOldPages() {
	if (articlePageHistory.length > 1) {
		for (i = 0; i < articlePageHistory.length; i++) {
			articlePageHistory[i].hide();
		}
	}
}