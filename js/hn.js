var hn = {
	
	loading: [],
	loaded: [],
	identport: null,
	identelem: null,

	init: function(){
	
		hn.getPage();
		hn.styleElements();
		hn.createProfileBubble();
		hn.createFilterMenu();
		hn.parseStories();
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
		$('.pagetop a[href^="/r"]').addClass('logout').text('').attr('title', 'Log Out');
	},
	
	createProfileBubble: function(){
	
		$('body').append('<div id="profile-bubble"><em></em><div class="profile"></div></div>');
	},
	
	createFilterMenu: function(){
		//<input id="add-filter" placeholder="Filter stories containing..." type="text" />
		$('.pagetop').last().append(' <a class="settings" title="Settings"></a> <ul class="current-filters"></ul>');
		hn.refreshFilters();
	},
	
	refreshFilters: function(){
	
		var filters = hn.getFilters();
		var $filters = '';
		
		for(var i=0, l=filters.length; i < l; i++){
			$filters += '<li><a class="filter remove" data-filter="'+filters[i]+'">'+filters[i]+'</a></li>'
		}
	
		$('.current-filters').html($filters);
		hn.filterStories();
	},
	
	bindEvents: function(){
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
		
		$('a[href^=user]').live('mouseover', hn.loadUserDetails);
		$(document).click(hn.closeProfileBubble);
		
	},
	
	loadUserDetails: function(){
	
		var $temp = $('<div/>');
		var url = $(this).attr('href') + ' table';
		hn.identelem = $(this);
		hn.renderProfileBubble();
		
		// load user profile page into temporary container
		$temp.load(url, function(){
						
			// twitter's library is far and away the best for extracting urls
			var urlsWithIndices = twttr.txt.extractUrlsWithIndices($temp.html());
			var filtered = [];
			
		    for (var i = 0; i < urlsWithIndices.length; i++) {
			
				// ensure urls are properly formed
				if(!urlsWithIndices[i].url.match(/^http:\/\//gi)){
					urlsWithIndices[i].url = 'http://' + urlsWithIndices[i].url;
				}
				
				// filter out any ycombinator that might have got in there
				if(!urlsWithIndices[i].url.match(/ycombinator/gi)){
					filtered.push(urlsWithIndices[i].url);
				}
		    };
		
			if (filtered.length) {
				// clean list of profile urls :-)
				hn.loadUserProfiles(filtered);
			} else {
				hn.renderProfileBubble(false);
			}
		});
	},
	
	loadUserProfiles: function(urls){
		console.log('Found profile URLS: ' + urls.join(','));
		
		hn.renderProfileBubble([], urls);
		
		// stop loading previous profiles
		// if (hn.identport) hn.identport.disconnect();
		
		var name = 'ident' + (new Date).getTime();
		var port = chrome.extension.connect({name: name});
		port.postMessage({urls: urls});
		port.onMessage.addListener(function(identities){
			hn.renderProfileBubble(identities, urls);
		});
		hn.identport = port;
	},
	
	renderProfileBubble: function(identities, urls){
		
		if (identities !== false) {
			
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
		}
				
		// reset bubble
		var $profile = $('#profile-bubble .profile');
		$profile.empty();
		
		if (identities && identities.length > 0){
			var ul = $('<ul class="profile-list"></ul>').appendTo($profile);

			for (var x = 0; x < identities.length; x++) {
				if (identities[x].name != '') {
					$('<li><a href="' + identities[x].profileUrl  + '" target="_blank"><div class="icon ' + identities[x].spriteClass +  '"></div> <span class="icon-label">' + identities[x].name + '</span><span class="username">' + identities[x].username + '</span></a></li>').appendTo(ul);   
				} else {
					$('<li><a href="' + identities[x].profileUrl  + '" target="_blank"><div class="icon ' + identities[x].spriteClass +  '"></div> <span class="icon-label">' + identities[x].domain + '</span></a></li>').appendTo(ul);
				}
			}
		} else if (identities === false) {
			$profile.html('Nothing found :(');
		} else {
			$profile.html('Loading...');
		}
		
		// position correctly
		var left = hn.identelem.offset().left + (hn.identelem.width()/2);
		var width = $('#profile-bubble').outerWidth()/2;
		
		$('#profile-bubble').css({
			display: 'block',
			position: 'absolute',
			top: hn.identelem.offset().top+20,
			left: left-width
		})
	},
	
	closeProfileBubble: function(ev){
	
		if (!$(ev.target).parents('#profile-bubble').length && ev.target != $('#profile-bubble')[0]) {
			$('#profile-bubble').fadeOut(200);
		}
	},
	
	filterStories: function(){
	
		$('td.title a').each(function(){
			var $row = $(this).parent().parent();
			var title = $(this).text();
		
			// check personal filters
			if (hn.checkFiltered(title)) {
				$row.hide();
				return;
			} else {
				$row.fadeIn();
			}
		});
	},
	
	parseStories: function(){
		
		$('td.title a:first-child').each(function(){
			var $title = $(this).parent();
			var $row = $title.parent();
			var $subtext = $row.next().find('.subtext');
			var domain = $('.comhead', $row).text().replace(/(\(|\))/g, '');
			var $score = $('span', $subtext).clone();
			var $comments = $('a[href^=item]', $subtext).clone();
			var $user = $('a[href^=user]', $subtext).clone();
			var time = $.trim($subtext.contents().filter(function(){ return(this.nodeType == 3); }).text().replace(/(by|\|)/gi, ''));
			
			// formatting	
			$score = ($score.outerHTML() || '').replace(/points?/i, '');
			$comments = ($comments.outerHTML() || '').replace(/comments?/i, '');

			// changes
			$('.comhead', $row).text(domain + ' by ').append($user);
			
			// append new meta
			$title.append('<ul class="meta">'+
			'<li class="comments">'+$comments+'</li>'+
			'<li class="points">'+$score+'</li>'+
			'<li class="time"><span>'+time+'</span></li>'+
			'</ul>');
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

(function($) {
  $.fn.outerHTML = function() {
    return $(this).clone().wrap('<div></div>').parent().html();
  }
})(jQuery);

$(hn.init);