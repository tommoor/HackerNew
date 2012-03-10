var hn = {
	
	loading: [],
	loaded: [],
	identport: null,
	identelem: null,
	endless_loading: false,
	endless_preload: 200,
	
	init: function(){
	
		hn.getPage();
		hn.styleElements();
		hn.createProfileBubble();
		hn.createQuickReply();
		hn.createFilterMenu();
		hn.bindEvents();
	},
	
	getPage: function(){
	
		switch(window.location.pathname) {
			case '/item':
				$('html').addClass('item');
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
		
		$('a[href^=user]').hoverIntent(hn.loadUserDetails, function(){});
		$('a[href^=reply]').click(hn.quickReply);
		
		$(document).click(hn.closeBubbles);
		$(document).scroll(hn.checkPageEnd);
	},
	
	checkPageEnd: function(){
		if (hn.endless_loading) return;
		
		if (window.scrollY > $(document).height()-window.innerHeight-hn.endless_preload) {
			hn.endless_loading = true;
			var $temp = $('<div/>');
			var $more = $('td.title a[href^="/x"]').last().addClass('endless_loading');
			var $morerow = $more.parent().parent();
			var url = $more.attr('href');
			
			$temp.load(url, function(){	
				// find the first news title and jump up two levels to get news table body
				$morerow.after($temp.find('td.title:first-child').parent().parent().html());
				$morerow.remove();
				
				hn.endless_loading = false;
				hn.filterStories();
				
				// bind quick profiles
				$('a[href^=user]').hoverIntent(hn.loadUserDetails, function(){});
			});
		}
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
	
	closeBubbles: function(ev){
	
		if (!$(ev.target).parents('#profile-bubble').length && ev.target != $('#profile-bubble')[0]) {
			$('#profile-bubble').fadeOut(200);
		}
	},
	
	filterStories: function(){
	
		$('td.title a').each(function(){
			var $row = $(this).parent().parent();
			var $details = $row.next();
			var $divider = $details.next();
			
			var title = $(this).text();
		
			// check personal filters
			if (hn.checkFiltered(title)) {
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
	
	checkFiltered: function(title){
		
		var filters = hn.getFilters();
		
		for(var i=0, l=filters.length; i < l; i++){
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