var hn = {
	
	init: function(){
	
		hn.createFilterMenu();
		hn.parseStories();
		hn.bindEvents();
	},
	
	createFilterMenu: function(){
	
		$('.pagetop').last().append(' | <a class="filters">filters</a> <input id="add-filter" placeholder="Filter stories containing..." type="text" /><ul class="current-filters"></ul>');
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
			$(this).parent().remove();
		});
		
		$('#add-filter').keyup(function(ev){
			if (ev.keyCode == 13) {
				hn.addFilter($(this).val());
				$(this).val('');
				hn.refreshFilters();
			}
		});
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
		
		$('td.title a').each(function(){
			var $row = $(this).parent().parent();
			var $subtext = $row.next().find('.subtext');
			var domain = $('.comhead', $row).text().replace('(', '').replace(')', '');
			//var score = $('span', $subtext).text().replace(/points?/i, '');
			//var comments = $('a:last-child', $subtext).text().replace(/comments?/i, '');
						
			// changes
			$('.comhead', $row).text(domain);
			$row.append('<div class="meta" />');
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