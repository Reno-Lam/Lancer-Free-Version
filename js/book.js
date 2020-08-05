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

const IS_LOCAL_TEST = false;
function getFakeData(){
return {};
}