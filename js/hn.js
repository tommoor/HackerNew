var hn = {
	
	loading: [],
	loaded: [],
	identport: null,
	identelem: null,
	endless_loading: false,
	endless_preload: 200,
	
	init: function(){
	
		hn.setPage();
		hn.styleElements();
		hn.createProfileBubble();
		hn.createQuickReply();
		hn.createFilterMenu();
		hn.augmentStories();
		hn.bindEvents();
	},
	
	setPage: function(){
	
		switch(window.location.pathname) {
			case '/item':
				$('html').addClass('item');
				hn.augmentComments();
				break;
			default:
				$('html').addClass('news');
		}
	},
	
	styleElements: function(){
	
		$('input[type=submit]').addClass('btn');
	},
	
	createProfileBubble: function(){
	
		$('body').append('<div id="profile-bubble"><em></em><div class="profile"></div></div>');
	},
	
	createQuickReply: function(){
	
		$('body').append('<div id="quick-reply"><em></em><div class="reply"></div></div>');
	},
	
	createFilterMenu: function(){
		$('.pagetop').last().prepend('<a id="menu-filters">filters</a> | ');
		$('.pagetop').parents('tr').first().after('<tr><td colspan="3" id="filter-wrapper"><em></em><input type="text" id="add-filter" placeholder="Add a filter term or phrase" /><ul id="current-filters"></ul></td></tr>');
		hn.refreshFilters();
	},
	
	refreshFilters: function(){
	
		var filters = hn.getFilters();
		var $filters = '';
		
		for(var i=0, l=filters.length; i < l; i++){
			$filters += '<li><a class="filter remove" data-filter="'+filters[i]+'" title="Remove filter">'+filters[i]+'</a></li>'
		}
	
		$('#current-filters').html($filters);
		hn.filterStories();
	},
	
	bindEvents: function(){
		
		$('#menu-filters').live('click', function(){
			$('#filter-wrapper').fadeToggle();
		});
		
		$('a.filter.remove').live('click', function(){
			hn.removeFilter($(this).data('filter'));
			hn.filterStories();
			$(this).parent().remove();
		});
		
		$('#add-filter').keyup(function(ev){
			if (ev.keyCode == 13) {
				hn.addFilter($(this).val());
				$(this).val('');
				hn.refreshFilters();
			}
		});
		
		$('.add-filter').live('click', function(ev){
			hn.addFilter($(this).data('filter'));
			hn.refreshFilters();
		});
		
		$('.toggle-replies').click(hn.toggleReplies);
		
		// slice removes the first user, which is always ourselves
		$('a[href^=user]').slice(1).hoverIntent(hn.loadUserDetails, function(){});
		$('a[href^=reply]').click(hn.quickReply);
		
		$(document).click(hn.closeQuickReply);
		$(document).scroll(hn.checkPageEnd);
	},
	
	shareStory: function(element, url, title){
		var $point = $(element);
		var url_encoded = encodeURIComponent(url);
		
		// remove sharing options
		if ($point.hasClass('sharing')) {
			$point.next().remove();
			$point.text('share')
			      .removeClass('sharing');
			return;
		}
		
		// add sharing options
		$point.addClass('sharing');
		$point.after('<div class="sharing-options"><iframe src="//platform.twitter.com/widgets/tweet_button.html?url='+url_encoded+'&text='+title+'&count=vertical" style="width:55px; height:62px; border:none;" scrolling="no" frameborder="0" ></iframe>'+
		'<iframe src="//www.facebook.com/plugins/like.php?href='+url_encoded+'&send=false&layout=box_count&width=55&show_faces=false&action=like&colorscheme=light&height=62" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:55px; height:62px;" allowTransparency="true"></iframe>'+
		'<iframe src="http://widgets.bufferapp.com/button/?url='+url_encoded+'&text='+title+'&count=vertical" style="width: 55px; height: 62px; border:none;" scrolling="no" frameborder="0"></iframe>'+
		'<g:plusone size="tall" href="'+url+'"></g:plusone><script type="text/javascript" src="https://apis.google.com/js/plusone.js"></script></div>');
	
		$point.text('actually, nah')
		      .next()
		      .fadeIn();
	},
	
	checkPageEnd: function(){
		
		// dont do anything if we're already loading the next page
		if (hn.endless_loading) return;
		
		// check if we're near the end
		if (window.scrollY > $(document).height()-window.innerHeight-hn.endless_preload) {
			
			// awesome, lets start loading
			hn.loadNextPage();
		}
	},
	
	loadNextPage: function(){
	
		hn.endless_loading = true;
		
		var $temp = $('<div/>');
		
		// find the 'More' link and add a loading class
		var $more = $('td.title a[href^="/x"]').last().addClass('endless_loading');
		var $morerow = $more.parent().parent();
		
		// extract the URL for the next page
		var url = $more.attr('href');
		
		// load next page 
		$temp.load(url, function(){	
		
			// find the first news title and jump up two levels to get news table body
			$temp = $temp.find('td.title:first-child').parent().parent().html();
			
			// add extra options to stories before appending to DOM
			hn.augmentStories($temp);
			$morerow.after($temp);
			$morerow.remove();
			
			hn.endless_loading = false;
			
			// refilter news stories
			hn.filterStories();
			
			// bind quick profiles
			$('a[href^=user]').hoverIntent(hn.loadUserDetails, function(){});
		});
	},
	
	quickReply: function(ev){
		ev.preventDefault();
		
		var $point = $(this);
		var $element = $('#quick-reply').clone();
		var $reply = $('.reply', $element);
		var url = $(this).attr('href') + ' form';
		
		$point.after($element);
		$point.remove();
		
		// load reply page into quick reply container
		$reply.empty();
		$reply.addClass('loading');
		$reply.load(url, function(){
			
			// so submit button receives twitter styling
			$reply.find('input').addClass('btn');
			
			// remove spinner
			$reply.removeClass('loading');
			
			// focus ready for reply ;)
			$reply.find('textarea').focus();	
		});
	},
	
	toggleReplies: function(ev){

		var $button = $(this);
		
		if ($button.hasClass('collapsed')) {
			var uniq = $button.data('uniq');
			$('.hidden-reply-' + uniq).fadeIn().removeClass();
			$button.text('collapse')
			       .removeClass('collapsed');
			return;
		}
		
		var count = 0;
		var parent = $button.parents('td.default').offset();
		var uniq = (new Date()).getTime();
		
		$('td.default').each(function(){
			var offset = $(this).offset();
			
			if (offset.top > parent.top) {
				if (offset.left > parent.left) {
					count++;
					
					// find parent tr, several levels down
					$(this).parent().parent().parent().parent().parent().fadeOut().addClass('hidden-reply-' + uniq);
					return true;
				}
				
				// gone too far
				return false;
			}
		});
		
		$button.text('show ' + count + ' replies')
		       .addClass('collapsed')
		       .data('uniq', uniq);
	},
	
	loadUserDetails: function(){
	
		var $temp = $('<div/>');
		var url = $(this).attr('href') + ' table';
		hn.identelem = $(this);
		hn.renderProfileBubble();
		
		// load user profile page into temporary container
		$temp.load(url, function(){
			
			// find this users karma value		
			var karma = $temp.find("td:contains('karma')").next().text();
			
			// twitter's library is far and away the best for extracting urls
			var urlsWithIndices = twttr.txt.extractUrlsWithIndices($temp.html());
			var filtered = [];
			
		    for (var i = 0; i < urlsWithIndices.length; i++) {
			
				// ensure urls are properly formed
				if(!urlsWithIndices[i].url.match(/^https?:\/\//gi)){
					urlsWithIndices[i].url = 'http://' + urlsWithIndices[i].url;
				}
				
				// filter out any ycombinator that might have got in there
				if(!urlsWithIndices[i].url.match(/ycombinator/gi)){
					filtered.push(urlsWithIndices[i].url);
				}
		    };
		
			if (filtered.length) {
				// clean list of profile urls :-)
				hn.loadUserProfiles(filtered, karma);
			} else {
				hn.renderProfileBubble([], [], karma);
			}
		});
	},
	
	loadUserProfiles: function(urls, karma){
		
		hn.renderProfileBubble([], urls, karma);
		
		var name = 'ident' + (new Date).getTime();
		var port = chrome.extension.connect({name: name});
		port.postMessage({urls: urls});
		port.onMessage.addListener(function(identities){
			hn.renderProfileBubble(identities, urls, karma);
		});
		hn.identport = port;
	},
	
	renderProfileBubble: function(identities, urls, karma){
		
		if (identities || urls || karma) {
			
			identities = identities || [];
			urls = urls || [];

			for(var i in urls) {
				identities.push({
					profileUrl: urls[i],
					spriteClass: 'icon-website',
					username: urls[i],
					name: 'Website'
				});
			}
			
			identities.unshift({
				profileUrl: '',
				spriteClass: 'icon-karma',
				username: 'Karma',
				name: karma
			});
		}
				
		// reset bubble
		var $profile = $('#profile-bubble .profile');
		$profile.empty().removeClass('loading');
		
		if (identities && identities.length > 0){
			var ul = $('<ul class="profile-list"></ul>').appendTo($profile);

			for (var x = 0; x < identities.length; x++) {
				if (identities[x].name != '') {
					$('<li><a href="' + identities[x].profileUrl  + '" target="_blank"><div class="icon ' + identities[x].spriteClass +  '"></div> <span class="icon-label">' + identities[x].name + '</span><span class="username">' + identities[x].username + '</span></a></li>').appendTo(ul);   
				} else {
					$('<li><a href="' + identities[x].profileUrl  + '" target="_blank"><div class="icon ' + identities[x].spriteClass +  '"></div> <span class="icon-label">' + identities[x].domain + '</span></a></li>').appendTo(ul);
				}
			}
		} else {
			$profile.addClass('loading');
		}
		
		// position correctly
		var left = hn.identelem.offset().left + (hn.identelem.width()/2);
		var width = $('#profile-bubble').outerWidth()/2;
		
		$('#profile-bubble').css({
			display: 'block',
			position: 'absolute',
			top: hn.identelem.offset().top+20,
			left: left-width
		});
	},
	
	closeQuickReply: function(ev){
	
		if (!$(ev.target).parents('#profile-bubble').length && ev.target != $('#profile-bubble')[0]) {
			$('#profile-bubble').fadeOut(200);
		}
	},
	
	augmentStories: function($context){
		
		if (!$context) {
			var $context = $('body');
		}
		
		$('td.title', $context).each(function(){
			
			var $link = $('a', this);
			var $title = $link.parent();
			var $details = $title.parent().next().find('td.subtext');
			
			// extract story info
			var domain = $('.comhead', $title).text().replace(/\(|\)/g, '');
			var username = $('a', $details).first().text();
			
			// add filtering options
			$link.before('<div class="filter-menu"><span>&#215;</span> <div class="quick-filter"><em></em> <ul>'+
				'<li><a data-filter="user:'+ username +'" class="add-filter">Filter user \''+ username +'\'</a></li>'+
				'<li><a data-filter="site:'+ domain +'" class="add-filter">Filter&nbsp;'+ domain +'</a></li>'+
			'</ul></div></div>');
			
			// add sharing options
			$details.append(' | <a class="share-story" href="#">share</a>');
			
			$('.share-story', $details).click(function(ev){
				ev.preventDefault();
				hn.shareStory(this, $link.attr('href'), $link.text());
			});
		});
	},
	
	augmentComments: function(){
		$('span.comment').each(function(){
			var $wrapper = $(this).parent();
			var $meta = $wrapper.find('span.comhead');
			
			$meta.append('<a class="toggle-replies">collapse<a>');
		});
	},
	
	filterStories: function(){
	
		$('td.title a').each(function(){
			var $title = $(this).parent();
			var $row = $title.parent();
			var $details = $row.next();
			var $divider = $details.next();
			
			// extract story info
			var domain = $('.comhead', $title).text().replace(/\(|\)/g, '');
			var title = $(this).text();
			var username = $('a', $details).first().text();
			
			// check personal filters
			if (hn.checkFiltered(title, domain, username)) {
				$row.hide();
				$details.hide();
				$divider.hide();
				
				return;
			} else {
				$row.fadeIn();
				$details.fadeIn();
				$divider.fadeIn();
			}
		});
	},
	
	checkFiltered: function(title, domain, username){
		
		var filters = hn.getFilters();
		var filter;
		
		for(var i=0, l=filters.length; i < l; i++){
			
			// filter domain
			if (filters[i].match(/^site:/)) {
				
				// domain name can be partial match
				var re = new RegExp(filters[i].replace(/site:/i, ''), 'gi');
				if (domain.match(re)) return true;
				
			// filter user	
			} else if (filters[i].match(/^user:/)) {
				
				// username must be exact match
				var re = new RegExp('^' + filters[i].replace(/user:/i, '') + '$', 'gi');
				if (username.match(re)) return true;
			}
			
			// filter story title
			var re = new RegExp(filters[i],"gi");
			if (title.match(re)) return true;
		}
		
		return false;
	},
	
	getFilters: function(){
		return JSON.parse(localStorage.getItem("filters")) || [];
	},
	
	setFilters: function(filters){
		return localStorage.setItem("filters", JSON.stringify(filters));
	},
	
	addFilter: function(filter){
		var f = hn.getFilters();
		var pos = f.indexOf(filter);
		
		// if the filter doesnt already exist
		if (pos == -1) {
			f.push(filter);
			hn.setFilters(f);
		}
	},
	
	removeFilter: function(filter){
		var f = hn.getFilters();
		var pos = f.indexOf(filter);
		
		// if the filter exists
		if (pos != -1) {
			f.splice(pos, 1);
			hn.setFilters(f);
		}
	}
};

$(hn.init);