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
	title: "ProPublica",
	url: "http://feeds.propublica.org/propublica/main"
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
	title: "Curbed",
	url: "https://www.curbed.com/rss/full.xml"
	}];

Settings.config({url: 'https://wowfunhappy.github.io/Pebble-RSS-Reader/', hash: true}, function(){
	if (typeof Settings.option().feeds === 'undefined' || Settings.option().feeds.length < 1) {
		Settings.option("feeds", defaultFeeds);
	}
}, function(){
	feedSelectMenu.hide(); // Will likely close app
});

/*-----------------------------------------------------------------------------*/

var articleSelectMenuExists = false;
var feedSelectMenu;
var loadingCardVisible;
var lastSeenArticleCard = {};
var articleSelectMenu = {};

selectFeed();

if (typeof Settings.data('welcomeScreenCompleted') === 'undefined') {
	welcomeScreen();
}
else {
	if (allSavedInfoExists()) {
		displayArticlePage(Settings.data('savedArticleList'), Settings.data('savedArticleNum'), Settings.data('savedPageNum'));
	}
}

function removeSavedInfo() {
	Settings.data('savedArticleList', undefined);
	Settings.data('savedArticleNum', undefined);
	Settings.data('savedPageNum', undefined);
	//savedFeed is NOT removed!
}
function allSavedInfoExists() {
	if (typeof Settings.data('savedFeed') === 'undefined' || typeof Settings.data('savedArticleList') === 'undefined' || typeof Settings.data('savedArticleNum') === 'undefined' || typeof Settings.data('savedPageNum') === 'undefined') {
		return false;
	}
	else {
		return true;
	}
}
function saveCurrPage(articleCard, articleList, articleNum, pageNum) {
		Settings.data('savedArticleList', articleList);
		Settings.data('savedArticleNum', articleNum);
		Settings.data('savedPageNum', pageNum);
		lastSeenArticleCard = articleCard;
}

function selectFeed() {

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

	feedSelectMenu.on('longSelect', function() {
		welcomeScreen();
	});

	lastSeenArticleCard = {};
	feedSelectMenu.on('show', function(){
		lastSeenArticleCard = {};
	})
}

function getArticles(feed) {
	loadingCard = new UI.Card({status: blackStatusBar});
	loadingCard.title(" ");
	loadingCard.subtitle(" ");
	if (Feature.round()) {
		loadingCard.body("Loading..."); //This will get centered automatically on the Round.
	}
	else {
		loadingCard.body("        Loading...");
	}
	loadingCard.show();
	loadingCardVisible = true;
	
	Settings.data('savedFeed', feed);
	
	articleList = [];
	jsonUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);

	var rss2jsonApiKey = "";
	if (typeof Settings.option().rss2jsonApiKey !== 'undefined') {
		rss2jsonApiKey = Settings.option().rss2jsonApiKey;
		jsonUrl = jsonUrl + "&api_key=" + rss2jsonApiKey + "&count=100";
	}

	ajax({ url: jsonUrl }, function(json) {
		json = JSON.parse(json);
		if (json.status === "ok") {
			items = json.items; 
			items.forEach(function(item) {
				article = {
					title: formatText(item.title),
					author: formatText(item.author),
					pages: makePages(item.content)
				};
				articleList.push(article);
				if (articleList.length === json.items.length) {
					if (loadingCardVisible) {
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
	/* Handle case where user returned to menu while article was loading. */
	loadingCard.on('hide', function() {
		loadingCardVisible = false;
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
		if (paragraphNum === 0) {
			// The first page is allowed be much longer. However, PebbleJS exhibits odd behavior once page length nears ~2,000 characters.
			pages = splitTextCleanly(pages, 1800, 0, true, paragraphs[paragraphNum]);
		}
		else {
			if (! Feature.round()) {
				// Whatever number you choose for maxCharsPerPage will never be ideal for all pages, due to line wrapping and variable width characters.
				pages = splitTextCleanly(pages, 80, 45, true, paragraphs[paragraphNum]);
			}
			else {
				// Time round cannot display as many characters.
				pages = splitTextCleanly(pages, 72, 0, true, paragraphs[paragraphNum]);
			}
		}
	}
	return pages;
}

function splitTextCleanly(pageArr, maxCharsPerPage, maxCharsExtension, includeContinuedIndicator, content) {
	firstPart = content.substring(0, maxCharsPerPage);
	laterPart = content.substring(maxCharsPerPage);

	if (laterPart.length > maxCharsExtension) { //maxCharsExtension prevents short widow pages at the end of paragraphs, at cost of more font shrinkage.

		//Prevent page split from occurring mid-word.
		firstPart = firstPart.split(' ');
		if (firstPart.length > 1) { //If firstPart contains a space.
			afterLastSpace = firstPart[ firstPart.length - 1 ];
			laterPart = afterLastSpace + laterPart;
			firstPart.pop(); //remove afterLastSpace from firstPart
			firstPart = firstPart.join(' ');
	
			if (includeContinuedIndicator) {
				firstPart = firstPart + String.fromCharCode(160) + "›"; // CharCode 160 is a nonbreaking space.
				laterPart = "‹" + String.fromCharCode(160) + laterPart;
			}
		}
		else {
			//There are no spaces.
			if (includeContinuedIndicator) {
				firstPart = firstPart[0] + "…";
				laterPart = "…" + laterPart;
			}
			else {
				firstPart = firstPart[0];
			}
		}
		pageArr.push(firstPart);
		pageArr.concat(splitTextCleanly(pageArr, maxCharsPerPage, maxCharsExtension, includeContinuedIndicator, laterPart));
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
		text = text.replace(/<aside.*?>.*?<\/aside>/gi, "");
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

		text = text.replace(/&ndash;/gi, "–");
		text = text.replace(/&mdash;/gi, "—");
		text = text.replace(/—/gi, String.fromCharCode(8203) + "—" + String.fromCharCode(8203)); //Insert zero width spaces before and after mdash's, to allow line breaks.

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

function selectArticle(articleList, heading) {
	/*articleDisplayTitles = [];
	if (! Feature.round()) {
		for (i = 0; i < articleList.length; i++) {
			currTitle = [];
			splitTextCleanly(currTitle, 17, 0, false, articleList[i].title);

			articleDisplayTitles.push({
				title: currTitle[0],
				subtitle: currTitle.slice(1, currTitle.length).join(' ')
			});
		}
	}
	else {
		articleDisplayTitles = articleList;
	}*/

	articleSelectMenu = new UI.Menu({
		status: false,
		sections: [{
			title: heading,
			items: articleList
		}]
	});

	articleSelectMenu.show();
	articleSelectMenuExists = true;
	removeSavedInfo();

	articleSelectMenu.on("select", function(e) {
		displayArticlePage(articleList, e.itemIndex, 0);
	});
	articleSelectMenu.on("longSelect", function() {
		if (Object.keys(lastSeenArticleCard).length !== 0) {
			lastSeenArticleCard.show();
		}
	})
	
	articleSelectMenu.on('show', function() {
		setTimeout(function(){
			//PebbleJS has a tendency to crash here, with certain articles. (The Atlantic is particularly troublesome.)
			//I can't fix the crash because it's not my code, but I can wait a bit before removing savedInfo to make it less painful.
			removeSavedInfo();
		}, 950);
	});
}

function displayArticlePage(articleList, articleNum, pageNum) {
	article = articleList[articleNum];
	articleCard = new UI.Card({status: blackStatusBar});
	if (pageNum === 0) {
		articleCard.scrollable(true);
		articleCard.title(article.title);
		if (article.author && article.pages[0].indexOf(article.author) === -1) { //If the article has an author which isn't repeated in the first page of the body
			if (article.author.lastIndexOf("by ") === 0) { //If the article's author string starts with "by "
				articleCard.subtitle(article.author);
			}
			else {
				articleCard.subtitle("by " + article.author);
			}
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
	
	saveCurrPage(articleCard, articleList, articleNum, pageNum);
	articleCard.on('show', function() {
		saveCurrPage(articleCard, articleList, articleNum, pageNum);
	});

	articleCard.on('click', function(e) {
		if (e.button === 'select' || e.button === 'down') {
			if (pageNum < article.pages.length - 1) {
				displayArticlePage(articleList, articleNum, pageNum + 1);
			}
			else {
				if (articleSelectMenuExists) {
					articleSelectMenu.show();
					articleSelectMenu.selection(0, articleNum + 1); //Note: will leave wrong story selected if feed was updated since article was saved.
				}
				else {
					getArticles(Settings.data('savedFeed'));
				}
			}
		}
		if (e.button === 'up' || e.button === 'back') {
			if (pageNum > 0) {
				displayArticlePage(articleList, articleNum, pageNum - 1);
			}
			else {
				if (articleSelectMenuExists) {
					articleSelectMenu.show();
					articleSelectMenu.selection(0, articleNum); //Note: will leave wrong story selected if feed was updated since article was saved.
				}
				else {
					getArticles(Settings.data('savedFeed'));
				}
			}
		}
		this.hide();
	});
	articleCard.on('longClick', 'select', function() {
		if (articleSelectMenuExists) {
			articleSelectMenu.show();
			articleSelectMenu.selection(0, articleNum); //Note: will leave wrong story selected if feed was updated since article was saved.
		}
		else {
			getArticles(Settings.data('savedFeed'));	
		}
		this.hide();
	});
	
	//Hack to override back button so PebbleJS lets us handle it above.
	articleCard.on('click', 'back', function(){});
}

/*-----------------------------------------------------------------------------*/

/*There are many cleverer ways I could have written this welcome sequence. However, this way was the easiest.*/

function welcomeScreen() {
	switch(Settings.data('lastSeenWelcomeScreenNum')) {
		default:
			welcomeScreen1();
			break;
		case 2:
			welcomeScreen2();
			break;
		case 3:
			welcomeScreen3();
			break;
		case 4:
			welcomeScreen4();
			break;
		case 5:
			welcomeScreen5();
			break;
		case 6:
			welcomeScreen6();
			break;
		case 7:
			welcomeScreen7();
			break;
	}
}

function welcomeScreen1() {
	Settings.data('lastSeenWelcomeScreenNum', 1);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.scrollable(true);
	welcomeCard.action({
		up: 'images/action_up.png',
		select: "images/action_next.png",
		down: 'images/action_down.png'
	});	

	welcomeCard.body("Welcome to the Pebble RSS Reader!\n\nBefore you start reading articles, there's a few things you should know!");
	welcomeCard.show();

	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('click', 'select', function() {
		welcomeScreen2();
		this.hide();
	});
	welcomeCard.on('longClick', function(e) {if (e.button === 'select') {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();}});
}

function welcomeScreen2() {
	Settings.data('lastSeenWelcomeScreenNum', 2);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.body("Press the BACK or UP buttons to return to the previous page.\n\nPress the SELECT or DOWN buttons to go to the next page.");
	welcomeCard.show();
	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('longClick', function(e) {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();this.hide();});
	welcomeCard.on('click', function(e) {if (e.button === 'up' || e.button === 'back') {welcomeScreen1();this.hide();}if (e.button === 'select' || e.button === 'down') {welcomeScreen3();this.hide();}});
}

function welcomeScreen3(){
	Settings.data('lastSeenWelcomeScreenNum', 3);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.body("Some paragraphs are too long to fit on a single page. If you see a symbol at the end of a page, it ›");
	welcomeCard.show();
	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('longClick', function(e) {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();this.hide();});
	welcomeCard.on('click', function(e) {if (e.button === 'up' || e.button === 'back') {welcomeScreen2();this.hide();}if (e.button === 'select' || e.button === 'down') {welcomeScreen4();this.hide();}});
}

function welcomeScreen4(){
	Settings.data('lastSeenWelcomeScreenNum', 4);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.body("‹ means that the current paragraph will be continued on the next page.");
	welcomeCard.show();
	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('longClick', function(e) {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();this.hide();});
	welcomeCard.on('click', function(e) {if (e.button === 'up' || e.button === 'back') {welcomeScreen3();this.hide();}if (e.button === 'select' || e.button === 'down') {welcomeScreen5();this.hide();}});
}

function welcomeScreen5(){
	Settings.data('lastSeenWelcomeScreenNum', 5);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.body("Hold down the BACK button to exit the app. We'll remember where you left off.");
	welcomeCard.show();
	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('longClick', function(e) {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();this.hide();});
	welcomeCard.on('click', function(e) {if (e.button === 'up' || e.button === 'back') {welcomeScreen4();this.hide();}if (e.button === 'select' || e.button === 'down') {welcomeScreen6();this.hide();}});
}

function welcomeScreen6(){
	Settings.data('lastSeenWelcomeScreenNum', 6);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.body("Hold down the SELECT button to open the menu. Do it again to return to what you were reading.");
	welcomeCard.show();
	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('longClick', function(e) {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();this.hide();});
	welcomeCard.on('click', function(e) {if (e.button === 'up' || e.button === 'back') {welcomeScreen5();this.hide();}if (e.button === 'select' || e.button === 'down') {welcomeScreen7();this.hide();}});
}

function welcomeScreen7(){
	Settings.data('lastSeenWelcomeScreenNum', 7);
	welcomeCard = new UI.Card({status: blackStatusBar});
	welcomeCard.body("That's all for now! Open the menu to choose a feed.");
	welcomeCard.show();
	welcomeCard.on('click', 'back', function(){}); //Disable back button.
	welcomeCard.on('click', function(e) {if (e.button === 'up' || e.button === 'back') {welcomeScreen6();this.hide();}});
	welcomeCard.on('longClick', function(e) {Settings.data('welcomeScreenCompleted', true);feedSelectMenu.show();this.hide();});
}