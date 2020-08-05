const path = require('path');
const fs = require('fs');

var language_arr = ["tw","en"];
var temp_json = {};
var language_json = {}, advantage_name_json = {};

for(var idx in language_arr){
	var lang_token = language_arr[idx];
	// parse Language
	try{
		language_json[lang_token] = require("../lang/lang_"+lang_token+".json");
	}catch(e){
		console.error(e);
	}
	// parse advantage name
	/*
	if(lang_token==="en") continue;
	try{
		temp_json = require("../data/"+lang_token+"/advantages.json");
		advantage_name_json[lang_token] = {};
		for(var idx in temp_json.advantage){
			var key = temp_json.advantage[idx].name;
			var value = temp_json.advantage[idx].translate_name;
			advantage_name_json[lang_token][key] = value;
		}
	}catch(e){
	}*/
}

var js_file = "const LANG="+JSON.stringify(language_json)+";";
//js_file += "const LANG_ADVANTAGE="+JSON.stringify(advantage_name_json)+";";
const my_path = path.join("../lang/", "lang.bundle.js");
fs.writeFileSync(my_path, js_file, "utf8");

console.log("Bundle Lang.js");