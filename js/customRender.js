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
		case "talents.html": return Renderer.talent.getCompactRenderedString;
		default: return null; 
	}
};

//=================================
// Renderer expansion
// Here you can customize the {@type} renderer
Renderer._customTypeRender = function (type, entry, textStack, meta, options){
	switch(type){
		case "actionBlock": this._renderActionBlock(entry, textStack, meta, options); break;
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
							<div style="font-size:0.9em;font-weight:normal;margin-top:0.2em;">${[ entry.action , entry.frequency ].join(", ")}</div>
						</div>`;
		actionBlock += `<div class="actionBlock__trigger"> <b>${FMT("Trigger")}</b>: ${entry.trigger} </div>`;
		actionBlock += `<div class="actionBlock__content"> <b>${FMT("Effect")}</b>: ${entry.effect} </div>`;
	}
	textStack[0] += actionBlock;
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
Renderer.backgrounds = {
	getCompactRenderedString: function (entry) {

		return (`
			${Renderer.utils.getNameTr(entry)}
			${Renderer.general.getTr(entry.desc.map(text=>`<p>${text}</p>`).join(""))}
		`);
	}

};
Renderer.talent = {
	getCompactRenderedString: function (entry) {
		var abilityStack = entry.abilities.map(a=>Renderer.talent.getTalentAbilityBlock(a));

		return (`
			${Renderer.utils.getNameTr(entry)}
			${Renderer.general.getTr(entry.desc.map(text=>`<p><i>${text}</i></p>`).join(""))}
			${abilityStack.join("")}
		`);
	},
	getTalentAbilityBlock: function(ability) {
		var contentStack = [];
		const renderer = Renderer.get();
		renderer.recursiveRender({entries: ability.entries}, contentStack, {depth: 2});
		return (`
			${Renderer.utils.getEntryTitle("Lv "+ability.lvl+" - " + (ability.translate_name? ability.translate_name: ability.name))}
			${Renderer.utils.getTextTr(contentStack.join(""))}
		`);
	}

};

