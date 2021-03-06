"use strict";

window.onload = function load () {
	BookUtil.renderArea = $(`#pagecontent`);

	// render context Block
	BookUtil.renderArea.append(Renderer.utils.getBorderTr());
	BookUtil.renderArea.append(`<tr><td colspan="6" class="initial-message book-loading-message">Loading...</td></tr>`);
	BookUtil.renderArea.append(Renderer.utils.getBorderTr());

	// bind onChange Function
	window.onhashchange = BookUtil.booksHashChange;

	// Configure BookUtil settings
	BookUtil.contentObj = $("ul.contents");
	BookUtil.contentType = "document";
	
	if (window.location.hash.length) {
		BookUtil.booksHashChange();
	} else {
		window.location.hash = "#example";
	}
};

const HASH_TO_DATAFILE = {};
HASH_TO_DATAFILE["example"] = "example-doc.json";
HASH_TO_DATAFILE["licensing"] = "licensing.json";
HASH_TO_DATAFILE["getting_started"] = "section-0-getting-started.json";
HASH_TO_DATAFILE["building_pilots_and_mechs"] = "section-1-building-pilots-and-mechs.json";
HASH_TO_DATAFILE["missions_uptime_and_downtime"] = "section-2-missions-uptime-and-downtime.json";
HASH_TO_DATAFILE["mech_combat"] = "section-3-mech-combat.json";
HASH_TO_DATAFILE["compendium"] = "section-4-compendium.json";

const IS_LOCAL_TEST = false;
function getFakeData(){
return {};
}