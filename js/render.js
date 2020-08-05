// ************************************************************************* //
// Strict mode should not be used, as the roll20 script depends on this file //
// ************************************************************************* //

// ENTRY RENDERING =====================================================================================================
/*
 * // EXAMPLE USAGE //
 *
 * const entryRenderer = new Renderer();
 *
 * const topLevelEntry = mydata[0];
 * // prepare an array to hold the string we collect while recursing
 * const textStack = [];
 *
 * // recurse through the entry tree
 * entryRenderer.renderEntries(topLevelEntry, textStack);
 *
 * // render the final product by joining together all the collected strings
 * $("#myElement").html(toDisplay.join(""));
 */
function Renderer () {
	this.wrapperTag = "div";
	this.baseUrl = "";

	this._lazyImages = false;
	this._subVariant = false;
	this._firstSection = true;
	this._headerIndex = 1;
	this._tagExportDict = null;
	this._roll20Ids = null;
	this._trackTitles = {enabled: false, titles: {}};
	this._enumerateTitlesRel = {enabled: false, titles: {}};

	/**
	 * Enables/disables lazy-load image rendering.
	 * @param bool true to enable, false to disable.
	 */
	this.setLazyImages = function (bool) {
		this._lazyImages = !!bool;
		return this;
	};

	/**
	 * Set the tag used to group rendered elements
	 * @param tag to use
	 */
	this.setWrapperTag = function (tag) {
		this.wrapperTag = tag;
		return this;
	};

	/**
	 * Set the base url for rendered links.
	 * Usage: `renderer.setBaseUrl("https://www.example.com/")` (note the "http" prefix and "/" suffix)
	 * @param url to use
	 */
	this.setBaseUrl = function (url) {
		this.baseUrl = url;
		return this;
	};

	/**
	 * Other sections should be prefixed with a vertical divider
	 * @param bool
	 */
	this.setFirstSection = function (bool) {
		this._firstSection = bool;
		return this;
	};

	/**
	 * Headers are ID'd using the attribute `data-title-index` using an incrementing int. This resets it to 1.
	 */
	this.resetHeaderIndex = function () {
		this._headerIndex = 1;
		this._trackTitles.titles = {};
		this._enumerateTitlesRel.titles = {};
		return this;
	};

	/**
	 * Pass an object to have the renderer export lists of found @-tagged content during renders
	 *
	 * @param toObj the object to fill with exported data. Example results:
	 * 			{
	 *				commoner_mm: {page: "bestiary.html", source: "MM", hash: "commoner_mm"},
	 *				storm%20giant_mm: {page: "bestiary.html", source: "MM", hash: "storm%20giant_mm"},
 	 *				detect%20magic_phb: {page: "spells.html", source: "PHB", hash: "detect%20magic_phb"}
	 *			}
	 * 			These results intentionally match those used for hover windows, so can use the same cache/loading paths
	 */
	this.doExportTags = function (toObj) {
		this._tagExportDict = toObj;
		return this;
	};

	/**
	 * Reset/disable tag export
	 */
	this.resetExportTags = function () {
		this._tagExportDict = null;
		return this;
	};

	this.setRoll20Ids = function (roll20Ids) {
		this._roll20Ids = roll20Ids;
	};

	this.resetRoll20Ids = function () {
		this._roll20Ids = null;
	};

	/**
	 * If enabled, titles with the same name will be given numerical identifiers.
	 * This identifier is stored in `data-title-relative-index`
	 */
	this.setEnumerateTitlesRel = function (bool) {
		this._enumerateTitlesRel.enabled = bool;
		return this;
	};

	this._getEnumeratedTitleRel = function (name) {
		if (this._enumerateTitlesRel.enabled && name) {
			const clean = name.toLowerCase();
			this._enumerateTitlesRel.titles[clean] = this._enumerateTitlesRel.titles[clean] || 0;
			return `data-title-relative-index="${this._enumerateTitlesRel.titles[clean]++}"`;
		} else return "";
	};

	this.setTrackTitles = function (bool) {
		this._trackTitles.enabled = bool;
		return this;
	};

	this.getTrackedTitles = function () {
		return MiscUtil.copy(this._trackTitles.titles);
	};

	this._handleTrackTitles = function (name) {
		if (this._trackTitles.enabled) {
			this._trackTitles.titles[this._headerIndex] = name;
		}
	};

	/**
	 * Recursively walk down a tree of "entry" JSON items, adding to a stack of strings to be finally rendered to the
	 * page. Note that this function does _not_ actually do the rendering, see the example code above for how to display
	 * the result.
	 *
	 * @param entry An "entry" usually defined in JSON. A schema is available in tests/schema
	 * @param textStack A reference to an array, which will hold all our strings as we recurse
	 * @param meta Meta state.
	 * @param meta.depth The current recursion depth. Optional; default 0, or -1 for type "section" entries.
	 */
	this.recursiveRender = function (entry, textStack, meta) {
		// respect the API of the original, but set up for using string concatenations
		if (typeof entry === 'function') return ;
		if (textStack.length === 0) textStack[0] = "";
		else textStack.reverse();

		// initialise meta
		meta = meta || {};
		meta._typeStack = [];
		meta.depth = meta.depth == null ? 0 : meta.depth;

		this._recursiveRender(entry, textStack, meta);
		textStack.reverse();
	};

	/**
	 * Inner rendering code. Uses string concatenation instead of an array stack, for ~2x the speed.
	 * @param entry As above.
	 * @param textStack As above.
	 * @param meta As above, with the addition of...
	 * @param options
	 *          .prefix The (optional) prefix to be added to the textStack before whatever is added by the current call
	 *          .suffix The (optional) suffix to be added to the textStack after whatever is added by the current call
	 * @private
	 */
	this._recursiveRender = function (entry, textStack, meta, options) {
		if (!meta) throw new Error("Missing metadata!");
		if (entry.type === "section") meta.depth = -1;

		options = options || {};

		meta._didRenderPrefix = false;
		meta._didRenderSuffix = false;

		if (typeof entry === "object") {
			// the root entry (e.g. "Rage" in barbarian "classFeatures") is assumed to be of type "entries"
			const type = entry.type == null || entry.type === "section" ? "entries" : entry.type;

			meta._typeStack.push(type);

			switch (type) {
				// recursive
				case "entries": this._renderEntries(entry, textStack, meta, options); break;
				case "options": this._renderOptions(entry, textStack, meta, options); break;
				case "list": this._renderList(entry, textStack, meta, options); break;
				case "table": this._renderTable(entry, textStack, meta, options); break;
				case "tableGroup": this._renderTableGroup(entry, textStack, meta, options); break;
				case "inset": this._renderInset(entry, textStack, meta, options); break;
				case "insetResistCheck": this._renderInsetResistCheck(entry, textStack, meta, options); break;
				case "insetReadaloud": this._renderInsetReadaloud(entry, textStack, meta, options); break;
				case "variant": this._renderVariant(entry, textStack, meta, options); break;
				case "variantSub": this._renderVariantSub(entry, textStack, meta, options); break;
				case "quote": this._renderQuote(entry, textStack, meta, options); break;
				case "example": this._renderExample(entry, textStack, meta, options); break;
				case "modifier": this._renderModifier(entry, textStack, meta, options); break;
				case "actionBlock": this._renderActionBlock(entry, textStack, meta, options); break;
				case "optionBlock": this._renderOptionBlock(entry, textStack, meta, options); break;
				case "advantageRow": this._renderAdvantageRow(entry, textStack, meta, options); break;

				// block
				case "middleEnhance": this._renderMiddleEnhance(entry, textStack, meta, options); break;
				case "abilityGeneric": this._renderAbilityGeneric(entry, textStack, meta, options); break;

				// inline
				case "inline": this._renderInline(entry, textStack, meta, options); break;
				case "inlineBlock": this._renderInlineBlock(entry, textStack, meta, options); break;
				case "bonus": this._renderBonus(entry, textStack, meta, options); break;
				case "bonusSpeed": this._renderBonusSpeed(entry, textStack, meta, options); break;
				case "dice": this._renderDice(entry, textStack, meta, options); break;
				case "link": this._renderLink(entry, textStack, meta, options); break;
				case "actions": this._renderActions(entry, textStack, meta, options); break;
				case "attack": this._renderAttack(entry, textStack, meta, options); break;

				// list items
				case "item": this._renderItem(entry, textStack, meta, options); break;
				case "itemSub": this._renderItemSub(entry, textStack, meta, options); break;
				case "itemSpell": this._renderItemSpell(entry, textStack, meta, options); break;

				// entire data records
				case "dataCreature": this._renderDataCreature(entry, textStack, meta, options); break;
				case "dataSpell": this._renderDataSpell(entry, textStack, meta, options); break;

				// images
				case "image": this._renderImage(entry, textStack, meta, options); break;
				case "gallery": this._renderGallery(entry, textStack, meta, options); break;

				// homebrew changes
				case "homebrew": this._renderHomebrew(entry, textStack, meta, options); break;

				// misc
				case "code": this._renderCode(entry, textStack, meta, options); break;
				case "hr": this._renderHr(entry, textStack, meta, options); break;
			}

			meta._typeStack.pop();
		} else if (typeof entry === "string") { // block
			this._renderPrefix(entry, textStack, meta, options);
			this._renderString(entry, textStack, meta, options);
			this._renderSuffix(entry, textStack, meta, options);
		} else { // block
			// for ints or any other types which do not require specific rendering
			this._renderPrefix(entry, textStack, meta, options);
			textStack[0] += entry;
			this._renderSuffix(entry, textStack, meta, options);
		}
	};

	this._adjustDepth = function (meta, dDepth) {
		const cachedDepth = meta.depth;
		meta.depth += dDepth;
		meta.depth = Math.min(Math.max(-1, meta.depth), 2); // cap depth between -1 and 2 for general use
		return cachedDepth;
	};

	this._renderPrefix = function (entry, textStack, meta, options) {
		if (meta._didRenderPrefix) return;
		if (options.prefix != null) {
			textStack[0] += options.prefix;
			meta._didRenderPrefix = true;
		}
	};

	this._renderSuffix = function (entry, textStack, meta, options) {
		if (meta._didRenderSuffix) return;
		if (options.suffix != null) {
			textStack[0] += options.suffix;
			meta._didRenderSuffix = true;
		}
	};

	this._renderImage = function (entry, textStack, meta, options) {
		if (entry.imageType === "map") textStack[0] += `<div class="rd__wrp-map">`;
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<div class="${meta._typeStack.includes("gallery") ? "rd__wrp-gallery-image" : ""}">`;
		let href;
		if (entry.href.type === "internal") {
			const imgPart = `img/${entry.href.path}`;
			href = this.baseUrl !== "" ? `${this.baseUrl}${imgPart}` : UrlUtil.link(imgPart);
		} else if (entry.href.type === "external") {
			href = entry.href.url;
		}
		const svg = this._lazyImages && entry.width != null && entry.height != null
			? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${entry.width}" height="${entry.height}"><rect width="100%" height="100%" fill="#ccc3"/></svg>`)}`
			: null;
		textStack[0] += `<div class="rd__wrp-image"><a href="${href}" target="_blank" rel="noopener" ${entry.title ? `title="${entry.title}"` : ""}><img class="rd__image" src="${svg || href}" ${entry.altText ? `alt="${entry.altText}"` : ""} ${svg ? `data-src="${href}"` : ""}></a></div>`;
		if (entry.title) textStack[0] += `<div class="rd__image-title"><div class="rd__image-title-inner">${entry.title}</div></div>`;
		textStack[0] += `</div>`;
		this._renderSuffix(entry, textStack, meta, options);
		if (entry.imageType === "map") textStack[0] += `</div>`;
	};

	this._renderList_getListCssClasses = function (entry, textStack, meta, options) {
		const out = [`rd__list`];
		if (entry.style || entry.columns) {
			if (entry.style) out.push(...entry.style.split(" ").map(it => `rd__${it}`));
			if (entry.columns) out.push(`columns-${entry.columns}`);
		}
		return out.join(" ");
	};

	this._renderTableGroup = function (entry, textStack, meta, options) {
		const len = entry.tables.length;
		for (let i = 0; i < len; ++i) this._recursiveRender(entry.tables[i], textStack, meta);
	};

	this._renderTable = function (entry, textStack, meta, options) {
		// TODO add handling for rowLabel property
		if (entry.intro) {
			const len = entry.intro.length;
			for (let i = 0; i < len; ++i) {
				this._recursiveRender(entry.intro[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			}
		}

		textStack[0] += `<table class="${entry.style || "striped-odd"}">`;

		if (entry.caption != null) {
			textStack[0] += `<caption>${entry.caption}</caption>`;
		}
		textStack[0] += "<thead>";
		textStack[0] += "<tr>";

		const autoMkRoller = Renderer.isRollableTable(entry);
		if (entry.colLabels) {
			const len = entry.colLabels.length;
			for (let i = 0; i < len; ++i) {
				const lbl = entry.colLabels[i];
				textStack[0] += `<th ${this._renderTable_getTableThClassText(entry, i)}>`;
				this._recursiveRender(autoMkRoller && i === 0 && !lbl.includes("@dice") ? `{@dice ${lbl}}` : lbl, textStack, meta);
				textStack[0] += `</th>`;
			}
		}

		textStack[0] += "</tr>";
		textStack[0] += "</thead>";
		textStack[0] += "<tbody>";

		const len = entry.rows.length;
		for (let i = 0; i < len; ++i) {
			textStack[0] += "<tr>";
			const r = entry.rows[i];
			let roRender = r.type === "row" ? r.row : r;
			const len = roRender.length;
			for (let j = 0; j < len; ++j) {
				// preconvert rollables
				if (autoMkRoller && j === 0) roRender = Renderer.getRollableRow(roRender);

				let toRenderCell;
				if (roRender[j].type === "cell") {
					if (roRender[j].entry) {
						toRenderCell = roRender[j].entry;
					} else if (roRender[j].roll) {
						if (roRender[j].roll.entry) {
							toRenderCell = roRender[j].roll.entry;
						} else if (roRender[j].roll.exact != null) {
							toRenderCell = roRender[j].roll.pad ? StrUtil.padNumber(roRender[j].roll.exact, 2, "0") : roRender[j].roll.exact;
						} else {
							if (roRender[j].roll.max === Renderer.dice.POS_INFINITE) {
								toRenderCell = roRender[j].roll.pad ? `${StrUtil.padNumber(roRender[j].roll.min, 2, "0")}+` : `${roRender[j].roll.min}+`;
							} else {
								toRenderCell = roRender[j].roll.pad ? `${StrUtil.padNumber(roRender[j].roll.min, 2, "0")}-${StrUtil.padNumber(roRender[j].roll.max, 2, "0")}` : `${roRender[j].roll.min}-${roRender[j].roll.max}`;
							}
						}
					}
				} else {
					toRenderCell = roRender[j];
				}
				textStack[0] += `<td ${this._renderTable_makeTableTdClassText(entry, j)} ${this._renderTable_getCellDataStr(roRender[j])} ${roRender[j].width ? `colspan="${roRender[j].width}"` : ""}>`;
				if (r.style === "row-indent-first" && j === 0) textStack[0] += `<div class="rd__tab-indent"/>`;
				const cacheDepth = this._adjustDepth(meta, 1);
				this._recursiveRender(toRenderCell, textStack, meta);
				meta.depth = cacheDepth;
				textStack[0] += "</td>";
			}
			textStack[0] += "</tr>";
		}

		textStack[0] += "</tbody>";
		if (entry.footnotes != null) {
			textStack[0] += "<tfoot>";
			const len = entry.footnotes.length;
			for (let i = 0; i < len; ++i) {
				textStack[0] += `<tr><td colspan="99">`;
				const cacheDepth = this._adjustDepth(meta, 1);
				this._recursiveRender(entry.footnotes[i], textStack, meta);
				meta.depth = cacheDepth;
				textStack[0] += "</td></tr>";
			}
			textStack[0] += "</tfoot>";
		}
		textStack[0] += "</table>";

		if (entry.outro) {
			const len = entry.outro.length;
			for (let i = 0; i < len; ++i) {
				this._recursiveRender(entry.outro[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			}
		}
	};

	this._renderTable_getCellDataStr = function (ent) {
		function convertZeros (num) {
			if (num === 0) return 100;
			return num;
		}

		if (ent.roll) {
			return `data-roll-min="${convertZeros(ent.roll.exact != null ? ent.roll.exact : ent.roll.min)}" data-roll-max="${convertZeros(ent.roll.exact != null ? ent.roll.exact : ent.roll.max)}"`
		}

		return "";
	};

	this._renderTable_getTableThClassText = function (entry, i) {
		return entry.colStyles == null || i >= entry.colStyles.length ? "" : `class="${entry.colStyles[i]}"`;
	};

	this._renderTable_makeTableTdClassText = function (entry, i) {
		if (entry.rowStyles != null) return i >= entry.rowStyles.length ? "" : `class="${entry.rowStyles[i]}"`;
		else return this._renderTable_getTableThClassText(entry, i);
	};

	this._renderEntries = function (entry, textStack, meta, options) {
		this._renderEntriesSubtypes(entry, textStack, meta, options, true);
	};

	this._renderEntriesSubtypes = function (entry, textStack, meta, options, incDepth) {
		const isInlineTitle = meta.depth >= 2;
		const isBookPage = (window.location.pathname.split("/").pop().match(/^rules\.html/)!=null);
		const nextDepth = incDepth && meta.depth < 2 ? meta.depth + 1 : meta.depth;
		const styleString = this._renderEntriesSubtypes_getStyleString(entry, meta, isInlineTitle);
		const dataString = this._renderEntriesSubtypes_getDataString(entry);
		if (entry.name != null) this._handleTrackTitles(entry.name);

		const headerClass = `rd__h--${meta.depth + 1}`; // adjust as the CSS is 0..4 rather than -1..3

		const book_idx = `book-idx="${entry.idx_name ? entry.idx_name : entry.name}"`.toLowerCase();
		const display_name = entry.translate_name? entry.translate_name: entry.name;
		const quickLink = (isInlineTitle||!isBookPage)? "": `<span class='entryLink' title=${FMT("msg_copylink")}>🔗</span>`;
		const headerSpan = entry.name ? `<span class="rd__h ${headerClass}" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}> <span class="entry-title-inner" ${book_idx}><div>${this.render({type: "inline", entries: [display_name+quickLink]})}${isInlineTitle ? "." : ""}</div></span></span> ` : "";
		//${entry.translate_name ? (" <st style='font-size:80%;'>"+entry.name+"<st>") : ""}
		if (meta.depth === -1) {
			if (!this._firstSection) textStack[0] += `<hr class="rd__hr rd__hr--section">`;
			this._firstSection = false;
		}

		if (entry.entries || entry.name) {
			textStack[0] += `<${this.wrapperTag} ${dataString} ${styleString}>${headerSpan}`;
			this._renderEntriesSubtypes_renderPreReqText(entry, textStack, meta);
			if (entry.entries) {
				const cacheDepth = meta.depth;
				meta.depth = nextDepth;
				const len = entry.entries.length;
				for (let i = 0; i < len; ++i) this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
				meta.depth = cacheDepth;
			}
			textStack[0] += `</${this.wrapperTag}>`;
		}
	};

	this._renderEntriesSubtypes_getDataString = function (entry) {
		let dataString = "";
		if (entry.type === "optfeature" || entry.type === "patron") {
			const titleString = entry.source ? `title="Source: ${Parser.sourceJsonToFull(entry.source)}"` : "";
			if (entry.subclass != null) dataString = `${ATB_DATA_SC}="${entry.subclass.name}" ${ATB_DATA_SRC}="${Parser._getSourceStringFromSource(entry.subclass.source)}" ${titleString}`;
			else dataString = `${ATB_DATA_SC}="${Renderer.DATA_NONE}" ${ATB_DATA_SRC}="${Renderer.DATA_NONE}" ${titleString}`;
		}
		return dataString;
	};

	this._renderEntriesSubtypes_renderPreReqText = function (entry, textStack, meta) {
		if (entry.prerequisite) {
			textStack[0] += `<span class="prerequisite">Prerequisite: `;
			this._recursiveRender({type: "inline", entries: [entry.prerequisite]}, textStack, meta);
			textStack[0] += `</span>`;
		}
	};

	this._renderEntriesSubtypes_getStyleString = function (entry, meta, isInlineTitle) {
		const styleClasses = [];
		styleClasses.push(this._getStyleClass(entry.source));
		if (isInlineTitle) {
			if (this._subVariant) styleClasses.push(Renderer.HEAD_2_SUB_VARIANT);
			else styleClasses.push(Renderer.HEAD_2);
		} else styleClasses.push(meta.depth === -1 ? Renderer.HEAD_NEG_1 : meta.depth === 0 ? Renderer.HEAD_0 : Renderer.HEAD_1);
		if ((entry.type === "optfeature" || entry.type === "patron") && entry.subclass != null) styleClasses.push(CLSS_SUBCLASS_FEATURE);
		return styleClasses.length > 0 ? `class="${styleClasses.join(" ")}"` : "";
	};

	this._renderOptions = function (entry, textStack, meta, options) {
		if (entry.entries) {
			entry.entries = entry.entries.sort((a, b) => a.name && b.name ? SortUtil.ascSort(a.name, b.name) : a.name ? -1 : b.name ? 1 : 0);
			this._renderEntriesSubtypes(entry, textStack, meta, options, false);
		}
	};

	this._renderList = function (entry, textStack, meta, options) {
		if (entry.items) {
			if (entry.name) textStack[0] += `<p class="rd__list-name">${entry.name}</p>`;
			const cssClasses = this._renderList_getListCssClasses(entry, textStack, meta, options);
			textStack[0] += `<ul ${cssClasses ? `class="${cssClasses}"` : ""}>`;
			const len = entry.items.length;
			for (let i = 0; i < len; ++i) {
				const item = entry.items[i];
				const className = `${this._getStyleClass(item.source)}${item.type === "itemSpell" ? " rd__li-spell" : ""}`;
				textStack[0] += `<li ${className ? `class="${className}"` : ""}>`;
				const cacheDepth = this._adjustDepth(meta, 1);
				this._recursiveRender(entry.items[i], textStack, meta);
				meta.depth = cacheDepth;
				textStack[0] += "</li>";
			}
			textStack[0] += "</ul>";
		}
	};

	this._renderInset = function (entry, textStack, meta, options) {
		textStack[0] += `<${this.wrapperTag} class="rd__b-inset">`;
		if (entry.name != null) {
			var name = entry.translate_name? entry.translate_name: entry.name;
			this._handleTrackTitles(name);
			textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(name)} book-idx="${entry.name}"><span class="entry-title-inner">${name}</span></span>`;
		}
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			const cacheDepth = meta.depth;
			meta.depth = 2;
			this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			meta.depth = cacheDepth;
		}
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderInsetResistCheck = function (entry, textStack, meta, options) {
		textStack[0] += `<${this.wrapperTag} class="rd__b-inset rd__b-inset--readaloud">`;
		if (entry.name != null) {
			var name = entry.translate_name? entry.translate_name: entry.name;
			this._handleTrackTitles(name);
			textStack[0] += `<span class="rd__h rd__h--2" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(name)}><span class="entry-title-inner">${name}</span></span>`;
		}
		if (entry.func != null) {
			textStack[0] += `<span class="rd__h rd__h--2-inset"><span class="entry-title-inner">${entry.func}</span></span>`;
		}
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			const cacheDepth = meta.depth;
			meta.depth = 2;
			this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			meta.depth = cacheDepth;
		}
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderInsetReadaloud = function (entry, textStack, meta, options) {
		textStack[0] += `<${this.wrapperTag} class="rd__b-inset rd__b-inset--readaloud">`;
		if (entry.name != null) {
			var name = entry.translate_name? entry.translate_name: entry.name;
			this._handleTrackTitles(name);
			textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(name)}><span class="entry-title-inner">${name}</span></span>`;
		}
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			const cacheDepth = meta.depth;
			meta.depth = 2;
			this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			meta.depth = cacheDepth;
		}
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderVariant = function (entry, textStack, meta, options) {
		this._handleTrackTitles(entry.name);
		textStack[0] += `<${this.wrapperTag} class="rd__b-inset">`;
		textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><span class="entry-title-inner">變體：${entry.name}</span></span>`;
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			const cacheDepth = meta.depth;
			meta.depth = 2;
			this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			meta.depth = cacheDepth;
		}
		if (entry.variantSource) textStack[0] += Renderer.utils._getPageTrText(entry.variantSource);
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderVariantSub = function (entry, textStack, meta, options) {
		// pretend this is an inline-header'd entry, but set a flag so we know not to add bold
		this._subVariant = true;
		const fauxEntry = entry;
		fauxEntry.type = "entries";
		const cacheDepth = meta.depth;
		meta.depth = 3;
		this._recursiveRender(fauxEntry, textStack, meta, {prefix: "<p>", suffix: "</p>"});
		meta.depth = cacheDepth;
		this._subVariant = false;
	};

	this._renderQuote = function (entry, textStack, meta, options) {
		textStack[0] += `<p style="margin-left:10px;"><i>`;
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			this._recursiveRender(entry.entries[i], textStack, meta);
			if (i !== entry.entries.length - 1) textStack[0] += `<br>`;
			else textStack[0] += `</i>`;
		}
		if (entry.by) {
			const tempStack = [""];
			this._recursiveRender(entry.by, tempStack, meta);
			textStack[0] += `<span class="rd__quote-by">\u2014 ${tempStack.join("")}${entry.from ? `, <i>${entry.from}</i>` : ""}</span>`;
		}
		textStack[0] += `</p>`;
	};

	this._renderExample = function (entry, textStack, meta, options) {
		textStack[0] += `<p style="margin-left:10px;"><i>${FMT("example")}: `;
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			this._recursiveRender(entry.entries[i], textStack, meta);
			if (i !== entry.entries.length - 1) textStack[0] += `<br>`;
			else textStack[0] += `</i>`;
		}
		textStack[0] += `</p>`;
	};
	this._renderModifier = function (entry, textStack, meta, options){
		this._renderEntriesSubtypes(entry, textStack, meta, options, false);
	};

	this._renderActionBlock = function (entry, textStack, meta, options){
		textStack[0] += `<${this.wrapperTag} style="padding:5px 10px; margin:7px; margin-bottom:0px; border: 1px solid #656565; border-top: 2px solid; background-color: #652020">`;
		if (entry.name != null) {
			var name = entry.translate_name? entry.translate_name: entry.name;
			this._handleTrackTitles(entry.name);
			textStack[0] += `<span class="rd__h--2-inset" style="font-size: 1.1em;color:#ececec;" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><span class="entry-title-inner" book-idx="${entry.name.toLowerCase()}">${name}</span>`;
			if (entry.subtitle != null){
				textStack[0] += `<span style="font-size: 1.1em;color:#ececec;float: right;">${entry.subtitle}</span>`;
			}
			textStack[0] += `</span></${this.wrapperTag}>`;
			textStack[0] += `<${this.wrapperTag} style="padding:5px 10px; margin:7px;margin-top:0px; border: 1px solid #656565; border-bottom: 2px solid">`;
		}
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			const cacheDepth = meta.depth;
			meta.depth = 2;
			this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			meta.depth = cacheDepth;
		}
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderOptionBlock = function (entry, textStack, meta, options){
		if(!entry.noTitle){
			textStack[0] += `<${this.wrapperTag} style="padding:5px 10px; margin:7px; margin-bottom:0px; border: 1px solid #656565; background-color: #652020">`;
			textStack[0] += `<span class="rd__h--2-inset" style="font-size: 1.1em;color:#ececec;"><span class="entry-title-inner">${FMT("options")}</span>`;
			textStack[0] += `</span></${this.wrapperTag}>`;
		}
		textStack[0] += `<${this.wrapperTag} style="padding:5px 10px; margin:7px;margin-top:0px; border: 1px solid #656565;">`;
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) {
			const cacheDepth = meta.depth;
			meta.depth = 2;
			this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
			meta.depth = cacheDepth;
		}
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderAdvantageRow = function (entry, textStack, meta, options){
		var advantageRowStack = [];
		for(let i=0; i<entry.advantages.length; i++){
			var advantage = entry.advantages[i];
        	var ref_name = advantage.ref_name? advantage.ref_name: advantage.name;
            var display_name = (advantage.display_name? advantage.display_name: parseAdvantageName(advantage.name)) + (advantage.suboption? (": "+advantage.suboption): "");
            var string = `{@advantage ${ref_name}|${display_name}${advantage.rank?" "+advantage.rank:""}}`;

            var advantageStack = [];
            this.recursiveRender(string, advantageStack, null);
            advantageRowStack.push(`<span class="abilityTab">${advantageStack.join("")}</span>`);
        }
		textStack[0] += "<div style='line-height:2;'>"+advantageRowStack.join("")+"</div>";
	}

	this._renderMiddleEnhance = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<div class='text-align-center'><h4>${entry.text}</h3></div>`;
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderAbilityGeneric = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<div class='text-align-center'>${entry.name ? `<b>${entry.name}</b>  = ` : ""}${entry.text}${entry.attributes ? ` ${Parser.attrChooseToFull(entry.attributes)}` : ""}</div>`;
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderInline = function (entry, textStack, meta, options) {
		if (entry.entries) {
			const len = entry.entries.length;
			for (let i = 0; i < len; ++i) this._recursiveRender(entry.entries[i], textStack, meta);
		}
	};

	this._renderInlineBlock = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		if (entry.entries) {
			const len = entry.entries.length;
			for (let i = 0; i < len; ++i) this._recursiveRender(entry.entries[i], textStack, meta);
		}
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderBonus = function (entry, textStack, meta, options) {
		textStack[0] += (entry.value < 0 ? "" : "+") + entry.value;
	};

	this._renderBonusSpeed = function (entry, textStack, meta, options) {
		textStack[0] += (entry.value < 0 ? "" : "+") + entry.value + " ft.";
	};

	this._renderDice = function (entry, textStack, meta, options) {
		textStack[0] += Renderer.getEntryDice(entry, entry.name);
	};

	this._renderActions = function (entry, textStack, meta, options) {
		this._handleTrackTitles(entry.name);
		textStack[0] += `<${this.wrapperTag} class="${Renderer.HEAD_2}"><span class="rd__h rd__h--3" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><span class="entry-title-inner">${entry.name}.</span></span> `;
		const len = entry.entries.length;
		for (let i = 0; i < len; ++i) this._recursiveRender(entry.entries[i], textStack, meta, {prefix: "<p>", suffix: "</p>"});
		textStack[0] += `</${this.wrapperTag}>`;
	};

	this._renderAttack = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<i>${Parser.attackTypeToFull(entry.attackType)}:</i> `;
		const len = entry.attackEntries.length;
		for (let i = 0; i < len; ++i) this._recursiveRender(entry.attackEntries[i], textStack, meta);
		textStack[0] += ` <i>Hit:</i> `;
		const len2 = entry.hitEntries.length;
		for (let i = 0; i < len2; ++i) this._recursiveRender(entry.hitEntries[i], textStack, meta);
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderItem = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<p><span class="bold list-item-title">${this.render(entry.name)}</span> `;
		if (entry.entry) this._recursiveRender(entry.entry, textStack, meta);
		else if (entry.entries) {
			const len = entry.entries.length;
			for (let i = 0; i < len; ++i) this._recursiveRender(entry.entries[i], textStack, meta, {prefix: i > 0 ? `<span class="rd__p-cont-indent">` : "", suffix: i > 0 ? "</span>" : ""});
		}
		textStack[0] += "</p>";
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderItemSub = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		this._recursiveRender(entry.entry, textStack, meta, {prefix: `<p><span class="italic list-item-title">${entry.name}</span> `, suffix: "</p>"});
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderItemSpell = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		this._recursiveRender(entry.entry, textStack, meta, {prefix: `<p>${entry.name} `, suffix: "</p>"});
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderDataCreature = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<table class="rd__b-data">`;
		textStack[0] += `<thead><tr><th class="rd__data-embed-header" colspan="6" onclick="((ele) => {
						$(ele).find('.rd__data-embed-name').toggle(); 
						$(ele).find('.rd__data-embed-toggle').text($(ele).text().includes('+') ? '[\u2013]' : '[+]'); 
						$(ele).closest('table').find('tbody').toggle()
					})(this)"><span style="display: none;" class="rd__data-embed-name">${entry.dataCreature.name}</span><span class="rd__data-embed-toggle">[\u2013]</span></th></tr></thead><tbody>`;
		textStack[0] += Renderer.monster.getCompactRenderedString(entry.dataCreature, this);
		textStack[0] += `</tbody></table>`;
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderDataSpell = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<table class="rd__b-data">`;
		textStack[0] += `<thead><tr><th class="rd__data-embed-header" colspan="6" onclick="((ele) => {
						$(ele).find('.rd__data-embed-name').toggle(); 
						$(ele).find('.rd__data-embed-toggle').text($(ele).text().includes('+') ? '[\u2013]' : '[+]'); 
						$(ele).closest('table').find('tbody').toggle()
					})(this)"><span style="display: none;" class="rd__data-embed-name">${entry.dataSpell.name}</span><span class="rd__data-embed-toggle">[\u2013]</span></th></tr></thead><tbody>`;
		textStack[0] += Renderer.spell.getCompactRenderedString(entry.dataSpell, this);
		textStack[0] += `</tbody></table>`;
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderGallery = function (entry, textStack, meta, options) {
		textStack[0] += `<div class="rd__wrp-gallery">`;
		const len = entry.images.length;
		for (let i = 0; i < len; ++i) {
			const img = MiscUtil.copy(entry.images[i]);
			delete img.imageType;
			this._recursiveRender(img, textStack, meta);
		}
		textStack[0] += `</div>`;
	};

	this._renderHomebrew = function (entry, textStack, meta, options) {
		this._renderPrefix(entry, textStack, meta, options);
		textStack[0] += `<div class="homebrew-section">`;
		if (entry.oldEntries) {
			const mouseOver = Renderer.hover.createOnMouseHover(entry.oldEntries);
			let markerText;
			if (entry.movedTo) {
				markerText = "(See moved content)";
			} else if (entry.entries) {
				markerText = "(See replaced content)";
			} else {
				markerText = "(See removed content)";
			}
			textStack[0] += `<span class="homebrew-old-content" href="#${window.location.hash}" ${mouseOver}>${markerText}</span>`;
		}

		textStack[0] += `<span class="homebrew-notice"></span>`;

		if (entry.entries) {
			const len = entry.entries.length;
			for (let i = 0; i < len; ++i) this._recursiveRender(entry.entries[i], textStack, meta)
		} else if (entry.movedTo) {
			textStack[0] += `<i>This content has been moved to ${entry.movedTo}.</i>`;
		} else {
			textStack[0] += "<i>This content has been deleted.</i>";
		}

		textStack[0] += `</div>`;
		this._renderSuffix(entry, textStack, meta, options);
	};

	this._renderCode = function (entry, textStack, meta, options) {
		textStack[0] += `<button class="btn btn-default btn-xs mb-1" onclick="{const $e = $(this).next('pre'); MiscUtil.pCopyTextToClipboard($e.text());JqueryUtil.showCopiedEffect($e)}">Copy Code</button>
			<pre>${entry.preformatted}</pre>
		`;
	};

	this._renderHr = function (entry, textStack, meta, options) {
		textStack[0] += `<hr class="rd__hr">`;
	};

	this._getStyleClass = function (source) {
		const outList = [];
		//if (SourceUtil.isNonstandardSource(source)) outList.push(CLSS_NON_STANDARD_SOURCE);
		//if (BrewUtil.hasSourceJson(source)) outList.push(CLSS_HOMEBREW_SOURCE);
		return outList.join(" ");
	};

	this._renderString = async function (entry, textStack, meta, options) {
		const tagSplit = Renderer.splitByTags(entry);
		const len = tagSplit.length;
		for (let i = 0; i < len; ++i) {
			const s = tagSplit[i];
			if (!s) continue;
			if (s[0] === "@") {
				const [tag, text] = Renderer.splitFirstSpace(s);

				switch (tag) {
					// BASIC STYLES/TEXT ///////////////////////////////////////////////////////////////////////////////
					case "@b":
					case "@bold":
						textStack[0] += `<b>`;
						this._recursiveRender(text, textStack, meta);
						textStack[0] += `</b>`;
						break;
					case "@i":
					case "@italic":
						textStack[0] += `<i>`;
						this._recursiveRender(text, textStack, meta);
						textStack[0] += `</i>`;
						break;
					case "@s":
					case "@strike":
						textStack[0] += `<s>`;
						this._recursiveRender(text, textStack, meta);
						textStack[0] += `</s>`;
						break;
					case "@note":
						textStack[0] += `<i class="text-muted">`;
						this._recursiveRender(text, textStack, meta);
						textStack[0] += `</i>`;
						break;

					// DICE ////////////////////////////////////////////////////////////////////////////////////////////
					case "@dice":
					case "@damage":
					case "@hit":
					case "@d20":
					case "@chance":
					case "@recharge": {
						const fauxEntry = {
							type: "dice",
							rollable: true
						};
						const [rollText, displayText, name, ...others] = text.split("|");
						if (displayText) fauxEntry.displayText = displayText;
						if (name) fauxEntry.name = name;

						switch (tag) {
							case "@dice": {
								// format: {@dice 1d2 + 3 + 4d5 - 6}
								fauxEntry.toRoll = rollText;
								if (!displayText && rollText.includes(";")) fauxEntry.displayText = rollText.replace(/;/g, "/");
								if ((!fauxEntry.displayText && rollText.includes("#$")) || (fauxEntry.displayText && fauxEntry.displayText.includes("#$"))) fauxEntry.displayText = (fauxEntry.displayText || rollText).replace(/#\$prompt_number[^$]*\$#/g, "(n)");
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							}
							case "@damage": {
								fauxEntry.toRoll = rollText;
								fauxEntry.subType = "damage";
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							}
							case "@d20":
							case "@hit": {
								// format: {@hit +1} or {@hit -2}
								const n = Number(rollText);
								const mod = `${n >= 0 ? "+" : ""}${n}`;
								fauxEntry.displayText = fauxEntry.displayText || mod;
								fauxEntry.toRoll = `1d20${mod}`;
								fauxEntry.subType = "d20";
								fauxEntry.d20mod = mod;
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							}
							case "@chance": {
								// format: {@chance 25|display text|rollbox rollee name}
								fauxEntry.toRoll = `1d100`;
								fauxEntry.successThresh = Number(rollText);
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							}
							case "@recharge": {
								// format: {@recharge 4}
								fauxEntry.toRoll = "1d6";
								const asNum = Number(rollText || 6);
								fauxEntry.successThresh = 7 - asNum;
								fauxEntry.successMax = 6;
								textStack[0] += `（充能 `;
								fauxEntry.displayText = `${asNum}${asNum < 6 ? `\u20136` : ""}`;
								this._recursiveRender(fauxEntry, textStack, meta);
								textStack[0] += `）`;
								break;
							}
						}

						break;
					}

					// SCALE DICE //////////////////////////////////////////////////////////////////////////////////////
					case "@scaledice": {
						// format: {@scaledice 2d6;3d6|2-8,9|1d6}
						const [baseRoll, progression, addPerProgress] = text.split("|");
						const progressionParse = MiscUtil.parseNumberRange(progression, 1, 9);
						const baseLevel = Math.min(...progressionParse);
						const options = {};
						const isMultableDice = /^(\d+)d(\d+)$/i.exec(addPerProgress);

						const getSpacing = () => {
							let diff = null;
							const sorted = [...progressionParse].sort(SortUtil.ascSort);
							for (let i = 1; i < sorted.length; ++i) {
								const prev = sorted[i - 1];
								const curr = sorted[i];
								if (diff == null) diff = curr - prev;
								else if (curr - prev !== diff) return null;
							}
							return diff;
						};

						const spacing = getSpacing();
						progressionParse.forEach(k => {
							const offset = k - baseLevel;
							if (isMultableDice && spacing != null) {
								options[k] = offset ? `${Number(isMultableDice[1]) * (offset / spacing)}d${isMultableDice[2]}` : "";
							} else {
								options[k] = offset ? [...new Array(Math.floor(offset / spacing))].map(_ => addPerProgress).join("+") : "";
							}
						});

						const fauxEntry = {
							type: "dice",
							rollable: true,
							toRoll: baseRoll,
							displayText: addPerProgress,
							prompt: {
								entry: "Cast at...",
								options
							}
						};
						this._recursiveRender(fauxEntry, textStack, meta);

						break;
					}

					// LINKS ///////////////////////////////////////////////////////////////////////////////////////////
					case "@filter": {
						// format: {@filter Warlock Spells|spells|level=1;2|class=Warlock}
						const [displayText, page, ...filters] = text.split("|");

						const fauxEntry = {
							type: "link",
							text: displayText,
							href: {
								type: "internal",
								path: `${page}.html`,
								hash: HASH_BLANK,
								subhashes: filters.map(f => {
									const [fname, fvals, fopts] = f.split("=").map(s => s.trim()).filter(s => s);
									const out = {
										key: `filter${fname}`,
										value: fvals.split(";").map(s => s.trim()).filter(s => s).join(HASH_SUB_LIST_SEP)
									};
									if (fopts && fopts === "&") {
										return [out, {
											key: `flmeta${fname}`,
											value: `and${HASH_SUB_LIST_SEP}or`
										}];
									}
									return out;
								}).flat()
							}
						};
						this._recursiveRender(fauxEntry, textStack, meta);

						break;
					}
					case "@link": {
						const [displayText, url] = text.split("|");
						let outUrl = url == null ? displayText : url;
						if (!outUrl.startsWith("http")) outUrl = `http://${outUrl}`; // avoid HTTPS, as the D&D homepage doesn't support it
						const fauxEntry = {
							type: "link",
							href: {
								type: "external",
								url: outUrl
							},
							text: displayText
						};
						this._recursiveRender(fauxEntry, textStack, meta);

						break;
					}
					case "@5etools": {
						const [displayText, page, hash] = text.split("|");
						const fauxEntry = {
							type: "link",
							href: {
								type: "internal",
								path: page
							},
							text: displayText
						};
						if (hash) {
							fauxEntry.hash = hash;
							fauxEntry.hashPreEncoded = true;
						}
						this._recursiveRender(fauxEntry, textStack, meta);

						break;
					}

					// OTHER HOVERABLES ////////////////////////////////////////////////////////////////////////////////
					case "@footnote": {
						const [displayText, footnoteText, optTitle] = text.split("|");
						const onMouseOver = Renderer.hover.createOnMouseHover([footnoteText, optTitle ? `{@note ${optTitle}}` : ""].filter(Boolean));
						textStack[0] += `<span class="help" ${onMouseOver}>`;
						this._recursiveRender(displayText, textStack, meta);
						textStack[0] += `</span>`;

						break;
					}
					case "@homebrew": {
						const [newText, oldText] = text.split("|");
						const tooltip = [];
						if (newText && oldText) {
							tooltip.push("<strong>This is a homebrew addition, replacing the following:</strong>");
						} else if (newText) {
							tooltip.push("<strong>This is a homebrew addition.</strong>")
						} else if (oldText) {
							tooltip.push("<strong>The following text has been removed with this homebrew:</strong>")
						}
						if (oldText) {
							tooltip.push(oldText);
						}
						const onMouseOver = Renderer.hover.createOnMouseHover(tooltip);
						textStack[0] += `<span class="homebrew-inline" ${onMouseOver}>`;
						this._recursiveRender(newText || "[...]", textStack, meta);
						textStack[0] += `</span>`;

						break;
					}
					case "@action":
					case "@sense": {
						const expander = (() => {
							switch (tag) {
								case "@action": return Parser.actionToExplanation;
								case "@sense": return Parser.senseToExplanation;
							}
						})();
						const [name, displayText] = text.split("|");
						const onMouseOver = Renderer.hover.createOnMouseHover(expander(name), name);
						textStack[0] += `<span class="help--hover" ${onMouseOver}>${displayText || name}</span>`;

						break;
					}
					case "@area": {
						const [areaCode, flags, displayText, ...others] = text.split("|");
						const splCode = areaCode.split(">"); // use pos [0] for names without ">"s, and pos [1] for names with (as pos [2] is for sequence ID)
						const renderText = displayText || `${flags && flags.includes("u") ? "A" : "a"}rea ${splCode.length === 1 ? splCode[0] : splCode[1]}`;
						if (typeof BookUtil === "undefined") { // for the roll20 script
							textStack[0] += renderText;
						} else {
							const area = BookUtil.curRender.headerMap[areaCode] || {entry: {name: ""}}; // default to prevent rendering crash on bad tag
							const onMouseOver = Renderer.hover.createOnMouseHoverEntry(area.entry, true);
							textStack[0] += `<a href="#${BookUtil.curRender.curBookId},${area.chapter},${UrlUtil.encodeForHash(area.entry.name)}" ${onMouseOver} onclick="BookUtil.handleReNav(this)">${renderText}</a>`;
						}

						break;
					}

					// CONTENT TAGS ////////////////////////////////////////////////////////////////////////////////////
					case "@rule": {
						// format: {@tag Display Text|DMG< |chapter< |section >< |number > >}
						const page = "rules.html";
						const [displayText, book, chapter, section, number] = text.split("|");
						const hash = `${book}${chapter ? `${HASH_PART_SEP}${chapter}${section ? `${HASH_PART_SEP}${UrlUtil.encodeForHash(section)}${number != null ? `${HASH_PART_SEP}${UrlUtil.encodeForHash(number)}` : ""}` : ""}` : ""}`;
						const fauxEntry = {
							type: "link",
							href: {
								type: "internal",
								path: page,
								hash,
								hashPreEncoded: true
							},
							text: displayText
						};
						this._recursiveRender(fauxEntry, textStack, meta);

						break;
					}

					default: {
						const [name, displayText, ...others] = text.split("|");
						const hash = name;

						const fauxEntry = {
							type: "link",
							href: {
								type: "internal",
								hash
							},
							text: (displayText || name)
						};
						switch (tag) {
							case "@advantage":
								fauxEntry.href.path = "advantages.html";
								fauxEntry.href.hover = {
									page: "advantages.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							case "@condition":
								fauxEntry.href.path = "conditions.html";
								fauxEntry.href.hover = {
									page: "conditions.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							case "@effect":
								fauxEntry.href.path = "powereffects.html";
								fauxEntry.href.hover = {
									page: "powereffects.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							case "@samplepower":
								fauxEntry.href.path = "samplepowers.html";
								fauxEntry.href.hover = {
									page: "samplepowers.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							case "@skill":
								fauxEntry.href.path = "skills.html";
								fauxEntry.href.hover = {
									page: "skills.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							case "@modifier":
								fauxEntry.href.path = "modifiers.html";
								fauxEntry.href.hover = {
									page: "modifiers.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
							case "@archetype":
								fauxEntry.href.path = "archetypes.html";
								fauxEntry.href.hover = {
									page: "archetypes.html"
								};
								this._recursiveRender(fauxEntry, textStack, meta);
								break;
						}

						break;
					}
				}
			} else textStack[0] += s;
		}
	};

	this._renderLink = function (entry, textStack, meta, options) {
		let href;
		if (entry.href.type === "internal") {
			// baseURL is blank by default
			href = `${this.baseUrl}${entry.href.path}#`;
			if (entry.href.hash != null) {
				href += entry.href.hashPreEncoded ? entry.href.hash : UrlUtil.encodeForHash(entry.href.hash);
			}
			if (entry.href.subhashes != null) {
				for (let i = 0; i < entry.href.subhashes.length; ++i) {
					const subHash = entry.href.subhashes[i];
					href += `${HASH_PART_SEP}${UrlUtil.encodeForHash(subHash.key)}${HASH_SUB_KV_SEP}`;
					if (subHash.value != null) {
						href += UrlUtil.encodeForHash(subHash.value);
					} else {
						// TODO allow list of values
						href += subHash.values.map(v => UrlUtil.encodeForHash(v)).join(HASH_SUB_LIST_SEP);
					}
				}
			}
		} else if (entry.href.type === "external") {
			href = entry.href.url;
		}

		textStack[0] += `<a href="${href}" ${entry.href.type === "internal" ? "" : `target="_blank" rel="noopener"`} ${this._renderLink_getHoverString(entry)}>${this.render(entry.text)}</a>`;
	};

	this._renderLink_getHoverString = function (entry) {
		if (!entry.href.hover) return "";
		const procHash = UrlUtil.encodeForHash(entry.href.hash).replace(/'/g, "\\'");
		if (this._tagExportDict) {
			this._tagExportDict[procHash] = {
				page: entry.href.hover.page,
				source: entry.href.hover.source,
				hash: procHash
			};
		}
		return `onmouseover="Renderer.hover.mouseOver(event, this, '${entry.href.hover.page}', '${entry.href.hover.source}', '${procHash}', false, ${entry.href.hover.prelodId ? `'${entry.href.hover.prelodId}'` : "null"})" ${Renderer.hover._getPreventTouchString()}`;
	};

	/**
	 * Helper function to render an entity using this renderer
	 * @param entry
	 * @param depth
	 * @returns {string}
	 */
	this.render = function (entry, depth = 0) {
		const tempStack = [];
		this.recursiveRender(entry, tempStack, {depth});
		return tempStack.join("");
	};
}

Renderer.applyProperties = function (entry, object) {
	const propSplit = Renderer.splitByPropertyInjectors(entry);
	const len = propSplit.length;
	if (len === 1) return entry;

	let textStack = "";

	for (let i = 0; i < len; ++i) {
		const s = propSplit[i];
		if (!s) continue;
		if (s[0] === "=") {
			const [path, modifiers] = s.substring(1).split("/");
			let fromProp = object[path];

			if (modifiers) {
				for (const modifier of modifiers) {
					switch (modifier) {
						case "a": // render "a"/"an" depending on prop value
							fromProp = Renderer.applyProperties._leadingAn.has(fromProp[0].toLowerCase()) ? "an" : "a";
							break;

						case "l": fromProp = fromProp.toLowerCase(); break; // convert text to lower case
						case "t": fromProp = fromProp.toTitleCase(); break; // title-case text
						case "u": fromProp = fromProp.toUpperCase(); break; // uppercase text
					}
				}
			}
			textStack += fromProp;
		} else textStack += s;
	}

	return textStack;
};
Renderer.applyProperties._leadingAn = new Set(["a", "e", "i", "o", "u"]);

Renderer.splitFirstSpace = function (string) {
	const firstIndex = string.indexOf(" ");
	return firstIndex === -1 ? [string, ""] : [string.substr(0, firstIndex), string.substr(firstIndex + 1)];
};

Renderer._splitByTagsBase = function (leadingCharacter) {
	return function (string) {
		let tagDepth = 0;
		let char, char2;
		const out = [];
		let curStr = "";

		const len = string.length;
		for (let i = 0; i < len; ++i) {
			char = string[i];
			char2 = string[i + 1];

			switch (char) {
				case "{":
					if (char2 === leadingCharacter) {
						if (tagDepth++ > 0) {
							curStr += "{";
						} else {
							out.push(curStr);
							curStr = "";
						}
					} else curStr += "{";
					break;

				case "}":
					if (tagDepth === 0) {
						curStr += "}";
					} else if (--tagDepth === 0) {
						out.push(curStr);
						curStr = "";
					} else curStr += "}";
					break;

				default: curStr += char; break;
			}
		}

		if (curStr) out.push(curStr);

		return out;
	}
};

Renderer.splitByTags = Renderer._splitByTagsBase("@");
Renderer.splitByPropertyInjectors = Renderer._splitByTagsBase("=");

Renderer.getEntryDice = function (entry, name) {
	function legacyDiceToString (array) {
		let stack = "";
		array.forEach(r => {
			stack += `${r.neg ? "-" : stack === "" ? "" : "+"}${r.number || 1}d${r.faces}${r.mod ? r.mod > 0 ? `+${r.mod}` : r.mod : ""}`
		});
		return stack;
	}

	function getDiceAsStr () {
		if (entry.successThresh) return `${entry.successThresh}％`;
		else if (typeof entry.toRoll === "string") return entry.toRoll;
		else {
			// handle legacy format
			return legacyDiceToString(entry.toRoll)
		}
	}

	function pack (obj) {
		return `'${JSON.stringify(obj).escapeQuotes()}'`;
	}

	const toDisplay = entry.displayText ? entry.displayText : getDiceAsStr();

	if (entry.rollable === true) {
		const toPack = MiscUtil.copy(entry);
		if (typeof toPack.toRoll !== "string") {
			// handle legacy format
			toPack.toRoll = legacyDiceToString(toPack.toRoll);
		}

		return `<span class='roller render-roller' title="${name ? `${name.escapeQuotes()}` : ""}" onmousedown="event.preventDefault()" onclick="Renderer.dice.rollerClickUseData(event, this)" data-packed-dice=${pack(toPack)}>${toDisplay}</span>`;
	} else return toDisplay;
};

Renderer.utils = {
	getTr: (content, style) => {
		return (content)? `<tr><td colspan="8" ${style? ("style=\""+style+"\""): ""}>${content}</td></tr>`: "";
	},

	getTextTr: (content) => {
		return (content)? `<tr class='text'><td colspan="8">${content}</td></tr>`: "";
	},

	getBorderTr: (optText) => {
		return `<tr><th class="border" colspan="8">${optText || ""}</th></tr>`;
	},

	getDividerTr: () => {
		return `<tr><td class="divider" colspan="8"><div></div></td></tr>`;
	},

	getSourceSubText (it) {
		return it.sourceSub ? ` \u2014 ${it.sourceSub}` : "";
	},

	getNameTr: (it, addPageNum, prefix, suffix) => {
		return `<tr>
					<th class="rnd-name name" colspan="8">
						<div class="name-inner">
							<span><b class="stats-name copyable" onmousedown="event.preventDefault()" onclick="Renderer.utils._pHandleNameClick(this, null)">${prefix || ""}${it.translate_name? it.translate_name: it.name}${suffix || ""}</b>${it.translate_name? " <st style='font-size:80%;'>"+it.name+"<st>": ""}</span>
						</div>
					</th>
				</tr>`;
	},

	getEntryTitle: (title) => {
		return `<tr><td colspan="8" class="mon__stat-header-underline"><span class="mon__sect-header-inner">${title}</span></td></tr>`;
	},

	async _pHandleNameClick (ele) {
		await MiscUtil.pCopyTextToClipboard($(ele).text());
		JqueryUtil.showCopiedEffect($(ele));
	},

	getPageTr: (it) => {
		return `<td colspan=8>${Renderer.utils._getPageTrText(it)}</td>`;
	},

	getAbilityRoller (statblock, ability) {
		const mod = Parser.getAbilityModifier(statblock[ability]);
		return Renderer.get().render(`{@d20 ${mod}|${statblock[ability]} (${mod})|${Parser.attAbvToFull(ability)}`);
	},

	tabButton: (label, funcChange, funcPopulate) => {
		return {
			label: label,
			funcChange: funcChange,
			funcPopulate: funcPopulate
		};
	},

	_tabs: {},
	_curTab: null,
	_prevTab: null,
	bindTabButtons: (...tabButtons) => {
		Renderer.utils._tabs = {};
		Renderer.utils._prevTab = Renderer.utils._curTab;
		Renderer.utils._curTab = null;

		const $content = $("#pagecontent");
		const $wrpTab = $(`#stat-tabs`);

		$wrpTab.find(`.stat-tab-gen`).remove();

		let initialTab = null;
		const toAdd = tabButtons.map((tb, i) => {
			const toSel = (!Renderer.utils._prevTab && i === 0) || (Renderer.utils._prevTab && Renderer.utils._prevTab.label === tb.label);
			const $t = $(`<span class="stat-tab ${toSel ? `stat-tab-sel` : ""} btn btn-default stat-tab-gen">${tb.label}</span>`);
			tb.$t = $t;
			$t.click(() => {
				const curTab = Renderer.utils._curTab;
				const tabs = Renderer.utils._tabs;

				if (!curTab || curTab.label !== tb.label) {
					if (curTab) curTab.$t.removeClass(`stat-tab-sel`);
					Renderer.utils._curTab = tb;
					$t.addClass(`stat-tab-sel`);
					if (curTab) tabs[curTab.label].content = $content.children().detach();

					tabs[tb.label] = tb;
					if (!tabs[tb.label].content && tb.funcPopulate) {
						tb.funcPopulate();
					} else {
						$content.append(tabs[tb.label].content);
					}
					if (tb.funcChange) tb.funcChange();
				}
			});
			if (Renderer.utils._prevTab && Renderer.utils._prevTab.label === tb.label) initialTab = $t;
			return $t;
		});

		toAdd.reverse().forEach($t => $wrpTab.prepend($t));
		(initialTab || toAdd[toAdd.length - 1]).click();
	},

	_pronounceButtonsBound: false,
	bindPronounceButtons () {
		if (Renderer.utils._pronounceButtonsBound) return;
		Renderer.utils._pronounceButtonsBound = true;
		$(`body`).on("click", ".btn-name-pronounce", function () {
			const audio = $(this).find(`.name-pronounce`)[0];
			audio.currentTime = 0;
			audio.play();
		});
	},

	/**
	 * @param entry Data entry to search for fluff on, e.g. a monster
	 * @param prop The fluff index reference prop, e.g. `"monsterFluff"`
	 */
	getPredefinedFluff (entry, prop) {
		if (!entry.fluff) return null;

		const mappedProp = `_${prop}`;
		const mappedPropAppend = `_append${prop.uppercaseFirst()}`;
		const fluff = {};

		const assignPropsIfExist = (fromObj, ...props) => {
			props.forEach(prop => {
				if (fromObj[prop]) fluff[prop] = fromObj[prop];
			});
		};

		assignPropsIfExist(entry.fluff, "name", "type", "entries", "images");

		if (entry.fluff[mappedProp]) {
			const fromList = (BrewUtil.homebrew[prop] || []).find(it => it.name === entry.fluff[mappedProp].name && it.source === entry.fluff[mappedProp].source);
			if (fromList) {
				assignPropsIfExist(fromList, "name", "type", "entries", "images");
			}
		}

		if (entry.fluff[mappedPropAppend]) {
			const fromList = (BrewUtil.homebrew[prop] || []).find(it => it.name === entry.fluff[mappedPropAppend].name && it.source === entry.fluff[mappedPropAppend].source);
			if (fromList) {
				if (fromList.entries) {
					fluff.entries = MiscUtil.copy(fluff.entries || []);
					fluff.entries.push(...fluff.entries);
				}
				if (fromList.images) {
					fluff.images = MiscUtil.copy(fluff.images || []);
					fluff.images.push(...fromList.images);
				}
			}
		}

		return fluff;
	},

	/**
	 * @param isImageTab True if this is the "Images" tab, false otherwise
	 * @param $content The statblock wrapper
	 * @param record Item to build tab for (e.g. a monster; an item)
	 * @param fnFluffBuilder Function which builds the final fluff object from available data (handling any merges/etc)
	 * @param fluffUrl Fluff data URL
	 * @param fnCheckSourceInIndex Function which returns true if the record's source has a fluff data file
	 */
	buildFluffTab (isImageTab, $content, record, fnFluffBuilder, fluffUrl, fnCheckSourceInIndex) {
		const renderer = Renderer.get();

		$content.append(Renderer.utils.getBorderTr());
		$content.append(Renderer.utils.getNameTr(record));
		const $tr = $(`<tr class="text"/>`);
		$content.append($tr);
		const $td = $(`<td colspan="8" class="text"/>`).appendTo($tr);
		$content.append(Renderer.utils.getBorderTr());

		function renderFluff (data) {
			renderer.setFirstSection(true);
			const fluff = fnFluffBuilder(data);
			
			if (!fluff) {
				$td.empty().append(HTML_NO_INFO);
				return;
			}

			if (isImageTab) {
				if (fluff.images) {
					fluff.images.forEach(img => $td.append(renderer.render(img, 1)));
				} else {
					$td.append(HTML_NO_IMAGES);
				}
			} else {
				if (fluff.entries) {
					const depth = fluff.type === "section" ? -1 : 2;
					if (fluff.type !== "section") renderer.setFirstSection(false);
					$td.append(renderer.render({type: fluff.type, entries: fluff.entries}, depth));
				} else {
					$td.append(HTML_NO_INFO);
				}
			}
		}

		if ((fnCheckSourceInIndex && fnCheckSourceInIndex(record.source)) || record.fluff) {
			if (record.fluff) renderFluff();
			else DataUtil.loadJSON(fluffUrl).then(renderFluff);
		} else {
			$td.empty();
			if (isImageTab) $td.append(HTML_NO_IMAGES);
			else $td.append(HTML_NO_INFO);
		}
	}
};

Renderer.get = () => {
	if (!Renderer.defaultRenderer) Renderer.defaultRenderer = new Renderer();
	return Renderer.defaultRenderer;
};

Renderer.hover = {
	linkCache: {},
	_isInit: false,
	_active: {},

	_dmScreen: null,
	bindDmScreen (screen) {
		this._dmScreen = screen;
	},

	_lastMouseHoverId: -1,
	_mouseHovers: {},
	createOnMouseHover (entries, title = "Homebrew") {
		const id = Renderer.hover._lastMouseHoverId++;
		Renderer.hover._mouseHovers[id] = {data: {hoverTitle: title}, entries: MiscUtil.copy(entries)};
		return `onmouseover="Renderer.hover.mouseOverHoverTooltip(event, this, ${id})" ${Renderer.hover._getPreventTouchString()}`;
	},

	createOnMouseHoverEntry (entry, isBookContent) {
		const id = Renderer.hover.__initOnMouseHoverEntry(entry);
		return `onmouseover="Renderer.hover.mouseOverHoverTooltip(event, this, ${id}, ${!!isBookContent})" ${Renderer.hover._getPreventTouchString()}`;
	},

	_getPreventTouchString () {
		return `ontouchstart="Renderer.hover.handleTouchStart(event, this)"`
	},

	handleTouchStart (evt, ele) {
		// on large touchscreen devices only (e.g. iPads)
		if (!Renderer.hover._isSmallScreen()) {
			// cache the link location and redirect it to void
			$(ele).data("href", $(ele).data("href") || $(ele).attr("href"));
			$(ele).attr("href", STR_VOID_LINK);
			// restore the location after 100ms; if the user long-presses the link will be restored by the time they
			//   e.g. attempt to open a new tab
			setTimeout(() => {
				const data = $(ele).data("href");
				if (data) {
					$(ele).attr("href", data);
					$(ele).data("href", null);
				}
			}, 100);
		}
	},

	__initOnMouseHoverEntry (entry) {
		const id = Renderer.hover._lastMouseHoverId++;
		Renderer.hover._mouseHovers[id] = {
			...entry,
			data: {hoverTitle: entry.name}
		};
		return id;
	},

	__updateOnMouseHoverEntry (id, entry) {
		Renderer.hover._mouseHovers[id] = {
			...entry,
			data: {hoverTitle: entry.name}
		};
	},

	bindOnMouseHoverEntry (entry, isBookContent) {
		const id = Renderer.hover.__initOnMouseHoverEntry(entry);
		return (event, ele) => Renderer.hover.mouseOverHoverTooltip(event, ele, id, !!isBookContent);
	},

	_addToCache: (page, source, hash, item) => {
		page = page.toLowerCase();
		hash = hash.toLowerCase();

		(Renderer.hover.linkCache[page] = Renderer.hover.linkCache[page] || [])[hash] = item;
	},

	_getFromCache: (page, source, hash) => {
		page = page.toLowerCase();
		hash = hash.toLowerCase();

		return Renderer.hover.linkCache[page][hash];
	},

	_isCached: (page, source, hash) => {
		page = page.toLowerCase();
		hash = hash.toLowerCase();

		return Renderer.hover.linkCache[page] && Renderer.hover.linkCache[page][hash];
	},

	pCacheAndGet (page, source, hash) {
		return new Promise(resolve => {
			Renderer.hover._doFillThenCall(page, source, hash, () => {
				const it = Renderer.hover._getFromCache(page, source, hash);
				resolve(it);
			});
		})
	},

	_doFillThenCall: (page, source, hash, callbackFn) => {
		/**
		 * @param data the data
		 * @param listProp list property in the data
		 * @param itemModifier optional function to run per item; takes listProp and an item as parameters
		 */
		function populate (data, listProp, itemModifier) {
			data[listProp].forEach(it => {
				var itHash = UrlUtil.encodeForHash(it.name);
				if (itemModifier) itemModifier(listProp, it);
				Renderer.hover._addToCache(page, null, itHash, it);
				if(it.translate_name){
					var itEngHash = UrlUtil.encodeForHash(it.translate_name);
					Renderer.hover._addToCache(page, null, itEngHash, it);
				}
			});
		}

		function loadMultiSource (page, baseUrl, listProp) {
			if (!Renderer.hover._isCached(page, source, hash)) {
				BrewUtil.pAddBrewData()
					.then((data) => {
						if (!data[listProp]) return;
						populate(data, listProp);
					})
					.catch(BrewUtil.pPurgeBrew)
					.then(() => DataUtil.loadJSON(`${Renderer.get().baseUrl}${baseUrl}index.json`))
					.then((data) => {
						const officialSources = {};
						Object.entries(data).forEach(([k, v]) => officialSources[k.toLowerCase()] = v);
						const officialSource = officialSources[source.toLowerCase()];
						if (officialSource) {
							DataUtil.loadJSON(`${Renderer.get().baseUrl}${baseUrl}${officialSource}`)
								.then((data) => {
									populate(data, listProp);
									callbackFn();
								});
						} else {
							callbackFn(); // source to load is 3rd party, which was already handled
						}
					});
			} else {
				callbackFn();
			}
		}

		function _handleSingleData (data, listProps, itemModifier) {
			if (listProps instanceof Array) listProps.forEach(p => populate(data, p, itemModifier));
			else populate(data, listProps, itemModifier);
			callbackFn();
		}

		function loadSimple (page, jsonFile, listProps, itemModifier) {
			if (!Renderer.hover._isCached(page, source, hash)) {
				DataUtil.loadJSON(`${Renderer.get().baseUrl}data/${languageParser.getActiveLanguage()}/${jsonFile}`)
					.then((data) => _handleSingleData(data, listProps, itemModifier));
			} else callbackFn();
		}

		function loadCustom (page, jsonFile, listProps, itemModifier, loader) {
			if (!Renderer.hover._isCached(page, source, hash)) {
				_pLoadSingleBrew(listProps, itemModifier)
					.then(() => DataUtil[loader].loadJSON(Renderer.get().baseUrl))
					.then((data) => _handleSingleData(data, listProps, itemModifier));
			} else callbackFn();
		}

		switch (page) {
			case "hover": {
				callbackFn();
				break;
			}
			//===========		
			default:
				if( UrlUtil.PG_TO_RENDER_LOAD( page, loadSimple ) ) throw new Error(`No load function defined for page ${page}`);
				else break;
		}
	},

	_teardownWindow: (hoverId) => {
		const obj = Renderer.hover._active[hoverId];
		if (obj) {
			obj.$ele.attr("data-hover-active", false);
			obj.$hov.remove();
			$(document).off(obj.mouseUpId);
			$(document).off(obj.mouseMoveId);
			$(window).off(obj.resizeId);
		}
		delete Renderer.hover._active[hoverId];
	},

	_makeWindow () {
		if (!Renderer.hover._curHovering) {
			reset();
			return;
		}
		const hoverId = Renderer.hover._curHovering.hoverId;
		const ele = Renderer.hover._curHovering.ele;
		let preLoaded = Renderer.hover._curHovering.preLoaded;
		const page = Renderer.hover._curHovering.cPage;
		const source = null;
		const hash = Renderer.hover._curHovering.cHash;
		const permanent = Renderer.hover._curHovering.permanent;
		const clientX = Renderer.hover._curHovering.clientX;
		const renderFn = Renderer.hover._curHovering.renderFunction;
		const isBookContent = Renderer.hover._curHovering.isBookContent;

		// if it doesn't seem to exist, return
		if (!preLoaded && page !== "hover" && !Renderer.hover._isCached(page, source, hash)) {
			Renderer.hover._showInProgress = false;
			setTimeout(() => {
				throw new Error(`Could not load hash ${hash} with source ${source} from page ${page}`);
			}, 1);
			return;
		}

		const toRender = page === "hover" ? {name: source.data.hoverTitle || ""} : preLoaded || Renderer.hover._getFromCache(page, source, hash);
		const content = page === "hover" ? renderFn(source) : renderFn(toRender);

		$(ele).attr("data-hover-active", true);

		const offset = $(ele).offset();
		const vpOffsetT = offset.top - $(document).scrollTop();
		const vpOffsetL = offset.left - $(document).scrollLeft();

		const fromBottom = vpOffsetT > $(window).height() / 2;
		const fromRight = vpOffsetL > $(window).width() / 2;

		const $hov = $(`<div class="hwin" style="right: -600px"/>`);
		const $wrpStats = $(`<div class="hwin__wrp-table"/>`);

		const $body = $(`body`);
		const $ele = $(ele);

		$ele.on("mouseleave.hoverwindow", (evt) => {
			Renderer.hover._cleanWindows();
			if (!($brdrTop.attr("data-perm") === "true") && !evt.shiftKey) {
				teardown();
			} else {
				$(ele).attr("data-hover-active", true);
				// use attr to let the CSS see it
				$brdrTop.attr("data-perm", true);
				delete Renderer.hover._active[hoverId];
			}
		});

		const $hovTitle = $(`<span class="window-title">${toRender._displayName || toRender.name}</span>`);
		const $stats = $(`<table class="stats ${isBookContent ? "stats-book--hover" : ""}"/>`);
		$stats.append(content);

		$stats.off("click", ".mon__btn-scale-cr").on("click", ".mon__btn-scale-cr", function (evt) {
			evt.stopPropagation();
			const $this = $(this);
			const initialCr = preLoaded && preLoaded._originalCr != null ? preLoaded._originalCr : toRender.cr.cr || toRender.cr;
			const lastCr = preLoaded ? preLoaded.cr.cr || preLoaded.cr : toRender.cr.cr || toRender.cr;
			Renderer.monster.getCrScaleTarget($this, lastCr, (targetCr) => {
				if (Parser.numberToCr(targetCr) === initialCr) {
					const original = Renderer.hover._getFromCache(page, source, hash);
					preLoaded = original;
					$stats.empty().append(renderFn(original));
					$hovTitle.text(original._displayName || original.name);
				} else {
					ScaleCreature.scale(toRender, targetCr).then(scaledContent => {
						preLoaded = scaledContent;
						$stats.empty().append(renderFn(scaledContent));
						$hovTitle.text(scaledContent._displayName || scaledContent.name);
					});
				}
			}, true);
		});
		$stats.off("click", ".mon__btn-reset-cr").on("click", ".mon__btn-reset-cr", function () {
			const original = Renderer.hover._getFromCache(page, source, hash);
			preLoaded = original;
			$stats.empty().append(renderFn(original));
			$hovTitle.text(original._displayName || original.name);
		});

		let drag = {};
		function handleDragMousedown (evt, type) {
			if (evt.which === 0 || evt.which === 1) evt.preventDefault();
			$hov.css({
				"z-index": 201, // temporarily display it on top
				"animation": "initial"
			});
			drag.type = type;
			drag.startX = Renderer.hover._getClientX(evt);
			drag.startY = Renderer.hover._getClientY(evt);
			drag.baseTop = parseFloat($hov.css("top"));
			drag.baseLeft = parseFloat($hov.css("left"));
			drag.baseHeight = $wrpStats.height();
			drag.baseWidth = $hov.width();
			if (type < 9) {
				$wrpStats.css("max-height", "initial");
				$hov.css("max-width", "initial");
			}
		}
		function handleDragClick () {
			$hov.css("z-index", ""); // remove the temporary z-boost...
			$hov.parent().append($hov); // ...and properly bring it to the front
		}

		const $brdrTopRightResize = $(`<div class="hoverborder__resize-ne"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 1))
			.on("click", handleDragClick);

		const $brdrRightResize = $(`<div class="hoverborder__resize-e"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 2))
			.on("click", handleDragClick);

		const $brdrBottomRightResize = $(`<div class="hoverborder__resize-se"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 3))
			.on("click", handleDragClick);

		const $brdrBtm = $(`<div class="hoverborder hoverborder--btm ${isBookContent ? "hoverborder-book" : ""}"><div class="hoverborder__resize-s"/></div>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 4))
			.on("click", handleDragClick);

		const $brdrBtmLeftResize = $(`<div class="hoverborder__resize-sw"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 5))
			.on("click", handleDragClick);

		const $brdrLeftResize = $(`<div class="hoverborder__resize-w"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 6))
			.on("click", handleDragClick);

		const $brdrTopLeftResize = $(`<div class="hoverborder__resize-nw"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 7))
			.on("click", handleDragClick);

		const $brdrTopResize = $(`<div class="hoverborder__resize-n"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 8))
			.on("click", handleDragClick);

		const $brdrTop = $(`<div class="hoverborder hoverborder--top ${isBookContent ? "hoverborder-book" : ""}" ${permanent ? `data-perm="true"` : ""} data-hover-id="${hoverId}"/>`)
			.on("mousedown touchstart", (evt) => handleDragMousedown(evt, 9))
			.on("click", handleDragClick)
			.on("contextmenu", (evt) => {
				if (!evt.ctrlKey) ContextUtil.handleOpenContextMenu(evt, ele, "hoverBorder");
			});

		const mouseUpId = `mouseup.${hoverId} touchend.${hoverId}`;
		const mouseMoveId = `mousemove.${hoverId} touchmove.${hoverId}`;
		const resizeId = `resize.${hoverId}`;

		function isOverHoverTarget (evt, target) {
			return Renderer.hover._getClientX(evt) >= target.left &&
				Renderer.hover._getClientX(evt) <= target.left + target.width &&
				Renderer.hover._getClientY(evt) >= target.top &&
				Renderer.hover._getClientY(evt) <= target.top + target.height;
		}

		function handleNorthDrag (evt) {
			const diffY = Math.max(drag.startY - Renderer.hover._getClientY(evt), 80 - drag.baseHeight); // prevent <80 height, as this will cause the box to move downwards
			$wrpStats.css("height", drag.baseHeight + diffY);
			$hov.css("top", drag.baseTop - diffY);
			drag.startY = Renderer.hover._getClientY(evt);
			drag.baseHeight = $wrpStats.height();
			drag.baseTop = parseFloat($hov.css("top"));
		}

		function handleEastDrag (evt) {
			const diffX = drag.startX - Renderer.hover._getClientX(evt);
			$hov.css("width", drag.baseWidth - diffX);
			drag.startX = Renderer.hover._getClientX(evt);
			drag.baseWidth = $hov.width();
		}

		function handleSouthDrag (evt) {
			const diffY = drag.startY - Renderer.hover._getClientY(evt);
			$wrpStats.css("height", drag.baseHeight - diffY);
			drag.startY = Renderer.hover._getClientY(evt);
			drag.baseHeight = $wrpStats.height();
		}

		function handleWestDrag (evt) {
			const diffX = Math.max(drag.startX - Renderer.hover._getClientX(evt), 150 - drag.baseWidth);
			$hov.css("width", drag.baseWidth + diffX);
			$hov.css("left", drag.baseLeft - diffX);
			drag.startX = Renderer.hover._getClientX(evt);
			drag.baseWidth = $hov.width();
			drag.baseLeft = parseFloat($hov.css("left"));
		}

		$(document)
			.on(mouseUpId, (evt) => {
				if (drag.type) {
					if (drag.type < 9) {
						$wrpStats.css("max-height", "");
						$hov.css("max-width", "");
					}
					adjustPosition();

					if (drag.type === 9) {
						// handle mobile button touches
						if (evt.target.classList.contains("hvr__close") || evt.target.classList.contains("hvr__popout")) {
							evt.preventDefault();
							drag.type = 0;
							$(evt.target).click();
							return;
						}

						// handle DM screen integration
						if (this._dmScreen) {
							const panel = this._dmScreen.getPanelPx(Renderer.hover._getClientX(evt), Renderer.hover._getClientY(evt));
							if (!panel) return;
							this._dmScreen.setHoveringPanel(panel);
							const target = panel.getAddButtonPos();

							if (isOverHoverTarget(evt, target)) {
								if (preLoaded && preLoaded._isScaledCr != null) panel.doPopulate_StatsScaledCr(page, source, hash, preLoaded.cr.cr || preLoaded.cr);
								else panel.doPopulate_Stats(page, source, hash);
								altTeardown();
							}
							this._dmScreen.resetHoveringButton();
						}
					}
					drag.type = 0;
				}
			})
			.on(mouseMoveId, (evt) => {
				switch (drag.type) {
					case 1: handleNorthDrag(evt); handleEastDrag(evt); break;
					case 2: handleEastDrag(evt); break;
					case 3: handleSouthDrag(evt); handleEastDrag(evt); break;
					case 4: handleSouthDrag(evt); break;
					case 5: handleSouthDrag(evt); handleWestDrag(evt); break;
					case 6: handleWestDrag(evt); break;
					case 7: handleNorthDrag(evt); handleWestDrag(evt); break;
					case 8: handleNorthDrag(evt); break;
					case 9: {
						const diffX = drag.startX - Renderer.hover._getClientX(evt);
						const diffY = drag.startY - Renderer.hover._getClientY(evt);
						$hov.css("left", drag.baseLeft - diffX);
						$hov.css("top", drag.baseTop - diffY);
						drag.startX = Renderer.hover._getClientX(evt);
						drag.startY = Renderer.hover._getClientY(evt);
						drag.baseTop = parseFloat($hov.css("top"));
						drag.baseLeft = parseFloat($hov.css("left"));

						// handle DM screen integration
						if (this._dmScreen) {
							const panel = this._dmScreen.getPanelPx(Renderer.hover._getClientX(evt), Renderer.hover._getClientY(evt));
							if (!panel) return;
							this._dmScreen.setHoveringPanel(panel);
							const target = panel.getAddButtonPos();

							if (isOverHoverTarget(evt, target)) this._dmScreen.setHoveringButton(panel);
							else this._dmScreen.resetHoveringButton();
						}
						break;
					}
				}
			});
		$(window).on(resizeId, () => {
			adjustPosition(true);
		});

		$brdrTop.attr("data-display-title", false);
		$brdrTop.on("dblclick", () => {
			const curState = $brdrTop.attr("data-display-title");
			$brdrTop.attr("data-display-title", curState === "false");
			$brdrTop.attr("data-perm", true);
			$hov.toggleClass("hwin--minified", curState === "false");
			delete Renderer.hover._active[hoverId];
		});
		$brdrTop.append($hovTitle);
		const $brdTopRhs = $(`<div class="flex" style="margin-left: auto;"/>`).appendTo($brdrTop);
		// TODO fix dice rollers?
		// TODO fix hover links?
		const $btnPopout = $(`<span class="top-border-icon glyphicon glyphicon-new-window hvr__popout" style="margin-right: 3px;" title="Open as Popup Window"></span>`)
			.on("click", (evt) => {
				evt.stopPropagation();
				const h = $stats.height();
				const win = open(
					"",
					toRender._displayName || toRender.name,
					`width=600,height=${h}location=0,menubar=0,status=0,titlebar=0,toolbar=0`
				);
				win.document.write(`
					<!DOCTYPE html>
					<html lang="en" class="${styleSwitcher.getActiveStyleSheet() === StyleSwitcher.STYLE_NIGHT ? StyleSwitcher.NIGHT_CLASS : ""}"><head>
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<title>${toRender._displayName || toRender.name}</title>
						<link rel="stylesheet" href="css/bootstrap.css">
						<link rel="stylesheet" href="css/jquery-ui.css">
						<link rel="stylesheet" href="css/jquery-ui-slider-pips.css">
						<link rel="stylesheet" href="css/style.css">
						<link rel="icon" href="favicon.png">
						<style>
							html, body { width: 100%; height: 100%; }
							body { overflow-y: scroll; }
						</style>
					</head><body>
					<div class="hwin hoverbox--popout" style="max-width: initial; max-height: initial; box-shadow: initial;">
					${$stats[0].outerHTML}
					</div>
					</body></html>
				`);
				altTeardown();
			}).appendTo($brdTopRhs);
		const $btnClose = $(`<span class="delete-icon glyphicon glyphicon-remove hvr__close" title="Close"></span>`)
			.on("click", (evt) => {
				evt.stopPropagation();
				altTeardown();
			}).appendTo($brdTopRhs);
		$wrpStats.append($stats);

		$hov
			.append($brdrTopResize).append($brdrTopRightResize).append($brdrRightResize).append($brdrBottomRightResize)
			.append($brdrBtmLeftResize).append($brdrLeftResize).append($brdrTopLeftResize)

			.append($brdrTop)
			.append($wrpStats)
			.append($brdrBtm);

		$body.append($hov);
		if (!permanent) {
			Renderer.hover._active[hoverId] = {
				$hov: $hov,
				$ele: $ele,
				resizeId: resizeId,
				mouseUpId: mouseUpId,
				mouseMoveId: mouseMoveId
			};
		}

		if (fromBottom) $hov.css("top", vpOffsetT - ($hov.height() + 10));
		else $hov.css("top", vpOffsetT + $(ele).height() + 10);

		if (fromRight) $hov.css("left", (clientX || vpOffsetL) - ($hov.width() + 10));
		else $hov.css("left", (clientX || (vpOffsetL + $(ele).width())) + 10);

		adjustPosition(true);

		$(ele).css("cursor", "");
		reset();

		function adjustPosition () {
			// readjust position...
			// ...if vertically clipping off screen
			const hvTop = parseFloat($hov.css("top"));
			if (hvTop < 0) {
				$hov.css("top", 0);
			} else if (hvTop >= $(window).height() - Renderer.hover._BAR_HEIGHT) {
				$hov.css("top", $(window).height() - Renderer.hover._BAR_HEIGHT);
			}
			// ...if horizontally clipping off screen
			const hvLeft = parseFloat($hov.css("left"));
			if (hvLeft < 0) {
				$hov.css("left", 0)
			} else if (hvLeft + $hov.width() > $(window).width()) {
				$hov.css("left", Math.max($(window).width() - $hov.width(), 0));
			}
		}

		function teardown () {
			Renderer.hover._teardownWindow(hoverId);
		}

		// alternate teardown for 'x' button
		function altTeardown () {
			$ele.attr("data-hover-active", false);
			$hov.remove();
			$(document).off(mouseUpId);
			$(document).off(mouseMoveId);
			$(window).off(resizeId);
			delete Renderer.hover._active[hoverId];
		}

		function reset () {
			Renderer.hover._showInProgress = false;
			Renderer.hover._curHovering = null;
		}
	},

	getGenericCompactRenderedString (entry) {
		return `
			<tr class="text homebrew-hover"><td colspan="8">
			${Renderer.get().setFirstSection(true).render(entry)}
			</td></tr>
		`;
	},

	_pageToRenderFn (page) {
		switch (page) {
			case "hover":
				return Renderer.hover.getGenericCompactRenderedString;
			default:
				return UrlUtil.PG_TO_RENDER_FUNC(page);
		}
	},

	// used in hover strings
	mouseOverHoverTooltip (evt, ele, id, isBookContent) {
		const data = Renderer.hover._mouseHovers[id];
		if (data == null) return setTimeout(() => { throw new Error(`No "data" found for hover ID ${id}`) }); // this should never occur, but does on other platforms
		Renderer.hover.show({evt, ele, page: "hover", source: data, hash: "", isBookContent});
	},

	mouseOver (evt, ele, page, source, hash, isPopout, preloadId) {
		if (preloadId != null) {
			const [type, data] = preloadId.split(":");
			switch (type) {
				case MON_HASH_SCALED: {
					Renderer.hover.pCacheAndGet(page, source, hash).then(mon => {
						ScaleCreature.scale(mon, Number(data)).then(scaled => {
							Renderer.hover.mouseOverPreloaded(evt, ele, scaled, page, source, hash, isPopout);
						});
					});
					break;
				}
			}
		} else Renderer.hover.show({evt, ele, page, source, hash, isPopout});
	},

	mouseOverPreloaded (evt, ele, preLoaded, page, source, hash, isPopout) {
		Renderer.hover.show({evt, ele, preLoaded, page, source, hash, isPopout});
	},

	_doInit () {
		if (!Renderer.hover._isInit) {
			Renderer.hover._isInit = true;
			$(`body`).on("click", () => {
				Renderer.hover._cleanWindows();
			});
			ContextUtil.doInitContextMenu("hoverBorder", (evt, ele, $invokedOn, $selectedMenu) => {
				const $perms = $(`.hoverborder[data-perm="true"]`);
				switch (Number($selectedMenu.data("ctx-id"))) {
					case 0:
						$perms.attr("data-display-title", "false");
						break;
					case 1:
						$perms.attr("data-display-title", "true");
						break;
					case 2:
						$(`.hvr__close`).click();
						break;
				}
			}, ["Maximize All", "Minimize All", null, "Close All"]);
		}
	},

	_isSmallScreen () {
		const outerWindow = (() => {
			let loops = 100;
			let curr = window.top;
			while (window.parent !== curr) {
				curr = window.parent;
				if (loops-- < 0) return window; // safety precaution
			}
			return curr;
		})();

		return $(outerWindow).width() <= 768;
	},

	_BAR_HEIGHT: 16,
	_showInProgress: false,
	_hoverId: 1,
	_popoutId: -1,
	_curHovering: null,
	show: (options) => {
		const evt = options.evt;
		const ele = options.ele;
		const preLoaded = options.preLoaded;
		const page = options.page;
		const source = options.source;
		const hash = options.hash;
		const isPopout = options.isPopout;
		const isBookContent = options.isBookContent;

		Renderer.hover._doInit();

		// don't show on narrow screens
		if (Renderer.hover._isSmallScreen() && !evt.shiftKey) return;

		let hoverId;
		if (isPopout) {
			// always use a new hover ID if popout
			hoverId = Renderer.hover._popoutId--;
			$(ele).attr("data-hover-id", hoverId);
		} else {
			const curHoverId = $(ele).attr("data-hover-id");
			if (curHoverId) {
				hoverId = Number(curHoverId);
			} else {
				hoverId = Renderer.hover._hoverId++;
				$(ele).attr("data-hover-id", hoverId);
			}
		}

		const alreadyHovering = $(ele).attr("data-hover-active");
		const $curWin = $(`.hoverborder[data-hover-id="${hoverId}"]`);
		if (alreadyHovering === "true" && $curWin.length) return;

		const renderFunction = Renderer.hover._pageToRenderFn(page);
		if (!renderFunction) throw new Error(`No hover render function specified for page ${page}`);
		Renderer.hover._curHovering = {
			hoverId: hoverId,
			ele: ele,
			renderFunction: renderFunction,
			preLoaded: preLoaded,
			cPage: page,
			cSource: source,
			cHash: hash,
			permanent: evt.shiftKey,
			clientX: Renderer.hover._getClientX(evt),
			isBookContent
		};

		// return if another event chain is handling the event
		if (Renderer.hover._showInProgress) {
			return;
		}

		Renderer.hover._showInProgress = true;
		$(ele).css("cursor", "wait");

		// clean up any old event listeners
		$(ele).off("mouseleave.hoverwindow");

		// clean up any abandoned windows
		Renderer.hover._cleanWindows();

		// cancel hover if the mouse leaves
		$(ele).on("mouseleave.hoverwindow", () => {
			if (!Renderer.hover._curHovering || !Renderer.hover._curHovering.permanent) {
				Renderer.hover._curHovering = null;
			}
		});

		Renderer.hover._doFillThenCall(page, source, hash, Renderer.hover._makeWindow.bind(Renderer.hover));
	},

	_cleanWindows: () => {
		const ks = Object.keys(Renderer.hover._active);
		ks.forEach(hovId => Renderer.hover._teardownWindow(hovId));
	},

	bindPopoutButton (toList, handlerGenerator) {
		const $btnPop = ListUtil.getOrTabRightButton(`btn-popout`, `new-window`)
			.off("click")
			.attr("title", FMT("util_popout"));

		const popoutCodeId = Renderer.hover.__initOnMouseHoverEntry({});

		$btnPop.on("click", handlerGenerator ? handlerGenerator(toList, $btnPop, popoutCodeId) : (evt) => {
			if (History.lastLoadedId !== null) {
				if (evt.shiftKey) {
					Renderer.hover.handlePopoutCode(evt, toList, $btnPop, popoutCodeId);
				} else Renderer.hover.doPopout($btnPop, toList, History.lastLoadedId, evt.clientX);
			}
		});
	},

	handlePopoutCode (evt, toList, $btnPop, popoutCodeId) {
		const data = toList[History.lastLoadedId];
		const cleanCopy = DataUtil.cleanJson(MiscUtil.copy(data));
		Renderer.hover.__updateOnMouseHoverEntry(popoutCodeId, {
			type: "code",
			name: `${data.name} \u2014 Source Data`,
			preformatted: JSON.stringify(cleanCopy, null, "\t")
		});
		$btnPop.attr("data-hover-active", false);
		Renderer.hover.mouseOverHoverTooltip({shiftKey: true, clientX: evt.clientX}, $btnPop.get(0), popoutCodeId, true);
	},

	doPopout: ($btnPop, list, index, clientX) => {
		$btnPop.attr("data-hover-active", false);
		const it = list[index];
		Renderer.hover.mouseOver({shiftKey: true, clientX: clientX}, $btnPop.get(0), UrlUtil.getCurrentPage(), it.source, UrlUtil.autoEncodeHash(it), true);
	},

	doPopoutPreloaded ($btnPop, it, clientX) {
		$btnPop.attr("data-hover-active", false);
		Renderer.hover.mouseOverPreloaded({shiftKey: true, clientX: clientX}, $btnPop.get(0), it, UrlUtil.getCurrentPage(), it.source, UrlUtil.autoEncodeHash(it), true);
	},

	// helpers to get clientX/Y on mobile
	_getClientX (evt) { return evt.touches && evt.touches.length ? evt.touches[0].clientX : evt.clientX; },
	_getClientY (evt) { return evt.touches && evt.touches.length ? evt.touches[0].clientY : evt.clientY; }
};

/**
 * Recursively find all the names of entries, useful for indexing
 * @param nameStack an array to append the names to
 * @param entry the base entry
 * @param maxDepth maximum depth to search for
 * @param depth start (used internally when recursing)
 */
Renderer.getNames = function (nameStack, entry, maxDepth = -1, depth = 0) {
	if (maxDepth !== -1 && depth > maxDepth) return;
	if (entry.name) nameStack.push(Renderer.stripTags(entry.name));
	if (entry.entries) {
		for (const eX of entry.entries) {
			Renderer.getNames(nameStack, eX, maxDepth, depth + 1);
		}
	} else if (entry.items) {
		for (const eX of entry.items) {
			Renderer.getNames(nameStack, eX, maxDepth, depth + 1);
		}
	}
};

Renderer.getNumberedNames = function (entry) {
	const renderer = new Renderer().setTrackTitles(true);
	renderer.render(entry);
	const titles = renderer.getTrackedTitles();
	const out = {};
	Object.entries(titles).forEach(([k, v]) => {
		v = Renderer.stripTags(v);
		out[v] = Number(k);
	});
	return out;
};

// dig down until we find a name, as feature names can be nested
Renderer.findName = function (entry) {
	function search (it) {
		if (it instanceof Array) {
			for (const child of it) {
				const n = search(child);
				if (n) return n;
			}
		} else if (it instanceof Object) {
			if (it.name) return it.name;
			else {
				for (const child of Object.values(it)) {
					const n = search(child);
					if (n) return n;
				}
			}
		}
	}
	return search(entry);
};

Renderer.stripTags = function (str) {
	if (str.includes("{@")) {
		const tagSplit = Renderer.splitByTags(str);
		return tagSplit.filter(it => it).map(it => {
			if (it.startsWith("@")) {
				const [tag, text] = Renderer.splitFirstSpace(it);
				switch (tag) {
					case "@b":
					case "@bold":
					case "@i":
					case "@italic":
					case "@s":
					case "@strike":
						return text.replace(/^{@(i|italic|b|bold|s|strike) (.*?)}$/, "$1");

					case "@action":
					case "@note":
					case "@sense":
					case "@skill": {
						return text;
					}

					case "@5etools":
					case "@adventure":
					case "@book":
					case "@filter":
					case "@footnote":
					case "@link":
					case "@scaledice": {
						const parts = text.split("|");
						return parts[0];
					}

					case "@advantage":
					case "@condition":
					case "@skill":
					case "@effect":
					case "@samplepower":
					case "@modifier": {
						const parts = text.split("|");
						return parts.length >= 2 ? parts[1] : parts[0];
					}

					default: throw new Error(`Unhandled tag: "${tag}"`);
				}
			} else return it;
		}).join("");
	} return str;
};

Renderer.isRollableTable = function (table) {
	let autoMkRoller = false;
	if (table.colLabels) {
		autoMkRoller = table.colLabels.length >= 2 && RollerUtil.isRollCol(table.colLabels[0]);
		if (autoMkRoller) {
			// scan the first column to ensure all rollable
			const notRollable = table.rows.find(it => {
				try {
					return !/\d+([-\u2013]\d+)?/.exec(it[0]);
				} catch (e) {
					return true;
				}
			});
			if (notRollable) autoMkRoller = false;
		}
	}
	return autoMkRoller;
};

// assumes validation has been done in advance
Renderer.getRollableRow = function (row, cbErr) {
	row = MiscUtil.copy(row);
	try {
		// format: "95-00" or "12"
		const m = /^(\d+)([-\u2013](\d+))?$/.exec(String(row[0]).trim());
		if (m) {
			if (m[1] && !m[2]) {
				row[0] = {
					type: "cell",
					roll: {
						exact: Number(m[1])
					}
				};
				if (m[1][0] === "0") row[0].roll.pad = true;
			} else {
				row[0] = {
					type: "cell",
					roll: {
						min: Number(m[1]),
						max: Number(m[3])
					}
				};
				if (m[1][0] === "0" || m[3][0] === "0") row[0].roll.pad = true;
			}
		} else {
			// format: "12+"
			const m = /^(\d+)\+$/.exec(row[0]);
			row[0] = {
				type: "cell",
				roll: {
					min: Number(m[1]),
					max: Renderer.dice.POS_INFINITE
				}
			};
		}
	} catch (e) { if (cbErr) cbErr(row[0], e); }
	return row;
};

Renderer.initLazyImageLoaders = function () {
	function onIntersection (obsEntries) {
		obsEntries.forEach(entry => {
			if (entry.intersectionRatio > 0) { // filter observed entries for those that intersect
				Renderer._imageObserver.unobserve(entry.target);
				const $img = $(entry.target);
				$img.attr("src", $img.attr("data-src")).removeAttr("data-src");
			}
		});
	}

	const $images = $(`img[data-src]`);
	const config = {
		rootMargin: "150px 0px", // if the image gets within 150px of the viewport
		threshold: 0.01
	};

	if (Renderer._imageObserver) Renderer._imageObserver.disconnect();
	Renderer._imageObserver = new IntersectionObserver(onIntersection, config);
	$images.each((i, image) => Renderer._imageObserver.observe(image));
};
Renderer._imageObserver = null;

Renderer.HEAD_NEG_1 = "rd__b--0";
Renderer.HEAD_0 = "rd__b--1";
Renderer.HEAD_1 = "rd__b--2";
Renderer.HEAD_2 = "rd__b--3";
Renderer.HEAD_2_SUB_VARIANT = "rd__b--4";
Renderer.DATA_NONE = "data-none";

if (typeof module !== "undefined") {
	module.exports.Renderer = Renderer;
	global.Renderer = Renderer;
}
