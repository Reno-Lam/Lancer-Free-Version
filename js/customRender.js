//=================================
// Util expansion
//  Here you can add different page-data link
UrlUtil.PG_TO_RENDER_LOAD = function (page, success_func){
	switch(page){
		case "data-page.html": success_func(page, "example-data.json", "example-data"); break;
		default: return 1; 
	}
	return 0;
};
UrlUtil.PG_TO_RENDER_FUNC = function (page){
	switch(page){
		case "data-page.html": return Renderer.exampleData.getCompactRenderedString;
		default: return null; 
	}
};

//=================================
// Renderer expansion
// Here you can customize the display of each data
Renderer.general = {
	getTr: function(content){
		if(!content) return "";
		else 		 return `<tr><td colspan="8">${content}</td></tr>`;
	},
	getSignedNumber: function(number) {
	    return (number>=0? "+": "") + number;
	}

}
Renderer.exampleData = {
	getCompactRenderedString: function (entry) {
		const renderer = Renderer.get();
		var contentStack = [];
		renderer.recursiveRender({entries: entry.entries}, contentStack, {depth: 2});

		var combine_stack = [];
		
		return (`
			${Renderer.utils.getNameTr(entry)}
			${Renderer.general.getTr(entry.type)}
			${Renderer.utils.getDividerTr()}
			${Renderer.utils.getTextTr(contentStack.join(""))}
		`);
	},
};