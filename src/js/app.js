// require('pebblejs');
var UI = require('ui');
var ajax = require('ajax');
var Settings = require('settings');
var Feature = require('platform/feature');

var blackStatusBar = {
	color: "white",
	backgroundColor: "black",
	separator: 'none'
};

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
	if (typeof Settings.option().feeds === 'undefined' || Settings.option().feeds.length < 1) {
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
	if (typeof Settings.option().feeds !== 'undefined' && Settings.option().feeds.length > 0) {
		feeds = Settings.option().feeds;
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
	if (Feature.round()) {
		loadingCard.body("Loading..."); //This should get centered automatically on the Round.
	}
	else {
		loadingCard.body("        Loading...");
	}
	loadingCard.show();
	articleList = [];
	jsonUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + feed.url;

	var rss2jsonApiKey = "";
	if (typeof Settings.option().rss2jsonApiKey !== 'undefined') {
		rss2jsonApiKey = Settings.option().rss2jsonApiKey;
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
	paragraphs = content.split(/<\/p>|<br>|[\r\n\t\f\v]+/gim);
	for (paragraphNum = 0; paragraphNum < paragraphs.length; paragraphNum++) {
		paragraphs[paragraphNum] = formatText(paragraphs[paragraphNum]);
	}
	paragraphs = paragraphs.filter(Boolean); //remove empty strings from array

	pages = [];
	for (paragraphNum = 0; paragraphNum < paragraphs.length; paragraphNum++) {
		if (! Feature.round()) {
			if (paragraphNum === 0) {
				// The first page is allowed be much longer on square devices. However, PebbleJS exhibits odd behavior once page length nears ~2,000 characters.
				pages = processParagraphs(pages, 1800, 0, paragraphs[paragraphNum]);
			}
			else {
				// Whatever number you choose for maxCharsPerPage will never be ideal for all pages, due to line wrapping and variable width characters.
				pages = processParagraphs(pages, 80, 45, paragraphs[paragraphNum]);
			}
		}
		else {
			if (paragraphNum === 0) {
				// On the round, make first page only include title and author on first page.
				pages = processParagraphs(pages, 1800, 0, paragraphs[paragraphNum]);
			}
			else {
				// Time round cannot display as many characters.
				pages = processParagraphs(pages, 72, 0, paragraphs[paragraphNum]);
			}
		}
	}
	return pages;
}

function processParagraphs(pageArr, maxCharsPerPage, maxCharsExtension, content) {
	firstPart = content.substring(0, maxCharsPerPage);
	laterPart = content.substring(maxCharsPerPage);

	if (laterPart.length > maxCharsExtension) { //maxCharsExtension prevents short widow pages at the end of paragraphs, at cost of more font shrinkage.

		//Prevent page split from occurring mid-word.
		firstPart = firstPart.split(" ");
		//console.log(firstPart);
		if (firstPart.length > 1) {
			afterLastSpace = firstPart[ firstPart.length - 1 ];
			laterPart = afterLastSpace + laterPart;
			firstPart.pop(); //remove afterLastSpace from firstPart
			firstPart = firstPart.join(' ');
	
			firstPart = firstPart + String.fromCharCode(160) + "›";
			laterPart = "‹" + String.fromCharCode(160) + laterPart; 
		}
		else {
			firstPart = firstPart[0] + "..." + String.fromCharCode(160) + "›";
		}
		pageArr.push(firstPart);
		pageArr.concat(processParagraphs(pageArr, maxCharsPerPage, maxCharsExtension, laterPart));
	}
  	else {
  		pageArr.push(content);
    }
    return pageArr;
}


function formatText(text) {
	if(!text) {
		return "";
	}
	else {
		text = text.replace(/<caption.*?>.*?<\/caption>/gi, "");
		text = text.replace(/<figcaption.*?>.*?<\/figcaption>/gi, "");
		text = text.replace(/<small.*?>.*?<\/small>/gi, "");
		text = text.replace(/<cite.*?>.*?<\/cite>/gi, "");

		text = text.replace(/<.*? .*?class=".*?caption.*?".*?>.*?<\/.*?>/gi, "");
		text = text.replace(/<.*? .*?class=".*?credit.*?".*?>.*?<\/.*?>/gi, "");
		text = text.replace(/<.*? .*?data-id="injected-recirculation-link".*?>.*?<\/.*?>/gi, "");
		text = text.replace(/<[^>]*>/gi, ''); //Remove html tags.
		text = text.replace(/[ ]{2,}/gi, ' '); //Remove multiple spaces
		text = text.replace(/&nbsp;/gi, " ");

		text = text.replace(/&quot;/gi, '"');
		text = text.replace(/&[lr]dquo;/gi, '"');
		text = text.replace(/&[lr]squo;/gi, "'");

		text = text.replace(/&mdash;/gi, "—");
		text = text.replace(/&ndash;/gi, "–");

		text = text.replace(/&hellip;/gi, "…");

		text = text.replace(/&gt;/gi, '>');
		text = text.replace(/&lt;/gi, '<');

		text = text.replace(/&amp;/gi, "&");

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
		if (e.button === 'up' || e.button === 'back') {
			this.hide();
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