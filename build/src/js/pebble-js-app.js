var __loader = (function() {

var loader = {};

loader.packages = {};

loader.packagesLinenoOrder = [{ filename: 'loader.js', lineno: 0 }];

loader.extpaths = ['?', '?.js', '?.json', '?/index.js'];

loader.paths = ['/', 'lib', 'vendor'];

loader.basepath = function(path) {
  return path.replace(/[^\/]*$/, '');
};

var replace = function(a, regexp, b) {
  var z;
  do {
    z = a;
  } while (z !== (a = a.replace(regexp, b)));
  return z;
};

loader.normalize = function(path) {
  path = replace(path, /(?:(^|\/)\.?\/)+/g, '$1');
  path = replace(path, /[^\/]*\/\.\.\//, '');
  return path;
};

loader.require = function(path, requirer) {
  var module = loader.getPackage(path, requirer);
  if (!module) {
    throw new Error("Cannot find module '" + path + "'");
  }

  if (module.exports) {
    return module.exports;
  }

  var require = function(path) { return loader.require(path, module); };

  module.exports = {};
  module.loader(module.exports, module, require);
  module.loaded = true;

  return module.exports;
};

var compareLineno = function(a, b) { return a.lineno - b.lineno; };

loader.define = function(path, lineno, loadfun) {
  var module = {
    filename: path,
    lineno: lineno,
    loader: loadfun,
  };

  loader.packages[path] = module;
  loader.packagesLinenoOrder.push(module);
  loader.packagesLinenoOrder.sort(compareLineno);
};

loader.getPackage = function(path, requirer) {
  var module;
  if (requirer) {
    module = loader.getPackageAtPath(loader.basepath(requirer.filename) + '/' + path);
  }

  if (!module) {
    module = loader.getPackageAtPath(path);
  }

  var paths = loader.paths;
  for (var i = 0, ii = paths.length; !module && i < ii; ++i) {
    var dirpath = paths[i];
    module = loader.getPackageAtPath(dirpath + '/' + path);
  }
  return module;
};

loader.getPackageAtPath = function(path) {
  path = loader.normalize(path);

  var module;
  var extpaths = loader.extpaths;
  for (var i = 0, ii = extpaths.length; !module && i < ii; ++i) {
    var filepath = extpaths[i].replace('?', path);
    module = loader.packages[filepath];
  }
  return module;
};

loader.getPackageByLineno = function(lineno) {
  var packages = loader.packagesLinenoOrder;
  var module;
  for (var i = 0, ii = packages.length; i < ii; ++i) {
    var next = packages[i];
    if (next.lineno > lineno) {
      break;
    }
    module = next;
  }
  return module;
};

return loader;

})();

__loader.define("app.js", 111, function(exports, module, require) {
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
	title: "Vice News",
	url: "http://news.vice.com/rss"
	},{
	title: "The Atlantic",
	url: "https://www.theatlantic.com/feed/all"
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

Settings.config({url: 'http://67.254.246.159/~Jonathan/pebble-rss-settings', hash: true}, function(){
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











// Alternate version of getArticles that does not rely on the rss2json api.
// Unusued due to numerous problems. Namely, it causes a freeze in makePages to appear much more frequently, and does not handle text encoding properly.
// This function has not been tested in some time, and rest of code has evolved in the meantime. Thus, minor adjustments may be necessary.

function getArticlesNoApi() {
	loadingCard = new UI.Card(blackStatusBar);
	loadingCard.title(" ");
	loadingCard.subtitle(" ");
	loadingCard.body("        Loading...");
	loadingCard.show();
	articleList = [];

	xhr = new XMLHttpRequest();
	// xhr.responseType = "document"
	// xhr.overrideMimeType("text/html; charset=ISO-8859-1");
	// xhr.setRequestHeader("Accept-Charset", "ISO-8859-1");
	xhr.open('GET', currFeed.url);
	// xhr.overrideMimeType('text/xml; charset=iso-8859-1');
	xhr.onload = function() {

		articleList = [];

		items = xhr.response.match(/<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g);
		for (itemNum = 0; itemNum < items.length; itemNum++) {
			article = {};

			title = items[itemNum].match(/<title>([\s\S]*?)<\/title>/);
			if (title) {
		    	article.title = formatText(title[1]);
		  	}

			author = items[itemNum].match(/(<author>|<dc:creator>)([\s\S]*?)(<\/author>|<\/dc:creator>)/);
			if (author) {
				article.author = formatText(author[2]);
			}

			content = items[itemNum].match(/<content.*?>([\s\S]*?)<\/content.*?>/);
			if (content) {
				article.pages = makePages(content[1]);
			}
			else {
				article.pages = makePages(items[itemNum].match(/<description.*?>([\s\S]*?)<\/description.*?>/)[1]);
			}

		 	articleList.push(article);
		 	if (articleList.length === items.length) {
				loadingCard.hide();
				selectArticle(articleList);
			}
		}
	};
	xhr.send();
}
});
__loader.define("clock/clock.js", 490, function(exports, module, require) {
var moment = require('vendor/moment');

var Clock = module.exports;

Clock.weekday = function(weekday, hour, minute, seconds) {
  var now = moment();
  var target = moment({ hour: hour, minute: minute, seconds: seconds }).day(weekday);
  if (moment.max(now, target) === now) {
    target.add(1, 'week');
  }
  return target.unix();
};

});
__loader.define("clock/index.js", 505, function(exports, module, require) {
var Clock = require('./clock');

module.exports = Clock;

});
__loader.define("lib/ajax.js", 511, function(exports, module, require) {
/*
 * ajax.js by Meiguro - MIT License
 */

var ajax = (function(){

var formify = function(data) {
  var params = [], i = 0;
  for (var name in data) {
    params[i++] = encodeURIComponent(name) + '=' + encodeURIComponent(data[name]);
  }
  return params.join('&');
};

var deformify = function(form) {
  var params = {};
  form.replace(/(?:([^=&]*)=?([^&]*)?)(?:&|$)/g, function(_, name, value) {
    if (name) {
      params[name] = value || true;
    }
    return _;
  });
  return params;
};

/**
 * ajax options. There are various properties with url being the only required property.
 * @typedef ajaxOptions
 * @property {string} [method='get'] - The HTTP method to use: 'get', 'post', 'put', 'delete', 'options',
 *    or any other standard method supported by the running environment.
 * @property {string} url - The URL to make the ajax request to. e.g. 'http://www.example.com?name=value'
 * @property {string} [type] - The content and response format. By default, the content format
 *    is 'form' and response format is separately 'text'. Specifying 'json' will have ajax send `data`
 *    as json as well as parse the response as json. Specifying 'text' allows you to send custom
 *    formatted content and parse the raw response text. If you wish to send form encoded data and
 *    parse json, leave `type` undefined and use `JSON.decode` to parse the response data.
 * @property {object} [data] - The request body, mainly to be used in combination with 'post' or 'put'.
 *    e.g. { username: 'guest' }
 * @property {object} headers - Custom HTTP headers. Specify additional headers.
 *    e.g. { 'x-extra': 'Extra Header' }
 * @property {boolean} [async=true] - Whether the request will be asynchronous.
 *    Specify false for a blocking, synchronous request.
 * @property {boolean} [cache=true] - Whether the result may be cached.
 *    Specify false to use the internal cache buster which appends the URL with the query parameter _
 *    set to the current time in milliseconds.
 */

/**
 * ajax allows you to make various http or https requests.
 * See {@link ajaxOptions}
 * @global
 * @param {ajaxOptions} opt - Options specifying the type of ajax request to make.
 * @param {function} success - The success handler that is called when a HTTP 200 response is given.
 * @param {function} failure - The failure handler when the HTTP request fails or is not 200.
 */
var ajax = function(opt, success, failure) {
  if (typeof opt === 'string') {
    opt = { url: opt };
  }
  var method = opt.method || 'GET';
  var url = opt.url;
  //console.log(method + ' ' + url);

  var onHandler = ajax.onHandler;
  if (onHandler) {
    if (success) { success = onHandler('success', success); }
    if (failure) { failure = onHandler('failure', failure); }
  }

  if (opt.cache === false) {
    var appendSymbol = url.indexOf('?') === -1 ? '?' : '&';
    url += appendSymbol + '_=' + Date.now();
  }

  var req = new XMLHttpRequest();
  req.open(method.toUpperCase(), url, opt.async !== false);

  var headers = opt.headers;
  if (headers) {
    for (var name in headers) {
      req.setRequestHeader(name, headers[name]);
    }
  }

  var data = opt.data;
  if (data) {
    if (opt.type === 'json') {
      req.setRequestHeader('Content-Type', 'application/json');
      data = JSON.stringify(opt.data);
    } else if (opt.type === 'xml') {
      req.setRequestHeader('Content-Type', 'text/xml');
    } else if (opt.type !== 'text') {
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      data = formify(opt.data);
    }
  }

  var ready = false;
  req.onreadystatechange = function(e) {
    if (req.readyState === 4 && !ready) {
      ready = true;
      var body = req.responseText;
      var okay = req.status >= 200 && req.status < 300 || req.status === 304;

      try {
        if (opt.type === 'json') {
          body = JSON.parse(body);
        } else if (opt.type === 'form') {
          body = deformify(body);
        }
      } catch (err) {
        okay = false;
      }
      var callback = okay ? success : failure;
      if (callback) {
        callback(body, req.status, req);
      }
    }
  };

  req.send(data);
};

ajax.formify = formify;
ajax.deformify = deformify;

if (typeof module !== 'undefined') {
  module.exports = ajax;
} else {
  window.ajax = ajax;
}

return ajax;

})();

});
__loader.define("lib/color.js", 649, function(exports, module, require) {
var Color = {};

Color.normalizeString = function(color) {
  if (typeof color === 'string') {
    if (color.substr(0, 2) === '0x') {
      return color.substr(2);
    } else if (color[0] === '#') {
      return color.substr(1);
    }
  }
  return color;
};

Color.rgbUint12To24 = function(color) {
  return ((color & 0xf00) << 12) | ((color & 0xf0) << 8) | ((color & 0xf) << 4);
};

Color.toArgbUint32 = function(color) {
  var argb = color;
  if (typeof color !== 'number') {
    color = Color.normalizeString(color.toString());
    argb = parseInt(color, 16);
  }
  if (typeof color === 'string') {
    var alpha = 0xff000000;
    if (color.length === 3) {
      argb = alpha | Color.rgbUint12To14(argb);
    } else if (color.length === 6) {
      argb = alpha | argb;
    }
  }
  return argb;
};

Color.toRgbUint24 = function(color) {
  return Color.toArgbUint32(color) & 0xffffff;
};

Color.toArgbUint8 = function(color) {
  var argb = Color.toArgbUint32(color);
  return (((argb >> 24) & 0xc0) | ((argb >> 18) & 0x30) |
          ((argb >> 12) & 0xc) | ((argb >> 6) & 0x3));
};

Color.toRgbUint8 = function(color) {
  return Color.toArgbUint8(color) & 0x3f;
};

module.exports = Color;

});
__loader.define("lib/emitter.js", 701, function(exports, module, require) {

var Emitter = function() {
  this._events = {};
};

Emitter.prototype.wrapHandler = function(handler) {
  return handler;
};

Emitter.prototype._on = function(type, subtype, handler) {
  var typeMap = this._events || ( this._events = {} );
  var subtypeMap = typeMap[type] || ( typeMap[type] = {} );
  (subtypeMap[subtype] || ( subtypeMap[subtype] = [] )).push({
    id: handler,
    handler: this.wrapHandler(handler),
  });
};

Emitter.prototype._off = function(type, subtype, handler) {
  if (!type) {
    this._events = {};
    return;
  }
  var typeMap = this._events;
  if (!handler && subtype === 'all') {
    delete typeMap[type];
    return;
  }
  var subtypeMap = typeMap[type];
  if (!subtypeMap) { return; }
  if (!handler) {
    delete subtypeMap[subtype];
    return;
  }
  var handlers = subtypeMap[subtype];
  if (!handlers) { return; }
  var index = -1;
  for (var i = 0, ii = handlers.length; i < ii; ++i) {
    if (handlers[i].id === handler) {
      index = i;
      break;
    }
  }
  if (index === -1) { return; }
  handlers.splice(index, 1);
};

Emitter.prototype.on = function(type, subtype, handler) {
  if (!handler) {
    handler = subtype;
    subtype = 'all';
  }
  this._on(type, subtype, handler);
  if (Emitter.onAddHandler) {
    Emitter.onAddHandler(type, subtype, handler);
  }
  if (this.onAddHandler) {
    this.onAddHandler(type, subtype, handler);
  }
};

Emitter.prototype.off = function(type, subtype, handler) {
  if (!handler) {
    handler = subtype;
    subtype = 'all';
  }
  this._off(type, subtype, handler);
  if (Emitter.onRemoveHandler) {
    Emitter.onRemoveHandler(type, subtype, handler);
  }
  if (this.onRemoveHandler) {
    this.onRemoveHandler(type, subtype, handler);
  }
};

Emitter.prototype.listeners = function(type, subtype) {
  if (!subtype) {
    subtype = 'all';
  }
  var typeMap = this._events;
  if (!typeMap) { return; }
  var subtypeMap = typeMap[type];
  if (!subtypeMap) { return; }
  return subtypeMap[subtype];
};

Emitter.prototype.listenerCount = function(type, subtype) {
  var listeners = this.listeners(type, subtype);
  return listeners ? listeners.length : 0;
};

Emitter.prototype.forEachListener = function(type, subtype, callback) {
  var typeMap = this._events;
  if (!typeMap) { return; }
  var subtypeMap;
  if (typeof callback === 'function') {
    var handlers = this.listeners(type, subtype);
    if (!handlers) { return; }
    for (var i = 0, ii = handlers.length; i < ii; ++i) {
      callback.call(this, type, subtype, handlers[i]);
    }
  } else if (typeof subtype === 'function') {
    callback = subtype;
    subtypeMap = typeMap[type];
    if (!subtypeMap) { return; }
    for (subtype in subtypeMap) {
      this.forEachListener(type, subtype, callback);
    }
  } else if (typeof type === 'function') {
    callback = type;
    for (type in typeMap) {
      this.forEachListener(type, callback);
    }
  }
};

var emitToHandlers = function(type, handlers, e) {
  if (!handlers) { return; }
  for (var i = 0, ii = handlers.length; i < ii; ++i) {
    var handler = handlers[i].handler;
    if (handler.call(this, e, type, i) === false) {
      return false;
    }
  }
  return true;
};

Emitter.prototype.emit = function(type, subtype, e) {
  if (!e) {
    e = subtype;
    subtype = null;
  }
  e.type = type;
  if (subtype) {
    e.subtype = subtype;
  }
  var typeMap = this._events;
  if (!typeMap) { return; }
  var subtypeMap = typeMap[type];
  if (!subtypeMap) { return; }
  var hadSubtype = emitToHandlers.call(this, type, subtypeMap[subtype], e);
  if (hadSubtype === false) {
    return false;
  }
  var hadAll = emitToHandlers.call(this, type, subtypeMap.all, e);
  if (hadAll === false) {
    return false;
  }
  if (hadSubtype || hadAll) {
    return true;
  }
};

module.exports = Emitter;

});
__loader.define("lib/image.js", 858, function(exports, module, require) {
var PNG = require('vendor/png');

var PNGEncoder = require('lib/png-encoder');

var image = {};

var getPos = function(width, x, y) {
  return y * width * 4 + x * 4;
};

//! Convert an RGB pixel array into a single grey color
var getPixelGrey = function(pixels, pos) {
  return ((pixels[pos] + pixels[pos + 1] + pixels[pos + 2]) / 3) & 0xFF;
};

//! Convert an RGB pixel array into a single uint8 2 bitdepth per channel color
var getPixelColorUint8 = function(pixels, pos) {
  var r = Math.min(Math.max(parseInt(pixels[pos    ] / 64 + 0.5), 0), 3);
  var g = Math.min(Math.max(parseInt(pixels[pos + 1] / 64 + 0.5), 0), 3);
  var b = Math.min(Math.max(parseInt(pixels[pos + 2] / 64 + 0.5), 0), 3);
  return (0x3 << 6) | (r << 4) | (g << 2) | b;
};

//! Get an RGB vector from an RGB pixel array
var getPixelColorRGB8 = function(pixels, pos) {
  return [pixels[pos], pixels[pos + 1], pixels[pos + 2]];
};

//! Normalize the color channels to be identical
image.greyscale = function(pixels, width, height, converter) {
  converter = converter || getPixelGrey;
  for (var y = 0, yy = height; y < yy; ++y) {
    for (var x = 0, xx = width; x < xx; ++x) {
      var pos = getPos(width, x, y);
      var newColor = converter(pixels, pos);
      for (var i = 0; i < 3; ++i) {
        pixels[pos + i] = newColor;
      }
    }
  }
};

//! Convert to an RGBA pixel array into a row major matrix raster
image.toRaster = function(pixels, width, height, converter) {
  converter = converter || getPixelColorRGB8;
  var matrix = [];
  for (var y = 0, yy = height; y < yy; ++y) {
    var row = matrix[y] = [];
    for (var x = 0, xx = width; x < xx; ++x) {
      var pos = getPos(width, x, y);
      row[x] = converter(pixels, pos);
    }
  }
  return matrix;
};

image.dithers = {};

image.dithers['floyd-steinberg'] = [
  [ 1, 0, 7/16],
  [-1, 1, 3/16],
  [ 0, 1, 5/16],
  [ 1, 1, 1/16]];

image.dithers['jarvis-judice-ninke'] = [
  [ 1, 0, 7/48],
  [ 2, 0, 5/48],
  [-2, 1, 3/48],
  [-1, 1, 5/48],
  [ 0, 1, 7/48],
  [ 1, 1, 5/48],
  [ 2, 1, 3/48],
  [-2, 2, 1/48],
  [-1, 2, 3/48],
  [ 0, 2, 5/48],
  [ 1, 2, 3/48],
  [ 2, 2, 1/48]];

image.dithers.sierra = [
  [ 1, 0, 5/32],
  [ 2, 0, 3/32],
  [-2, 1, 2/32],
  [-1, 1, 4/32],
  [ 0, 1, 5/32],
  [ 1, 1, 4/32],
  [ 2, 1, 2/32],
  [-1, 2, 2/32],
  [ 0, 2, 3/32],
  [ 1, 2, 2/32]];

image.dithers['default'] = image.dithers.sierra;

//! Get the nearest normalized grey color
var getChannelGrey = function(color) {
  return color >= 128 ? 255 : 0;
};

//! Get the nearest normalized 2 bitdepth color
var getChannel2 = function(color) {
  return Math.min(Math.max(parseInt(color / 64 + 0.5), 0) * 64, 255);
};

image.dither = function(pixels, width, height, dithers, converter) {
  converter = converter || getChannel2;
  dithers = dithers || image.dithers['default'];
  var numDithers = dithers.length;
  for (var y = 0, yy = height; y < yy; ++y) {
    for (var x = 0, xx = width; x < xx; ++x) {
      var pos = getPos(width, x, y);
      for (var i = 0; i < 3; ++i) {
        var oldColor = pixels[pos + i];
        var newColor = converter(oldColor);
        var error = oldColor - newColor;
        pixels[pos + i] = newColor;
        for (var j = 0; j < numDithers; ++j) {
          var dither = dithers[j];
          var x2 = x + dither[0], y2 = y + dither[1];
          if (x2 >= 0 && x2 < width && y < height) {
            pixels[getPos(width, x2, y2) + i] += parseInt(error * dither[2]);
          }
        }
      }
    }
  }
};

//! Dither a pixel buffer by image properties
image.ditherByProps = function(pixels, img, converter) {
  if (img.dither) {
    var dithers = image.dithers[img.dither];
    image.dither(pixels, img.width, img.height, dithers, converter);
  }
};

image.resizeNearest = function(pixels, width, height, newWidth, newHeight) {
  var newPixels = new Array(newWidth * newHeight * 4);
  var widthRatio = width / newWidth;
  var heightRatio = height / newHeight;
  for (var y = 0, yy = newHeight; y < yy; ++y) {
    for (var x = 0, xx = newWidth; x < xx; ++x) {
      var x2 = parseInt(x * widthRatio);
      var y2 = parseInt(y * heightRatio);
      var pos2 = getPos(width, x2, y2);
      var pos = getPos(newWidth, x, y);
      for (var i = 0; i < 4; ++i) {
        newPixels[pos + i] = pixels[pos2 + i];
      }
    }
  }
  return newPixels;
};

image.resizeSample = function(pixels, width, height, newWidth, newHeight) {
  var newPixels = new Array(newWidth * newHeight * 4);
  var widthRatio = width / newWidth;
  var heightRatio = height / newHeight;
  for (var y = 0, yy = newHeight; y < yy; ++y) {
    for (var x = 0, xx = newWidth; x < xx; ++x) {
      var x2 = Math.min(parseInt(x * widthRatio), width - 1);
      var y2 = Math.min(parseInt(y * heightRatio), height - 1);
      var pos = getPos(newWidth, x, y);
      for (var i = 0; i < 4; ++i) {
        newPixels[pos + i] = ((pixels[getPos(width, x2  , y2  ) + i] +
                               pixels[getPos(width, x2+1, y2  ) + i] +
                               pixels[getPos(width, x2  , y2+1) + i] +
                               pixels[getPos(width, x2+1, y2+1) + i]) / 4) & 0xFF;
      }
    }
  }
  return newPixels;
};

image.resize = function(pixels, width, height, newWidth, newHeight) {
  if (newWidth < width || newHeight < height) {
    return image.resizeSample(pixels, width, height, newWidth, newHeight);
  } else {
    return image.resizeNearest(pixels, width, height, newWidth, newHeight);
  }
};

//! Resize a pixel buffer by image properties
image.resizeByProps = function(pixels, img) {
  if (img.width !== img.originalWidth || img.height !== img.originalHeight) {
    return image.resize(pixels, img.originalWidth, img.originalHeight, img.width, img.height);
  } else {
    return pixels;
  }
};

//! Convert to a GBitmap with bitdepth 1
image.toGbitmap1 = function(pixels, width, height) {
  var rowBytes = width * 4;

  var gpixels = [];
  var growBytes = Math.ceil(width / 32) * 4;
  for (var i = 0, ii = height * growBytes; i < ii; ++i) {
    gpixels[i] = 0;
  }

  for (var y = 0, yy = height; y < yy; ++y) {
    for (var x = 0, xx = width; x < xx; ++x) {
      var grey = 0;
      var pos = getPos(width, x, y);
      for (var j = 0; j < 3; ++j) {
        grey += pixels[pos + j];
      }
      grey /= 3 * 255;
      if (grey >= 0.5) {
        var gbytePos = y * growBytes + parseInt(x / 8);
        gpixels[gbytePos] += 1 << (x % 8);
      }
    }
  }

  var gbitmap = {
    width: width,
    height: height,
    pixelsLength: gpixels.length,
    pixels: gpixels,
  };

  return gbitmap;
};

//! Convert to a PNG with total color bitdepth 8
image.toPng8 = function(pixels, width, height) {
  var raster = image.toRaster(pixels, width, height, getPixelColorRGB8);

  var palette = [];
  var colorMap = {};
  var numColors = 0;
  for (var y = 0, yy = height; y < yy; ++y) {
    var row = raster[y];
    for (var x = 0, xx = width; x < xx; ++x) {
      var color = row[x];
      var hash = getPixelColorUint8(color, 0);
      if (!(hash in colorMap)) {
        colorMap[hash] = numColors;
        palette[numColors++] = color;
      }
     row[x] = colorMap[hash];
    }
  }

  var bitdepth = 8;
  var colorType = 3; // 8-bit palette
  var bytes = PNGEncoder.encode(raster, bitdepth, colorType, palette);

  var png = {
    width: width,
    height: height,
    pixelsLength: bytes.array.length,
    pixels: bytes.array,
  };

  return png;
};

//! Set the size maintaining the aspect ratio
image.setSizeAspect = function(img, width, height) {
  img.originalWidth = width;
  img.originalHeight = height;
  if (img.width) {
    if (!img.height) {
      img.height = parseInt(height * (img.width / width));
    }
  } else if (img.height) {
    if (!img.width) {
      img.width = parseInt(width * (img.height / height));
    }
  } else {
    img.width = width;
    img.height = height;
  }
};

image.load = function(img, bitdepth, callback) {
  PNG.load(img.url, function(png) {
    var pixels = png.decode();
    if (bitdepth === 1) {
      image.greyscale(pixels, png.width, png.height);
    }
    image.setSizeAspect(img, png.width, png.height);
    pixels = image.resizeByProps(pixels, img);
    image.ditherByProps(pixels, img,
                        bitdepth === 1 ? getChannelGrey : getChannel2);
    if (bitdepth === 8) {
      img.image = image.toPng8(pixels, img.width, img.height);
    } else if (bitdepth === 1) {
      img.image = image.toGbitmap1(pixels, img.width, img.height);
    }
    if (callback) {
      callback(img);
    }
  });
  return img;
};

module.exports = image;

});
__loader.define("lib/myutil.js", 1160, function(exports, module, require) {
var util2 = require('util2');

var myutil = {};

myutil.shadow = function(a, b) {
  for (var k in a) {
    if (typeof b[k] === 'undefined') {
      b[k] = a[k];
    }
  }
  return b;
};

myutil.defun = function(fn, fargs, fbody) {
  if (!fbody) {
    fbody = fargs;
    fargs = [];
  }
  return new Function('return function ' + fn + '(' + fargs.join(', ') + ') {' + fbody + '}')();
};

myutil.slog = function() {
  var args = [];
  for (var i = 0, ii = arguments.length; i < ii; ++i) {
    args[i] = util2.toString(arguments[i]);
  }
  return args.join(' ');
};

myutil.toObject = function(key, value) {
  if (typeof key === 'object') {
    return key;
  }
  var obj = {};
  obj[key] = value;
  return obj;
};

myutil.flag = function(flags) {
  if (typeof flags === 'boolean') {
    return flags;
  }
  for (var i = 1, ii = arguments.length; i < ii; ++i) {
    if (flags[arguments[i]]) {
      return true;
    }
  }
  return false;
};

myutil.toFlags = function(flags) {
  if (typeof flags === 'string') {
    flags = myutil.toObject(flags, true);
  } else {
    flags = !!flags;
  }
  return flags;
};

/**
 * Returns an absolute path based on a root path and a relative path.
 */
myutil.abspath = function(root, path) {
  if (!path) {
    path = root;
  }
  if (path.match(/^\/\//)) {
    var m = root && root.match(/^(\w+:)\/\//);
    path = (m ? m[1] : 'http:') + path;
  }
  if (root && !path.match(/^\w+:\/\//)) {
    path = root + path;
  }
  return path;
};

/**
 *  Converts a name to a C constant name format of UPPER_CASE_UNDERSCORE.
 */
myutil.toCConstantName = function(x) {
  x = x.toUpperCase();
  x = x.replace(/[- ]/g, '_');
  return x;
};

module.exports = myutil;

});
__loader.define("lib/png-encoder.js", 1249, function(exports, module, require) {
/**
 * PNG Encoder from data-demo
 * https://code.google.com/p/data-demo/
 *
 * @author mccalluc@yahoo.com
 * @license MIT
 */

var Zlib = require('vendor/zlib');

var png = {};

png.Bytes = function(data, optional) {
  var datum, i;
  this.array = [];

  if (!optional) {

    if (data instanceof Array || data instanceof Uint8Array) {
      for (i = 0; i < data.length; i++) {
        datum = data[i];
        if (datum !== null) { // nulls and undefineds are silently skipped.
          if (typeof datum !== "number") {
            throw new Error("Expected number, not "+(typeof datum));
          } else if (Math.floor(datum) != datum) {
            throw new Error("Expected integer, not "+datum);
          } else if (datum < 0 || datum > 255) {
            throw new Error("Expected integer in [0,255], not "+datum);
          }
          this.array.push(datum);
        }
      }
    }

    else if (typeof data == "string") {
      for (i = 0; i < data.length; i++) {
        datum = data.charCodeAt(i);
        if (datum < 0 || datum > 255) {
          throw new Error("Characters above 255 not allowed without explicit encoding: "+datum);
        }
        this.array.push(datum);
      }
    }

    else if (data instanceof png.Bytes) {
      this.array.push.apply(this.array, data.array);
    }

    else if (typeof data == "number") {
        return new png.Bytes([data]);
    }

    else {
      throw new Error("Unexpected data type: "+data);
    }

  }

  else { // optional is defined.

    // TODO: generalize when generalization is required.
    if (typeof data == "number" &&
        Math.floor(data) == data &&
        data >= 0 &&
        (optional.bytes in {4:1, 2:1}) &&
        // don't change this last one to bit shifts: in JS, 0x100 << 24 == 0.
        data < Math.pow(256, optional.bytes)) {
      this.array = [
        (data & 0xFF000000) >>> 24,
        (data & 0x00FF0000) >>> 16,
        (data & 0x0000FF00) >>> 8,
        (data & 0x000000FF)
      ].slice(-optional.bytes);
    }

    else throw new Error("Unexpected data/optional args combination: "+data);

  }
};

png.Bytes.prototype.add = function(data, optional) {
  // Takes the same arguments as the constructor,
  // but appends the new data instead, and returns the modified object.
  // (suitable for chaining.)
  this.array.push.apply(this.array, new png.Bytes(data, optional).array);
  return this;
};

png.Bytes.prototype.chunk = function(n) {
  // Split the array into chunks of length n.
  // Returns an array of arrays.
  var buffer = [];
  for (var i = 0; i < this.array.length; i += n) {
    var slice = this.array.slice(i, i+n);
    buffer.push(this.array.slice(i, i+n));
  }
  return buffer;
};

png.Bytes.prototype.toString = function(n) {
  // one optional argument specifies line length in bytes.
  // returns a hex dump of the Bytes object.
  var chunks = this.chunk(n || 8);
  var byte;
  var lines = [];
  var hex;
  var chr;
  for (var i = 0; i < chunks.length; i++) {
    hex = [];
    chr = [];
    for (var j = 0; j < chunks[i].length; j++) {
      byte = chunks[i][j];
      hex.push(
        ((byte < 16) ? "0" : "") +
        byte.toString(16)
      );
      chr.push(
        (byte >=32 && byte <= 126 ) ?
          String.fromCharCode(byte)
          : "_"
      );
    }
    lines.push(hex.join(" ")+"  "+chr.join(""));
  }
  return lines.join("\n");
};

png.Bytes.prototype.serialize = function() {
  // returns a string whose char codes correspond to the bytes of the array.
  // TODO: get rid of this once transition is complete?
  return String.fromCharCode.apply(null, this.array);
};

png.fromRaster = function(raster, optional_palette, optional_transparency) {
  // Given a Raster object,
  // and optionally a list of rgb triples,
  // and optionally a corresponding list of transparency values (0: clear - 255: opaque)
  // return the corresponding PNG as a Bytes object.

  var signature = new png.Bytes([
    137, 80 /* P */, 78 /* N */, 71 /* G */, 13, 10, 26, 10
  ]);
  var ihdr = new png.Chunk.IHDR(raster.width, raster.height, raster.bit_depth, raster.color_type);
  var plte = (optional_palette instanceof Array) ?
    new png.Chunk.PLTE(optional_palette) :
    new png.Bytes([]);
  var trns = (optional_transparency instanceof Array) ?
    new png.Chunk.tRNS(optional_transparency) :
    new png.Bytes([]);
  var idat = new png.Chunk.IDAT(raster);
  var iend = new png.Chunk.IEND(); // intentionally blank

  // order matters.
  return signature.add(ihdr).add(plte).add(trns).add(idat).add(iend);
};

png.encode = function(raster, bit_depth, color_type, optional_palette, optional_transparency) {
  if (color_type === 0 || color_type === 3) {
    raster = new png.Raster(bit_depth, color_type, raster);
  } else if (color_type === 2 || color_type === 6) {
    raster = new png.Raster_rgb(bit_depth, color_type, raster);
  }
  return png.fromRaster(raster, optional_palette, optional_transparency);
};

png.Chunk = function(type, data) {
  // given a four character type, and Bytes,
  // calculates the length and the checksum, and creates
  // a Bytes object for that png chunk.

  if (!type.match(/^[A-Za-z]{4}$/)) {
    throw new Error("Creating PNG chunk: provided type should be four letters, not "+type);
  }

  if (!(data instanceof png.Bytes)) {
    throw new Error("Creating PNG "+type+" chunk: provided data is not Bytes: "+data);
  }

    // CRC calculations are a literal translation of the C code at
  // http://www.libpng.org/pub/png/spec/1.0/PNG-CRCAppendix.html
  if (!png.crc_table) {
    png.crc_table = []; // Table of CRCs of all 8-bit messages.
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        if (c & 1) {
          c = 0xedb88320 ^ (c >>> 1); // C ">>" is JS ">>>"
        } else {
          c = c >>> 1; // C ">>" is JS ">>>"
        }
      }
      png.crc_table[n] = c;
    }
  }

  function update_crc(crc, buffer) {
    // Update a running CRC with the buffer--the CRC
    // should be initialized to all 1's, and the transmitted value
    // is the 1's complement of the final running CRC
    var c = crc;
    var n;
    for (n = 0; n < buffer.length; n++) {
      c = png.crc_table[(c ^ buffer[n]) & 0xff] ^ (c >>> 8); // C ">>" is JS ">>>"
    }
    return c;
  }

  var type_and_data = new png.Bytes(type).add(data);
  var crc = (update_crc(0xffffffff, type_and_data.array) ^ 0xffffffff)>>>0;
  // >>>0 converts to unsigned, without changing the bits.

  var length_type_data_checksum =
    new png.Bytes(data.array.length,{bytes:4})
    .add(type_and_data)
    .add(crc,{bytes:4});

  return length_type_data_checksum;
};

png.Chunk.IHDR = function(width, height, bit_depth, color_type) {
  if (!(
        // grayscale
        (color_type === 0) && (bit_depth in {1:1, 2:1, 4:1, 8:1, 16:1}) ||
        // rgb
        (color_type === 2) && (bit_depth in {8:1, 16:1}) ||
        // palette
        (color_type === 3) && (bit_depth in {1:1, 2:1, 4:1, 8:1}) ||
        // grayscale + alpha
        (color_type === 4) && (bit_depth in {8:1, 16:1}) ||
        // rgb + alpha
        (color_type ===  6) && (bit_depth in {8:1, 16:1})
        // http://www.libpng.org/pub/png/spec/1.0/PNG-Chunks.html#C.IHDR
        )) {
    throw new Error("Invalid color type ("+color_type+") / bit depth ("+bit_depth+") combo");
  }
  return new png.Chunk(
    "IHDR",
    new png.Bytes(width,{bytes:4})
      .add(height,{bytes:4})
      .add([
        bit_depth,
        color_type,
        0, // compression method
        0, // filter method
        0  // interlace method
      ])
  );
};

png.Chunk.PLTE = function(rgb_list) {
  // given a list of RGB triples,
  // returns the corresponding PNG PLTE (palette) chunk.
  for (var i = 0, ii = rgb_list.length; i < ii; i++) {
    var triple = rgb_list[i];
    if (triple.length !== 3) {
      throw new Error("This is not a valid RGB triple: "+triple);
    }
  }
  return new png.Chunk(
    "PLTE",
    new png.Bytes(Array.prototype.concat.apply([], rgb_list))
  );
};

png.Chunk.tRNS = function(alpha_list) {
  // given a list of alpha values corresponding to the palette entries,
  // returns the corresponding PNG tRNS (transparency) chunk.
  return new png.Chunk(
    "tRNS",
    new png.Bytes(alpha_list)
  );
};

png.Raster = function(bit_depth, color_type, raster) {
  // takes an array of arrays of greyscale or palette values.
  // provides encode(), which returns bytes ready for a PNG IDAT chunk.

  // validate depth and type
  if (color_type !== 0 && color_type !== 3) throw new Error("Color type "+color_type+" is unsupported.");
  if (bit_depth > 8) throw new Error("Bit depths greater than 8 are unsupported.");

  this.bit_depth = bit_depth;
  this.color_type = color_type;

  // validate raster data.
  var max_value = (1 << bit_depth) - 1;
  var cols = raster[0].length;
  for (var row = 0; row < raster.length; row++) {
    if (raster[row].length != cols)
      throw new Error("Row "+row+" does not have the expected "+cols+" columns.");
    for (var col = 0; col < cols; col++) {
      if (!(raster[row][col] >= 0 && raster[row][col] <= max_value))
        throw new Error("Image data ("+raster[row][col]+") out of bounds at ("+row+","+col+")");
    }
  }

  this.height = raster.length;
  this.width = cols;

  this.encode = function() {
    // Returns the image data as a single array of bytes, using filter method 0.
    var buffer = [];
    for (var row = 0; row < raster.length; row++) {
      buffer.push(0); // each row gets filter type 0.
      for (var col = 0; col < cols; col += 8/bit_depth) {
        var byte = 0;
        for (var sub = 0; sub < 8/bit_depth; sub++) {
          byte <<= bit_depth;
          if (col + sub < cols) {
            byte |= raster[row][col+sub];
          }
        }
        if (byte & ~0xFF) throw new Error("Encoded raster byte out of bounds at ("+row+","+col+")");
        buffer.push(byte);
      }
    }
    return buffer;
  };
};

png.Raster_rgb = function(bit_depth, color_type, raster) {
  // takes an array of arrays of RGB triples.
  // provides encode(), which returns bytes ready for a PNG IDAT chunk.

  // validate depth and type
  if (color_type != 2 && color_type != 6) throw new Error("Only color types 2 and 6 for RGB.");
  if (bit_depth != 8) throw new Error("Bit depths other than 8 are unsupported for RGB.");

  this.bit_depth = bit_depth;
  this.color_type = color_type;

  // validate raster data.
  var cols = raster[0].length;
  for (var row = 0; row < raster.length; row++) {
    if (raster[row].length != cols) {
      throw new Error("Row "+row+" does not have the expected "+cols+" columns.");
    }
    for (var col = 0; col < cols; col++) {
      if (!(color_type == 2 && raster[row][col].length == 3) &&
          !(color_type == 6 && raster[row][col].length == 4)) {
        throw new Error("Not RGB[A] at ("+row+","+col+")");
      }
      for (var i = 0; i < (color_type == 2 ? 3 : 4); i++) {
        if (raster[row][col][i]<0 || raster[row][col][i]>255) {
          throw new Error("RGB out of range at ("+row+","+col+")");
        }
      }
    }
  }

  this.height = raster.length;
  this.width = cols;

  this.encode = function() {
    // Returns the image data as a single array of bytes, using filter method 0.
    var buffer = [];
    for (var row = 0; row < raster.length; row++) {
      buffer.push(0); // each row gets filter type 0.
      for (var col = 0; col < cols; col++) {
        buffer.push.apply(buffer, raster[row][col]);
      }
    }
    return buffer;
  };
};

png.Chunk.IDAT = function(raster) {
  var encoded = raster.encode();
  var zipped = new Zlib.Deflate(encoded).compress();
  return new png.Chunk("IDAT", new png.Bytes(zipped));
};

png.Chunk.IEND = function() {
  return new png.Chunk("IEND", new png.Bytes([]));
};

if (typeof module !== 'undefined') {
  module.exports = png;
}

});
__loader.define("lib/safe.js", 1631, function(exports, module, require) {
/* safe.js - Building a safer world for Pebble.JS Developers
 *
 * This library provides wrapper around all the asynchronous handlers that developers
 * have access to so that error messages are caught and displayed nicely in the pebble tool
 * console.
 */

/* global __loader */

var safe = {};

/* The name of the concatenated file to translate */
safe.translateName = 'pebble-js-app.js';

safe.indent = '    ';

/* Translates a source line position to the originating file */
safe.translatePos = function(name, lineno, colno) {
  if (name === safe.translateName) {
    var pkg = __loader.getPackageByLineno(lineno);
    if (pkg) {
      name = pkg.filename;
      lineno -= pkg.lineno;
    }
  }
  return name + ':' + lineno + ':' + colno;
};

var makeTranslateStack = function(stackLineRegExp, translateLine) {
  return function(stack, level) {
    var lines = stack.split('\n');
    var firstStackLine = -1;
    for (var i = lines.length - 1; i >= 0; --i) {
      var m = lines[i].match(stackLineRegExp);
      if (!m) {
        continue;
      }
      var line = lines[i] = translateLine.apply(this, m);
      if (line) {
        firstStackLine = i;
        if (line.indexOf(module.filename) !== -1) {
          lines.splice(i, 1);
        }
      } else {
        lines.splice(i, lines.length - i);
      }
    }
    if (firstStackLine > -1) {
      lines.splice(firstStackLine, level);
    }
    return lines;
  };
};

/* Translates a node style stack trace line */
var translateLineV8 = function(line, msg, scope, name, lineno, colno) {
  var pos = safe.translatePos(name, lineno, colno);
  return msg + (scope ? ' ' + scope + ' (' + pos + ')' : pos);
};

/* Matches <msg> (<scope> '(')? <name> ':' <lineno> ':' <colno> ')'? */
var stackLineRegExpV8 = /(.+?)(?:\s+([^\s]+)\s+\()?([^\s@:]+):(\d+):(\d+)\)?/;

safe.translateStackV8 = makeTranslateStack(stackLineRegExpV8, translateLineV8);

/* Translates an iOS stack trace line to node style */
var translateLineIOS = function(line, scope, name, lineno, colno) {
  var pos = safe.translatePos(name, lineno, colno);
  return safe.indent + 'at ' + (scope ? scope  + ' (' + pos + ')' : pos);
};

/* Matches (<scope> '@' )? <name> ':' <lineno> ':' <colno> */
var stackLineRegExpIOS = /(?:([^\s@]+)@)?([^\s@:]+):(\d+):(\d+)/;

safe.translateStackIOS = makeTranslateStack(stackLineRegExpIOS, translateLineIOS);

/* Translates an Android stack trace line to node style */
var translateLineAndroid = function(line, msg, scope, name, lineno, colno) {
  if (name !== 'jskit_startup.js') {
    return translateLineV8(line, msg, scope, name, lineno, colno);
  }
};

/* Matches <msg> <scope> '('? filepath <name> ':' <lineno> ':' <colno> ')'? */
var stackLineRegExpAndroid = /^(.*?)(?:\s+([^\s]+)\s+\()?[^\s\(]*?([^\/]*?):(\d+):(\d+)\)?/;

safe.translateStackAndroid = makeTranslateStack(stackLineRegExpAndroid, translateLineAndroid);

/* Translates a stack trace to the originating files */
safe.translateStack = function(stack, level) {
  level = level || 0;
  if (Pebble.platform === 'pypkjs') {
    return safe.translateStackV8(stack, level);
  } else if (stack.match('com.getpebble.android')) {
    return safe.translateStackAndroid(stack, level);
  } else {
    return safe.translateStackIOS(stack, level);
  }
};

var normalizeIndent = function(lines, pos) {
  pos = pos || 0;
  var label = lines[pos].match(/^[^\s]* /);
  if (label) {
    var indent = label[0].replace(/./g, ' ');
    for (var i = pos + 1, ii = lines.length; i < ii; i++) {
      lines[i] = lines[i].replace(/^\t/, indent);
    }
  }
  return lines;
};

safe.translateError = function(err, intro, level) {
  var name = err.name;
  var message = err.message || err.toString();
  var stack = err.stack;
  var result = [intro || 'JavaScript Error:'];
  if (message && (!stack || stack.indexOf(message) === -1)) {
    if (name && message.indexOf(name + ':') === -1) {
      message = name + ': ' + message;
    }
    result.push(message);
  }
  if (stack) {
    Array.prototype.push.apply(result, safe.translateStack(stack, level));
  }
  return normalizeIndent(result, 1).join('\n');
};

/* Dumps error messages to the console. */
safe.dumpError = function(err, intro, level) {
  if (typeof err === 'object') {
    console.log(safe.translateError(err, intro, level));
  } else {
    console.log('Error: dumpError argument is not an object');
  }
};

/* Logs runtime warnings to the console. */
safe.warn = function(message, level, name) {
  var err = new Error(message);
  err.name = name || 'Warning';
  safe.dumpError(err, 'Warning:', level);
};

/* Takes a function and return a new function with a call to it wrapped in a try/catch statement */
safe.protect = function(fn) {
  return fn ? function() {
    try {
      fn.apply(this, arguments);
    } catch (err) {
      safe.dumpError(err);
    }
  } : undefined;
};

/* Wrap event handlers added by Pebble.addEventListener */
var pblAddEventListener = Pebble.addEventListener;
Pebble.addEventListener = function(eventName, eventCallback) {
  pblAddEventListener.call(this, eventName, safe.protect(eventCallback));
};

var pblSendMessage = Pebble.sendAppMessage;
Pebble.sendAppMessage = function(message, success, failure) {
  return pblSendMessage.call(this, message, safe.protect(success), safe.protect(failure));
};

/* Wrap setTimeout and setInterval */
var originalSetTimeout = setTimeout;
window.setTimeout = function(callback, delay) {
  if (safe.warnSetTimeoutNotFunction !== false && typeof callback !== 'function') {
    safe.warn('setTimeout was called with a `' + (typeof callback) + '` type. ' +
              'Did you mean to pass a function?');
    safe.warnSetTimeoutNotFunction = false;
  }
  return originalSetTimeout(safe.protect(callback), delay);
};

var originalSetInterval = setInterval;
window.setInterval = function(callback, delay) {
  if (safe.warnSetIntervalNotFunction !== false && typeof callback !== 'function') {
    safe.warn('setInterval was called with a `' + (typeof callback) + '` type. ' +
              'Did you mean to pass a function?');
    safe.warnSetIntervalNotFunction = false;
  }
  return originalSetInterval(safe.protect(callback), delay);
};

/* Wrap the geolocation API Callbacks */
var watchPosition = navigator.geolocation.watchPosition;
navigator.geolocation.watchPosition = function(success, error, options) {
  return watchPosition.call(this, safe.protect(success), safe.protect(error), options);
};

var getCurrentPosition = navigator.geolocation.getCurrentPosition;
navigator.geolocation.getCurrentPosition = function(success, error, options) {
  return getCurrentPosition.call(this, safe.protect(success), safe.protect(error), options);
};

var ajax;

/* Try to load the ajax library if available and silently fail if it is not found. */
try {
  ajax = require('ajax');
} catch (err) {}

/* Wrap the success and failure callback of the ajax library */
if (ajax) {
  ajax.onHandler = function(eventName, callback) {
    return safe.protect(callback);
  };
}

module.exports = safe;

});
__loader.define("lib/struct.js", 1848, function(exports, module, require) {
/**
 * struct.js - chainable ArrayBuffer DataView wrapper
 *
 * @author Meiguro / http://meiguro.com/
 * @license MIT
 */

var capitalize = function(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
};

var struct = function(def) {
  this._littleEndian = true;
  this._offset = 0;
  this._cursor = 0;
  this._makeAccessors(def);
  this._view = new DataView(new ArrayBuffer(this._size));
  this._def = def;
};

struct.types = {
  int8: { size: 1 },
  uint8: { size: 1 },
  int16: { size: 2 },
  uint16: { size: 2 },
  int32: { size: 4 },
  uint32: { size: 4 },
  int64: { size: 8 },
  uint64: { size: 8 },
  float32: { size: 2 },
  float64: { size: 4 },
  cstring: { size: 1, dynamic: true },
  data: { size: 0, dynamic: true },
};

var makeDataViewAccessor = function(type, typeName) {
  var getName = 'get' + capitalize(typeName);
  var setName = 'set' + capitalize(typeName);
  type.get = function(offset, little) {
    this._advance = type.size;
    return this._view[getName](offset, little);
  };
  type.set = function(offset, value, little) {
    this._advance = type.size;
    this._view[setName](offset, value, little);
  };
};

for (var k in struct.types) {
  var type = struct.types[k];
  makeDataViewAccessor(type, k);
}

struct.types.bool = struct.types.uint8;

struct.types.uint64.get = function(offset, little) {
  var buffer = this._view;
  var a = buffer.getUint32(offset, little);
  var b = buffer.getUint32(offset + 4, little);
  this._advance = 8;
  return ((little ? b : a) << 32) + (little ? a : b);
};

struct.types.uint64.set = function(offset, value, little) {
  var a = value & 0xFFFFFFFF;
  var b = (value >> 32) & 0xFFFFFFFF;
  var buffer = this._view;
  buffer.setUint32(offset, little ? a : b, little);
  buffer.setUint32(offset + 4, little ? b : a, little);
  this._advance = 8;
};

struct.types.cstring.get = function(offset) {
  var chars = [];
  var buffer = this._view;
  for (var i = offset, ii = buffer.byteLength, j = 0; i < ii && buffer.getUint8(i) !== 0; ++i, ++j) {
    chars[j] = String.fromCharCode(buffer.getUint8(i));
  }
  this._advance = chars.length + 1;
  return decodeURIComponent(escape(chars.join('')));
};

struct.types.cstring.set = function(offset, value) {
  value = unescape(encodeURIComponent(value));
  this._grow(offset + value.length + 1);
  var i = offset;
  var buffer = this._view;
  for (var j = 0, jj = value.length; j < jj && value[i] !== '\0'; ++i, ++j) {
    buffer.setUint8(i, value.charCodeAt(j));
  }
  buffer.setUint8(i, 0);
  this._advance = value.length + 1;
};

struct.types.data.get = function(offset) {
  var length = this._value;
  this._cursor = offset;
  var buffer = this._view;
  var copy = new DataView(new ArrayBuffer(length));
  for (var i = 0; i < length; ++i) {
    copy.setUint8(i, buffer.getUint8(i + offset));
  }
  this._advance = length;
  return copy;
};

struct.types.data.set = function(offset, value) {
  var length = value.byteLength || value.length;
  this._cursor = offset;
  this._grow(offset + length);
  var buffer = this._view;
  if (value instanceof ArrayBuffer) {
    value = new DataView(value);
  }
  for (var i = 0; i < length; ++i) {
    buffer.setUint8(i + offset, value instanceof DataView ? value.getUint8(i) : value[i]);
  }
  this._advance = length;
};

struct.prototype._grow = function(target) {
  var buffer = this._view;
  var size = buffer.byteLength;
  if (target <= size) { return; }
  while (size < target) { size *= 2; }
  var copy = new DataView(new ArrayBuffer(size));
  for (var i = 0; i < buffer.byteLength; ++i) {
    copy.setUint8(i, buffer.getUint8(i));
  }
  this._view = copy;
};

struct.prototype._prevField = function(field) {
  field = field || this._access;
  var fieldIndex = this._fields.indexOf(field);
  return this._fields[fieldIndex - 1];
};

struct.prototype._makeAccessor = function(field) {
  this[field.name] = function(value) {
    var type = field.type;
    
    if (field.dynamic) {
      var prevField = this._prevField(field);
      if (prevField === undefined) {
        this._cursor = 0;
      } else if (this._access === field) {
        this._cursor -= this._advance;
      } else if (this._access !== prevField) {
        throw new Error('dynamic field requires sequential access');
      }
    } else {
      this._cursor = field.index;
    }
    this._access = field;
    var result = this;
    if (arguments.length === 0) {
      result = type.get.call(this, this._offset + this._cursor, this._littleEndian);
      this._value = result;
    } else {
      if (field.transform) {
        value = field.transform(value, field);
      }
      type.set.call(this, this._offset + this._cursor, value, this._littleEndian);
      this._value = value;
    }
    this._cursor += this._advance;
    return result;
  };
  return this;
};

struct.prototype._makeMetaAccessor = function(name, transform) {
  this[name] = function(value, field) {
    transform.call(this, value, field);
    return this;
  };
};

struct.prototype._makeAccessors = function(def, index, fields, prefix) {
  index = index || 0;
  this._fields = ( fields = fields || [] );
  var prevField = fields[fields.length];
  for (var i = 0, ii = def.length; i < ii; ++i) {
    var member = def[i];
    var type = member[0];
    if (typeof type === 'string') {
      type = struct.types[type];
    }
    var name = member[1];
    if (prefix) {
      name = prefix + capitalize(name);
    }
    var transform = member[2];
    if (type instanceof struct) {
      if (transform) {
        this._makeMetaAccessor(name, transform);
      }
      this._makeAccessors(type._def, index, fields, name);
      index = this._size;
      continue;
    }
    var field = {
      index: index,
      type: type,
      name: name,
      transform: transform,
      dynamic: type.dynamic || prevField && prevField.dynamic,
    };
    this._makeAccessor(field);
    fields.push(field);
    index += type.size;
    prevField = field;
  }
  this._size = index;
  return this;
};

struct.prototype.prop = function(def) {
  var fields = this._fields;
  var i = 0, ii = fields.length, name;
  if (arguments.length === 0) {
    var obj = {};
    for (; i < ii; ++i) {
      name = fields[i].name;
      obj[name] = this[name]();
    }
    return obj;
  }
  for (; i < ii; ++i) {
    name = fields[i].name;
    if (name in def) {
      this[name](def[name]);
    }
  }
  return this;
};

struct.prototype.view = function(view) {
  if (arguments.length === 0) {
    return this._view;
  }
  if (view instanceof ArrayBuffer) {
    view = new DataView(view);
  }
  this._view = view;
  return this;
};

struct.prototype.offset = function(offset) {
  if (arguments.length === 0) {
    return this._offset;
  }
  this._offset = offset;
  return this;
};

module.exports = struct;


});
__loader.define("lib/util2.js", 2110, function(exports, module, require) {
/*
 * util2.js by Meiguro - MIT License
 */

var util2 = (function(){

var util2 = {};

util2.noop = function() {};

util2.count = function(o) {
  var i = 0;
  for (var k in o) { ++i; }
  return i;
};

util2.copy = function(a, b) {
  b = b || (a instanceof Array ? [] : {});
  for (var k in a) { b[k] = a[k]; }
  return b;
};

util2.toInteger = function(x) {
  if (!isNaN(x = parseInt(x))) { return x; }
};

util2.toNumber = function(x) {
  if (!isNaN(x = parseFloat(x))) { return x; }
};

util2.toString = function(x) {
  return typeof x === 'object' ? JSON.stringify.apply(this, arguments) : '' + x;
};

util2.toArray = function(x) {
  if (x instanceof Array) { return x; }
  if (x[0]) { return util2.copy(x, []); }
  return [x];
};

util2.trim = function(s) {
  return s ? s.toString().trim() : s;
};

util2.last = function(a) {
  return a[a.length-1];
};

util2.inherit = function(child, parent, proto) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
  if (proto) {
    util2.copy(proto, child.prototype);
  }
  return child.prototype;
};

var chunkSize = 128;

var randomBytes = function(chunkSize) {
  var z = [];
  for (var i = 0; i < chunkSize; ++i) {
    z[i] = String.fromCharCode(Math.random() * 256);
  }
  return z.join('');
};

util2.randomString = function(regex, size, acc) {
  if (!size) {
    return '';
  }
  if (typeof regex === 'string') {
    regex = new RegExp('(?!'+regex+')[\\s\\S]', 'g');
  }
  acc = acc || '';
  var buf = randomBytes(chunkSize);
  if (buf) {
    acc += buf.replace(regex, '');
  }
  if (acc.length >= size) {
    return acc.substr(0, size);
  } else {
    return util2.randomString(regex, size, acc);
  }
};

var varpat = new RegExp("^([\\s\\S]*?)\\$([_a-zA-Z0-9]+)", "m");

util2.format = function(text, table) {
  var m, z = '';
  while ((m = text.match(varpat))) {
    var subtext = m[0], value = table[m[2]];
    if (typeof value === 'function') { value = value(); }
    z += value !== undefined ? m[1] + value.toString() : subtext;
    text = text.substring(subtext.length);
  }
  z += text;
  return z;
};

if (typeof module !== 'undefined') {
  module.exports = util2;
}

return util2;

})();

});
__loader.define("lib/vector2.js", 2220, function(exports, module, require) {
/**
 * Vector2 from three.js
 * https://github.com/mrdoob/three.js
 *
 * @author mr.doob / http://mrdoob.com/
 * @author philogb / http://blog.thejit.org/
 * @author egraether / http://egraether.com/
 * @author zz85 / http://www.lab4games.net/zz85/blog
 */

/**
 * Create a new vector with given dimensions.
 * @param x
 * @param y
 */
var Vector2 = function ( x, y ) {

  this.x = x || 0;
  this.y = y || 0;

};

Vector2.prototype = {

  constructor: Vector2,

  set: function ( x, y ) {

    this.x = x;
    this.y = y;

    return this;

  },

  copy: function ( v ) {

    this.x = v.x;
    this.y = v.y;

    return this;

  },

  clone: function () {

    return new Vector2( this.x, this.y );

  },

  add: function ( v1, v2 ) {

    this.x = v1.x + v2.x;
    this.y = v1.y + v2.y;

    return this;

  },

  addSelf: function ( v ) {

    this.x += v.x;
    this.y += v.y;

    return this;

  },

  sub: function ( v1, v2 ) {

    this.x = v1.x - v2.x;
    this.y = v1.y - v2.y;

    return this;

  },

  subSelf: function ( v ) {

    this.x -= v.x;
    this.y -= v.y;

    return this;

  },

  multiplyScalar: function ( s ) {

    this.x *= s;
    this.y *= s;

    return this;

  },

  divideScalar: function ( s ) {

    if ( s ) {

      this.x /= s;
      this.y /= s;

    } else {

      this.set( 0, 0 );

    }

    return this;

  },


  negate: function() {

    return this.multiplyScalar( -1 );

  },

  dot: function ( v ) {

    return this.x * v.x + this.y * v.y;

  },

  lengthSq: function () {

    return this.x * this.x + this.y * this.y;

  },

  length: function () {

    return Math.sqrt( this.lengthSq() );

  },

  normalize: function () {

    return this.divideScalar( this.length() );

  },

  distanceTo: function ( v ) {

    return Math.sqrt( this.distanceToSquared( v ) );

  },

  distanceToSquared: function ( v ) {

    var dx = this.x - v.x, dy = this.y - v.y;
    return dx * dx + dy * dy;

  },


  setLength: function ( l ) {

    return this.normalize().multiplyScalar( l );

  },

  equals: function( v ) {

    return ( ( v.x === this.x ) && ( v.y === this.y ) );

  }

};

if (typeof module !== 'undefined') {
  module.exports = Vector2;
}

});
__loader.define("main.js", 2397, function(exports, module, require) {
/*
 * This is the main PebbleJS file. You do not need to modify this file unless
 * you want to change the way PebbleJS starts, the script it runs or the libraries
 * it loads.
 *
 * By default, this will run app.js
 */

var safe = require('safe');
var util2 = require('util2');

Pebble.addEventListener('ready', function(e) {
  // Initialize the Pebble protocol
  require('ui/simply-pebble.js').init();

  // Backwards compatibility: place moment.js in global scope
  // This will be removed in a future update
  var moment = require('vendor/moment');

  var momentPasser = function(methodName) {
    return function() {
      if (safe.warnGlobalMoment !== false) {
        safe.warn("You've accessed moment globally. Pleae use `var moment = require('moment')` instead.\n\t" +
                  'moment will not be automatically loaded as a global in future versions.', 1);
        safe.warnGlobalMoment = false;
      }
      return (methodName ? moment[methodName] : moment).apply(this, arguments);
    };
  };

  var globalMoment = momentPasser();
  util2.copy(moment.prototype, globalMoment.prototype);
  for (var k in moment) {
    var v = moment[k];
    globalMoment[k] = typeof v === 'function' ? momentPasser(k) : v;
  }

  window.moment = globalMoment;

  // Load local file
  require('./app');
});

});
__loader.define("platform/feature.js", 2442, function(exports, module, require) {
var Vector2 = require('vector2');
var Platform = require('platform');

var Feature = module.exports;

Feature.platform = function(map, yes, no) {
  var v = map[Platform.version()] || map.unknown;
  var rv;
  if (v && yes !== undefined) {
    rv = typeof yes === 'function' ? yes(v) : yes;
  } else if (!v && no !== undefined) {
    rv = typeof no === 'function' ? no(v) : no;
  }
  return rv !== undefined ? rv : v;
};

Feature.makePlatformTest = function(map) {
  return function(yes, no) {
    return Feature.platform(map, yes, no);
  };
};

Feature.blackAndWhite = Feature.makePlatformTest({
  aplite: true,
  basalt: false,
  chalk: false,
  diorite: true,
  emery: false,
});

Feature.color = Feature.makePlatformTest({
  aplite: false,
  basalt: true,
  chalk: true,
  diorite: false,
  emery: true,
});

Feature.rectangle = Feature.makePlatformTest({
  aplite: true,
  basalt: true,
  chalk: false,
  diorite: true,
  emery: true,
});

Feature.round = Feature.makePlatformTest({
  aplite: false,
  basalt: false,
  chalk: true,
  diorite: false,
  emery: false,
});

Feature.microphone = Feature.makePlatformTest({
  aplite: false,
  basalt: true,
  chalk: true,
  diorite: true,
  emery: true,
});

Feature.resolution = Feature.makePlatformTest({
  aplite: new Vector2(144, 168),
  basalt: new Vector2(144, 168),
  chalk: new Vector2(180, 180),
  diorite: new Vector2(144, 168),
  emery: new Vector2(200, 228),
});

Feature.actionBarWidth = function() {
  return Feature.rectangle(30, 40);
};

Feature.statusBarHeight = function() {
  return 16;
};

});
__loader.define("platform/index.js", 2522, function(exports, module, require) {
var Platform = require('./platform');

module.exports = Platform;

});
__loader.define("platform/platform.js", 2528, function(exports, module, require) {
var Platform = module.exports;

Platform.version = function() {
  if (Pebble.getActiveWatchInfo) {
    return Pebble.getActiveWatchInfo().platform;
  } else {
    return 'aplite';
  }
};

});
__loader.define("settings/index.js", 2540, function(exports, module, require) {
var Settings = require('./settings');

Settings.init();

module.exports = Settings;

});
__loader.define("settings/settings.js", 2548, function(exports, module, require) {
var util2 = require('lib/util2');
var myutil = require('lib/myutil');
var safe = require('lib/safe');
var ajax = require('lib/ajax');
var appinfo = require('appinfo');

var Settings = module.exports;

var parseJson = function(data) {
  try {
    return JSON.parse(data);
  } catch (e) {
    safe.warn('Invalid JSON in localStorage: ' + (e.message || '') + '\n\t' + data);
  }
};

var state;

Settings.settingsUrl = 'http://meiguro.com/simplyjs/settings.html';

Settings.init = function() {
  Settings.reset();

  Settings._loadOptions();
  Settings._loadData();

  // Register listeners for the Settings
  Pebble.addEventListener('showConfiguration', Settings.onOpenConfig);
  Pebble.addEventListener('webviewclosed', Settings.onCloseConfig);
};

Settings.reset = function() {
  state = Settings.state = {
    options: {},
    data: {},
    listeners: [],
    ignoreCancelled: 0,
  };
};

var toHttpUrl = function(url) {
  if (typeof url === 'string' && url.length && !url.match(/^(\w+:)?\/\//)) {
    url = 'http://' + url;
  }
  return url;
};

Settings.mainScriptUrl = function(scriptUrl) {
  scriptUrl = toHttpUrl(scriptUrl);
  if (scriptUrl) {
    localStorage.setItem('mainJsUrl', scriptUrl);
  } else {
    scriptUrl = localStorage.getItem('mainJsUrl');
  }
  return scriptUrl;
};

Settings.getBaseOptions = function() {
  return {
    scriptUrl: Settings.mainScriptUrl(),
  };
};

Settings._getDataKey = function(path, field) {
  path = path || appinfo.uuid;
  return field + ':' + path;
};

Settings._saveData = function(path, field, data) {
  field = field || 'data';
  if (data) {
    state[field] = data;
  } else {
    data = state[field];
  }
  var key = Settings._getDataKey(path, field);
  localStorage.setItem(key, JSON.stringify(data));
};

Settings._loadData = function(path, field, nocache) {
  field = field || 'data';
  state[field] = {};
  var key = Settings._getDataKey(path, field);
  var value = localStorage.getItem(key);
  var data = parseJson(value);
  if (value && typeof data === 'undefined') {
    // There was an issue loading the data, remove it
    localStorage.removeItem(key);
  }
  if (!nocache && typeof data === 'object' && data !== null) {
    state[field] = data;
  }
  return data;
};

Settings._saveOptions = function(path) {
  Settings._saveData(path, 'options');
};

Settings._loadOptions = function(path) {
  Settings._loadData(path, 'options');
};

var makeDataAccessor = function(type, path) {
  return function(field, value) {
    var data = state[type];
    if (arguments.length === 0) {
      return data;
    }
    if (arguments.length === 1 && typeof field !== 'object') {
      return data[field];
    }
    if (typeof field !== 'object' && value === undefined || value === null) {
      delete data[field];
    }
    var def = myutil.toObject(field, value);
    util2.copy(def, data);
    Settings._saveData(path, type);
  };
};

Settings.option = makeDataAccessor('options');

Settings.data = makeDataAccessor('data');

Settings.config = function(opt, open, close) {
  if (typeof opt === 'string') {
    opt = { url: opt };
  }
  opt.url = toHttpUrl(opt.url);
  if (close === undefined) {
    close = open;
    open = util2.noop;
  }
  var listener = {
    params: opt,
    open: open,
    close: close,
  };
  state.listeners.push(listener);
};

Settings.onOpenConfig = function(e) {
  var options;
  var url;
  var listener = util2.last(state.listeners);
  if (listener) {
    e = {
      originalEvent: e,
      options: state.options,
      url: listener.params.url,
    };
    var result;
    if (listener.open) {
      result = listener.open(e);
      if (result === false) {
        return;
      }
    }
    url = typeof result === 'string' ? result : listener.params.url;
    options = state.options;
  } else {
    url = Settings.settingsUrl;
    options = Settings.getBaseOptions();
    return;
  }
  if (listener.params.hash !== false) {
    url += '#' + encodeURIComponent(JSON.stringify(options));
  }
  Pebble.openURL(url);
};

Settings.onCloseConfig = function(e) {
  // Work around for PebbleKit JS Android
  // On Android, an extra cancelled event occurs after a normal close
  if (e.response !== 'CANCELLED') {
    state.ignoreCancelled++;
  } else if (state.ignoreCancelled > 0) {
    state.ignoreCancelled--;
    return;
  }
  var listener = util2.last(state.listeners);
  var options = {};
  var format;
  if (e.response) {
    options = parseJson(decodeURIComponent(e.response));
    if (typeof options === 'object' && options !== null) {
      format = 'json';
    }
    if (!format && e.response.match(/(&|=)/)) {
      options = ajax.deformify(e.response);
      if (util2.count(options) > 0) {
        format = 'form';
      }
    }
  }
  if (listener) {
    e = {
      originalEvent: e,
      response: e.response,
      originalOptions: state.options,
      options: options,
      url: listener.params.url,
      failed: !format,
      format: format,
    };
    if (format && listener.params.autoSave !== false) {
      e.originalOptions = util2.copy(state.options);
      util2.copy(options, state.options);
      Settings._saveOptions();
    }
    if (listener.close) {
      return listener.close(e);
    }
  }
};

});
__loader.define("simply/simply.js", 2767, function(exports, module, require) {
/**
 * Simply.js
 *
 * Provides the classic "SimplyJS" API on top of PebbleJS.
 *
 * Not to be confused with ui/Simply which abstracts the implementation used
 * to interface with the underlying hardware.
 *
 * @namespace simply
 */

var WindowStack = require('ui/windowstack');
var Card = require('ui/card');
var Vibe = require('ui/vibe');

var simply = {};

simply.text = function(textDef) {
  var wind = WindowStack.top();
  if (!wind || !(wind instanceof Card)) {
    wind = new Card(textDef);
    wind.show();
  } else {
    wind.prop(textDef, true);
  }
};

/**
 * Vibrates the Pebble.
 * There are three support vibe types: short, long, and double.
 * @memberOf simply
 * @param {string} [type=short] - The vibe type.
 */
simply.vibe = function(type) {
  return Vibe.vibrate(type);
};

module.exports = simply;

});
__loader.define("smartpackage/package-pebble.js", 2808, function(exports, module, require) {
var myutil = require('myutil');
var package = require('smartpackage/package');
var simply = require('simply/simply');

var packageImpl = module.exports;

var getExecPackage = function(execname) {
  var packages = package.packages;
  for (var path in packages) {
    var pkg = packages[path];
    if (pkg && pkg.execname === execname) {
      return path;
    }
  }
};

var getExceptionFile = function(e, level) {
  var stack = e.stack.split('\n');
  for (var i = level || 0, ii = stack.length; i < ii; ++i) {
    var line = stack[i];
    if (line.match(/^\$\d/)) {
      var path = getExecPackage(line);
      if (path) {
        return path;
      }
    }
  }
  return stack[level];
};

var getExceptionScope = function(e, level) {
  var stack = e.stack.split('\n');
  for (var i = level || 0, ii = stack.length; i < ii; ++i) {
    var line = stack[i];
    if (!line || line.match('native code')) { continue; }
    return line.match(/^\$\d/) && getExecPackage(line) || line;
  }
  return stack[level];
};

var setHandlerPath = function(handler, path, level) {
  var level0 = 4; // caller -> wrap -> apply -> wrap -> set
  handler.path = path ||
      getExceptionScope(new Error(), (level || 0) + level0) ||
      package.basename(package.module.filename);
  return handler;
};

var papply = packageImpl.papply = function(f, args, path) {
  try {
    return f.apply(this, args);
  } catch (e) {
    var scope = package.name(!path && getExceptionFile(e) || getExecPackage(path) || path);
    console.log(scope + ':' + e.line + ': ' + e + '\n' + e.stack);
    simply.text({
      subtitle: scope,
      body: e.line + ' ' + e.message,
    }, true);
  }
};

var protect = packageImpl.protect = function(f, path) {
  return function() {
    return papply(f, arguments, path);
  };
};

packageImpl.wrapHandler = function(handler, level) {
  if (!handler) { return; }
  setHandlerPath(handler, null, level || 1);
  var pkg = package.packages[handler.path];
  if (pkg) {
    return protect(pkg.fwrap(handler), handler.path);
  } else {
    return protect(handler, handler.path);
  }
};

var toSafeName = function(name) {
  name = name.replace(/[^0-9A-Za-z_$]/g, '_');
  if (name.match(/^[0-9]/)) {
    name = '_' + name;
  }
  return name;
};

var nextId = 1;

packageImpl.loadPackage = function(pkg, loader) {
  pkg.execname = toSafeName(pkg.name) + '$' + nextId++;
  pkg.fapply = myutil.defun(pkg.execname, ['f', 'args'],
    'return f.apply(this, args)'
  );
  pkg.fwrap = function(f) {
    return function() {
      return pkg.fapply(f, arguments);
    };
  };
  return papply(loader, null, pkg.name);
};


});
__loader.define("smartpackage/package.js", 2912, function(exports, module, require) {
var ajax = require('ajax');
var util2 = require('util2');
var myutil = require('myutil');
var Settings = require('settings/settings');
var simply = require('simply');

var package = module.exports;

package.packages = {};

package.basepath = function(path) {
  return path.replace(/[^\/]*$/, '');
};

package.basename = function(path) {
  return path.match(/[^\/]*$/)[0];
};

/**
 * Converts a relative path to an absolute path
 * using the path of the currently running script
 * (package.module) or optionaly, the given root.
 *
 * The first argument is optional:
 *   abspath(path);
 *   abspath(root, path);
 */
package.abspath = function(root, path) {
  // Handle optional first argument
  if (!path) {
    path = root;
    root = null;
  }
  // Use the package root if no root provided.
  if (!root && package.module) {
    root = package.basepath(package.module.filename);
  }
  return myutil.abspath(root, path);
};


package.name = function(rootfile, path) {
  if (!path) {
    path = rootfile;
    rootfile = null;
  }
  if (!rootfile && package.module) {
    rootfile = package.basepath(package.module.filename);
  }
  var name = path;
  if (typeof name === 'string') {
    name = name.replace(package.basepath(rootfile), '');
  }
  return name || package.basename(rootfile);
};

package.get = function(root, path) {
  return package.packages[package.abspath(root, path)];
};

package.make = function(path) {
  var pkg = package.packages[path];
  if (pkg) { return; }
  pkg = package.packages[path] = {
    name: package.basename(path),
    savename: 'script:' + path,
    filename: path
  };
  return pkg;
};

package.loader = function(pkg, script) {
  // console shim
  var console2 = util2.copy(console);

  console2.log = function() {
    var msg = pkg.name + ': ' + myutil.slog.apply(this, arguments);
    var width = 45;
    var prefix = (new Array(width + 1)).join('\b'); // erase source line
    var suffix = msg.length < width ? (new Array(width - msg.length + 1)).join(' ') : 0;
    console.log(prefix + msg + suffix);
  };

  // loader
  return function() {
    var exports = pkg.exports;
    var result = myutil.defun(pkg.execName,
      ['module', 'require', 'console', 'Pebble'], script)
      (pkg, package.require, console2, Pebble);

    // backwards compatibility for return-style modules
    if (pkg.exports === exports && result) {
      pkg.exports = result;
    }

    return pkg.exports;
  };
};

package.loadScript = function(url, async) {
  console.log('loading: ' + url);

  var pkg = package.make(url);

  if (!package.module) {
    package.module = pkg;
  }

  pkg.exports = {};

  var loader = util2.noop;
  var makeLoader = function(script) {
    return package.loader(pkg, script);
  };

  ajax({ url: url, cache: false, async: async },
    function(data) {
      if (data && data.length) {
        localStorage.setItem(pkg.savename, data);
        loader = makeLoader(data);
      }
    },
    function(data, status) {
      data = localStorage.getItem(pkg.savename);
      if (data && data.length) {
        console.log(status + ': failed, loading saved script instead');
        loader = makeLoader(data);
      }
    }
  );

  return package.impl.loadPackage(pkg, loader);
};

package.loadMainScript = function(scriptUrl) {
  simply.reset();

  scriptUrl = Settings.mainScriptUrl(scriptUrl);
  if (!scriptUrl) { return; }

  Settings.loadOptions(scriptUrl);

  try {
    package.loadScript(scriptUrl, false);
  } catch (e) {
    simply.text({
      title: 'Failed to load',
      body: scriptUrl,
    }, true);
    return;
  }
};

/**
 * Loads external dependencies, allowing you to write a multi-file project.
 * Package loading loosely follows the CommonJS format.
 * Exporting is possible by modifying or setting module.exports within the required file.
 * The module path is also available as module.path.
 * This currently only supports a relative path to another JavaScript file.
 * @global
 * @param {string} path - The path to the dependency.
 */

package.require = function(path) {
  if (!path.match(/\.js$/)) {
    path += '.js';
  }
  var pkg = package.get(path);
  if (pkg) {
    return pkg.exports;
  }
  path = package.abspath(path);
  return package.loadScript(path, false);
};

});
__loader.define("timeline/index.js", 3089, function(exports, module, require) {
var Timeline = require('./timeline');

Timeline.init();

module.exports = Timeline;

});
__loader.define("timeline/timeline.js", 3097, function(exports, module, require) {
var Timeline = module.exports;

Timeline.init = function() {
  this._launchCallbacks = [];
};

Timeline.launch = function(callback) {
  if (this._launchEvent) {
    callback(this._launchEvent);
  } else {
    this._launchCallbacks.push(callback);
  }
};

Timeline.emitAction = function(args) {
  var e;
  if (args !== undefined) {
    e = {
      action: true,
      launchCode: args,
    };
  } else {
    e = {
      action: false,
    };
  }

  this._launchEvent = e;

  var callbacks = this._launchCallbacks;
  this._launchCallbacks = [];
  for (var i = 0, ii = callbacks.length; i < ii; ++i) {
    if (callbacks[i](e) === false) {
      return false;
    }
  }
};

});
__loader.define("ui/accel.js", 3137, function(exports, module, require) {
var Emitter = require('emitter');

var Accel = new Emitter();

module.exports = Accel;

var WindowStack = require('ui/windowstack');
var Window = require('ui/window');
var simply = require('ui/simply');

var state;

Accel.init = function() {
  if (state) {
    Accel.off();
  }

  state = Accel.state = {
    rate: 100,
    samples: 25,
    subscribe: false,
    subscribeMode: 'auto',
    listeners: [],
  };
};

Accel.onAddHandler = function(type, subtype) {
  if (type === 'data') {
    Accel.autoSubscribe();
  }
};

Accel.onRemoveHandler = function(type, subtype) {
  if (!type || type === 'accelData') {
    Accel.autoSubscribe();
  }
};

var accelDataListenerCount = function() {
  var count = Accel.listenerCount('data');
  var wind = WindowStack.top();
  if (wind) {
    count += wind.listenerCount('accelData');
  }
  return count;
};

Accel.autoSubscribe = function() {
  if (state.subscribeMode !== 'auto') { return; }
  var subscribe = (accelDataListenerCount() > 0);
  if (subscribe !== state.subscribe) {
    return Accel.config(subscribe, true);
  }
};

/**
 * The accelerometer configuration parameter for {@link simply.accelConfig}.
 * The accelerometer data stream is useful for applications such as gesture recognition when accelTap is too limited.
 * However, keep in mind that smaller batch sample sizes and faster rates will drastically impact the battery life of both the Pebble and phone because of the taxing use of the processors and Bluetooth modules.
 * @typedef {object} simply.accelConf
 * @property {number} [rate] - The rate accelerometer data points are generated in hertz. Valid values are 10, 25, 50, and 100. Initializes as 100.
 * @property {number} [samples] - The number of accelerometer data points to accumulate in a batch before calling the event handler. Valid values are 1 to 25 inclusive. Initializes as 25.
 * @property {boolean} [subscribe] - Whether to subscribe to accelerometer data events. {@link simply.accelPeek} cannot be used when subscribed. Simply.js will automatically (un)subscribe for you depending on the amount of accelData handlers registered.
 */

/**
 * Changes the accelerometer configuration.
 * See {@link simply.accelConfig}
 * @memberOf simply
 * @param {simply.accelConfig} accelConf - An object defining the accelerometer configuration.
 */
Accel.config = function(opt, auto) {
  if (arguments.length === 0) {
    return {
      rate: state.rate,
      samples: state.samples,
      subscribe: state.subscribe,
    };
  } else if (typeof opt === 'boolean') {
    opt = { subscribe: opt };
  }
  for (var k in opt) {
    if (k === 'subscribe') {
      state.subscribeMode = opt[k] && !auto ? 'manual' : 'auto';
    }
    state[k] = opt[k];
  }
  return simply.impl.accelConfig(Accel.config());
};

/**
 * Peeks at the current accelerometer values.
 * @memberOf simply
 * @param {simply.eventHandler} callback - A callback function that will be provided the accel data point as an event.
 */
Accel.peek = function(callback) {
  if (state.subscribe) {
    throw new Error('Cannot use accelPeek when listening to accelData events');
  }
  return simply.impl.accelPeek.apply(this, arguments);
};

/**
 * Simply.js accel tap event.
 * Use the event type 'accelTap' to subscribe to these events.
 * @typedef simply.accelTapEvent
 * @property {string} axis - The axis the tap event occurred on: 'x', 'y', or 'z'. This is also the event subtype.
 * @property {number} direction - The direction of the tap along the axis: 1 or -1.
 */

Accel.emitAccelTap = function(axis, direction) {
  var e = {
    axis: axis,
    direction: direction,
  };
  if (Window.emit('accelTap', axis, e) === false) {
    return false;
  }
  Accel.emit('tap', axis, e);
};

/**
 * Simply.js accel data point.
 * Typical values for gravity is around -1000 on the z axis.
 * @typedef simply.accelPoint
 * @property {number} x - The acceleration across the x-axis.
 * @property {number} y - The acceleration across the y-axis.
 * @property {number} z - The acceleration across the z-axis.
 * @property {boolean} vibe - Whether the watch was vibrating when measuring this point.
 * @property {number} time - The amount of ticks in millisecond resolution when measuring this point.
 */

/**
 * Simply.js accel data event.
 * Use the event type 'accelData' to subscribe to these events.
 * @typedef simply.accelDataEvent
 * @property {number} samples - The number of accelerometer samples in this event.
 * @property {simply.accelPoint} accel - The first accel in the batch. This is provided for convenience.
 * @property {simply.accelPoint[]} accels - The accelerometer samples in an array.
 */

Accel.emitAccelData = function(accels, callback) {
  var e = {
    samples: accels.length,
    accel: accels[0],
    accels: accels,
  };
  if (callback) {
    return callback(e);
  }
  if (Window.emit('accelData', null, e) === false) {
    return false;
  }
  Accel.emit('data', e);
};

Accel.init();

});
__loader.define("ui/card.js", 3297, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Emitter = require('emitter');
var WindowStack = require('ui/windowstack');
var Propable = require('ui/propable');
var Window = require('ui/window');
var simply = require('ui/simply');

var textProps = [
  'title',
  'subtitle',
  'body',
];

var textColorProps = [
  'titleColor',
  'subtitleColor',
  'bodyColor',
];

var imageProps = [
  'icon',
  'subicon',
  'banner',
];

var actionProps = [
  'up',
  'select',
  'back',
];

var configProps = [
  'style',
  'backgroundColor'
];

var accessorProps = textProps.concat(textColorProps).concat(imageProps).concat(configProps);
var clearableProps = textProps.concat(imageProps);

var defaults = {
  status: true,
  backgroundColor: 'white',
};

var Card = function(cardDef) {
  Window.call(this, myutil.shadow(defaults, cardDef || {}));
  this._dynamic = false;
};

Card._codeName = 'card';

util2.inherit(Card, Window);

util2.copy(Emitter.prototype, Card.prototype);

Propable.makeAccessors(accessorProps, Card.prototype);

Card.prototype._prop = function() {
  if (this === WindowStack.top()) {
    simply.impl.card.apply(this, arguments);
  }
};

Card.prototype._clear = function(flags_) {
  var flags = myutil.toFlags(flags_);
  if (flags === true) {
    clearableProps.forEach(Propable.unset.bind(this.state));
  }
  Window.prototype._clear.call(this, flags_);
};

module.exports = Card;

});
__loader.define("ui/circle.js", 3373, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var accessorProps = [
  'radius',
];

var defaults = {
  backgroundColor: 'white',
  borderColor: 'clear',
  borderWidth: 1,
};

var Circle = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.CircleType;
};

util2.inherit(Circle, StageElement);

Propable.makeAccessors(accessorProps, Circle.prototype);

module.exports = Circle;

});
__loader.define("ui/element.js", 3401, function(exports, module, require) {
var util2 = require('util2');
var Vector2 = require('vector2');
var myutil = require('myutil');
var WindowStack = require('ui/windowstack');
var Propable = require('ui/propable');
var simply = require('ui/simply');

var elementProps = [
  'position',
  'size',
  'backgroundColor',
  'borderColor',
  'borderWidth',
];

var accessorProps = elementProps;

var nextId = 1;

var StageElement = function(elementDef) {
  this.state = elementDef || {};
  this.state.id = nextId++;
  if (!this.state.position) {
    this.state.position = new Vector2();
  }
  if (!this.state.size) {
    this.state.size = new Vector2();
  }
  this._queue = [];
};

var Types = [
  'NoneType',
  'RectType',
  'LineType',
  'CircleType',
  'RadialType',
  'TextType',
  'ImageType',
  'InverterType',
];

Types.forEach(function(name, index) {
  StageElement[name] = index;
});

util2.copy(Propable.prototype, StageElement.prototype);

Propable.makeAccessors(accessorProps, StageElement.prototype);

StageElement.prototype._reset = function() {
  this._queue = [];
};

StageElement.prototype._id = function() {
  return this.state.id;
};

StageElement.prototype._type = function() {
  return this.state.type;
};

StageElement.prototype._prop = function(elementDef) {
  if (this.parent === WindowStack.top()) {
    simply.impl.stageElement(this._id(), this._type(), this.state);
  }
};

StageElement.prototype.index = function() {
  if (!this.parent) { return -1; }
  return this.parent.index(this);
};

StageElement.prototype.remove = function(broadcast) {
  if (!this.parent) { return this; }
  this.parent.remove(this, broadcast);
  return this;
};

StageElement.prototype._animate = function(animateDef, duration) {
  if (this.parent === WindowStack.top()) {
    simply.impl.stageAnimate(this._id(), this.state,
        animateDef, duration || 400, animateDef.easing || 'easeInOut');
  }
};

StageElement.prototype.animate = function(field, value, duration) {
  if (typeof field === 'object') {
    duration = value;
  }
  var animateDef = myutil.toObject(field, value);
  this.queue(function() {
    this._animate(animateDef, duration);
    util2.copy(animateDef, this.state);
  });
  if (!this.state.animating) {
    this.dequeue();
  }
  return this;
};

StageElement.prototype.queue = function(callback) {
  this._queue.push(callback);
};

StageElement.prototype.dequeue = function() {
  var callback = this._queue.shift();
  if (callback) {
    this.state.animating = true;
    callback.call(this, this.dequeue.bind(this));
  } else {
    this.state.animating = false;
  }
};

StageElement.emitAnimateDone = function(id) {
  var wind = WindowStack.top();
  if (!wind || !wind._dynamic) { return; }
  wind.each(function(element) {
    if (element._id() === id) {
      element.dequeue();
      return false;
    }
  });
};

module.exports = StageElement;

});
__loader.define("ui/image.js", 3531, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var imageProps = [
  'image',
  'compositing',
];

var defaults = {
  backgroundColor: 'clear',
  borderColor: 'clear',
  borderWidth: 1,
};

var ImageElement = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.ImageType;
};

util2.inherit(ImageElement, StageElement);

Propable.makeAccessors(imageProps, ImageElement.prototype);

module.exports = ImageElement;

});
__loader.define("ui/imageservice.js", 3560, function(exports, module, require) {
var imagelib = require('lib/image');
var myutil = require('myutil');
var Feature = require('platform/feature');
var Resource = require('ui/resource');
var simply = require('ui/simply');

var ImageService = module.exports;

var state;

ImageService.init = function() {
  state = ImageService.state = {
    cache: {},
    nextId: Resource.items.length + 1,
    rootUrl: undefined,
  };
};

var makeImageHash = function(image) {
  var url = image.url;
  var hashPart = '';
  if (image.width) {
    hashPart += ',width:' + image.width;
  }
  if (image.height) {
    hashPart += ',height:' + image.height;
  }
  if (image.dither) {
    hashPart += ',dither:' + image.dither;
  }
  if (hashPart) {
    url += '#' + hashPart.substr(1);
  }
  return url;
};

var parseImageHash = function(hash) {
  var image = {};
  hash = hash.split('#');
  image.url = hash[0];
  hash = hash[1];
  if (!hash) { return image; }
  var args = hash.split(',');
  for (var i = 0, ii = args.length; i < ii; ++i) {
    var arg = args[i];
    if (arg.match(':')) {
      arg = arg.split(':');
      var v = arg[1];
      image[arg[0]] = !isNaN(Number(v)) ? Number(v) : v;
    } else {
      image[arg] = true;
    }
  }
  return image;
};

ImageService.load = function(opt, reset, callback) {
  if (typeof opt === 'string') {
    opt = parseImageHash(opt);
  }
  if (typeof reset === 'function') {
    callback = reset;
    reset = null;
  }
  var url = myutil.abspath(state.rootUrl, opt.url);
  var hash = makeImageHash(opt);
  var image = state.cache[hash];
  var fetch = false;
  if (image) {
    if ((opt.width && image.width !== opt.width) ||
        (opt.height && image.height !== opt.height) ||
        (opt.dither && image.dither !== opt.dither)) {
      reset = true;
    }
    if (reset !== true && image.loaded) {
      return image.id;
    }
  }
  if (!image || reset === true) {
    fetch = true;
    image = {
      id: state.nextId++,
      url: url,
    };
  }
  image.width = opt.width;
  image.height = opt.height;
  image.dither =  opt.dither;
  image.loaded = true;
  state.cache[hash] = image;
  var onLoad = function() {
    simply.impl.image(image.id, image.image);
    if (callback) {
      var e = {
        type: 'image',
        image: image.id,
        url: image.url,
      };
      callback(e);
    }
  };
  if (fetch) {
    var bitdepth = Feature.color(8, 1);
    imagelib.load(image, bitdepth, onLoad);
  } else {
    onLoad();
  }
  return image.id;
};

ImageService.setRootUrl = function(url) {
  state.rootUrl = url;
};

/**
 * Resolve an image path to an id. If the image is defined in appinfo, the index of the resource is used,
 * otherwise a new id is generated for dynamic loading.
 */
ImageService.resolve = function(opt) {
  var id = Resource.getId(opt);
  return typeof id !== 'undefined' ? id : ImageService.load(opt);
};

ImageService.markAllUnloaded = function() {
  for (var k in state.cache) {
    delete state.cache[k].loaded;
  }
};

ImageService.init();

});
__loader.define("ui/index.js", 3693, function(exports, module, require) {
var UI = {};

UI.Vector2 = require('vector2');
UI.Window = require('ui/window');
UI.Card = require('ui/card');
UI.Menu = require('ui/menu');
UI.Rect = require('ui/rect');
UI.Line = require('ui/line');
UI.Circle = require('ui/circle');
UI.Radial = require('ui/radial');
UI.Text = require('ui/text');
UI.TimeText = require('ui/timetext');
UI.Image = require('ui/image');
UI.Inverter = require('ui/inverter');
UI.Vibe = require('ui/vibe');
UI.Light = require('ui/light');

module.exports = UI;

});
__loader.define("ui/inverter.js", 3714, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var StageElement = require('ui/element');

var Inverter = function(elementDef) {
  StageElement.call(this, elementDef);
  this.state.type = StageElement.InverterType;
};

util2.inherit(Inverter, StageElement);

module.exports = Inverter;

});
__loader.define("ui/light.js", 3729, function(exports, module, require) {
var simply = require('ui/simply');

var Light = module.exports;

Light.on = function() {
  simply.impl.light('on');
};

Light.auto = function() {
  simply.impl.light('auto');
};

Light.trigger = function() {
  simply.impl.light('trigger');
};

});
__loader.define("ui/line.js", 3747, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var accessorProps = [
  'strokeColor',
  'strokeWidth',
  'position2',
];

var defaults = {
  strokeColor: 'white',
  strokeWidth: 1,
};

var Line = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.LineType;
};

util2.inherit(Line, StageElement);

Propable.makeAccessors(accessorProps, Line.prototype);

module.exports = Line;

});
__loader.define("ui/menu.js", 3776, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Emitter = require('emitter');
var Platform = require('platform');
var WindowStack = require('ui/windowstack');
var Window = require('ui/window');
var simply = require('ui/simply');

var defaults = {
  status: true,
  backgroundColor: 'white',
  textColor: 'black',
  highlightBackgroundColor: 'black',
  highlightTextColor: 'white',
};

var Menu = function(menuDef) {
  Window.call(this, myutil.shadow(defaults, menuDef || {}));
  this._dynamic = false;
  this._sections = {};
  this._selection = { sectionIndex: 0, itemIndex: 0 };
  this._selections = [];
};

Menu._codeName = 'menu';

util2.inherit(Menu, Window);

util2.copy(Emitter.prototype, Menu.prototype);

Menu.prototype._show = function() {
  Window.prototype._show.apply(this, arguments);
  this._select();
};

Menu.prototype._select = function() {
  if (this === WindowStack.top()) {
    var select = this._selection;
    simply.impl.menuSelection(select.sectionIndex, select.itemIndex);
  }
};

Menu.prototype._numPreloadItems = (Platform.version() === 'aplite' ? 5 : 50);

Menu.prototype._prop = function(state, clear, pushing) {
  if (this === WindowStack.top()) {
    this._resolveMenu(clear, pushing);
    this._resolveSection(this._selection);
  }
};

Menu.prototype.action = function() {
  throw new Error("Menus don't support action bars.");
};

Menu.prototype.buttonConfig = function() {
  throw new Error("Menus don't support changing button configurations.");
};

Menu.prototype._buttonAutoConfig = function() {};

Menu.prototype._getMetaSection = function(sectionIndex) {
  return (this._sections[sectionIndex] || ( this._sections[sectionIndex] = {} ));
};

Menu.prototype._getSections = function() {
  var sections = this.state.sections;
  if (sections instanceof Array) {
    return sections;
  }
  if (typeof sections === 'number') {
    sections = new Array(sections);
    return (this.state.sections = sections);
  }
  if (typeof sections === 'function') {
    this.sectionsProvider = this.state.sections;
    delete this.state.sections;
  }
  if (this.sectionsProvider) {
    sections = this.sectionsProvider.call(this);
    if (sections) {
      this.state.sections = sections;
      return this._getSections();
    }
  }
  return (this.state.sections = []);
};

Menu.prototype._getSection = function(e, create) {
  var sections = this._getSections();
  var section = sections[e.sectionIndex];
  if (section) {
    return section;
  }
  if (this.sectionProvider) {
    section = this.sectionProvider.call(this, e);
    if (section) {
      return (sections[e.sectionIndex] = section);
    }
  }
  if (!create) { return; }
  return (sections[e.sectionIndex] = {});
};

Menu.prototype._getItems = function(e, create) {
  var section = this._getSection(e, create);
  if (!section) {
    if (e.sectionIndex > 0) { return; }
    section = this.state.sections[0] = {};
  }
  if (section.items instanceof Array) {
    return section.items;
  }
  if (typeof section.items === 'number') {
    return (section.items = new Array(section.items));
  }
  if (typeof section.items === 'function') {
    this._sections[e.sectionIndex] = section.items;
    delete section.items;
  }
  var itemsProvider = this._getMetaSection(e.sectionIndex).items || this.itemsProvider;
  if (itemsProvider) {
    var items = itemsProvider.call(this, e);
    if (items) {
      section.items = items;
      return this._getItems(e, create);
    }
  }
  return (section.items = []);
};

Menu.prototype._getItem = function(e, create) {
  var items = this._getItems(e, create);
  var item = items[e.itemIndex];
  if (item) {
    return item;
  }
  var itemProvider = this._getMetaSection(e.sectionIndex).item || this.itemProvider;
  if (itemProvider) {
    item = itemProvider.call(this, e);
    if (item) {
      return (items[e.itemIndex] = item);
    }
  }
  if (!create) { return; }
  return (items[e.itemIndex] = {});
};

Menu.prototype._resolveMenu = function(clear, pushing) {
  var sections = this._getSections(this);
  if (this === WindowStack.top()) {
    simply.impl.menu(this.state, clear, pushing);
    return true;
  }
};

Menu.prototype._resolveSection = function(e, clear) {
  var section = this._getSection(e);
  if (!section) { return; }
  section = myutil.shadow({
    textColor: this.state.textColor, 
    backgroundColor: this.state.backgroundColor
  }, section);
  section.items = this._getItems(e);
  if (this === WindowStack.top()) {
    simply.impl.menuSection.call(this, e.sectionIndex, section, clear);
    var select = this._selection;
    if (select.sectionIndex === e.sectionIndex) {
      this._preloadItems(select);
    }
    return true;
  }
};

Menu.prototype._resolveItem = function(e) {
  var item = this._getItem(e);
  if (!item) { return; }
  if (this === WindowStack.top()) {
    simply.impl.menuItem.call(this, e.sectionIndex, e.itemIndex, item);
    return true;
  }
};

Menu.prototype._preloadItems = function(e) {
  var select = util2.copy(e);
  select.itemIndex = Math.max(0, select.itemIndex - Math.floor(this._numPreloadItems / 2));
  for (var i = 0; i < this._numPreloadItems; ++i) {
    this._resolveItem(select);
    select.itemIndex++;
  }
};

Menu.prototype._emitSelect = function(e) {
  this._selection = e;
  var item = this._getItem(e);
  switch (e.type) {
    case 'select':
      if (item && typeof item.select === 'function') {
        if (item.select(e) === false) {
          return false;
        }
      }
      break;
    case 'longSelect':
      if (item && typeof item.longSelect === 'function') {
        if (item.longSelect(e) === false) {
          return false;
        }
      }
      break;
    case 'selection':
      var handlers = this._selections;
      this._selections = [];
      if (item && typeof item.selected === 'function') {
        if (item.selected(e) === false) {
          return false;
        }
      }
      for (var i = 0, ii = handlers.length; i < ii; ++i) {
        if (handlers[i](e) === false) {
          break;
        }
      }
      break;
  }
};

Menu.prototype.sections = function(sections) {
  if (typeof sections === 'function') {
    delete this.state.sections;
    this.sectionsProvider = sections;
    this._resolveMenu();
    return this;
  }
  this.state.sections = sections;
  this._resolveMenu();
  return this;
};

Menu.prototype.section = function(sectionIndex, section) {
  if (typeof sectionIndex === 'object') {
    sectionIndex = sectionIndex.sectionIndex || 0;
  } else if (typeof sectionIndex === 'function') {
    this.sectionProvider = sectionIndex;
    return this;
  }
  var menuIndex = { sectionIndex: sectionIndex };
  if (!section) {
    return this._getSection(menuIndex);
  }
  var sections = this._getSections();
  var prevLength = sections.length;
  sections[sectionIndex] = util2.copy(section, sections[sectionIndex]);
  if (sections.length !== prevLength) {
    this._resolveMenu();
  }
  this._resolveSection(menuIndex, typeof section.items !== 'undefined');
  return this;
};

Menu.prototype.items = function(sectionIndex, items) {
  if (typeof sectionIndex === 'object') {
    sectionIndex = sectionIndex.sectionIndex || 0;
  } else if (typeof sectionIndex === 'function') {
    this.itemsProvider = sectionIndex;
    return this;
  }
  if (typeof items === 'function') {
    this._getMetaSection(sectionIndex).items = items;
    return this;
  }
  var menuIndex = { sectionIndex: sectionIndex };
  if (!items) {
    return this._getItems(menuIndex);
  }
  var section = this._getSection(menuIndex, true);
  section.items = items;
  this._resolveSection(menuIndex, true);
  return this;
};

Menu.prototype.item = function(sectionIndex, itemIndex, item) {
  if (typeof sectionIndex === 'object') {
    item = itemIndex || item;
    itemIndex = sectionIndex.itemIndex;
    sectionIndex = sectionIndex.sectionIndex || 0;
  } else if (typeof sectionIndex === 'function') {
    this.itemProvider = sectionIndex;
    return this;
  }
  if (typeof itemIndex === 'function') {
    item = itemIndex;
    itemIndex = null;
  }
  if (typeof item === 'function') {
    this._getMetaSection(sectionIndex).item = item;
    return this;
  }
  var menuIndex = { sectionIndex: sectionIndex, itemIndex: itemIndex };
  if (!item) {
    return this._getItem(menuIndex);
  }
  var items = this._getItems(menuIndex, true);
  var prevLength = items.length;
  items[itemIndex] = util2.copy(item, items[itemIndex]);
  if (items.length !== prevLength) {
    this._resolveSection(menuIndex);
  }
  this._resolveItem(menuIndex);
  return this;
};

Menu.prototype.selection = function(sectionIndex, itemIndex) {
  var callback;
  if (typeof sectionIndex === 'function') {
    callback = sectionIndex;
    sectionIndex = undefined;
  }
  if (callback) {
    this._selections.push(callback);
    simply.impl.menuSelection();
  } else {
    this._selection = {
      sectionIndex: sectionIndex,
      itemIndex: itemIndex,
    };
    this._select();
  }
};

Menu.emit = Window.emit;

Menu.emitSection = function(sectionIndex) {
  var menu = WindowStack.top();
  if (!(menu instanceof Menu)) { return; }
  var e = {
    menu: menu,
    sectionIndex: sectionIndex
  };
  e.section = menu._getSection(e);
  if (Menu.emit('section', null, e) === false) {
    return false;
  }
  menu._resolveSection(e);
};

Menu.emitItem = function(sectionIndex, itemIndex) {
  var menu = WindowStack.top();
  if (!(menu instanceof Menu)) { return; }
  var e = {
    menu: menu,
    sectionIndex: sectionIndex,
    itemIndex: itemIndex,
  };
  e.section = menu._getSection(e);
  e.item = menu._getItem(e);
  if (Menu.emit('item', null, e) === false) {
    return false;
  }
  menu._resolveItem(e);
};

Menu.emitSelect = function(type, sectionIndex, itemIndex) {
  var menu = WindowStack.top();
  if (!(menu instanceof Menu)) { return; }
  var e = {
    menu: menu,
    sectionIndex: sectionIndex,
    itemIndex: itemIndex,
  };
  e.section = menu._getSection(e);
  e.item = menu._getItem(e);
  switch (type) {
    case 'menuSelect': type = 'select'; break;
    case 'menuLongSelect': type = 'longSelect'; break;
    case 'menuSelection': type = 'selection'; break;
  }
  if (Menu.emit(type, null, e) === false) {
    return false;
  }
  menu._emitSelect(e);
};

module.exports = Menu;

});
__loader.define("ui/propable.js", 4163, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');

var Propable = function(def) {
  this.state = def || {};
};

Propable.unset = function(k) {
  delete this[k];
};

Propable.makeAccessor = function(k) {
  return function(value) {
    if (arguments.length === 0) {
      return this.state[k];
    }
    this.state[k] = value;
    this._prop(myutil.toObject(k, value));
    return this;
  };
};

Propable.makeNestedAccessor = function(k) {
  var _k = '_' + k;
  return function(field, value, clear) {
    var nest = this.state[k];
    if (arguments.length === 0) {
      return nest;
    }
    if (arguments.length === 1 && typeof field === 'string') {
      return typeof nest === 'object' ? nest[field] : undefined;
    }
    if (typeof field === 'boolean') {
      value = field;
      field = k;
    }
    if (typeof field === 'object') {
      clear = value;
      value = undefined;
    }
    if (clear) {
      this._clear(k);
    }
    if (field !== undefined && typeof nest !== 'object') {
      nest = this.state[k] = {};
    }
    if (field !== undefined && typeof nest === 'object') {
      util2.copy(myutil.toObject(field, value), nest);
    }
    if (this[_k]) {
      this[_k](nest);
    }
    return this;
  };
};

Propable.makeAccessors = function(props, proto) {
  proto = proto || {};
  props.forEach(function(k) {
    proto[k] = Propable.makeAccessor(k);
  });
  return proto;
};

Propable.makeNestedAccessors = function(props, proto) {
  proto = proto || {};
  props.forEach(function(k) {
    proto[k] = Propable.makeNestedAccessor(k);
  });
  return proto;
};

Propable.prototype.unset = function(k) {
  delete this.state[k];
};

Propable.prototype._clear = function(k) {
  if (k === undefined || k === true) {
    this.state = {};
  } else if (k !== false) {
    this.state[k] = {};
  }
};

Propable.prototype._prop = function(def) {
};

Propable.prototype.prop = function(field, value, clear) {
  if (arguments.length === 0) {
    return util2.copy(this.state);
  }
  if (arguments.length === 1 && typeof field !== 'object') {
    return this.state[field];
  }
  if (typeof field === 'object') {
    clear = value;
  }
  if (clear) {
    this._clear(true);
  }
  var def = myutil.toObject(field, value);
  util2.copy(def, this.state);
  this._prop(def);
  return this;
};

module.exports = Propable;

});
__loader.define("ui/radial.js", 4273, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var safe = require('safe');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var accessorProps = [
  'radius',
  'angle',
  'angle2',
];

var defaults = {
  backgroundColor: 'white',
  borderColor: 'clear',
  borderWidth: 1,
  radius: 0,
  angle: 0,
  angle2: 360,
};

var checkProps = function(def) {
  if (!def) return;
  if ('angleStart' in def && safe.warnAngleStart !== false) {
    safe.warn('`angleStart` has been deprecated in favor of `angle` in order to match\n\t' +
              "Line's `position` and `position2`. Please use `angle` intead.", 2);
    safe.warnAngleStart = false;
  }
  if ('angleEnd' in def && safe.warnAngleEnd !== false) {
    safe.warn('`angleEnd` has been deprecated in favor of `angle2` in order to match\n\t' +
              "Line's `position` and `position2`. Please use `angle2` intead.", 2);
    safe.warnAngleEnd = false;
  }
};

var Radial = function(elementDef) {
  checkProps(elementDef);
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.RadialType;
};

util2.inherit(Radial, StageElement);

Propable.makeAccessors(accessorProps, Radial.prototype);

Radial.prototype._prop = function(def) {
  checkProps(def);
  StageElement.prototype._prop.call(this, def);
};

module.exports = Radial;

});
__loader.define("ui/rect.js", 4327, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var StageElement = require('ui/element');

var defaults = {
  backgroundColor: 'white',
  borderColor: 'clear',
  borderWidth: 1,
};

var Rect = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.RectType;
};

util2.inherit(Rect, StageElement);

module.exports = Rect;

});
__loader.define("ui/resource.js", 4348, function(exports, module, require) {
var myutil = require('lib/myutil');
var appinfo = require('appinfo');

var resources = (function() {
  var resources = appinfo.resources;
  return resources && resources.media || [];
})();

var Resource = {};

Resource.items = resources;

Resource.getId = function(opt) {
  var path = opt;
  if (typeof opt === 'object') {
    path = opt.url;
  }
  path = path.replace(/#.*/, '');
  var cname = myutil.toCConstantName(path);
  for (var i = 0, ii = resources.length; i < ii; ++i) {
    var res = resources[i];
    if (res.name === cname || res.file === path) {
      return i + 1;
    }
  }
};

module.exports = Resource;

});
__loader.define("ui/simply-pebble.js", 4379, function(exports, module, require) {
var Color = require('color');
var struct = require('struct');
var util2 = require('util2');
var myutil = require('myutil');
var Platform = require('platform');
var Wakeup = require('wakeup');
var Timeline = require('timeline');
var Resource = require('ui/resource');
var Accel = require('ui/accel');
var Voice = require('ui/voice');
var ImageService = require('ui/imageservice');
var WindowStack = require('ui/windowstack');
var Window = require('ui/window');
var Menu = require('ui/menu');
var StageElement = require('ui/element');
var Vector2 = require('vector2');

var simply = require('ui/simply');

/**
 * This package provides the underlying implementation for the ui/* classes.
 *
 * This implementation uses PebbleKit JS AppMessage to send commands to a Pebble Watch.
 */

/**
 * First part of this file is defining the commands and types that we will use later.
 */

var state;

var BoolType = function(x) {
  return x ? 1 : 0;
};

var StringType = function(x) {
  return (x === undefined) ? '' : '' + x;
};

var UTF8ByteLength = function(x) {
  return unescape(encodeURIComponent(x)).length;
};

var EnumerableType = function(x) {
  if (x && x.hasOwnProperty('length')) {
    return x.length;
  }
  return x ? Number(x) : 0;
};

var StringLengthType = function(x) {
  return UTF8ByteLength(StringType(x));
};

var TimeType = function(x) {
  if (x instanceof Date) {
    x = x.getTime() / 1000;
  }
  return (x ? Number(x) : 0) + state.timeOffset;
};

var ImageType = function(x) {
  if (x && typeof x !== 'number') {
    return ImageService.resolve(x);
  }
  return x ? Number(x) : 0;
};

var PositionType = function(x) {
  this.positionX(x.x);
  this.positionY(x.y);
};

var SizeType = function(x) {
  this.sizeW(x.x);
  this.sizeH(x.y);
};

var namedColorMap = {
  'clear': 0x00,
  'black': 0xC0,
  'oxfordBlue': 0xC1,
  'dukeBlue': 0xC2,
  'blue': 0xC3,
  'darkGreen': 0xC4,
  'midnightGreen': 0xC5,
  'cobaltBlue': 0xC6,
  'blueMoon': 0xC7,
  'islamicGreen': 0xC8,
  'jaegerGreen': 0xC9,
  'tiffanyBlue': 0xCA,
  'vividCerulean': 0xCB,
  'green': 0xCC,
  'malachite': 0xCD,
  'mediumSpringGreen': 0xCE,
  'cyan': 0xCF,
  'bulgarianRose': 0xD0,
  'imperialPurple': 0xD1,
  'indigo': 0xD2,
  'electricUltramarine': 0xD3,
  'armyGreen': 0xD4,
  'darkGray': 0xD5,
  'liberty': 0xD6,
  'veryLightBlue': 0xD7,
  'kellyGreen': 0xD8,
  'mayGreen': 0xD9,
  'cadetBlue': 0xDA,
  'pictonBlue': 0xDB,
  'brightGreen': 0xDC,
  'screaminGreen': 0xDD,
  'mediumAquamarine': 0xDE,
  'electricBlue': 0xDF,
  'darkCandyAppleRed': 0xE0,
  'jazzberryJam': 0xE1,
  'purple': 0xE2,
  'vividViolet': 0xE3,
  'windsorTan': 0xE4,
  'roseVale': 0xE5,
  'purpureus': 0xE6,
  'lavenderIndigo': 0xE7,
  'limerick': 0xE8,
  'brass': 0xE9,
  'lightGray': 0xEA,
  'babyBlueEyes': 0xEB,
  'springBud': 0xEC,
  'inchworm': 0xED,
  'mintGreen': 0xEE,
  'celeste': 0xEF,
  'red': 0xF0,
  'folly': 0xF1,
  'fashionMagenta': 0xF2,
  'magenta': 0xF3,
  'orange': 0xF4,
  'sunsetOrange': 0xF5,
  'brilliantRose': 0xF6,
  'shockingPink': 0xF7,
  'chromeYellow': 0xF8,
  'rajah': 0xF9,
  'melon': 0xFA,
  'richBrilliantLavender': 0xFB,
  'yellow': 0xFC,
  'icterine': 0xFD,
  'pastelYellow': 0xFE,
  'white': 0xFF,
  'clearWhite': 0x3F,
};

var namedColorMapUpper = (function() {
  var map = {};
  for (var k in namedColorMap) {
    map[k.toUpperCase()] = namedColorMap[k];
  }
  return map;
})();

var ColorType = function(color) {
  if (typeof color === 'string') {
    var name = myutil.toCConstantName(color);
    name = name.replace(/_+/g, '');
    if (name in namedColorMapUpper) {
      return namedColorMapUpper[name];
    }
  }
  var argb = Color.toArgbUint8(color);
  if ((argb & 0xc0) === 0 && argb !== 0) {
    argb = argb | 0xc0;
  }
  return argb;
};

var Font = function(x) {
  var id = Resource.getId(x);
  if (id) {
    return id;
  }
  x = myutil.toCConstantName(x);
  if (!x.match(/^RESOURCE_ID/)) {
    x = 'RESOURCE_ID_' + x;
  }
  x = x.replace(/_+/g, '_');
  return x;
};

var TextOverflowMode = function(x) {
  switch (x) {
    case 'wrap'    : return 0;
    case 'ellipsis': return 1;
    case 'fill'    : return 2;
  }
  return Number(x);
};

var TextAlignment = function(x) {
  switch (x) {
    case 'left'  : return 0;
    case 'center': return 1;
    case 'right' : return 2;
  }
  return Number(x);
};

var TimeUnits = function(x) {
  var z = 0;
  x = myutil.toObject(x, true);
  for (var k in x) {
    switch (k) {
      case 'seconds': z |= (1 << 0); break;
      case 'minutes': z |= (1 << 1); break;
      case 'hours'  : z |= (1 << 2); break;
      case 'days'   : z |= (1 << 3); break;
      case 'months' : z |= (1 << 4); break;
      case 'years'  : z |= (1 << 5); break;
    }
  }
  return z;
};

var CompositingOp = function(x) {
  switch (x) {
    case 'assign':
    case 'normal': return 0;
    case 'assignInverted':
    case 'invert': return 1;
    case 'or'    : return 2;
    case 'and'   : return 3;
    case 'clear' : return 4;
    case 'set'   : return 5;
  }
  return Number(x);
};

var AnimationCurve = function(x) {
  switch (x) {
    case 'linear'   : return 0;
    case 'easeIn'   : return 1;
    case 'easeOut'  : return 2;
    case 'easeInOut': return 3;
  }
  return Number(x);
};

var MenuRowAlign = function(x) {
  switch(x) {
    case 'none'   : return 0;
    case 'center' : return 1;
    case 'top'    : return 2;
    case 'bottom' : return 3;
  }
  return x ? Number(x) : 0;
};

var makeArrayType = function(types) {
  return function(x) {
    var index = types.indexOf(x);
    if (index !== -1) {
      return index;
    }
    return Number(x);
  };
};

var makeFlagsType = function(types) {
  return function(x) {
    var z = 0;
    for (var k in x) {
      if (!x[k]) { continue; }
      var index = types.indexOf(k);
      if (index !== -1) {
        z |= 1 << index;
      }
    }
    return z;
  };
};

var LaunchReasonTypes = [
  'system',
  'user',
  'phone',
  'wakeup',
  'worker',
  'quickLaunch',
  'timelineAction'
];

var LaunchReasonType = makeArrayType(LaunchReasonTypes);

var WindowTypes = [
  'window',
  'menu',
  'card',
];

var WindowType = makeArrayType(WindowTypes);

var ButtonTypes = [
  'back',
  'up',
  'select',
  'down',
];

var ButtonType = makeArrayType(ButtonTypes);

var ButtonFlagsType = makeFlagsType(ButtonTypes);

var CardTextTypes = [
  'title',
  'subtitle',
  'body',
];

var CardTextType = makeArrayType(CardTextTypes);

var CardTextColorTypes = [
  'titleColor',
  'subtitleColor',
  'bodyColor',
];

var CardImageTypes = [
  'icon',
  'subicon',
  'banner',
];

var CardImageType = makeArrayType(CardImageTypes);

var CardStyleTypes = [
  'classic-small',
  'classic-large',
  'mono',
  'small',
  'large',
];

var CardStyleType = makeArrayType(CardStyleTypes);

var VibeTypes = [
  'short',
  'long',
  'double',
];

var VibeType = makeArrayType(VibeTypes);

var LightTypes = [
  'on',
  'auto',
  'trigger'
];

var LightType = makeArrayType(LightTypes);

var DictationSessionStatus = [
  null,
  'transcriptionRejected',
  'transcriptionRejectedWithError',
  'systemAborted',
  'noSpeechDetected',
  'connectivityError',
  'disabled',
  'internalError',
  'recognizerError',
];
// Custom Dictation Errors:
DictationSessionStatus[64] = "sessionAlreadyInProgress";
DictationSessionStatus[65] = "noMicrophone";

var StatusBarSeparatorModeTypes = [
  'none',
  'dotted',
];

var StatusBarSeparatorModeType = makeArrayType(StatusBarSeparatorModeTypes);

var Packet = new struct([
  ['uint16', 'type'],
  ['uint16', 'length'],
]);

var SegmentPacket = new struct([
  [Packet, 'packet'],
  ['bool', 'isLast'],
  ['data', 'buffer'],
]);

var ReadyPacket = new struct([
  [Packet, 'packet'],
]);

var LaunchReasonPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'reason', LaunchReasonType],
  ['uint32', 'args'],
  ['uint32', 'time'],
  ['bool', 'isTimezone'],
]);

var WakeupSetPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'timestamp', TimeType],
  ['int32', 'cookie'],
  ['uint8', 'notifyIfMissed', BoolType],
]);

var WakeupSetResultPacket = new struct([
  [Packet, 'packet'],
  ['int32', 'id'],
  ['int32', 'cookie'],
]);

var WakeupCancelPacket = new struct([
  [Packet, 'packet'],
  ['int32', 'id'],
]);

var WakeupEventPacket = new struct([
  [Packet, 'packet'],
  ['int32', 'id'],
  ['int32', 'cookie'],
]);

var WindowShowPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'type', WindowType],
  ['bool', 'pushing', BoolType],
]);

var WindowHidePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var WindowShowEventPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var WindowHideEventPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var WindowPropsPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'backgroundColor', ColorType],
  ['bool', 'scrollable', BoolType],
  ['bool', 'paging', BoolType],
]);

var WindowButtonConfigPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'buttonMask', ButtonFlagsType],
]);

var WindowStatusBarPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'backgroundColor', ColorType],
  ['uint8', 'color', ColorType],
  ['uint8', 'separator', StatusBarSeparatorModeType],
  ['uint8', 'status', BoolType],
]);

var WindowActionBarPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'up', ImageType],
  ['uint32', 'select', ImageType],
  ['uint32', 'down', ImageType],
  ['uint8', 'backgroundColor', ColorType],
  ['uint8', 'action', BoolType],
]);

var ClickPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'button', ButtonType],
]);

var LongClickPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'button', ButtonType],
]);

var ImagePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['int16', 'width'],
  ['int16', 'height'],
  ['uint16', 'pixelsLength'],
  ['data', 'pixels'],
]);

var CardClearPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'flags'],
]);

var CardTextPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'index', CardTextType],
  ['uint8', 'color', ColorType],
  ['cstring', 'text'],
]);

var CardImagePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'image', ImageType],
  ['uint8', 'index', CardImageType],
]);

var CardStylePacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'style', CardStyleType],
]);

var VibePacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'type', VibeType],
]);

var LightPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'type', LightType],
]);

var AccelPeekPacket = new struct([
  [Packet, 'packet'],
]);

var AccelConfigPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'samples'],
  ['uint8', 'rate'],
  ['bool', 'subscribe', BoolType],
]);

var AccelData = new struct([
  ['int16', 'x'],
  ['int16', 'y'],
  ['int16', 'z'],
  ['bool', 'vibe'],
  ['uint64', 'time'],
]);

var AccelDataPacket = new struct([
  [Packet, 'packet'],
  ['bool', 'peek'],
  ['uint8', 'samples'],
]);

var AccelTapPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'axis'],
  ['int8', 'direction'],
]);

var MenuClearPacket = new struct([
  [Packet, 'packet'],
]);

var MenuClearSectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
]);

var MenuPropsPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'sections', EnumerableType],
  ['uint8', 'backgroundColor', ColorType],
  ['uint8', 'textColor', ColorType],
  ['uint8', 'highlightBackgroundColor', ColorType],
  ['uint8', 'highlightTextColor', ColorType],
]);

var MenuSectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'items', EnumerableType],
  ['uint8', 'backgroundColor', ColorType],
  ['uint8', 'textColor', ColorType],
  ['uint16', 'titleLength', StringLengthType],
  ['cstring', 'title', StringType],
]);

var MenuGetSectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
]);

var MenuItemPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
  ['uint32', 'icon', ImageType],
  ['uint16', 'titleLength', StringLengthType],
  ['uint16', 'subtitleLength', StringLengthType],
  ['cstring', 'title', StringType],
  ['cstring', 'subtitle', StringType],
]);

var MenuGetItemPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var MenuSelectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
  ['uint8', 'align', MenuRowAlign],
  ['bool', 'animated', BoolType],
]);

var MenuGetSelectionPacket = new struct([
  [Packet, 'packet'],
]);

var MenuSelectionEventPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var MenuSelectPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var MenuLongSelectPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var StageClearPacket = new struct([
  [Packet, 'packet'],
]);

var ElementInsertPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'type'],
  ['uint16', 'index'],
]);

var ElementRemovePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var GPoint = new struct([
  ['int16', 'x'],
  ['int16', 'y'],
]);

var GSize = new struct([
  ['int16', 'w'],
  ['int16', 'h'],
]);

var GRect = new struct([
  [GPoint, 'origin', PositionType],
  [GSize, 'size', SizeType],
]);

var ElementCommonPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  [GPoint, 'position', PositionType],
  [GSize, 'size', SizeType],
  ['uint16', 'borderWidth', EnumerableType],
  ['uint8', 'backgroundColor', ColorType],
  ['uint8', 'borderColor', ColorType],
]);

var ElementRadiusPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint16', 'radius', EnumerableType],
]);

var ElementAnglePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint16', 'angle', EnumerableType],
]);

var ElementAngle2Packet = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint16', 'angle2', EnumerableType],
]);

var ElementTextPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'updateTimeUnits', TimeUnits],
  ['cstring', 'text', StringType],
]);

var ElementTextStylePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'color', ColorType],
  ['uint8', 'textOverflow', TextOverflowMode],
  ['uint8', 'textAlign', TextAlignment],
  ['uint32', 'customFont'],
  ['cstring', 'systemFont', StringType],
]);

var ElementImagePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint32', 'image', ImageType],
  ['uint8', 'compositing', CompositingOp],
]);

var ElementAnimatePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  [GPoint, 'position', PositionType],
  [GSize, 'size', SizeType],
  ['uint32', 'duration'],
  ['uint8', 'easing', AnimationCurve],
]);

var ElementAnimateDonePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var VoiceDictationStartPacket = new struct([
  [Packet, 'packet'],
  ['bool', 'enableConfirmation'],
]);

var VoiceDictationStopPacket = new struct([
  [Packet, 'packet'],
]);

var VoiceDictationDataPacket = new struct([
  [Packet, 'packet'],
  ['int8', 'status'],
  ['cstring', 'transcription'],
]);

var CommandPackets = [
  Packet,
  SegmentPacket,
  ReadyPacket,
  LaunchReasonPacket,
  WakeupSetPacket,
  WakeupSetResultPacket,
  WakeupCancelPacket,
  WakeupEventPacket,
  WindowShowPacket,
  WindowHidePacket,
  WindowShowEventPacket,
  WindowHideEventPacket,
  WindowPropsPacket,
  WindowButtonConfigPacket,
  WindowStatusBarPacket,
  WindowActionBarPacket,
  ClickPacket,
  LongClickPacket,
  ImagePacket,
  CardClearPacket,
  CardTextPacket,
  CardImagePacket,
  CardStylePacket,
  VibePacket,
  LightPacket,
  AccelPeekPacket,
  AccelConfigPacket,
  AccelDataPacket,
  AccelTapPacket,
  MenuClearPacket,
  MenuClearSectionPacket,
  MenuPropsPacket,
  MenuSectionPacket,
  MenuGetSectionPacket,
  MenuItemPacket,
  MenuGetItemPacket,
  MenuSelectionPacket,
  MenuGetSelectionPacket,
  MenuSelectionEventPacket,
  MenuSelectPacket,
  MenuLongSelectPacket,
  StageClearPacket,
  ElementInsertPacket,
  ElementRemovePacket,
  ElementCommonPacket,
  ElementRadiusPacket,
  ElementAnglePacket,
  ElementAngle2Packet,
  ElementTextPacket,
  ElementTextStylePacket,
  ElementImagePacket,
  ElementAnimatePacket,
  ElementAnimateDonePacket,
  VoiceDictationStartPacket,
  VoiceDictationStopPacket,
  VoiceDictationDataPacket,
];

var accelAxes = [
  'x',
  'y',
  'z',
];

var clearFlagMap = {
  action: (1 << 0),
  text: (1 << 1),
  image: (1 << 2),
};

/**
 * SimplyPebble object provides the actual methods to communicate with Pebble.
 *
 * It's an implementation of an abstract interface used by all the other classes.
 */

var SimplyPebble = {};

SimplyPebble.init = function() {
  // Register listeners for app message communication
  Pebble.addEventListener('appmessage', SimplyPebble.onAppMessage);

  // Register this implementation as the one currently in use
  simply.impl = SimplyPebble;

  state = SimplyPebble.state = {};

  state.timeOffset = new Date().getTimezoneOffset() * -60;

  // Initialize the app message queue
  state.messageQueue = new MessageQueue();

  // Initialize the packet queue
  state.packetQueue = new PacketQueue();

  // Signal the Pebble that the Phone's app message is ready
  SimplyPebble.ready();
};

/**
 * MessageQueue is an app message queue that guarantees delivery and order.
 */
var MessageQueue = function() {
  this._queue = [];
  this._sending = false;

  this._consume = this.consume.bind(this);
  this._cycle = this.cycle.bind(this);
};

MessageQueue.prototype.stop = function() {
  this._sending = false;
};

MessageQueue.prototype.consume = function() {
  this._queue.shift();
  if (this._queue.length === 0) {
    return this.stop();
  }
  this.cycle();
};

MessageQueue.prototype.checkSent = function(message, fn) {
  return function() {
    if (message === this._sent) {
      fn();
    }
  }.bind(this);
};

MessageQueue.prototype.cycle = function() {
  if (!this._sending) {
    return;
  }
  var head = this._queue[0];
  if (!head) {
    return this.stop();
  }
  this._sent = head;
  var success = this.checkSent(head, this._consume);
  var failure = this.checkSent(head, this._cycle);
  Pebble.sendAppMessage(head, success, failure);
};

MessageQueue.prototype.send = function(message) {
  this._queue.push(message);
  if (this._sending) {
    return;
  }
  this._sending = true;
  this.cycle();
};

var toByteArray = function(packet) {
  var type = CommandPackets.indexOf(packet);
  var size = Math.max(packet._size, packet._cursor);
  packet.packetType(type);
  packet.packetLength(size);

  var buffer = packet._view;
  var byteArray = new Array(size);
  for (var i = 0; i < size; ++i) {
    byteArray[i] = buffer.getUint8(i);
  }

  return byteArray;
};

/**
 * PacketQueue is a packet queue that combines multiple packets into a single packet.
 * This reduces latency caused by the time spacing between each app message.
 */
var PacketQueue = function() {
  this._message = [];

  this._send = this.send.bind(this);
};

PacketQueue.prototype._maxPayloadSize = (Platform.version() === 'aplite' ? 1024 : 2044) - 32;

PacketQueue.prototype.add = function(packet) {
  var byteArray = toByteArray(packet);
  if (this._message.length + byteArray.length > this._maxPayloadSize) {
    this.send();
  }
  Array.prototype.push.apply(this._message, byteArray);
  clearTimeout(this._timeout);
  this._timeout = setTimeout(this._send, 0);
};

PacketQueue.prototype.send = function() {
  if (this._message.length === 0) {
    return;
  }
  state.messageQueue.send({ 0: this._message });
  this._message = [];
};

SimplyPebble.sendMultiPacket = function(packet) {
  var byteArray = toByteArray(packet);
  var totalSize = byteArray.length;
  var segmentSize = state.packetQueue._maxPayloadSize - Packet._size;
  for (var i = 0; i < totalSize; i += segmentSize) {
    var isLast = (i + segmentSize) >= totalSize;
    var buffer = byteArray.slice(i, Math.min(totalSize, i + segmentSize));
    SegmentPacket.isLast((i + segmentSize) >= totalSize).buffer(buffer);
    state.packetQueue.add(SegmentPacket);
  }
};

SimplyPebble.sendPacket = function(packet) {
  if (packet._cursor < state.packetQueue._maxPayloadSize) {
    state.packetQueue.add(packet);
  } else {
    SimplyPebble.sendMultiPacket(packet);
  }
};

SimplyPebble.ready = function() {
  SimplyPebble.sendPacket(ReadyPacket);
};

SimplyPebble.wakeupSet = function(timestamp, cookie, notifyIfMissed) {
  WakeupSetPacket
    .timestamp(timestamp)
    .cookie(cookie)
    .notifyIfMissed(notifyIfMissed);
  SimplyPebble.sendPacket(WakeupSetPacket);
};

SimplyPebble.wakeupCancel = function(id) {
  SimplyPebble.sendPacket(WakeupCancelPacket.id(id === 'all' ? -1 : id));
};

SimplyPebble.windowShow = function(def) {
  SimplyPebble.sendPacket(WindowShowPacket.prop(def));
};

SimplyPebble.windowHide = function(id) {
  SimplyPebble.sendPacket(WindowHidePacket.id(id));
};

SimplyPebble.windowProps = function(def) {
  WindowPropsPacket
    .prop(def)
    .backgroundColor(def.backgroundColor || 'white');
  SimplyPebble.sendPacket(WindowPropsPacket);
};

SimplyPebble.windowButtonConfig = function(def) {
  SimplyPebble.sendPacket(WindowButtonConfigPacket.buttonMask(def));
};

var toStatusDef = function(statusDef) {
  if (typeof statusDef === 'boolean') {
    statusDef = { status: statusDef };
  }
  return statusDef;
};

SimplyPebble.windowStatusBar = function(def) {
  var statusDef = toStatusDef(def);
  WindowStatusBarPacket
    .separator(statusDef.separator || 'dotted')
    .status(typeof def === 'boolean' ? def : def.status !== false)
    .color(statusDef.color || 'black')
    .backgroundColor(statusDef.backgroundColor || 'white');
  SimplyPebble.sendPacket(WindowStatusBarPacket);
};

SimplyPebble.windowStatusBarCompat = function(def) {
  if (typeof def.fullscreen === 'boolean') {
    SimplyPebble.windowStatusBar(!def.fullscreen);
  } else if (def.status !== undefined) {
    SimplyPebble.windowStatusBar(def.status);
  }
};

var toActionDef = function(actionDef) {
  if (typeof actionDef === 'boolean') {
    actionDef = { action: actionDef };
  }
  return actionDef;
};

SimplyPebble.windowActionBar = function(def) {
  var actionDef = toActionDef(def);
  WindowActionBarPacket
    .up(actionDef.up)
    .select(actionDef.select)
    .down(actionDef.down)
    .action(typeof def === 'boolean' ? def : def.action !== false)
    .backgroundColor(actionDef.backgroundColor || 'black');
  SimplyPebble.sendPacket(WindowActionBarPacket);
};

SimplyPebble.image = function(id, gbitmap) {
  SimplyPebble.sendPacket(ImagePacket.id(id).prop(gbitmap));
};

var toClearFlags = function(clear) {
  if (clear === true || clear === 'all') {
    clear = ~0;
  } else if (typeof clear === 'string') {
    clear = clearFlagMap[clear];
  } else if (typeof clear === 'object') {
    var flags = 0;
    for (var k in clear) {
      if (clear[k] === true) {
        flags |= clearFlagMap[k];
      }
    }
    clear = flags;
  }
  return clear;
};

SimplyPebble.cardClear = function(clear) {
  SimplyPebble.sendPacket(CardClearPacket.flags(toClearFlags(clear)));
};

SimplyPebble.cardText = function(field, text, color) {
  CardTextPacket
    .index(field)
    .color(color || 'clearWhite')
    .text(text || '');
  SimplyPebble.sendPacket(CardTextPacket);
};

SimplyPebble.cardImage = function(field, image) {
  SimplyPebble.sendPacket(CardImagePacket.index(field).image(image));
};

SimplyPebble.cardStyle = function(field, style) {
  SimplyPebble.sendPacket(CardStylePacket.style(style));
};

SimplyPebble.card = function(def, clear, pushing) {
  if (arguments.length === 3) {
    SimplyPebble.windowShow({ type: 'card', pushing: pushing });
  }
  if (clear !== undefined) {
    SimplyPebble.cardClear(clear);
  }
  SimplyPebble.windowProps(def);
  SimplyPebble.windowStatusBarCompat(def);
  if (def.action !== undefined) {
    SimplyPebble.windowActionBar(def.action);
  }
  for (var k in def) {
    var textIndex = CardTextTypes.indexOf(k);
    if (textIndex !== -1) {
      SimplyPebble.cardText(k, def[k], def[CardTextColorTypes[textIndex]]);
    } else if (CardImageTypes.indexOf(k) !== -1) {
      SimplyPebble.cardImage(k, def[k]);
    } else if (k === 'style') {
      SimplyPebble.cardStyle(k, def[k]);
    }
  }
};

SimplyPebble.vibe = function(type) {
  SimplyPebble.sendPacket(VibePacket.type(type));
};

SimplyPebble.light = function(type) {
  SimplyPebble.sendPacket(LightPacket.type(type));
};

var accelListeners = [];

SimplyPebble.accelPeek = function(callback) {
  accelListeners.push(callback);
  SimplyPebble.sendPacket(AccelPeekPacket);
};

SimplyPebble.accelConfig = function(def) {
  SimplyPebble.sendPacket(AccelConfigPacket.prop(def));
};

SimplyPebble.voiceDictationStart = function(callback, enableConfirmation) {
  if (Platform.version() === 'aplite') {
    // If there is no microphone, call with an error event
    callback({
      'err': DictationSessionStatus[65],  // noMicrophone
      'failed': true,
      'transcription': null,
    });
    return;
  } else if (state.dictationCallback) {
    // If there's a transcription in progress, call with an error event
    callback({
      'err': DictationSessionStatus[64],  // dictationAlreadyInProgress
      'failed': true,
      'transcription': null,
    });
    return;
  }

  // Set the callback and send the packet
  state.dictationCallback = callback;
  SimplyPebble.sendPacket(VoiceDictationStartPacket.enableConfirmation(enableConfirmation));
};

SimplyPebble.voiceDictationStop = function() {
  // Send the message and delete the callback
  SimplyPebble.sendPacket(VoiceDictationStopPacket);
  delete state.dictationCallback;
};

SimplyPebble.onVoiceData = function(packet) {
  if (!state.dictationCallback) {
    // Something bad happened
    console.log("No callback specified for dictation session");
  } else {
    var e = {
      'err': DictationSessionStatus[packet.status()],
      'failed': packet.status() !== 0,
      'transcription': packet.transcription(),
    };
    // Invoke and delete the callback
    state.dictationCallback(e);
    delete state.dictationCallback;
  }
};

SimplyPebble.menuClear = function() {
  SimplyPebble.sendPacket(MenuClearPacket);
};

SimplyPebble.menuClearSection = function(section) {
  SimplyPebble.sendPacket(MenuClearSectionPacket.section(section));
};

SimplyPebble.menuProps = function(def) {
  SimplyPebble.sendPacket(MenuPropsPacket.prop(def));
};

SimplyPebble.menuSection = function(section, def, clear) {
  if (clear !== undefined) {
    SimplyPebble.menuClearSection(section);
  }
  MenuSectionPacket
    .section(section)
    .items(def.items)
    .backgroundColor(def.backgroundColor)
    .textColor(def.textColor)
    .titleLength(def.title)
    .title(def.title);
  SimplyPebble.sendPacket(MenuSectionPacket);
};

SimplyPebble.menuItem = function(section, item, def) {
  MenuItemPacket
    .section(section)
    .item(item)
    .icon(def.icon)
    .titleLength(def.title)
    .subtitleLength(def.subtitle)
    .title(def.title)
    .subtitle(def.subtitle);
  SimplyPebble.sendPacket(MenuItemPacket);
};

SimplyPebble.menuSelection = function(section, item, align) {
  if (section === undefined) {
    SimplyPebble.sendPacket(MenuGetSelectionPacket);
    return;
  }
  SimplyPebble.sendPacket(MenuSelectionPacket.section(section).item(item).align(align || 'center'));
};

SimplyPebble.menu = function(def, clear, pushing) {
  if (typeof pushing === 'boolean') {
    SimplyPebble.windowShow({ type: 'menu', pushing: pushing });
  }
  if (clear !== undefined) {
    SimplyPebble.menuClear();
  }
  SimplyPebble.windowProps(def);
  SimplyPebble.windowStatusBarCompat(def);
  SimplyPebble.menuProps(def);
};

SimplyPebble.elementInsert = function(id, type, index) {
  SimplyPebble.sendPacket(ElementInsertPacket.id(id).type(type).index(index));
};

SimplyPebble.elementRemove = function(id) {
  SimplyPebble.sendPacket(ElementRemovePacket.id(id));
};

SimplyPebble.elementFrame = function(packet, def, altDef) {
  var position = def.position || (altDef ? altDef.position : undefined);
  var position2 = def.position2 || (altDef ? altDef.position2 : undefined);
  var size = def.size || (altDef ? altDef.size : undefined);
  if (position && position2) {
    size = position2.clone().subSelf(position);
  }
  packet.position(position);
  packet.size(size);
};

SimplyPebble.elementCommon = function(id, def) {
  if ('strokeColor' in def) {
    ElementCommonPacket.borderColor(def.strokeColor);
  }
  if ('strokeWidth' in def) {
    ElementCommonPacket.borderWidth(def.strokeWidth);
  }
  SimplyPebble.elementFrame(ElementCommonPacket, def);
  ElementCommonPacket
    .id(id)
    .prop(def);
  SimplyPebble.sendPacket(ElementCommonPacket);
};

SimplyPebble.elementRadius = function(id, def) {
  SimplyPebble.sendPacket(ElementRadiusPacket.id(id).radius(def.radius));
};

SimplyPebble.elementAngle = function(id, def) {
  SimplyPebble.sendPacket(ElementAnglePacket.id(id).angle(def.angleStart || def.angle));
};

SimplyPebble.elementAngle2 = function(id, def) {
  SimplyPebble.sendPacket(ElementAngle2Packet.id(id).angle2(def.angleEnd || def.angle2));
};

SimplyPebble.elementText = function(id, text, timeUnits) {
  SimplyPebble.sendPacket(ElementTextPacket.id(id).updateTimeUnits(timeUnits).text(text));
};

SimplyPebble.elementTextStyle = function(id, def) {
  ElementTextStylePacket.id(id).prop(def);
  var font = Font(def.font);
  if (typeof font === 'number') {
    ElementTextStylePacket.customFont(font).systemFont('');
  } else {
    ElementTextStylePacket.customFont(0).systemFont(font);
  }
  SimplyPebble.sendPacket(ElementTextStylePacket);
};

SimplyPebble.elementImage = function(id, image, compositing) {
  SimplyPebble.sendPacket(ElementImagePacket.id(id).image(image).compositing(compositing));
};

SimplyPebble.elementAnimate = function(id, def, animateDef, duration, easing) {
  SimplyPebble.elementFrame(ElementAnimatePacket, animateDef, def);
  ElementAnimatePacket
    .id(id)
    .duration(duration)
    .easing(easing);
  SimplyPebble.sendPacket(ElementAnimatePacket);
};

SimplyPebble.stageClear = function() {
  SimplyPebble.sendPacket(StageClearPacket);
};

SimplyPebble.stageElement = function(id, type, def, index) {
  if (index !== undefined) {
    SimplyPebble.elementInsert(id, type, index);
  }
  SimplyPebble.elementCommon(id, def);
  switch (type) {
    case StageElement.RectType:
    case StageElement.CircleType:
      SimplyPebble.elementRadius(id, def);
      break;
    case StageElement.RadialType:
      SimplyPebble.elementRadius(id, def);
      SimplyPebble.elementAngle(id, def);
      SimplyPebble.elementAngle2(id, def);
      break;
    case StageElement.TextType:
      SimplyPebble.elementRadius(id, def);
      SimplyPebble.elementTextStyle(id, def);
      SimplyPebble.elementText(id, def.text, def.updateTimeUnits);
      break;
    case StageElement.ImageType:
      SimplyPebble.elementRadius(id, def);
      SimplyPebble.elementImage(id, def.image, def.compositing);
      break;
  }
};

SimplyPebble.stageRemove = SimplyPebble.elementRemove;

SimplyPebble.stageAnimate = SimplyPebble.elementAnimate;

SimplyPebble.stage = function(def, clear, pushing) {
  if (arguments.length === 3) {
    SimplyPebble.windowShow({ type: 'window', pushing: pushing });
  }
  SimplyPebble.windowProps(def);
  SimplyPebble.windowStatusBarCompat(def);
  if (clear !== undefined) {
    SimplyPebble.stageClear();
  }
  if (def.action !== undefined) {
    SimplyPebble.windowActionBar(def.action);
  }
};

SimplyPebble.window = SimplyPebble.stage;

var toArrayBuffer = function(array, length) {
  length = length || array.length;
  var copy = new DataView(new ArrayBuffer(length));
  for (var i = 0; i < length; ++i) {
    copy.setUint8(i, array[i]);
  }
  return copy;
};

SimplyPebble.onLaunchReason = function(packet) {
  var reason = LaunchReasonTypes[packet.reason()];
  var args = packet.args();
  var remoteTime = packet.time();
  var isTimezone = packet.isTimezone();
  if (isTimezone) {
    state.timeOffset = 0;
  } else {
    var time = Date.now() / 1000;
    var resolution = 60 * 30;
    state.timeOffset = Math.round((remoteTime - time) / resolution) * resolution;
  }
  if (reason === 'timelineAction') {
    Timeline.emitAction(args);
  } else {
    Timeline.emitAction();
  }
  if (reason !== 'wakeup') {
    Wakeup.emitWakeup();
  }
};

SimplyPebble.onWakeupSetResult = function(packet) {
  var id = packet.id();
  switch (id) {
    case -8: id = 'range'; break;
    case -4: id = 'invalidArgument'; break;
    case -7: id = 'outOfResources'; break;
    case -3: id = 'internal'; break;
  }
  Wakeup.emitSetResult(id, packet.cookie());
};

SimplyPebble.onAccelData = function(packet) {
  var samples = packet.samples();
  var accels = [];
  AccelData._view = packet._view;
  AccelData._offset = packet._size;
  for (var i = 0; i < samples; ++i) {
    accels.push(AccelData.prop());
    AccelData._offset += AccelData._size;
  }
  if (!packet.peek()) {
    Accel.emitAccelData(accels);
  } else {
    var handlers = accelListeners;
    accelListeners = [];
    for (var j = 0, jj = handlers.length; j < jj; ++j) {
      Accel.emitAccelData(accels, handlers[j]);
    }
  }
};

SimplyPebble.onPacket = function(buffer, offset) {
  Packet._view = buffer;
  Packet._offset = offset;
  var packet = CommandPackets[Packet.type()];

  if (!packet) {
    console.log('Received unknown packet: ' + JSON.stringify(buffer));
    return;
  }

  packet._view = Packet._view;
  packet._offset = offset;
  switch (packet) {
    case LaunchReasonPacket:
      SimplyPebble.onLaunchReason(packet);
      break;
    case WakeupSetResultPacket:
      SimplyPebble.onWakeupSetResult(packet);
      break;
    case WakeupEventPacket:
      Wakeup.emitWakeup(packet.id(), packet.cookie());
      break;
    case WindowHideEventPacket:
      ImageService.markAllUnloaded();
      WindowStack.emitHide(packet.id());
      break;
    case ClickPacket:
      Window.emitClick('click', ButtonTypes[packet.button()]);
      break;
    case LongClickPacket:
      Window.emitClick('longClick', ButtonTypes[packet.button()]);
      break;
    case AccelDataPacket:
      SimplyPebble.onAccelData(packet);
      break;
    case AccelTapPacket:
      Accel.emitAccelTap(accelAxes[packet.axis()], packet.direction());
      break;
    case MenuGetSectionPacket:
      Menu.emitSection(packet.section());
      break;
    case MenuGetItemPacket:
      Menu.emitItem(packet.section(), packet.item());
      break;
    case MenuSelectPacket:
      Menu.emitSelect('menuSelect', packet.section(), packet.item());
      break;
    case MenuLongSelectPacket:
      Menu.emitSelect('menuLongSelect', packet.section(), packet.item());
      break;
    case MenuSelectionEventPacket:
      Menu.emitSelect('menuSelection', packet.section(), packet.item());
      break;
    case ElementAnimateDonePacket:
      StageElement.emitAnimateDone(packet.id());
      break;
    case VoiceDictationDataPacket:
      SimplyPebble.onVoiceData(packet);
      break;
  }
};

SimplyPebble.onAppMessage = function(e) {
  var data = e.payload[0];
  
  Packet._view = toArrayBuffer(data);

  var offset = 0;
  var length = data.length;

  do {
    SimplyPebble.onPacket(Packet._view, offset);

    Packet._offset = offset;
    offset += Packet.length();
  } while (offset !== 0 && offset < length);
};

module.exports = SimplyPebble;


});
__loader.define("ui/simply.js", 5882, function(exports, module, require) {
/**
 * This file provides an easy way to switch the actual implementation used by all the
 * ui objects.
 *
 * simply.impl provides the actual communication layer to the hardware.
 */

var simply = {};

// Override this with the actual implementation you want to use.
simply.impl = undefined;

module.exports = simply;

});
__loader.define("ui/stage.js", 5898, function(exports, module, require) {
var util2 = require('util2');
var Emitter = require('emitter');
var WindowStack = require('ui/windowstack');
var simply = require('ui/simply');

var Stage = function(stageDef) {
  this.state = stageDef || {};
  this._items = [];
};

Stage.RectType = 1;
Stage.CircleType = 2;
Stage.RadialType = 6;
Stage.TextType = 3;
Stage.ImageType = 4;
Stage.InverterType = 5;

util2.copy(Emitter.prototype, Stage.prototype);

Stage.prototype._show = function() {
  this.each(function(element, index) {
    element._reset();
    this._insert(index, element);
  }.bind(this));
};

Stage.prototype._prop = function() {
  if (this === WindowStack.top()) {
    simply.impl.stage.apply(this, arguments);
  }
};

Stage.prototype.each = function(callback) {
  this._items.forEach(callback);
  return this;
};

Stage.prototype.at = function(index) {
  return this._items[index];
};

Stage.prototype.index = function(element) {
  return this._items.indexOf(element);
};

Stage.prototype._insert = function(index, element) {
  if (this === WindowStack.top()) {
    simply.impl.stageElement(element._id(), element._type(), element.state, index);
  }
};

Stage.prototype._remove = function(element, broadcast) {
  if (broadcast === false) { return; }
  if (this === WindowStack.top()) {
    simply.impl.stageRemove(element._id());
  }
};

Stage.prototype.insert = function(index, element) {
  element.remove(false);
  this._items.splice(index, 0, element);
  element.parent = this;
  this._insert(this.index(element), element);
  return this;
};

Stage.prototype.add = function(element) {
  return this.insert(this._items.length, element);
};

Stage.prototype.remove = function(element, broadcast) {
  var index = this.index(element);
  if (index === -1) { return this; }
  this._remove(element, broadcast);
  this._items.splice(index, 1);
  delete element.parent;
  return this;
};

module.exports = Stage;

});
__loader.define("ui/tests.js", 5981, function(exports, module, require) {

var tests = {};

tests.setTimeoutErrors = function () {
  /* global wind */
  var i = 0;
  var interval = setInterval(function() {
    clearInterval(interval);
    wind.titlex('i = ' + i++);
  }, 1000);
};

tests.ajaxErrors = function() {
  var ajax = require('ajax');
  var ajaxCallback = function(reqStatus, reqBody, request) {
    console.logx('broken call');
  };
  ajax({ url: 'http://www.google.fr/' }, ajaxCallback, ajaxCallback);
};

tests.geolocationErrors = function () {
  navigator.geolocation.getCurrentPosition(function(coords) {
    console.logx('Got coords: ' + coords);
  });
};

tests.loadAppinfo = function() {
  console.log('longName: ' + require('appinfo').longName);
};

tests.resolveBultinImagePath = function() {
  var ImageService = require('ui/imageservice');
  console.log('image-logo-splash = resource #' + ImageService.resolve('images/logo_splash.png'));
};

for (var test in tests) {
  console.log('Running test: ' + test);
  tests[test]();
}

});
__loader.define("ui/text.js", 6023, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var textProps = [
  'text',
  'font',
  'color',
  'textOverflow',
  'textAlign',
  'updateTimeUnits',
];

var defaults = {
  backgroundColor: 'clear',
  borderColor: 'clear',
  borderWidth: 1,
  color: 'white',
  font: 'gothic-24',
};

var Text = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.TextType;
};

util2.inherit(Text, StageElement);

Propable.makeAccessors(textProps, Text.prototype);

module.exports = Text;

});
__loader.define("ui/timetext.js", 6058, function(exports, module, require) {
var util2 = require('util2');
var Text = require('ui/text');

var TimeText = function(elementDef) {
  Text.call(this, elementDef);
  if (this.state.text) {
    this.text(this.state.text);
  }
};

util2.inherit(TimeText, Text);

var formatUnits = {
  a: 'days',
  A: 'days',
  b: 'months',
  B: 'months',
  c: 'seconds',
  d: 'days',
  H: 'hours',
  I: 'hours',
  j: 'days',
  m: 'months',
  M: 'minutes',
  p: 'hours',
  S: 'seconds',
  U: 'days',
  w: 'days',
  W: 'days',
  x: 'days',
  X: 'seconds',
  y: 'years',
  Y: 'years',
};

var getUnitsFromText = function(text) {
  var units = {};
  text.replace(/%(.)/g, function(_, code) {
    var unit = formatUnits[code];
    if (unit) {
      units[unit] = true;
    }
    return _;
  });
  return units;
};

TimeText.prototype.text = function(text) {
  if (arguments.length === 0) {
    return this.state.text;
  }
  this.prop({
    text: text,
    updateTimeUnits: getUnitsFromText(text),
  });
  return this;
};

module.exports = TimeText;

});
__loader.define("ui/vibe.js", 6120, function(exports, module, require) {
var simply = require('ui/simply');

var Vibe = module.exports;

Vibe.vibrate = function(type) {
  simply.impl.vibe(type);
};

});
__loader.define("ui/voice.js", 6130, function(exports, module, require) {
var simply = require('ui/simply');

var Voice = {};

Voice.dictate = function(type, confirm, callback) {
  type = type.toLowerCase();
  switch (type){
    case 'stop':
      simply.impl.voiceDictationStop();
      break;
    case 'start':
      if (typeof callback === 'undefined') {
        callback = confirm;
        confirm = true;
      }

      simply.impl.voiceDictationStart(callback, confirm);
      break;
    default:
      console.log('Unsupported type passed to Voice.dictate');
  }
};

module.exports = Voice;

});
__loader.define("ui/window.js", 6157, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var safe = require('safe');
var Emitter = require('emitter');
var Vector2 = require('vector2');
var Feature = require('platform/feature');
var Accel = require('ui/accel');
var WindowStack = require('ui/windowstack');
var Propable = require('ui/propable');
var Stage = require('ui/stage');
var simply = require('ui/simply');

var buttons = [
  'back',
  'up',
  'select',
  'down',
];

var configProps = [
  'fullscreen',
  'style',
  'scrollable',
  'paging',
  'backgroundColor',
];

var statusProps = [
  'status',
  'separator',
  'color',
  'backgroundColor',
];

var actionProps = [
  'action',
  'up',
  'select',
  'back',
  'backgroundColor',
];

var accessorProps = configProps;

var nestedProps = [
  'action',
  'status',
];

var defaults = {
  status: false,
  backgroundColor: 'black',
  scrollable: false,
  paging: Feature.round(true, false),
};

var nextId = 1;

var checkProps = function(def) {
  if (!def) return;
  if ('fullscreen' in def && safe.warnFullscreen !== false) {
    safe.warn('`fullscreen` has been deprecated by `status` which allows settings\n\t' +
              'its color and separator in a similar manner to the `action` property.\n\t' +
              'Remove usages of `fullscreen` to enable usage of `status`.', 2);
    safe.warnFullscreen = false;
  }
};

var Window = function(windowDef) {
  checkProps(windowDef);
  this.state = myutil.shadow(defaults, windowDef || {});
  this.state.id = nextId++;
  this._buttonInit();
  this._items = [];
  this._dynamic = true;
  this._size = new Vector2();
  this.size(); // calculate and set the size
};

Window._codeName = 'window';

util2.copy(Emitter.prototype, Window.prototype);

util2.copy(Propable.prototype, Window.prototype);

util2.copy(Stage.prototype, Window.prototype);

Propable.makeAccessors(accessorProps, Window.prototype);

Propable.makeNestedAccessors(nestedProps, Window.prototype);

Window.prototype._id = function() {
  return this.state.id;
};

Window.prototype._prop = function(def, clear, pushing) {
  checkProps(def);
  Stage.prototype._prop.call(this, def, clear, pushing);
};

Window.prototype._hide = function(broadcast) {
  if (broadcast === false) { return; }
  simply.impl.windowHide(this._id());
};

Window.prototype.hide = function() {
  WindowStack.remove(this, true);
  return this;
};

Window.prototype._show = function(pushing) {
  this._prop(this.state, true, pushing || false);
  this._buttonConfig({});
  if (this._dynamic) {
    Stage.prototype._show.call(this, pushing);
  }
};

Window.prototype.show = function() {
  WindowStack.push(this);
  return this;
};

Window.prototype._insert = function() {
  if (this._dynamic) {
    Stage.prototype._insert.apply(this, arguments);
  }
};

Window.prototype._remove = function() {
  if (this._dynamic) {
    Stage.prototype._remove.apply(this, arguments);
  }
};

Window.prototype._clearStatus = function() {
  statusProps.forEach(Propable.unset.bind(this.state.status));
};

Window.prototype._clearAction = function() {
  actionProps.forEach(Propable.unset.bind(this.state.action));
};

Window.prototype._clear = function(flags_) {
  var flags = myutil.toFlags(flags_);
  if (myutil.flag(flags, 'action')) {
    this._clearAction();
  }
  if (myutil.flag(flags, 'status')) {
    this._clearStatus();
  }
  if (flags_ === true || flags_ === undefined) {
    Propable.prototype._clear.call(this);
  }
};

Window.prototype._action = function(actionDef) {
  if (this === WindowStack.top()) {
    simply.impl.windowActionBar(actionDef);
  }
};

Window.prototype._status = function(statusDef) {
  if (this === WindowStack.top()) {
    simply.impl.windowStatusBar(statusDef);
  }
};

var isBackEvent = function(type, subtype) {
  return ((type === 'click' || type === 'longClick') && subtype === 'back');
};

Window.prototype.onAddHandler = function(type, subtype) {
  if (isBackEvent(type, subtype)) {
    this._buttonAutoConfig();
  }
  if (type === 'accelData') {
    Accel.autoSubscribe();
  }
};

Window.prototype.onRemoveHandler = function(type, subtype) {
  if (!type || isBackEvent(type, subtype)) {
    this._buttonAutoConfig();
  }
  if (!type || type === 'accelData') {
    Accel.autoSubscribe();
  }
};

Window.prototype._buttonInit = function() {
  this._button = {
    config: {},
    configMode: 'auto',
  };
  for (var i = 0, ii = buttons.length; i < ii; i++) {
    var button = buttons[i];
    if (button !== 'back') {
      this._button.config[buttons[i]] = true;
    }
  }
};

/**
 * The button configuration parameter for {@link simply.buttonConfig}.
 * The button configuration allows you to enable to disable buttons without having to register or unregister handlers if that is your preferred style.
 * You may also enable the back button manually as an alternative to registering a click handler with 'back' as its subtype using {@link simply.on}.
 * @typedef {object} simply.buttonConf
 * @property {boolean} [back] - Whether to enable the back button. Initializes as false. Simply.js can also automatically register this for you based on the amount of click handlers with subtype 'back'.
 * @property {boolean} [up] - Whether to enable the up button. Initializes as true. Note that this is disabled when using {@link simply.scrollable}.
 * @property {boolean} [select] - Whether to enable the select button. Initializes as true.
 * @property {boolean} [down] - Whether to enable the down button. Initializes as true. Note that this is disabled when using {@link simply.scrollable}.
 */

/**
 * Changes the button configuration.
 * See {@link simply.buttonConfig}
 * @memberOf simply
 * @param {simply.buttonConfig} buttonConf - An object defining the button configuration.
 */
Window.prototype._buttonConfig = function(buttonConf, auto) {
  if (buttonConf === undefined) {
    var config = {};
    for (var i = 0, ii = buttons.length; i < ii; ++i) {
      var name = buttons[i];
      config[name] = this._button.config[name];
    }
    return config;
  }
  for (var k in buttonConf) {
    if (buttons.indexOf(k) !== -1) {
      if (k === 'back') {
        this._button.configMode = buttonConf.back && !auto ? 'manual' : 'auto';
      }
      this._button.config[k] = buttonConf[k];
    }
  }
  if (simply.impl.windowButtonConfig) {
    return simply.impl.windowButtonConfig(this._button.config);
  }
};

Window.prototype.buttonConfig = function(buttonConf) {
  this._buttonConfig(buttonConf);
};

Window.prototype._buttonAutoConfig = function() {
  if (!this._button || this._button.configMode !== 'auto') {
    return;
  }
  var singleBackCount = this.listenerCount('click', 'back');
  var longBackCount = this.listenerCount('longClick', 'back');
  var useBack = singleBackCount + longBackCount > 0;
  if (useBack !== this._button.config.back) {
    this._button.config.back = useBack;
    return this._buttonConfig(this._button.config, true);
  }
};

Window.prototype.size = function() {
  var state = this.state;
  var size = this._size.copy(Feature.resolution());
  if ('status' in state && state.status !== false) {
    size.y -= Feature.statusBarHeight();
  } else if ('fullscreen' in state && state.fullscreen === false) {
    size.y -= Feature.statusBarHeight();
  }
  if ('action' in state && state.action !== false) {
    size.x -= Feature.actionBarWidth();
  }
  return size;
};

Window.prototype._toString = function() {
  return '[' + this.constructor._codeName + ' ' + this._id() + ']';
};

Window.prototype._emit = function(type, subtype, e) {
  e.window = this;
  var klass = this.constructor;
  if (klass) {
    e[klass._codeName] = this;
  }
  if (this.emit(type, subtype, e) === false) {
    return false;
  }
};

Window.prototype._emitShow = function(type) {
  return this._emit(type, null, {});
};

Window.emit = function(type, subtype, e) {
  var wind = WindowStack.top();
  if (wind) {
    return wind._emit(type, subtype, e);
  }
};

/**
 * Simply.js button click event. This can either be a single click or long click.
 * Use the event type 'click' or 'longClick' to subscribe to these events.
 * @typedef simply.clickEvent
 * @property {string} button - The button that was pressed: 'back', 'up', 'select', or 'down'. This is also the event subtype.
 */

Window.emitClick = function(type, button) {
  var e = {
    button: button,
  };
  return Window.emit(type, button, e);
};

module.exports = Window;

});
__loader.define("ui/windowstack.js", 6474, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Emitter = require('emitter');
var simply = require('ui/simply');

var WindowStack = function() {
  this.init();
};

util2.copy(Emitter.prototype, WindowStack.prototype);

WindowStack.prototype.init = function() {
  this.off();
  this._items = [];

};

WindowStack.prototype.top = function() {
  return util2.last(this._items);
};

WindowStack.prototype._emitShow = function(item) {
  item.forEachListener(item.onAddHandler);
  item._emitShow('show');

  var e = {
    window: item
  };
  this.emit('show', e);
};

WindowStack.prototype._emitHide = function(item) {
  var e = {
    window: item
  };
  this.emit('hide', e);

  item._emitShow('hide');
  item.forEachListener(item.onRemoveHandler);
};

WindowStack.prototype._show = function(item, pushing) {
  if (!item) { return; }
  item._show(pushing);
  this._emitShow(item);
};

WindowStack.prototype._hide = function(item, broadcast) {
  if (!item) { return; }
  this._emitHide(item);
  item._hide(broadcast);
};

WindowStack.prototype.at = function(index) {
  return this._items[index];
};

WindowStack.prototype.index = function(item) {
  return this._items.indexOf(item);
};

WindowStack.prototype.push = function(item) {
  if (item === this.top()) { return; }
  this.remove(item);
  var prevTop = this.top();
  this._items.push(item);
  this._show(item, true);
  this._hide(prevTop, false);
  console.log('(+) ' + item._toString() + ' : ' + this._toString());
};

WindowStack.prototype.pop = function(broadcast) {
  return this.remove(this.top(), broadcast);
};

WindowStack.prototype.remove = function(item, broadcast) {
  if (typeof item === 'number') {
    item = this.get(item);
  }
  if (!item) { return; }
  var index = this.index(item);
  if (index === -1) { return item; }
  var wasTop = (item === this.top());
  this._items.splice(index, 1);
  if (wasTop) {
    var top = this.top();
    this._show(top);
    this._hide(item, top && top.constructor === item.constructor ? false : broadcast);
  }
  console.log('(-) ' + item._toString() + ' : ' + this._toString());
  return item;
};

WindowStack.prototype.get = function(windowId) {
  var items = this._items;
  for (var i = 0, ii = items.length; i < ii; ++i) {
    var wind = items[i];
    if (wind._id() === windowId) {
      return wind;
    }
  }
};

WindowStack.prototype.each = function(callback) {
  var items = this._items;
  for (var i = 0, ii = items.length; i < ii; ++i) {
    if (callback(items[i], i) === false) {
      break;
    }
  }
};

WindowStack.prototype.length = function() {
  return this._items.length;
};

WindowStack.prototype.emitHide = function(windowId) {
  var wind = this.get(windowId);
  if (wind !== this.top()) { return; }
  this.remove(wind);
};

WindowStack.prototype._toString = function() {
  return this._items.map(function(x){ return x._toString(); }).join(',');
};

module.exports = new WindowStack();

});
__loader.define("vendor/moment.js", 6604, function(exports, module, require) {
//! moment.js
//! version : 2.9.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.9.0',
        // the global-scope this is NOT the global object in Node.js
        globalScope = (typeof global !== 'undefined' && (typeof window === 'undefined' || window === global.window)) ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for locale config files
        locales = {},

        // extra moment internal properties (plugins register props here)
        momentProperties = [],

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenOffsetMs = /[\+\-]?\d+/, // 1234567890123
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-', '15', '30']
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.localeData().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.localeData().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.localeData().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.localeData().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.localeData().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            x    : function () {
                return this.valueOf();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        deprecations = {},

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'],

        updateInProgress = false;

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error('Implement me');
        }
    }

    function hasOwnProp(a, b) {
        return hasOwnProperty.call(a, b);
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function printMsg(msg) {
        if (moment.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        return extend(function () {
            if (firstTime) {
                printMsg(msg);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            printMsg(msg);
            deprecations[name] = true;
        }
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.localeData().ordinal(func.call(this, a), period);
        };
    }

    function monthDiff(a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        return -(wholeMonthDiff + adjust);
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    function meridiemFixWrap(locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // thie is not supposed to happen
            return hour;
        }
    }

    /************************************
        Constructors
    ************************************/

    function Locale() {
    }

    // Moment prototype object
    function Moment(config, skipOverflow) {
        if (skipOverflow !== false) {
            checkOverflow(config);
        }
        copyConfig(this, config);
        this._d = new Date(+config._d);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            moment.updateOffset(this);
            updateInProgress = false;
        }
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = moment.localeData();

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = from._pf;
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = moment.duration(val, period);
            addOrSubtractDurationFromMoment(this, dur, direction);
            return this;
        };
    }

    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment._locale[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment._locale, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 24 ||
                    (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 ||
                                           m._a[SECOND] !== 0 ||
                                           m._a[MILLISECOND] !== 0)) ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0 &&
                    m._pf.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        if (!locales[name] && hasModule) {
            try {
                oldLocale = moment.locale();
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we want to undo that for lazy loaded locales
                moment.locale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // Return a moment from input, that is local/utc/utcOffset equivalent to
    // model.
    function makeAs(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (moment.isMoment(input) || isDate(input) ?
                    +input : +moment(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            moment.updateOffset(res, false);
            return res;
        } else {
            return moment(input).local();
        }
    }

    /************************************
        Locale
    ************************************/


    extend(Locale.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _ordinalParseLenient.
            this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
        },

        _months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName, format, strict) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = moment.utc([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                    this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
                }
                if (!strict && !this._monthsParse[i]) {
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                    return i;
                } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LTS : 'h:mm:ss A',
            LT : 'h:mm A',
            L : 'MM/DD/YYYY',
            LL : 'MMMM D, YYYY',
            LLL : 'MMMM D, YYYY LT',
            LLLL : 'dddd, MMMM D, YYYY LT'
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },


        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom, now) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom, [now]) : output;
        },

        _relativeTime : {
            future : 'in %s',
            past : '%s ago',
            s : 'a few seconds',
            m : 'a minute',
            mm : '%d minutes',
            h : 'an hour',
            hh : '%d hours',
            d : 'a day',
            dd : '%d days',
            M : 'a month',
            MM : '%d months',
            y : 'a year',
            yy : '%d years'
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace('%d', number);
        },
        _ordinal : '%d',
        _ordinalParse : /\d{1,2}/,

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        firstDayOfWeek : function () {
            return this._week.dow;
        },

        firstDayOfYear : function () {
            return this._week.doy;
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return config._locale._meridiemParse;
        case 'x':
            return parseTokenOffsetMs;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
            return a;
        }
    }

    function utcOffsetFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(
                            input.match(/\d{1,2}/)[0], 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._meridiem = input;
            // config._isPm = config._locale.isPM(input);
            break;
        // HOUR
        case 'h' : // fall through to hh
        case 'hh' :
            config._pf.bigHour = true;
            /* falls through */
        case 'H' : // fall through to HH
        case 'HH' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX OFFSET (MILLISECONDS)
        case 'x':
            config._d = new Date(toInt(input));
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = utcOffsetFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = config._locale.weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day || normalizedInput.date,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
            config._pf.bigHour = undefined;
        }
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR],
                config._meridiem);
        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be 'T' or undefined
                    config._f = isoDates[i][0] + (match[6] || ' ');
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += 'Z';
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, locale) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = locale.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = locale;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f,
            res;

        config._locale = config._locale || moment.localeData(config._l);

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (moment.isMoment(input)) {
            return new Moment(input, true);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        res = new Moment(config);
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    moment = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = locale;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    moment.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        function (key, value) {
            return moment.locale(key, value);
        }
    );

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    moment.locale = function (key, values) {
        var data;
        if (key) {
            if (typeof(values) !== 'undefined') {
                data = moment.defineLocale(key, values);
            }
            else {
                data = moment.localeData(key);
            }

            if (data) {
                moment.duration._locale = moment._locale = data;
            }
        }

        return moment._locale._abbr;
    };

    moment.defineLocale = function (name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);

            // backwards compat for now: also set the locale
            moment.locale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    };

    moment.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        function (key) {
            return moment.localeData(key);
        }
    );

    // returns locale data
    moment.localeData = function (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return moment._locale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    moment.isDate = isDate;

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d - ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                if ('function' === typeof Date.prototype.toISOString) {
                    // native implementation is ~50x faster, use it when we can
                    return this.toDate().toISOString();
                } else {
                    return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
                }
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {
            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.utcOffset(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(this._dateUtcOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.localeData().postformat(output);
        },

        add : createAdder(1, 'add'),

        subtract : createAdder(-1, 'subtract'),

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (that.utcOffset() - this.utcOffset()) * 6e4,
                anchor, diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month' || units === 'quarter') {
                output = monthDiff(this, that);
                if (units === 'quarter') {
                    output = output / 3;
                } else if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = this - that;
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're locat/utc/offset
            // or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.localeData().calendar(format, this, moment(now)));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf : function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond') {
                return this;
            }
            return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
        },

        isAfter: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this > +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return inputMs < +this.clone().startOf(units);
            }
        },

        isBefore: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this < +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return +this.clone().endOf(units) < inputMs;
            }
        },

        isBetween: function (from, to, units) {
            return this.isAfter(from, units) && this.isBefore(to, units);
        },

        isSame: function (input, units) {
            var inputMs;
            units = normalizeUnits(units || 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this === +input;
            } else {
                inputMs = +moment(input);
                return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
            }
        },

        min: deprecate(
                 'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        zone : deprecate(
                'moment().zone is deprecated, use moment().utcOffset instead. ' +
                'https://github.com/moment/moment/issues/1779',
                function (input, keepLocalTime) {
                    if (input != null) {
                        if (typeof input !== 'string') {
                            input = -input;
                        }

                        this.utcOffset(input, keepLocalTime);

                        return this;
                    } else {
                        return -this.utcOffset();
                    }
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        utcOffset : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = utcOffsetFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateUtcOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(input - offset, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }

                return this;
            } else {
                return this._isUTC ? offset : this._dateUtcOffset();
            }
        },

        isLocal : function () {
            return !this._isUTC;
        },

        isUtcOffset : function () {
            return this._isUTC;
        },

        isUtc : function () {
            return this._isUTC && this._offset === 0;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.utcOffset(this._tzm);
            } else if (typeof this._i === 'string') {
                this.utcOffset(utcOffsetFromString(this._i));
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).utcOffset();
            }

            return (this.utcOffset() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        week : function (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            var unit;
            if (typeof units === 'object') {
                for (unit in units) {
                    this.set(unit, units[unit]);
                }
            }
            else {
                units = normalizeUnits(units);
                if (typeof this[units] === 'function') {
                    this[units](value);
                }
            }
            return this;
        },

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        locale : function (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = moment.localeData(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        },

        lang : deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        ),

        localeData : function () {
            return this._locale;
        },

        _dateUtcOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(this._d.getTimezoneOffset() / 15) * 15;
        }

    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    // alias isUtc for dev-friendliness
    moment.fn.isUTC = moment.fn.isUtc;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.localeData());

            if (withSuffix) {
                output = this.localeData().pastFuture(+this, output);
            }

            return this.localeData().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            if (units === 'month' || units === 'year') {
                days = this._days + this._milliseconds / 864e5;
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(yearsToDays(this._months / 12));
                switch (units) {
                    case 'week': return days / 7 + this._milliseconds / 6048e5;
                    case 'day': return days + this._milliseconds / 864e5;
                    case 'hour': return days * 24 + this._milliseconds / 36e5;
                    case 'minute': return days * 24 * 60 + this._milliseconds / 6e4;
                    case 'second': return days * 24 * 60 * 60 + this._milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        },

        lang : moment.fn.lang,
        locale : moment.fn.locale,

        toIsoString : deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead ' +
            '(notice the capitals)',
            function () {
                return this.toISOString();
            }
        ),

        toISOString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        },

        localeData : function () {
            return this._locale;
        },

        toJSON : function () {
            return this.toISOString();
        }
    });

    moment.duration.fn.toString = moment.duration.fn.toISOString;

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (hasOwnProp(unitMillisecondFactors, i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Locale
    ************************************/


    // Set default locale, other locale will inherit from English.
    moment.locale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LOCALES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    'Accessing Moment through the global scope is ' +
                    'deprecated, and will be removed in an upcoming ' +
                    'release.',
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
        define(function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

});
__loader.define("vendor/png.js", 9650, function(exports, module, require) {
// Generated by CoffeeScript 1.4.0

/*
# MIT LICENSE
# Copyright (c) 2011 Devon Govett
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy of this 
# software and associated documentation files (the "Software"), to deal in the Software 
# without restriction, including without limitation the rights to use, copy, modify, merge, 
# publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons 
# to whom the Software is furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all copies or 
# substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Zlib;
if (typeof require !== 'undefined') {
  Zlib = require('zlib');
} else {
  Zlib = window.Zlib;
}

(function() {
  var PNG;

  PNG = (function() {
    var APNG_BLEND_OP_OVER, APNG_BLEND_OP_SOURCE, APNG_DISPOSE_OP_BACKGROUND, APNG_DISPOSE_OP_NONE, APNG_DISPOSE_OP_PREVIOUS, makeImage, scratchCanvas, scratchCtx;

    PNG.load = function(url, canvas, callback) {
      var xhr,
        _this = this;
      if (typeof canvas === 'function') {
        callback = canvas;
      }
      xhr = new XMLHttpRequest;
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function() {
        var data, png;
        data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
        png = new PNG(data);
        if (typeof (canvas != null ? canvas.getContext : void 0) === 'function') {
          png.render(canvas);
        }
        return typeof callback === "function" ? callback(png) : void 0;
      };
      return xhr.send(null);
    };

    APNG_DISPOSE_OP_NONE = 0;

    APNG_DISPOSE_OP_BACKGROUND = 1;

    APNG_DISPOSE_OP_PREVIOUS = 2;

    APNG_BLEND_OP_SOURCE = 0;

    APNG_BLEND_OP_OVER = 1;

    function PNG(data) {
      var chunkSize, colors, delayDen, delayNum, frame, i, index, key, section, short, text, _i, _j, _ref;
      this.data = data;
      this.pos = 8;
      this.palette = [];
      this.imgData = [];
      this.transparency = {};
      this.animation = null;
      this.text = {};
      frame = null;
      while (true) {
        chunkSize = this.readUInt32();
        section = ((function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i < 4; i = ++_i) {
            _results.push(String.fromCharCode(this.data[this.pos++]));
          }
          return _results;
        }).call(this)).join('');
        switch (section) {
          case 'IHDR':
            this.width = this.readUInt32();
            this.height = this.readUInt32();
            this.bits = this.data[this.pos++];
            this.colorType = this.data[this.pos++];
            this.compressionMethod = this.data[this.pos++];
            this.filterMethod = this.data[this.pos++];
            this.interlaceMethod = this.data[this.pos++];
            break;
          case 'acTL':
            this.animation = {
              numFrames: this.readUInt32(),
              numPlays: this.readUInt32() || Infinity,
              frames: []
            };
            break;
          case 'PLTE':
            this.palette = this.read(chunkSize);
            break;
          case 'fcTL':
            if (frame) {
              this.animation.frames.push(frame);
            }
            this.pos += 4;
            frame = {
              width: this.readUInt32(),
              height: this.readUInt32(),
              xOffset: this.readUInt32(),
              yOffset: this.readUInt32()
            };
            delayNum = this.readUInt16();
            delayDen = this.readUInt16() || 100;
            frame.delay = 1000 * delayNum / delayDen;
            frame.disposeOp = this.data[this.pos++];
            frame.blendOp = this.data[this.pos++];
            frame.data = [];
            break;
          case 'IDAT':
          case 'fdAT':
            if (section === 'fdAT') {
              this.pos += 4;
              chunkSize -= 4;
            }
            data = (frame != null ? frame.data : void 0) || this.imgData;
            for (i = _i = 0; 0 <= chunkSize ? _i < chunkSize : _i > chunkSize; i = 0 <= chunkSize ? ++_i : --_i) {
              data.push(this.data[this.pos++]);
            }
            break;
          case 'tRNS':
            this.transparency = {};
            switch (this.colorType) {
              case 3:
                this.transparency.indexed = this.read(chunkSize);
                short = 255 - this.transparency.indexed.length;
                if (short > 0) {
                  for (i = _j = 0; 0 <= short ? _j < short : _j > short; i = 0 <= short ? ++_j : --_j) {
                    this.transparency.indexed.push(255);
                  }
                }
                break;
              case 0:
                this.transparency.grayscale = this.read(chunkSize)[0];
                break;
              case 2:
                this.transparency.rgb = this.read(chunkSize);
            }
            break;
          case 'tEXt':
            text = this.read(chunkSize);
            index = text.indexOf(0);
            key = String.fromCharCode.apply(String, text.slice(0, index));
            this.text[key] = String.fromCharCode.apply(String, text.slice(index + 1));
            break;
          case 'IEND':
            if (frame) {
              this.animation.frames.push(frame);
            }
            this.colors = (function() {
              switch (this.colorType) {
                case 0:
                case 3:
                case 4:
                  return 1;
                case 2:
                case 6:
                  return 3;
              }
            }).call(this);
            this.hasAlphaChannel = (_ref = this.colorType) === 4 || _ref === 6;
            colors = this.colors + (this.hasAlphaChannel ? 1 : 0);
            this.pixelBitlength = this.bits * colors;
            this.colorSpace = (function() {
              switch (this.colors) {
                case 1:
                  return 'DeviceGray';
                case 3:
                  return 'DeviceRGB';
              }
            }).call(this);
            this.imgData = new Uint8Array(this.imgData);
            return;
          default:
            this.pos += chunkSize;
        }
        this.pos += 4;
        if (this.pos > this.data.length) {
          throw new Error("Incomplete or corrupt PNG file");
        }
      }
      return;
    }

    PNG.prototype.read = function(bytes) {
      var i, _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i) {
        _results.push(this.data[this.pos++]);
      }
      return _results;
    };

    PNG.prototype.readUInt32 = function() {
      var b1, b2, b3, b4;
      b1 = this.data[this.pos++] << 24;
      b2 = this.data[this.pos++] << 16;
      b3 = this.data[this.pos++] << 8;
      b4 = this.data[this.pos++];
      return b1 | b2 | b3 | b4;
    };

    PNG.prototype.readUInt16 = function() {
      var b1, b2;
      b1 = this.data[this.pos++] << 8;
      b2 = this.data[this.pos++];
      return b1 | b2;
    };

    PNG.prototype.decodePixels = function(data) {
      var byte, c, col, i, left, length, p, pa, paeth, pb, pc, pixelBytes, pixels, pos, row, scanlineLength, upper, upperLeft, _i, _j, _k, _l, _m;
      if (data == null) {
        data = this.imgData;
      }
      if (data.length === 0) {
        return new Uint8Array(0);
      }
      data = new Zlib.Inflate(data);
      data = data.decompress();
      pixelBytes = this.pixelBitlength / 8;
      scanlineLength = pixelBytes * this.width;
      pixels = new Uint8Array(scanlineLength * this.height);
      length = data.length;
      row = 0;
      pos = 0;
      c = 0;
      while (pos < length) {
        switch (data[pos++]) {
          case 0:
            for (i = _i = 0; _i < scanlineLength; i = _i += 1) {
              pixels[c++] = data[pos++];
            }
            break;
          case 1:
            for (i = _j = 0; _j < scanlineLength; i = _j += 1) {
              byte = data[pos++];
              left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
              pixels[c++] = (byte + left) % 256;
            }
            break;
          case 2:
            for (i = _k = 0; _k < scanlineLength; i = _k += 1) {
              byte = data[pos++];
              col = (i - (i % pixelBytes)) / pixelBytes;
              upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
              pixels[c++] = (upper + byte) % 256;
            }
            break;
          case 3:
            for (i = _l = 0; _l < scanlineLength; i = _l += 1) {
              byte = data[pos++];
              col = (i - (i % pixelBytes)) / pixelBytes;
              left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
              upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
              pixels[c++] = (byte + Math.floor((left + upper) / 2)) % 256;
            }
            break;
          case 4:
            for (i = _m = 0; _m < scanlineLength; i = _m += 1) {
              byte = data[pos++];
              col = (i - (i % pixelBytes)) / pixelBytes;
              left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
              if (row === 0) {
                upper = upperLeft = 0;
              } else {
                upper = pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                upperLeft = col && pixels[(row - 1) * scanlineLength + (col - 1) * pixelBytes + (i % pixelBytes)];
              }
              p = left + upper - upperLeft;
              pa = Math.abs(p - left);
              pb = Math.abs(p - upper);
              pc = Math.abs(p - upperLeft);
              if (pa <= pb && pa <= pc) {
                paeth = left;
              } else if (pb <= pc) {
                paeth = upper;
              } else {
                paeth = upperLeft;
              }
              pixels[c++] = (byte + paeth) % 256;
            }
            break;
          default:
            throw new Error("Invalid filter algorithm: " + data[pos - 1]);
        }
        row++;
      }
      return pixels;
    };

    PNG.prototype.decodePalette = function() {
      var c, i, length, palette, pos, ret, transparency, _i, _ref, _ref1;
      palette = this.palette;
      transparency = this.transparency.indexed || [];
      ret = new Uint8Array((transparency.length || 0) + palette.length);
      pos = 0;
      length = palette.length;
      c = 0;
      for (i = _i = 0, _ref = palette.length; _i < _ref; i = _i += 3) {
        ret[pos++] = palette[i];
        ret[pos++] = palette[i + 1];
        ret[pos++] = palette[i + 2];
        ret[pos++] = (_ref1 = transparency[c++]) != null ? _ref1 : 255;
      }
      return ret;
    };

    PNG.prototype.copyToImageData = function(imageData, pixels) {
      var alpha, colors, data, i, input, j, k, length, palette, v, _ref;
      colors = this.colors;
      palette = null;
      alpha = this.hasAlphaChannel;
      if (this.palette.length) {
        palette = (_ref = this._decodedPalette) != null ? _ref : this._decodedPalette = this.decodePalette();
        colors = 4;
        alpha = true;
      }
      data = imageData.data || imageData;
      length = data.length;
      input = palette || pixels;
      i = j = 0;
      if (colors === 1) {
        while (i < length) {
          k = palette ? pixels[i / 4] * 4 : j;
          v = input[k++];
          data[i++] = v;
          data[i++] = v;
          data[i++] = v;
          data[i++] = alpha ? input[k++] : 255;
          j = k;
        }
      } else {
        while (i < length) {
          k = palette ? pixels[i / 4] * 4 : j;
          data[i++] = input[k++];
          data[i++] = input[k++];
          data[i++] = input[k++];
          data[i++] = alpha ? input[k++] : 255;
          j = k;
        }
      }
    };

    PNG.prototype.decode = function() {
      var ret;
      ret = new Uint8Array(this.width * this.height * 4);
      this.copyToImageData(ret, this.decodePixels());
      return ret;
    };

    makeImage = function(imageData) {
      var img;
      scratchCtx.width = imageData.width;
      scratchCtx.height = imageData.height;
      scratchCtx.clearRect(0, 0, imageData.width, imageData.height);
      scratchCtx.putImageData(imageData, 0, 0);
      img = new Image;
      img.src = scratchCanvas.toDataURL();
      return img;
    };

    PNG.prototype.decodeFrames = function(ctx) {
      var frame, i, imageData, pixels, _i, _len, _ref, _results;
      if (!this.animation) {
        return;
      }
      _ref = this.animation.frames;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        frame = _ref[i];
        imageData = ctx.createImageData(frame.width, frame.height);
        pixels = this.decodePixels(new Uint8Array(frame.data));
        this.copyToImageData(imageData, pixels);
        frame.imageData = imageData;
        _results.push(frame.image = makeImage(imageData));
      }
      return _results;
    };

    PNG.prototype.renderFrame = function(ctx, number) {
      var frame, frames, prev;
      frames = this.animation.frames;
      frame = frames[number];
      prev = frames[number - 1];
      if (number === 0) {
        ctx.clearRect(0, 0, this.width, this.height);
      }
      if ((prev != null ? prev.disposeOp : void 0) === APNG_DISPOSE_OP_BACKGROUND) {
        ctx.clearRect(prev.xOffset, prev.yOffset, prev.width, prev.height);
      } else if ((prev != null ? prev.disposeOp : void 0) === APNG_DISPOSE_OP_PREVIOUS) {
        ctx.putImageData(prev.imageData, prev.xOffset, prev.yOffset);
      }
      if (frame.blendOp === APNG_BLEND_OP_SOURCE) {
        ctx.clearRect(frame.xOffset, frame.yOffset, frame.width, frame.height);
      }
      return ctx.drawImage(frame.image, frame.xOffset, frame.yOffset);
    };

    PNG.prototype.animate = function(ctx) {
      var doFrame, frameNumber, frames, numFrames, numPlays, _ref,
        _this = this;
      frameNumber = 0;
      _ref = this.animation, numFrames = _ref.numFrames, frames = _ref.frames, numPlays = _ref.numPlays;
      return (doFrame = function() {
        var f, frame;
        f = frameNumber++ % numFrames;
        frame = frames[f];
        _this.renderFrame(ctx, f);
        if (numFrames > 1 && frameNumber / numFrames < numPlays) {
          return _this.animation._timeout = setTimeout(doFrame, frame.delay);
        }
      })();
    };

    PNG.prototype.stopAnimation = function() {
      var _ref;
      return clearTimeout((_ref = this.animation) != null ? _ref._timeout : void 0);
    };

    PNG.prototype.render = function(canvas) {
      var ctx, data;
      if (canvas._png) {
        canvas._png.stopAnimation();
      }
      canvas._png = this;
      canvas.width = this.width;
      canvas.height = this.height;
      ctx = canvas.getContext("2d");
      if (this.animation) {
        this.decodeFrames(ctx);
        return this.animate(ctx);
      } else {
        data = ctx.createImageData(this.width, this.height);
        this.copyToImageData(data, this.decodePixels());
        return ctx.putImageData(data, 0, 0);
      }
    };

    return PNG;

  })();

  if (typeof module !== 'undefined') {
    module.exports = PNG;
  } else {
    window.PNG = PNG;
  }

}).call(this);

});
__loader.define("vendor/zlib.js", 10117, function(exports, module, require) {
/**
 * zlib.js Deflate + Inflate
 *
 * @link https://github.com/imaya/zlib.js
 * @author imaya
 * @license MIT
 **/
(function() {'use strict';function l(d){throw d;}var v=void 0,x=!0,aa=this;function D(d,a){var c=d.split("."),e=aa;!(c[0]in e)&&e.execScript&&e.execScript("var "+c[0]);for(var b;c.length&&(b=c.shift());)!c.length&&a!==v?e[b]=a:e=e[b]?e[b]:e[b]={}};var F="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array&&"undefined"!==typeof DataView;function H(d,a){this.index="number"===typeof a?a:0;this.i=0;this.buffer=d instanceof(F?Uint8Array:Array)?d:new (F?Uint8Array:Array)(32768);2*this.buffer.length<=this.index&&l(Error("invalid index"));this.buffer.length<=this.index&&this.f()}H.prototype.f=function(){var d=this.buffer,a,c=d.length,e=new (F?Uint8Array:Array)(c<<1);if(F)e.set(d);else for(a=0;a<c;++a)e[a]=d[a];return this.buffer=e};
H.prototype.d=function(d,a,c){var e=this.buffer,b=this.index,f=this.i,g=e[b],h;c&&1<a&&(d=8<a?(N[d&255]<<24|N[d>>>8&255]<<16|N[d>>>16&255]<<8|N[d>>>24&255])>>32-a:N[d]>>8-a);if(8>a+f)g=g<<a|d,f+=a;else for(h=0;h<a;++h)g=g<<1|d>>a-h-1&1,8===++f&&(f=0,e[b++]=N[g],g=0,b===e.length&&(e=this.f()));e[b]=g;this.buffer=e;this.i=f;this.index=b};H.prototype.finish=function(){var d=this.buffer,a=this.index,c;0<this.i&&(d[a]<<=8-this.i,d[a]=N[d[a]],a++);F?c=d.subarray(0,a):(d.length=a,c=d);return c};
var fa=new (F?Uint8Array:Array)(256),O;for(O=0;256>O;++O){for(var P=O,Q=P,ga=7,P=P>>>1;P;P>>>=1)Q<<=1,Q|=P&1,--ga;fa[O]=(Q<<ga&255)>>>0}var N=fa;function ha(d){this.buffer=new (F?Uint16Array:Array)(2*d);this.length=0}ha.prototype.getParent=function(d){return 2*((d-2)/4|0)};ha.prototype.push=function(d,a){var c,e,b=this.buffer,f;c=this.length;b[this.length++]=a;for(b[this.length++]=d;0<c;)if(e=this.getParent(c),b[c]>b[e])f=b[c],b[c]=b[e],b[e]=f,f=b[c+1],b[c+1]=b[e+1],b[e+1]=f,c=e;else break;return this.length};
ha.prototype.pop=function(){var d,a,c=this.buffer,e,b,f;a=c[0];d=c[1];this.length-=2;c[0]=c[this.length];c[1]=c[this.length+1];for(f=0;;){b=2*f+2;if(b>=this.length)break;b+2<this.length&&c[b+2]>c[b]&&(b+=2);if(c[b]>c[f])e=c[f],c[f]=c[b],c[b]=e,e=c[f+1],c[f+1]=c[b+1],c[b+1]=e;else break;f=b}return{index:d,value:a,length:this.length}};function R(d){var a=d.length,c=0,e=Number.POSITIVE_INFINITY,b,f,g,h,k,n,q,r,p,m;for(r=0;r<a;++r)d[r]>c&&(c=d[r]),d[r]<e&&(e=d[r]);b=1<<c;f=new (F?Uint32Array:Array)(b);g=1;h=0;for(k=2;g<=c;){for(r=0;r<a;++r)if(d[r]===g){n=0;q=h;for(p=0;p<g;++p)n=n<<1|q&1,q>>=1;m=g<<16|r;for(p=n;p<b;p+=k)f[p]=m;++h}++g;h<<=1;k<<=1}return[f,c,e]};function ia(d,a){this.h=ma;this.w=0;this.input=F&&d instanceof Array?new Uint8Array(d):d;this.b=0;a&&(a.lazy&&(this.w=a.lazy),"number"===typeof a.compressionType&&(this.h=a.compressionType),a.outputBuffer&&(this.a=F&&a.outputBuffer instanceof Array?new Uint8Array(a.outputBuffer):a.outputBuffer),"number"===typeof a.outputIndex&&(this.b=a.outputIndex));this.a||(this.a=new (F?Uint8Array:Array)(32768))}var ma=2,na={NONE:0,r:1,k:ma,O:3},oa=[],S;
for(S=0;288>S;S++)switch(x){case 143>=S:oa.push([S+48,8]);break;case 255>=S:oa.push([S-144+400,9]);break;case 279>=S:oa.push([S-256+0,7]);break;case 287>=S:oa.push([S-280+192,8]);break;default:l("invalid literal: "+S)}
ia.prototype.j=function(){var d,a,c,e,b=this.input;switch(this.h){case 0:c=0;for(e=b.length;c<e;){a=F?b.subarray(c,c+65535):b.slice(c,c+65535);c+=a.length;var f=a,g=c===e,h=v,k=v,n=v,q=v,r=v,p=this.a,m=this.b;if(F){for(p=new Uint8Array(this.a.buffer);p.length<=m+f.length+5;)p=new Uint8Array(p.length<<1);p.set(this.a)}h=g?1:0;p[m++]=h|0;k=f.length;n=~k+65536&65535;p[m++]=k&255;p[m++]=k>>>8&255;p[m++]=n&255;p[m++]=n>>>8&255;if(F)p.set(f,m),m+=f.length,p=p.subarray(0,m);else{q=0;for(r=f.length;q<r;++q)p[m++]=
f[q];p.length=m}this.b=m;this.a=p}break;case 1:var s=new H(F?new Uint8Array(this.a.buffer):this.a,this.b);s.d(1,1,x);s.d(1,2,x);var w=pa(this,b),y,ja,A;y=0;for(ja=w.length;y<ja;y++)if(A=w[y],H.prototype.d.apply(s,oa[A]),256<A)s.d(w[++y],w[++y],x),s.d(w[++y],5),s.d(w[++y],w[++y],x);else if(256===A)break;this.a=s.finish();this.b=this.a.length;break;case ma:var C=new H(F?new Uint8Array(this.a.buffer):this.a,this.b),Ea,M,U,V,W,gb=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],ba,Fa,ca,Ga,ka,ra=Array(19),
Ha,X,la,z,Ia;Ea=ma;C.d(1,1,x);C.d(Ea,2,x);M=pa(this,b);ba=qa(this.M,15);Fa=sa(ba);ca=qa(this.L,7);Ga=sa(ca);for(U=286;257<U&&0===ba[U-1];U--);for(V=30;1<V&&0===ca[V-1];V--);var Ja=U,Ka=V,I=new (F?Uint32Array:Array)(Ja+Ka),t,J,u,da,G=new (F?Uint32Array:Array)(316),E,B,K=new (F?Uint8Array:Array)(19);for(t=J=0;t<Ja;t++)I[J++]=ba[t];for(t=0;t<Ka;t++)I[J++]=ca[t];if(!F){t=0;for(da=K.length;t<da;++t)K[t]=0}t=E=0;for(da=I.length;t<da;t+=J){for(J=1;t+J<da&&I[t+J]===I[t];++J);u=J;if(0===I[t])if(3>u)for(;0<
u--;)G[E++]=0,K[0]++;else for(;0<u;)B=138>u?u:138,B>u-3&&B<u&&(B=u-3),10>=B?(G[E++]=17,G[E++]=B-3,K[17]++):(G[E++]=18,G[E++]=B-11,K[18]++),u-=B;else if(G[E++]=I[t],K[I[t]]++,u--,3>u)for(;0<u--;)G[E++]=I[t],K[I[t]]++;else for(;0<u;)B=6>u?u:6,B>u-3&&B<u&&(B=u-3),G[E++]=16,G[E++]=B-3,K[16]++,u-=B}d=F?G.subarray(0,E):G.slice(0,E);ka=qa(K,7);for(z=0;19>z;z++)ra[z]=ka[gb[z]];for(W=19;4<W&&0===ra[W-1];W--);Ha=sa(ka);C.d(U-257,5,x);C.d(V-1,5,x);C.d(W-4,4,x);for(z=0;z<W;z++)C.d(ra[z],3,x);z=0;for(Ia=d.length;z<
Ia;z++)if(X=d[z],C.d(Ha[X],ka[X],x),16<=X){z++;switch(X){case 16:la=2;break;case 17:la=3;break;case 18:la=7;break;default:l("invalid code: "+X)}C.d(d[z],la,x)}var La=[Fa,ba],Ma=[Ga,ca],L,Na,ea,ua,Oa,Pa,Qa,Ra;Oa=La[0];Pa=La[1];Qa=Ma[0];Ra=Ma[1];L=0;for(Na=M.length;L<Na;++L)if(ea=M[L],C.d(Oa[ea],Pa[ea],x),256<ea)C.d(M[++L],M[++L],x),ua=M[++L],C.d(Qa[ua],Ra[ua],x),C.d(M[++L],M[++L],x);else if(256===ea)break;this.a=C.finish();this.b=this.a.length;break;default:l("invalid compression type")}return this.a};
function ta(d,a){this.length=d;this.H=a}
var va=function(){function d(b){switch(x){case 3===b:return[257,b-3,0];case 4===b:return[258,b-4,0];case 5===b:return[259,b-5,0];case 6===b:return[260,b-6,0];case 7===b:return[261,b-7,0];case 8===b:return[262,b-8,0];case 9===b:return[263,b-9,0];case 10===b:return[264,b-10,0];case 12>=b:return[265,b-11,1];case 14>=b:return[266,b-13,1];case 16>=b:return[267,b-15,1];case 18>=b:return[268,b-17,1];case 22>=b:return[269,b-19,2];case 26>=b:return[270,b-23,2];case 30>=b:return[271,b-27,2];case 34>=b:return[272,
b-31,2];case 42>=b:return[273,b-35,3];case 50>=b:return[274,b-43,3];case 58>=b:return[275,b-51,3];case 66>=b:return[276,b-59,3];case 82>=b:return[277,b-67,4];case 98>=b:return[278,b-83,4];case 114>=b:return[279,b-99,4];case 130>=b:return[280,b-115,4];case 162>=b:return[281,b-131,5];case 194>=b:return[282,b-163,5];case 226>=b:return[283,b-195,5];case 257>=b:return[284,b-227,5];case 258===b:return[285,b-258,0];default:l("invalid length: "+b)}}var a=[],c,e;for(c=3;258>=c;c++)e=d(c),a[c]=e[2]<<24|e[1]<<
16|e[0];return a}(),wa=F?new Uint32Array(va):va;
function pa(d,a){function c(b,c){var a=b.H,d=[],e=0,f;f=wa[b.length];d[e++]=f&65535;d[e++]=f>>16&255;d[e++]=f>>24;var g;switch(x){case 1===a:g=[0,a-1,0];break;case 2===a:g=[1,a-2,0];break;case 3===a:g=[2,a-3,0];break;case 4===a:g=[3,a-4,0];break;case 6>=a:g=[4,a-5,1];break;case 8>=a:g=[5,a-7,1];break;case 12>=a:g=[6,a-9,2];break;case 16>=a:g=[7,a-13,2];break;case 24>=a:g=[8,a-17,3];break;case 32>=a:g=[9,a-25,3];break;case 48>=a:g=[10,a-33,4];break;case 64>=a:g=[11,a-49,4];break;case 96>=a:g=[12,a-
65,5];break;case 128>=a:g=[13,a-97,5];break;case 192>=a:g=[14,a-129,6];break;case 256>=a:g=[15,a-193,6];break;case 384>=a:g=[16,a-257,7];break;case 512>=a:g=[17,a-385,7];break;case 768>=a:g=[18,a-513,8];break;case 1024>=a:g=[19,a-769,8];break;case 1536>=a:g=[20,a-1025,9];break;case 2048>=a:g=[21,a-1537,9];break;case 3072>=a:g=[22,a-2049,10];break;case 4096>=a:g=[23,a-3073,10];break;case 6144>=a:g=[24,a-4097,11];break;case 8192>=a:g=[25,a-6145,11];break;case 12288>=a:g=[26,a-8193,12];break;case 16384>=
a:g=[27,a-12289,12];break;case 24576>=a:g=[28,a-16385,13];break;case 32768>=a:g=[29,a-24577,13];break;default:l("invalid distance")}f=g;d[e++]=f[0];d[e++]=f[1];d[e++]=f[2];var h,k;h=0;for(k=d.length;h<k;++h)p[m++]=d[h];w[d[0]]++;y[d[3]]++;s=b.length+c-1;r=null}var e,b,f,g,h,k={},n,q,r,p=F?new Uint16Array(2*a.length):[],m=0,s=0,w=new (F?Uint32Array:Array)(286),y=new (F?Uint32Array:Array)(30),ja=d.w,A;if(!F){for(f=0;285>=f;)w[f++]=0;for(f=0;29>=f;)y[f++]=0}w[256]=1;e=0;for(b=a.length;e<b;++e){f=h=0;
for(g=3;f<g&&e+f!==b;++f)h=h<<8|a[e+f];k[h]===v&&(k[h]=[]);n=k[h];if(!(0<s--)){for(;0<n.length&&32768<e-n[0];)n.shift();if(e+3>=b){r&&c(r,-1);f=0;for(g=b-e;f<g;++f)A=a[e+f],p[m++]=A,++w[A];break}0<n.length?(q=xa(a,e,n),r?r.length<q.length?(A=a[e-1],p[m++]=A,++w[A],c(q,0)):c(r,-1):q.length<ja?r=q:c(q,0)):r?c(r,-1):(A=a[e],p[m++]=A,++w[A])}n.push(e)}p[m++]=256;w[256]++;d.M=w;d.L=y;return F?p.subarray(0,m):p}
function xa(d,a,c){var e,b,f=0,g,h,k,n,q=d.length;h=0;n=c.length;a:for(;h<n;h++){e=c[n-h-1];g=3;if(3<f){for(k=f;3<k;k--)if(d[e+k-1]!==d[a+k-1])continue a;g=f}for(;258>g&&a+g<q&&d[e+g]===d[a+g];)++g;g>f&&(b=e,f=g);if(258===g)break}return new ta(f,a-b)}
function qa(d,a){var c=d.length,e=new ha(572),b=new (F?Uint8Array:Array)(c),f,g,h,k,n;if(!F)for(k=0;k<c;k++)b[k]=0;for(k=0;k<c;++k)0<d[k]&&e.push(k,d[k]);f=Array(e.length/2);g=new (F?Uint32Array:Array)(e.length/2);if(1===f.length)return b[e.pop().index]=1,b;k=0;for(n=e.length/2;k<n;++k)f[k]=e.pop(),g[k]=f[k].value;h=ya(g,g.length,a);k=0;for(n=f.length;k<n;++k)b[f[k].index]=h[k];return b}
function ya(d,a,c){function e(b){var c=k[b][n[b]];c===a?(e(b+1),e(b+1)):--g[c];++n[b]}var b=new (F?Uint16Array:Array)(c),f=new (F?Uint8Array:Array)(c),g=new (F?Uint8Array:Array)(a),h=Array(c),k=Array(c),n=Array(c),q=(1<<c)-a,r=1<<c-1,p,m,s,w,y;b[c-1]=a;for(m=0;m<c;++m)q<r?f[m]=0:(f[m]=1,q-=r),q<<=1,b[c-2-m]=(b[c-1-m]/2|0)+a;b[0]=f[0];h[0]=Array(b[0]);k[0]=Array(b[0]);for(m=1;m<c;++m)b[m]>2*b[m-1]+f[m]&&(b[m]=2*b[m-1]+f[m]),h[m]=Array(b[m]),k[m]=Array(b[m]);for(p=0;p<a;++p)g[p]=c;for(s=0;s<b[c-1];++s)h[c-
1][s]=d[s],k[c-1][s]=s;for(p=0;p<c;++p)n[p]=0;1===f[c-1]&&(--g[0],++n[c-1]);for(m=c-2;0<=m;--m){w=p=0;y=n[m+1];for(s=0;s<b[m];s++)w=h[m+1][y]+h[m+1][y+1],w>d[p]?(h[m][s]=w,k[m][s]=a,y+=2):(h[m][s]=d[p],k[m][s]=p,++p);n[m]=0;1===f[m]&&e(m)}return g}
function sa(d){var a=new (F?Uint16Array:Array)(d.length),c=[],e=[],b=0,f,g,h,k;f=0;for(g=d.length;f<g;f++)c[d[f]]=(c[d[f]]|0)+1;f=1;for(g=16;f<=g;f++)e[f]=b,b+=c[f]|0,b<<=1;f=0;for(g=d.length;f<g;f++){b=e[d[f]];e[d[f]]+=1;h=a[f]=0;for(k=d[f];h<k;h++)a[f]=a[f]<<1|b&1,b>>>=1}return a};function T(d,a){this.l=[];this.m=32768;this.e=this.g=this.c=this.q=0;this.input=F?new Uint8Array(d):d;this.s=!1;this.n=za;this.C=!1;if(a||!(a={}))a.index&&(this.c=a.index),a.bufferSize&&(this.m=a.bufferSize),a.bufferType&&(this.n=a.bufferType),a.resize&&(this.C=a.resize);switch(this.n){case Aa:this.b=32768;this.a=new (F?Uint8Array:Array)(32768+this.m+258);break;case za:this.b=0;this.a=new (F?Uint8Array:Array)(this.m);this.f=this.K;this.t=this.I;this.o=this.J;break;default:l(Error("invalid inflate mode"))}}
var Aa=0,za=1,Ba={F:Aa,D:za};
T.prototype.p=function(){for(;!this.s;){var d=Y(this,3);d&1&&(this.s=x);d>>>=1;switch(d){case 0:var a=this.input,c=this.c,e=this.a,b=this.b,f=a.length,g=v,h=v,k=e.length,n=v;this.e=this.g=0;c+1>=f&&l(Error("invalid uncompressed block header: LEN"));g=a[c++]|a[c++]<<8;c+1>=f&&l(Error("invalid uncompressed block header: NLEN"));h=a[c++]|a[c++]<<8;g===~h&&l(Error("invalid uncompressed block header: length verify"));c+g>a.length&&l(Error("input buffer is broken"));switch(this.n){case Aa:for(;b+g>e.length;){n=
k-b;g-=n;if(F)e.set(a.subarray(c,c+n),b),b+=n,c+=n;else for(;n--;)e[b++]=a[c++];this.b=b;e=this.f();b=this.b}break;case za:for(;b+g>e.length;)e=this.f({v:2});break;default:l(Error("invalid inflate mode"))}if(F)e.set(a.subarray(c,c+g),b),b+=g,c+=g;else for(;g--;)e[b++]=a[c++];this.c=c;this.b=b;this.a=e;break;case 1:this.o(Ca,Da);break;case 2:Sa(this);break;default:l(Error("unknown BTYPE: "+d))}}return this.t()};
var Ta=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],Ua=F?new Uint16Array(Ta):Ta,Va=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],Wa=F?new Uint16Array(Va):Va,Xa=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],Ya=F?new Uint8Array(Xa):Xa,Za=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],$a=F?new Uint16Array(Za):Za,ab=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,
10,11,11,12,12,13,13],bb=F?new Uint8Array(ab):ab,cb=new (F?Uint8Array:Array)(288),Z,db;Z=0;for(db=cb.length;Z<db;++Z)cb[Z]=143>=Z?8:255>=Z?9:279>=Z?7:8;var Ca=R(cb),eb=new (F?Uint8Array:Array)(30),fb,hb;fb=0;for(hb=eb.length;fb<hb;++fb)eb[fb]=5;var Da=R(eb);function Y(d,a){for(var c=d.g,e=d.e,b=d.input,f=d.c,g=b.length,h;e<a;)f>=g&&l(Error("input buffer is broken")),c|=b[f++]<<e,e+=8;h=c&(1<<a)-1;d.g=c>>>a;d.e=e-a;d.c=f;return h}
function ib(d,a){for(var c=d.g,e=d.e,b=d.input,f=d.c,g=b.length,h=a[0],k=a[1],n,q;e<k&&!(f>=g);)c|=b[f++]<<e,e+=8;n=h[c&(1<<k)-1];q=n>>>16;d.g=c>>q;d.e=e-q;d.c=f;return n&65535}
function Sa(d){function a(a,b,c){var d,e=this.z,f,g;for(g=0;g<a;)switch(d=ib(this,b),d){case 16:for(f=3+Y(this,2);f--;)c[g++]=e;break;case 17:for(f=3+Y(this,3);f--;)c[g++]=0;e=0;break;case 18:for(f=11+Y(this,7);f--;)c[g++]=0;e=0;break;default:e=c[g++]=d}this.z=e;return c}var c=Y(d,5)+257,e=Y(d,5)+1,b=Y(d,4)+4,f=new (F?Uint8Array:Array)(Ua.length),g,h,k,n;for(n=0;n<b;++n)f[Ua[n]]=Y(d,3);if(!F){n=b;for(b=f.length;n<b;++n)f[Ua[n]]=0}g=R(f);h=new (F?Uint8Array:Array)(c);k=new (F?Uint8Array:Array)(e);
d.z=0;d.o(R(a.call(d,c,g,h)),R(a.call(d,e,g,k)))}T.prototype.o=function(d,a){var c=this.a,e=this.b;this.u=d;for(var b=c.length-258,f,g,h,k;256!==(f=ib(this,d));)if(256>f)e>=b&&(this.b=e,c=this.f(),e=this.b),c[e++]=f;else{g=f-257;k=Wa[g];0<Ya[g]&&(k+=Y(this,Ya[g]));f=ib(this,a);h=$a[f];0<bb[f]&&(h+=Y(this,bb[f]));e>=b&&(this.b=e,c=this.f(),e=this.b);for(;k--;)c[e]=c[e++-h]}for(;8<=this.e;)this.e-=8,this.c--;this.b=e};
T.prototype.J=function(d,a){var c=this.a,e=this.b;this.u=d;for(var b=c.length,f,g,h,k;256!==(f=ib(this,d));)if(256>f)e>=b&&(c=this.f(),b=c.length),c[e++]=f;else{g=f-257;k=Wa[g];0<Ya[g]&&(k+=Y(this,Ya[g]));f=ib(this,a);h=$a[f];0<bb[f]&&(h+=Y(this,bb[f]));e+k>b&&(c=this.f(),b=c.length);for(;k--;)c[e]=c[e++-h]}for(;8<=this.e;)this.e-=8,this.c--;this.b=e};
T.prototype.f=function(){var d=new (F?Uint8Array:Array)(this.b-32768),a=this.b-32768,c,e,b=this.a;if(F)d.set(b.subarray(32768,d.length));else{c=0;for(e=d.length;c<e;++c)d[c]=b[c+32768]}this.l.push(d);this.q+=d.length;if(F)b.set(b.subarray(a,a+32768));else for(c=0;32768>c;++c)b[c]=b[a+c];this.b=32768;return b};
T.prototype.K=function(d){var a,c=this.input.length/this.c+1|0,e,b,f,g=this.input,h=this.a;d&&("number"===typeof d.v&&(c=d.v),"number"===typeof d.G&&(c+=d.G));2>c?(e=(g.length-this.c)/this.u[2],f=258*(e/2)|0,b=f<h.length?h.length+f:h.length<<1):b=h.length*c;F?(a=new Uint8Array(b),a.set(h)):a=h;return this.a=a};
T.prototype.t=function(){var d=0,a=this.a,c=this.l,e,b=new (F?Uint8Array:Array)(this.q+(this.b-32768)),f,g,h,k;if(0===c.length)return F?this.a.subarray(32768,this.b):this.a.slice(32768,this.b);f=0;for(g=c.length;f<g;++f){e=c[f];h=0;for(k=e.length;h<k;++h)b[d++]=e[h]}f=32768;for(g=this.b;f<g;++f)b[d++]=a[f];this.l=[];return this.buffer=b};
T.prototype.I=function(){var d,a=this.b;F?this.C?(d=new Uint8Array(a),d.set(this.a.subarray(0,a))):d=this.a.subarray(0,a):(this.a.length>a&&(this.a.length=a),d=this.a);return this.buffer=d};function jb(d){if("string"===typeof d){var a=d.split(""),c,e;c=0;for(e=a.length;c<e;c++)a[c]=(a[c].charCodeAt(0)&255)>>>0;d=a}for(var b=1,f=0,g=d.length,h,k=0;0<g;){h=1024<g?1024:g;g-=h;do b+=d[k++],f+=b;while(--h);b%=65521;f%=65521}return(f<<16|b)>>>0};function kb(d,a){var c,e;this.input=d;this.c=0;if(a||!(a={}))a.index&&(this.c=a.index),a.verify&&(this.N=a.verify);c=d[this.c++];e=d[this.c++];switch(c&15){case lb:this.method=lb;break;default:l(Error("unsupported compression method"))}0!==((c<<8)+e)%31&&l(Error("invalid fcheck flag:"+((c<<8)+e)%31));e&32&&l(Error("fdict flag is not supported"));this.B=new T(d,{index:this.c,bufferSize:a.bufferSize,bufferType:a.bufferType,resize:a.resize})}
kb.prototype.p=function(){var d=this.input,a,c;a=this.B.p();this.c=this.B.c;this.N&&(c=(d[this.c++]<<24|d[this.c++]<<16|d[this.c++]<<8|d[this.c++])>>>0,c!==jb(a)&&l(Error("invalid adler-32 checksum")));return a};var lb=8;function mb(d,a){this.input=d;this.a=new (F?Uint8Array:Array)(32768);this.h=$.k;var c={},e;if((a||!(a={}))&&"number"===typeof a.compressionType)this.h=a.compressionType;for(e in a)c[e]=a[e];c.outputBuffer=this.a;this.A=new ia(this.input,c)}var $=na;
mb.prototype.j=function(){var d,a,c,e,b,f,g,h=0;g=this.a;d=lb;switch(d){case lb:a=Math.LOG2E*Math.log(32768)-8;break;default:l(Error("invalid compression method"))}c=a<<4|d;g[h++]=c;switch(d){case lb:switch(this.h){case $.NONE:b=0;break;case $.r:b=1;break;case $.k:b=2;break;default:l(Error("unsupported compression type"))}break;default:l(Error("invalid compression method"))}e=b<<6|0;g[h++]=e|31-(256*c+e)%31;f=jb(this.input);this.A.b=h;g=this.A.j();h=g.length;F&&(g=new Uint8Array(g.buffer),g.length<=
h+4&&(this.a=new Uint8Array(g.length+4),this.a.set(g),g=this.a),g=g.subarray(0,h+4));g[h++]=f>>24&255;g[h++]=f>>16&255;g[h++]=f>>8&255;g[h++]=f&255;return g};function nb(d,a){var c,e,b,f;if(Object.keys)c=Object.keys(a);else for(e in c=[],b=0,a)c[b++]=e;b=0;for(f=c.length;b<f;++b)e=c[b],D(d+"."+e,a[e])};D("Zlib.Inflate",kb);D("Zlib.Inflate.prototype.decompress",kb.prototype.p);nb("Zlib.Inflate.BufferType",{ADAPTIVE:Ba.D,BLOCK:Ba.F});D("Zlib.Deflate",mb);D("Zlib.Deflate.compress",function(d,a){return(new mb(d,a)).j()});D("Zlib.Deflate.prototype.compress",mb.prototype.j);nb("Zlib.Deflate.CompressionType",{NONE:$.NONE,FIXED:$.r,DYNAMIC:$.k});}).call(window);
if (typeof module !== 'undefined') {
  module.exports = Zlib;
}

});
__loader.define("wakeup/index.js", 10169, function(exports, module, require) {
var Wakeup = require('./wakeup');

module.exports = Wakeup;

});
__loader.define("wakeup/wakeup.js", 10175, function(exports, module, require) {
var util2 = require('util2');
var Emitter = require('emitter');
var Settings = require('settings');
var simply = require('ui/simply');

var Wakeup = function() {
  this.init();
};

Wakeup.prototype.cleanupGracePeriod = 60 * 5;

util2.copy(Emitter.prototype, Wakeup.prototype);

Wakeup.prototype.init = function() {
  this._setRequests = [];
  this._launchCallbacks = [];
  this._loadData();
  this._cleanup();
};

Wakeup.prototype._loadData = function() {
  this.state = Settings._loadData(null, 'wakeup', true) || {};
  this.state.wakeups = this.state.wakeups || {};
};

Wakeup.prototype._saveData = function() {
  Settings._saveData(null, 'wakeup', this.state);
};

Wakeup.prototype._cleanup = function() {
  var id;
  var ids = [];
  for (id in this.state.wakeups) {
    ids.push(id);
  }
  var cleanupTime = Date.now() / 1000 - Wakeup.cleanupGracePeriod;
  var deleted = false;
  for (var i = 0, ii = ids.length; i < ii; ++i) {
    id = ids[i];
    var wakeup = this.state.wakeups[id];
    if (wakeup.params.time < cleanupTime) {
      deleted = true;
      delete this.state.wakeups[id];
    }
  }
  if (deleted) {
    this._saveData();
  }
};

Wakeup.prototype.get = function(id) {
  var wakeup = this.state.wakeups[id];
  if (wakeup) {
    return {
      id: wakeup.id,
      cookie: wakeup.cookie,
      data: wakeup.data,
      time: wakeup.params.time,
      notifyIfMissed: !!wakeup.params.notifyIfMissed,
    };
  }
};

Wakeup.prototype.each = function(callback) {
  var i = 0;
  for (var id in this.state.wakeups) {
    if (callback(this.get(id), i++) === false) {
      break;
    }
  }
};

Wakeup.prototype.schedule = function(opt, callback) {
  if (typeof opt !== 'object' || opt instanceof Date) {
    opt = { time: opt };
  }
  var cookie = opt.cookie || 0;
  this._setRequests.push({
    params: opt,
    data: opt.data,
    callback: callback,
  });
  this.launch(function() {
    simply.impl.wakeupSet(opt.time, cookie, opt.notifyIfMissed);
  });
};

Wakeup.prototype.cancel = function(id) {
  if (id === 'all') {
    this.state.wakeups = {};
  } else {
    delete this.state.wakeups[id];
  }
  simply.impl.wakeupCancel(id);
};

Wakeup.prototype.launch = function(callback) {
  if (this._launchEvent) {
    callback(this._launchEvent);
  } else {
    this._launchCallbacks.push(callback);
  }
};

Wakeup.prototype._makeBaseEvent = function(id, cookie) {
  var wakeup = this.state.wakeups[id];
  var e = {
    id: id,
    cookie: cookie,
  };
  if (wakeup) {
    e.data = wakeup.data;
  }
  return e;
};

Wakeup.prototype._makeWakeupEvent = function(id, cookie) {
  var e;
  if (id !== undefined) {
    e = this._makeBaseEvent(id, cookie);
    e.wakeup = true;
  } else {
    e = { wakeup: false };
  }
  return e;
};

Wakeup.prototype._setWakeup = function(id, wakeup) {
  this.state.wakeups[id] = wakeup;
  this._saveData();
};

Wakeup.prototype._removeWakeup = function(id) {
  if (id in this.state.wakeups) {
    delete this.state.wakeups[id];
    this._saveData();
  }
};

Wakeup.prototype.emitSetResult = function(id, cookie) {
  var req = this._setRequests.shift();
  if (!req) {
    return;
  }
  var e;
  if (typeof id === 'number') {
    this._setWakeup(id, {
      id: id,
      cookie: cookie,
      data: req.data,
      params: req.params,
    });
    e = this._makeBaseEvent(id, cookie);
    e.failed = false;
  } else {
    e = {
      error: id,
      failed: true,
      cookie: cookie,
      data: req.data,
    };
  }
  return req.callback(e);
};

Wakeup.prototype.emitWakeup = function(id, cookie) {
  var e = this._makeWakeupEvent(id, cookie);

  if (!this._launchEvent) {
    e.launch = true;
    if (this._emitWakeupLaunch(e) === false) {
      return false;
    }
  } else {
    e.launch = false;
  }

  if (e.wakeup) {
    this._removeWakeup(id);
    if (this.emit('wakeup', e) === false) {
      return false;
    }
  }
};

Wakeup.prototype._emitWakeupLaunch = function(e) {
  this._launchEvent = e;

  var callbacks = this._launchCallbacks;
  this._launchCallbacks = [];

  for (var i = 0, ii = callbacks.length; i < ii; ++i) {
    if (callbacks[i](e) === false) {
      return false;
    }
  }
};

module.exports = new Wakeup();

});
__loader.define("appinfo.json", 10377, function(exports, module, require) {
module.exports = {
  "appKeys": {},
  "capabilities": [
    "configurable"
  ],
  "companyName": "Jonathan Alland",
  "longName": "RSS Reader",
  "resources": {
    "media": [
      {
        "file": "images/menu_icon.png",
        "menuIcon": true,
        "name": "IMAGE_MENU_ICON",
        "type": "bitmap"
      },
      {
        "file": "images/tile_splash.png",
        "name": "IMAGE_TILE_SPLASH",
        "type": "bitmap"
      },
      {
        "file": "fonts/UbuntuMono-Regular.ttf",
        "name": "MONO_FONT_14",
        "type": "font"
      },
      {
        "file": "images/action_up.png",
        "name": "ACTION_UP",
        "type": "bitmap"
      },
      {
        "file": "images/action_down.png",
        "name": "ACTION_DOWN",
        "type": "bitmap"
      },
      {
        "file": "images/action_check.png",
        "name": "ACTION_CHECK",
        "type": "bitmap"
      },
      {
        "file": "images/action_next.png",
        "name": "ACTION_NEXT",
        "type": "bitmap"
      }
    ]
  },
  "sdkVersion": "3",
  "shortName": "RSS Reader",
  "targetPlatforms": [
    "aplite",
    "basalt",
    "chalk",
    "diorite",
    "emery"
  ],
  "uuid": "133215f0-cf20-4c05-997b-3c9be5a64e5b",
  "versionCode": 1,
  "versionLabel": "0.4",
  "watchapp": {
    "watchface": false
  }
};
});
__loader.require("main");
