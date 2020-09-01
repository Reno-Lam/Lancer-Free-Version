//=================================
// Util expansion
//  Here you can add different page-data link
UrlUtil.PG_TO_RENDER_LOAD = function (page, success_func){
	switch(page){
		case "data-page.html": success_func(page, "example-data.json", "example-data"); break;
		case "talents.html": success_func(page, "data-talents.json", "talent"); break;
		default: return 1; 
	}
	return 0;
};
UrlUtil.PG_TO_RENDER_FUNC = function (page){
	switch(page){
		case "data-page.html": return Renderer.exampleData.getCompactRenderedString;
		case "talents.html": return Renderer.ranked.getCompactRenderedString;
		default: return null; 
	}
};

//=================================
// Renderer expansion
// Here you can customize the {@type} renderer
Renderer._customTypeRender = function (type, entry, textStack, meta, options){
	switch(type){
		case "actionBlock": this._renderActionBlock(entry, textStack, meta, options); break;
		case "reactionBlock": this._renderReactionBlock(entry, textStack, meta, options); break;
	}
}
Renderer._renderActionBlock = function (entry, textStack, meta, options){
	const renderer = Renderer.get();
	var actionBlock = "";
	if (entry.name != null) {
		var name = entry.translate_name? entry.translate_name: entry.name;
		renderer._handleTrackTitles(entry.name);
		actionBlock += `<div class="actionBlock__title">
							<span class="rd__h--2-inset" style="font-size: 1.1em;" data-title-index="${renderer._headerIndex++}" ${renderer._getEnumeratedTitleRel(entry.name)}>
								<span class="entry-title-inner" book-idx="${entry.name.toLowerCase()}">
									${name}
								</span>
							</span>
							<div style="font-size:0.9em;font-weight:normal;margin-top:0.2em;">${ entry.tag }</div>
						</div>`;
		actionBlock += `<div class="actionBlock__entries"> ${entry.entries}</div>`;
		actionBlock += `<div class="actionBlock__desc"> <i>${entry.desc}</i> </div>`;
	}
	textStack[0] += actionBlock;
};

Renderer._renderReactionBlock = function (entry, textStack, meta, options){
	const renderer = Renderer.get();
	var reactionBlock = "";
	if (entry.name != null) {
		var name = entry.translate_name? entry.translate_name: entry.name;
		renderer._handleTrackTitles(entry.name);
		reactionBlock += `<div class="reactionBlock__title" style="background: #0B7675;color:#FFFFFF;">
							<span class="rd__h--2-inset" style="font-size: 1.1em;" data-title-index="${renderer._headerIndex++}" ${renderer._getEnumeratedTitleRel(entry.name)}>
								<span class="entry-title-inner" book-idx="${entry.name.toLowerCase()}">
									${name}
								</span>
							</span>
							<div style="font-size:0.9em;font-weight:normal;margin-top:0.2em;">${[ entry.action , entry.frequency ].join(FMT("separator"))}</div>
						</div>`;
		reactionBlock += `<div class="reactionBlock__trigger" style="background: #FFFFFF;color:#000000;"> <b>${FMT("Trigger")}</b>${entry.trigger} </div>`;
		reactionBlock += `<div class="reactionBlock__content" style="background: #E7F1F1;color:#000000;"> <b>${FMT("Effect")}</b>${entry.effect} </div>`;
	}
	textStack[0] += reactionBlock;
};


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
Renderer.generic = {
	getCompactRenderedString: function (entry) {
		const renderer = Renderer.get();
		var contentStack = [];
		renderer.recursiveRender({entries: entry.entries}, contentStack, {depth: 0});

		return (`
			${Renderer.utils.getNameTr(entry)}
			${Renderer.general.getTr(entry.tag)}
			${Renderer.utils.getDividerTr()}
			${Renderer.general.getTr(entry.desc.map(text=>`<p><i>${text}</i></p>`).join(""))}
			${Renderer.utils.getTextTr(contentStack.join(""))}
		`);
	}
};
Renderer.ranked = {
	getCompactRenderedString: function (entry) {
		var rankStack = entry.ranks.map(a=>Renderer.ranked.getRankBlock(a));

		return (`
			${Renderer.utils.getNameTr(entry)}
			${Renderer.general.getTr(entry.desc.map(text=>`<p><i>${text}</i></p>`).join(""))}
			${rankStack.join("")}
		`);
	},
	getRankBlock: function(rank) {
		var contentStack = [];
		const renderer = Renderer.get();
		renderer.recursiveRender({entries: rank.entries}, contentStack, {depth: 2});
		return (`
			${Renderer.utils.getEntryTitle("Lv "+rank.lvl+" - " + (rank.translate_name? rank.translate_name: rank.name))}
			${Renderer.utils.getTextTr(contentStack.join(""))}
		`);
	}

};

