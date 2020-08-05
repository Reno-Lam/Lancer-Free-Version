"use strict";

class LanguageParser {
	constructor () {
		this.currentLang = LanguageParser.LANG_TW;
		this.loadStyleFromCookie();
	}

	// Set Language
	setActiveLanguage (lang) {
		this.currentLang = lang;
		LanguageParser.createCookie(this.currentLang);
	}
	getActiveLanguage () {
		return this.currentLang;
	}

	loadStyleFromCookie () {
		this.cookie = LanguageParser.readCookie();
		this.cookie = this.cookie ? this.cookie : LanguageParser.LANG_TW;
		this.setActiveLanguage(this.cookie);
	}
	static createCookie (value) {
		LanguageParser.storage.setItem(LanguageParser.LANG_STORAGE, value);
	}
	static readCookie () {
		return LanguageParser.storage.getItem(LanguageParser.LANG_STORAGE);
	}
}

LanguageParser.LANG_STORAGE = "LanguageParser_lang";
LanguageParser.LANG_TW = "tw";
LanguageParser.LANG_EN = "en";

try {
	LanguageParser.storage = window.localStorage;
} catch (e) { // cookies are disabled
	LanguageParser.storage = {
		getItem () { return LanguageParser.LANG_TW;},
		setItem (k, v) {}
	}
}
const languageParser = new LanguageParser();
window.addEventListener("unload", function () {
	const title = languageParser.getActiveLanguage();
	LanguageParser.createCookie(title);
});

function FMT(key, ...parameter){
	var token = languageParser.getActiveLanguage();
	if(!LANG[token]) return key;
	if(!LANG[token][key]) return key;

	var text = LANG[token][key];
	if( typeof text === "string" ){
		for(var idx in parameter){
			text = text.replace("{"+idx+"}", FMT(parameter[idx]));
		}
	}
	else if( typeof text === "object" ){
		const renderer = Renderer.get();
		var introStack = [];
		renderer.recursiveRender( text, introStack, {depth: 0} );
		text = introStack.join("");
	}
	
	return text;
}
function parseAdvantageName(en_name){
	var token = languageParser.getActiveLanguage();
	if(!LANG_ADVANTAGE[token]) return en_name;
	if(!LANG_ADVANTAGE[token][en_name]) return en_name;
	return LANG_ADVANTAGE[token][en_name];
}