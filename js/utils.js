
STR_VOID_LINK = "javascript:void(0)";
STR_NONE = FMT("none");
FLTR_ID = "filterId";
SRC_KEY = "basic";

HASH_PART_SEP = ",";
HASH_LIST_SEP = "_";
HASH_SUB_LIST_SEP = "~";
HASH_SUB_KV_SEP = ":";
HASH_START = "#";
HASH_SUBCLASS = "sub:";
HASH_BLANK = "blankhash";
HASH_SUB_NONE = "null";

// SORTING =============================================================================================================
SortUtil = {
	ascSort: (a, b) => {
		// to handle `FilterItem`s
		if (a.hasOwnProperty("item") && b.hasOwnProperty("item")) {
			return SortUtil._ascSort(a.item, b.item);
		}
		return SortUtil._ascSort(a, b);
	},

	ascSortLower: (a, b) => {
		return SortUtil._ascSort(a.toLowerCase(), b.toLowerCase());
	},

	// warning: slow
	ascSortNumericalSuffix (a, b) {
		function popEndNumber (str) {
			const spl = str.split(" ");
			return spl.last().isNumeric() ? [spl.slice(0, -1).join(" "), Number(spl.last().replace(Parser._numberCleanRegexp, ""))] : [spl.join(" "), 0];
		}

		const [aStr, aNum] = popEndNumber(a.item || a);
		const [bStr, bNum] = popEndNumber(b.item || b);
		const initialSort = SortUtil.ascSort(aStr, bStr);
		if (initialSort) return initialSort;
		return SortUtil.ascSort(aNum, bNum);
	},

	_ascSort: (a, b) => {
		if (b === a) return 0;
		return b < a ? 1 : -1;
	},

	compareNames: (a, b) => {
		if (b._values.name.toLowerCase() === a._values.name.toLowerCase()) return 0;
		else if (b._values.name.toLowerCase() > a._values.name.toLowerCase()) return 1;
		else if (b._values.name.toLowerCase() < a._values.name.toLowerCase()) return -1;
	},

	listSort: (itemA, itemB, options) => {
		if (options.valueName === "name") return compareBy("name");
		else return compareByOrDefault(options.valueName, "name");

		function compareBy (valueName) {
			const aValue = itemA.values()[valueName].toLowerCase();
			const bValue = itemB.values()[valueName].toLowerCase();
			if (aValue === bValue) return 0;
			return (aValue > bValue) ? 1 : -1;
		}

		function compareByOrDefault (valueName, defaultValueName) {
			const initialCompare = compareBy(valueName);
			return initialCompare === 0 ? compareBy(defaultValueName) : initialCompare;
		}
	},

	/**
	 * "Special Equipment" first, then alphabetical
	 */

	ascSort$Options ($select) {
		$select.append($select.find("option").remove().sort((a, b) => {
			const at = $(a).text();
			const bt = $(b).text();
			return (at > bt) ? 1 : ((at < bt) ? -1 : 0);
		}));
	},

	initHandleFilterButtonClicks (target = "#filtertools") {
		$("#filtertools").find("button.sort").click(function () {
			setTimeout(() => { // defer to allow button to update
				SortUtil.handleFilterButtonClick.call(this, target);
			}, 1);
		});
	},

	handleFilterButtonClick (target, $this = $(this), direction) {
		if (!direction) direction = $this.hasClass("asc") || $this.attr("data-sortby") === "asc" ? "asc" : "desc";

		$(target).find(".caret").removeClass("caret");
		$this.find(".caret_wrp").addClass("caret").toggleClass("caret--reverse", direction === "asc");
	},
};

// JSON LOADING ========================================================================================================
DataUtil = {
	_loaded: {},

	async loadJSON (url, ...otherData) { // FIXME otherData doesn't get returned, as resolve() can only return a single value
		//const procUrl = UrlUtil.link(url);

		if (DataUtil._loaded[url]) {
			return DataUtil._loaded[url] // , otherData
		}

		const data = await new Promise((resolve, reject) => {
			function getRequest (toUrl) {
				const request = new XMLHttpRequest();
				request.open("GET", toUrl, true);
				request.overrideMimeType("application/json");
				request.onload = function () {
					try {
						const data = JSON.parse(this.response);
						DataUtil._loaded[toUrl] = data;
						resolve(data, otherData);
					} catch (e) {
						reject(new Error(`Could not parse JSON from ${toUrl}: ${e.message}`));
					}
				};
				request.onerror = (e) => reject(new Error(`Error during JSON request: ${e.target.status}`));
				return request;
			}

			const request = getRequest(url);
			/*
			if (procUrl !== url) {
				request.onerror = function () {
					const fallbackRequest = getRequest(url);
					fallbackRequest.send();
				};
			}*/
			try{
				request.send();
			} catch(e){
				console.log(e);
			}
		});

		//await DataUtil.pDoMetaMerge(data);

		return data;
	},

	async multiLoadJSON (toLoads, onEachLoadFunction, onFinalLoadFunction) {
		if (!toLoads.length) onFinalLoadFunction([]);

		const datas = await Promise.all(toLoads.map(tl => DataUtil.loadJSON(tl.url)));
		if (onEachLoadFunction) {
			datas.forEach((data, i) => onEachLoadFunction(toLoads[i], data));
		}
		return onFinalLoadFunction(datas);
	},

	userDownload: function (filename, data) {
		if (typeof data !== "string") data = JSON.stringify(data, null, "\t");
		const $a = $(`<a href="data:text/json;charset=utf-8,${encodeURIComponent(data)}" download="${filename}.json" style="display: none;">DL</a>`);
		$(`body`).append($a);
		$a[0].click();
		$a.remove();
	},

	getCleanFilename (filename) {
		return filename.replace(/[^-_a-zA-Z0-9]/g, "_");
	},

	getCsv (headers, rows) {
		function escapeCsv (str) {
			return `"${str.replace(/\"/g, `""`).replace(/ +/g, " ").replace(/\n\n+/gi, "\n\n")}"`;
		}

		function toCsv (row) {
			return row.map(str => escapeCsv(str)).join(",");
		}

		return `${toCsv(headers)}\n${rows.map(r => toCsv(r)).join("\n")}`;
	},

	userDownloadText (filename, string) {
		const $a = $(`<a href="data:text/plain;charset=utf-8,${encodeURIComponent(string)}" download="${filename}" style="display: none;">DL</a>`);
		$(`body`).append($a);
		$a[0].click();
		$a.remove();
	},

	pUserUpload () {
		return new Promise(resolve => {
			const $iptAdd = $(`<input type="file" accept=".json" style="position: fixed; top: -100px; left: -100px; display: none;">`).on("change", (evt) => {
				const input = evt.target;

				const reader = new FileReader();
				reader.onload = () => {
					const text = reader.result;
					const json = JSON.parse(text);
					resolve(json);
				};

				reader.readAsText(input.files[0]);
			}).appendTo($(`body`));
			$iptAdd.click();
		});
	},

	cleanJson (cpy) {
		cpy.name = cpy._displayName || cpy.name;
		DataUtil.__cleanJsonObject(cpy);
		return cpy;
	},

	__cleanJsonObject (obj) {
		if (typeof obj === "object") {
			if (obj instanceof Array) {
				obj.forEach(it => DataUtil.__cleanJsonObject(it));
			} else {
				Object.entries(obj).forEach(([k, v]) => {
					if (k.startsWith("_") || k === "uniqueId") delete obj[k];
					else DataUtil.__cleanJsonObject(v);
				});
			}
		}
	},
};

// CONTEXT MENUS =======================================================================================================
ContextUtil = {
	_ctxInit: {},
	_ctxClick: {},
	_ctxOpenRefsNextId: 1,
	_ctxOpenRefs: {},
	_handlePreInitContextMenu: (menuId) => {
		if (ContextUtil._ctxInit[menuId]) return;
		ContextUtil._ctxInit[menuId] = true;
		const clickId = `click.${menuId}`;
		$("body").off(clickId).on(clickId, (evt) => {
			if ($(evt.target).data("ctx-id") != null) return; // ignore clicks on context menus

			Object.entries(ContextUtil._ctxOpenRefs[menuId] || {}).forEach(([k, v]) => {
				v(false);
				delete ContextUtil._ctxOpenRefs[menuId][k];
			});
			$(`#${menuId}`).hide();
		});
	},

	_getMenuPosition: (menuId, mouse, direction, scrollDir) => {
		const win = $(window)[direction]();
		const scroll = $(window)[scrollDir]();
		const menu = $(`#${menuId}`)[direction]();
		let position = mouse + scroll;
		// opening menu would pass the side of the page
		if (mouse + menu > win && menu < mouse) position -= menu;
		return position;
	},

	_lastMenuId: 1,
	getNextGenericMenuId () { return `contextMenu_${ContextUtil._lastMenuId++}`; },

	doInitContextMenu: (menuId, clickFn, labels) => {
		ContextUtil._ctxClick[menuId] = clickFn;
		ContextUtil._handlePreInitContextMenu(menuId);
		let tempString = `<ul id="${menuId}" class="dropdown-menu" role="menu">`;
		let i = 0;
		labels.forEach(it => {
			if (it === null) tempString += `<li class="divider"/>`;
			else if (it.disabled) {
				tempString += `<li class="disabled"><a href="${STR_VOID_LINK}">${it.text}</a></li>`;
			} else {
				tempString += `<li><a data-ctx-id="${i}" href="${STR_VOID_LINK}">${it}</a></li>`;
				i++;
			}
		});
		tempString += `</ul>`;
		$(`#${menuId}`).remove();
		$("body").append(tempString);
	},

	doTeardownContextMenu (menuId) {
		delete ContextUtil._ctxInit[menuId];
		delete ContextUtil._ctxClick[menuId];
		delete ContextUtil._ctxOpenRefs[menuId];
		$(`#${menuId}`).remove();
	},

	handleOpenContextMenu: (evt, ele, menuId, closeHandler) => {
		if (evt.ctrlKey) return;
		evt.preventDefault();
		evt.stopPropagation();
		const thisId = ContextUtil._ctxOpenRefsNextId++;
		(ContextUtil._ctxOpenRefs[menuId] = ContextUtil._ctxOpenRefs[menuId] || {})[thisId] = closeHandler || (() => {});
		const $menu = $(`#${menuId}`)
			.show()
			.css({
				position: "absolute",
				left: ContextUtil._getMenuPosition(menuId, evt.clientX, "width", "scrollLeft"),
				top: ContextUtil._getMenuPosition(menuId, evt.clientY, "height", "scrollTop")
			})
			.off("click")
			.on("click", "a", function (e) {
				$menu.hide();
				if (ContextUtil._ctxOpenRefs[menuId][thisId]) ContextUtil._ctxOpenRefs[menuId][thisId](true);
				delete ContextUtil._ctxOpenRefs[menuId][thisId];
				const $invokedOn = $(evt.target).closest(`li.row`);
				const $selectedMenu = $(e.target);
				const invokedOnId = Number($selectedMenu.data("ctx-id"));
				ContextUtil._ctxClick[menuId](e, ele, $invokedOn, $selectedMenu, isNaN(invokedOnId) ? null : invokedOnId);
			});
	}
};

// LIST AND SEARCH =====================================================================================================
ListUtil = {
	SUB_HASH_PREFIX: "sublistselected",

	_first: true,

	bindEscapeKey (list, $iptSearch, forceRebind) {
		if (!list._isBoundEscape || forceRebind) {
			if (forceRebind) $iptSearch.off("keydown.search5e");
			list._isBoundEscape = true;
			$iptSearch.on("keydown.search5e", (e) => {
				if (e.which === 27) {
					setTimeout(() => {
						$iptSearch.blur();
						list.search();
					}, 0);
				}
			});
		}
	},

	search: (options) => {
		if (!options.sortFunction && options.valueNames && options.valueNames.includes("name")) options.sortFunction = SortUtil.listSort;
		const list = new List("listcontainer", options);
		list.sort("name");
		const $iptSearch = $("#search");
		$("#reset").click(function () {
			$("#filtertools").find("select").val("All");
			$iptSearch.val("");
			list.search();
			list.sort("name");
			list.filter();
		});

		ListUtil.bindEscapeKey(list, $iptSearch);

		const listWrapper = $("#listcontainer");
		if (listWrapper.data("lists")) {
			listWrapper.data("lists").push(list);
		} else {
			listWrapper.data("lists", [list]);
		}
		if (ListUtil._first) {
			ListUtil._first = false;
			const $headDesc = $(`header div p`);
			$headDesc.html(`${$headDesc.html()} ${FMT("search_jk_navigate")}`);

			const scrollTo = () => {
				const toShow = History.getSelectedListElementWithIndex();
				if (toShow && toShow.$el && toShow.$el.length) {
					const $wrp = toShow.$el.parent();
					const $parent = toShow.$el.parent().parent();
					const parentScroll = $parent.scrollTop();
					const parentHeight = $parent.height();
					const posInParent = $wrp.position().top;
					const height = $wrp.height();

					if (posInParent < 0) {
						$wrp[0].scrollIntoView();
					} else if (posInParent + height > parentHeight) {
						$parent.scrollTop(parentScroll + (posInParent - parentHeight + height));
					}
				}
			};

			$(window).on("keypress", (e) => {
				// K up; J down
				if (noModifierKeys(e)) {
					if (e.key === "k" || e.key === "j") {
						// don't switch if the user is typing somewhere else
						if (MiscUtil.isInInput(e)) return;
						const it = History.getSelectedListElementWithIndex();

						if (it) {
							if (e.key === "k") {
								const prevLink = it.$el.parent().prev().find("a").attr("href");
								if (prevLink !== undefined) {
									window.location.hash = prevLink;
									scrollTo();
								} else {
									const lists = listWrapper.data("lists");
									let x = it.x;
									while (--x >= 0) {
										const l = lists[x];
										if (l.visibleItems.length) {
											const goTo = $(l.visibleItems[l.visibleItems.length - 1].elm).find("a").attr("href");
											if (goTo) {
												window.location.hash = goTo;
												scrollTo();
											}
											return;
										}
									}
								}
								const fromPrevSibling = it.$el.closest(`ul`).parent().prev(`li`).find(`ul li`).last().find("a").attr("href");
								if (fromPrevSibling) {
									window.location.hash = fromPrevSibling;
								}
							} else if (e.key === "j") {
								const nextLink = it.$el.parent().next().find("a").attr("href");
								if (nextLink !== undefined) {
									window.location.hash = nextLink;
									scrollTo();
								} else {
									const lists = listWrapper.data("lists");
									let x = it.x;
									while (++x < lists.length) {
										const l = lists[x];
										if (l.visibleItems.length) {
											const goTo = $(l.visibleItems[0].elm).find("a").attr("href");
											if (goTo) {
												window.location.hash = goTo;
												scrollTo();
											}
											return;
										}
									}
								}
								const fromNxtSibling = it.$el.closest(`ul`).parent().next(`li`).find(`ul li`).first().find("a").attr("href");
								if (fromNxtSibling) {
									window.location.hash = fromNxtSibling;
								}
							}
						}
					}
				}
			});
		}
		return list;
	},

	_lastSelected: null,
	toggleSelected: (evt, ele) => {
		function doSingle () {
			ListUtil._primaryLists.forEach(l => ListUtil.deslectAll(l));
			$(ele).addClass("list-multi-selected");
		}

		function getListPos (selected) {
			let i, j, list, listItem;
			outer: for (i = 0; i < ListUtil._primaryLists.length; ++i) {
				const l = ListUtil._primaryLists[i];
				for (j = 0; j < l.visibleItems.length; ++j) {
					const it = l.visibleItems[j];
					if (selected === it.elm.getAttribute("filterid")) {
						list = l;
						listItem = it;
						break outer;
					}
				}
			}
			return list && listItem ? {ixList: i, list, ixItem: j, listItem} : null;
		}

		const nextSelected = $(ele).attr("filterid");

		if (evt.shiftKey && ListUtil._lastSelected) {
			evt.preventDefault();
			const lastItem = getListPos(ListUtil._lastSelected);
			if (!lastItem) {
				doSingle();
				ListUtil._lastSelected = nextSelected;
			} else {
				ListUtil._primaryLists.forEach(l => ListUtil.deslectAll(l));

				const nextItem = getListPos(nextSelected);

				const [min, max] = [lastItem, nextItem].sort((a, b) => {
					if (a.ixList < b.ixList) return -1;
					else if (a.ixList > b.ixList) return 1;
					else if (a.ixItem < b.ixItem) return -1;
					else if (a.ixItem > b.ixItem) return 1;
					else return 0;
				});

				for (let i = min.ixList; i <= max.ixList; ++i) {
					const l = ListUtil._primaryLists[i];
					const rangeStart = i < max.ixList && i > min.ixList ? 0 : max.ixList === i && min.ixList < max.ixList ? 0 : min.ixItem;
					const rangeEnd = max.ixList > i ? l.visibleItems.length - 1 : max.ixItem;

					for (let j = rangeStart; j <= rangeEnd; ++j) {
						$(l.visibleItems[j].elm).addClass("list-multi-selected");
					}
				}
			}
		} else {
			doSingle();
			ListUtil._lastSelected = nextSelected;
		}
	},

	updateSelected: () => {
		ListUtil.toggleSelected({}, History.getSelectedListElement().parent());
	},

	initContextMenu: (clickFn, ...labels) => {
		ContextUtil.doInitContextMenu("list", clickFn, labels);
	},

	initSubContextMenu: (clickFn, ...labels) => {
		ContextUtil.doInitContextMenu("listSub", clickFn, labels);
	},

	openContextMenu: (evt, ele) => {
		const selCount = ListUtil._primaryLists.map(l => ListUtil.getSelectedCount(l)).reduce((a, b) => a + b, 0);
		if (selCount === 1) ListUtil._primaryLists.forEach(l => ListUtil.deslectAll(l));
		if (selCount === 0 || selCount === 1) $(ele).addClass("list-multi-selected");
		ContextUtil.handleOpenContextMenu(evt, ele, "list");
	},

	openSubContextMenu: (evt, ele) => {
		ContextUtil.handleOpenContextMenu(evt, ele, "listSub");
	},

	$sublistContainer: null,
	sublist: null,
	$sublist: null,
	_sublistChangeFn: null,
	_pUidHandler: null,
	_allItems: null,
	_primaryLists: [],
	_pinned: {},
	initSublist: (options) => {
		ListUtil._allItems = options.itemList;
		ListUtil._getSublistRow = options.getSublistRow;
		ListUtil._sublistChangeFn = options.onUpdate;
		ListUtil._primaryLists = options.primaryLists;
		ListUtil._pUidHandler = options.uidHandler;
		ListUtil._uidUnpackFn = options.uidUnpacker;
		delete options.itemList;
		delete options.getSublistRow;
		delete options.onUpdate;
		delete options.primaryLists;
		delete options.uidHandler;

		ListUtil.$sublistContainer = $("#sublistcontainer");
		const sublist = new List("sublistcontainer", options);
		ListUtil.sublist = sublist;
		ListUtil.$sublist = $(`ul.${options.listClass}`);

		if (ListUtil.$sublistContainer.hasClass(`sublist--resizable`)) ListUtil._pBindSublistResizeHandlers(ListUtil.$sublistContainer);

		return sublist;
	},

	__mouseMoveId: 1,
	async _pBindSublistResizeHandlers ($ele) {
		const STORAGE_KEY = "SUBLIST_RESIZE";
		const BORDER_SIZE = 3;
		const MOUSE_MOVE_ID = ListUtil.__mouseMoveId++;
		const $doc = $(document);

		let mousePos;
		function resize (evt) {
			const dx = evt.clientY - mousePos;
			mousePos = evt.clientY;
			$ele.css("height", parseInt($ele.css("height")) + dx);
		}

		$ele.on("mousedown", (evt) => {
			if (evt.which === 1 && evt.target === $ele[0]) {
				evt.preventDefault();
				if (evt.offsetY > $ele.height() - BORDER_SIZE) {
					mousePos = evt.clientY;
					$doc.on(`mousemove.sublist_resize-${MOUSE_MOVE_ID}`, resize);
				}
			}
		});

		$doc.on("mouseup", (evt) => {
			if (evt.which === 1) {
				$(document).off(`mousemove.sublist_resize-${MOUSE_MOVE_ID}`);
				StorageUtil.pSetForPage(STORAGE_KEY, $ele.css("height"));
			}
		});

		const storedHeight = await StorageUtil.pGetForPage(STORAGE_KEY);
		if (storedHeight) $ele.css("height", storedHeight);
	},

	setOptions: (options) => {
		if (options.itemList !== undefined) ListUtil._allItems = options.itemList;
		if (options.getSublistRow !== undefined) ListUtil._getSublistRow = options.getSublistRow;
		if (options.onUpdate !== undefined) ListUtil._sublistChangeFn = options.onUpdate;
		if (options.primaryLists !== undefined) ListUtil._primaryLists = options.primaryLists;
		if (options.uidHandler !== undefined) ListUtil._pUidHandler = options.uidHandler;
		if (options.uidUnpacker !== undefined) ListUtil._uidUnpackFn = options.uidUnpacker;
	},

	getOrTabRightButton: (id, icon) => {
		let $btn = $(`#${id}`);
		if (!$btn.length) {
			$btn = $(`<button class="stat-tab btn btn-default" id="${id}"><span class="glyphicon glyphicon-${icon}"></span></button>`).appendTo($(`#tabs-right`));
		}
		return $btn;
	},

	bindPinButton: () => {
		ListUtil.getOrTabRightButton(`btn-pin`, `pushpin`)
			.off("click")
			.on("click", () => {
				if (!ListUtil.isSublisted(History.lastLoadedId)) ListUtil.pDoSublistAdd(History.lastLoadedId, true);
				else ListUtil.pDoSublistRemove(History.lastLoadedId);
			})
			.attr("title", FMT("util_pin_toggle"));
	},

	genericAddButtonHandler (evt, options = {}) {
		if (evt.shiftKey) ListUtil.pDoSublistAdd(History.lastLoadedId, true, options.shiftCount || 20);
		else ListUtil.pDoSublistAdd(History.lastLoadedId, true);
	},
	bindAddButton: (handlerGenerator, options = {}) => {
		ListUtil.getOrTabRightButton(`btn-sublist-add`, `plus`)
			.off("click")
			.attr("title", `Add (SHIFT for ${options.shiftCount || 20})`)
			.on("click", handlerGenerator ? handlerGenerator() : ListUtil.genericAddButtonHandler);
	},

	genericSubtractButtonHandler (evt, options = {}) {
		if (evt.shiftKey) ListUtil.pDoSublistSubtract(History.lastLoadedId, options.shiftCount || 20);
		else ListUtil.pDoSublistSubtract(History.lastLoadedId);
	},
	bindSubtractButton: (handlerGenerator, options = {}) => {
		ListUtil.getOrTabRightButton(`btn-sublist-subtract`, `minus`)
			.off("click")
			.attr("title", `Subtract (SHIFT for ${options.shiftCount || 20})`)
			.on("click", handlerGenerator ? handlerGenerator() : ListUtil.genericSubtractButtonHandler);
	},

	bindDownloadButton: () => {
		/*
		const $btn = ListUtil.getOrTabRightButton(`btn-sublist-download`, `download`);
		$btn.off("click")
			.on("click", async evt => {
				if (evt.shiftKey) {
					const toEncode = JSON.stringify(ListUtil.getExportableSublist());
					const parts = [window.location.href, (UrlUtil.packSubHash(ListUtil.SUB_HASH_PREFIX, [toEncode], true))];
					await MiscUtil.pCopyTextToClipboard(parts.join(HASH_PART_SEP));
					JqueryUtil.showCopiedEffect($btn);
				} else {
					DataUtil.userDownload(ListUtil._getDownloadName(), JSON.stringify(ListUtil.getExportableSublist(), null, "\t"));
				}
			})
			.attr("title", `${FMT("util_downloadjson")} (${FMT("util_shift_link")})`);*/
	},

	doJsonLoad (json, additive, funcPreload) {
		const funcOnload = () => {
			ListUtil._pLoadSavedSublist(json.items, additive).then(() => {
				ListUtil._pFinaliseSublist();
			});
		};
		if (funcPreload) funcPreload(json, funcOnload);
		else funcOnload();
	},

	bindUploadButton: (funcPreload) => {
		/*const $btn = ListUtil.getOrTabRightButton(`btn-sublist-upload`, `upload`);
		$btn.off("click")
			.on("click", (evt) => {
				function loadSaved (event, additive) {
					const input = event.target;

					const reader = new FileReader();
					reader.onload = () => {
						const text = reader.result;
						const json = JSON.parse(text);
						$iptAdd.remove();
						ListUtil.doJsonLoad(json, additive, funcPreload);
					};
					reader.readAsText(input.files[0]);
				}

				const additive = evt.shiftKey;
				const $iptAdd = $(`<input type="file" accept=".json" style="position: fixed; top: -100px; left: -100px; display: none;">`).on("change", (evt) => {
					loadSaved(evt, additive);
				}).appendTo($(`body`));
				$iptAdd.click();
			})
			.attr("title", `${FMT("util_uploadjson")} (${FMT("util_shift_add_only")})`);*/
	},

	setFromSubHashes: (subHashes, funcPreload) => {
		function funcOnload (json) {
			ListUtil._pLoadSavedSublist(json.items, false).then(async () => {
				await ListUtil._pFinaliseSublist();

				const [link, ...sub] = History._getHashParts();
				const outSub = [];
				Object.keys(unpacked)
					.filter(k => k !== ListUtil.SUB_HASH_PREFIX)
					.forEach(k => {
						outSub.push(`${k}${HASH_SUB_KV_SEP}${unpacked[k].join(HASH_SUB_LIST_SEP)}`);
					});
				History.setSuppressHistory(true);
				window.location.hash = `#${link}${outSub.length ? `${HASH_PART_SEP}${outSub.join(HASH_PART_SEP)}` : ""}`;
			});
		}

		const unpacked = {};
		subHashes.forEach(s => Object.assign(unpacked, UrlUtil.unpackSubHash(s, true)));
		const setFrom = unpacked[ListUtil.SUB_HASH_PREFIX];
		if (setFrom) {
			const json = JSON.parse(setFrom);

			if (funcPreload) funcPreload(json, () => funcOnload(json));
			else funcOnload(json);
		}
	},

	_getPinnedCount (index, data) {
		const base = ListUtil._pinned[index];
		if (!base) return null;
		if (data && data.uid) return base[data.uid];
		return base._;
	},

	_setPinnedCount (index, count, data) {
		const base = ListUtil._pinned[index];
		const key = data && data.uid ? data.uid : "_";
		if (base) base[key] = count;
		else (ListUtil._pinned[index] = {})[key] = count;
	},

	_deletePinnedCount (index, data) {
		const base = ListUtil._pinned[index];
		if (base) {
			if (data && data.uid) delete base[data.uid];
			else delete base._;
		}
	},

	async pDoSublistAdd (index, doFinalise, addCount, data) {
		if (index == null) {
			return JqueryUtil.doToast({
				content: "Please first view something from the list.",
				type: "danger"
			});
		}

		const count = ListUtil._getPinnedCount(index, data) || 0;
		addCount = addCount || 1;
		ListUtil._setPinnedCount(index, count + addCount, data);

		if (count !== 0) {
			ListUtil._setViewCount(index, count + addCount, data);
			if (doFinalise) await ListUtil._pFinaliseSublist();
		} else {
			const sl = ListUtil._getSublistRow(ListUtil._allItems[index], index, addCount, data);
			if (sl instanceof Promise) {
				return sl.then(async (r) => {
					ListUtil.$sublist.append(r);
					if (doFinalise) await ListUtil._pFinaliseSublist();
				});
			} else {
				ListUtil.$sublist.append(sl);
				if (doFinalise) await ListUtil._pFinaliseSublist();
			}
		}
	},

	async pDoSublistSubtract (index, subtractCount, data) {
		const count = ListUtil._getPinnedCount(index, data);
		subtractCount = subtractCount || 1;
		if (count > subtractCount) {
			ListUtil._setPinnedCount(index, count - subtractCount, data);
			ListUtil._setViewCount(index, count - subtractCount, data);
			ListUtil.sublist.reIndex();
			await ListUtil._pSaveSublist();
			ListUtil._handleCallUpdateFn();
		} else if (count) await ListUtil.pDoSublistRemove(index, data);
	},

	getSublisted () {
		return MiscUtil.copy(ListUtil._pinned);
	},

	getSublistedIds () {
		return Object.keys(ListUtil._pinned).map(it => Number(it));
	},

	_setViewCount: (index, newCount, data) => {
		const $cnt = $(ListUtil.sublist.get(data && data.uid ? "uid" : "id", data && data.uid ? data.uid : index)[0].elm).find(".count");
		if ($cnt.find("input").length) $cnt.find("input").val(newCount);
		else $cnt.text(newCount);
	},

	async _pFinaliseSublist (noSave) {
		ListUtil.sublist.reIndex();
		ListUtil._updateSublistVisibility();
		if (!noSave) await ListUtil._pSaveSublist();
		ListUtil._handleCallUpdateFn();
	},

	getExportableSublist: () => {
		const sources = new Set();
		const toSave = ListUtil.sublist.items
			.map(it => {
				const $elm = $(it.elm);
				sources.add(ListUtil._allItems[Number($elm.attr(FLTR_ID))].source);
				return {h: $elm.find(`a`).prop("hash").slice(1).split(HASH_PART_SEP)[0], c: $elm.find(".count").first().text() || undefined, uid: $elm.find(`.uid`).text() || undefined};
			});
		return {items: toSave, sources: Array.from(sources)};
	},

	async _pSaveSublist () {
		await StorageUtil.pSetForPage("sublist", ListUtil.getExportableSublist());
	},

	_updateSublistVisibility: () => {
		if (ListUtil.sublist.items.length) ListUtil.$sublistContainer.addClass("sublist--visible");
		else ListUtil.$sublistContainer.removeClass("sublist--visible");
	},

	async pDoSublistRemove (index, data) {
		ListUtil._deletePinnedCount(index, data);
		if (data && data.uid) ListUtil.sublist.remove("uid", data.uid);
		else ListUtil.sublist.remove("id", index);
		ListUtil._updateSublistVisibility();
		await ListUtil._pSaveSublist();
		ListUtil._handleCallUpdateFn();
	},

	async pDoSublistRemoveAll (noSave) {
		ListUtil._pinned = {};
		ListUtil.sublist.clear();
		ListUtil._updateSublistVisibility();
		if (!noSave) await ListUtil._pSaveSublist();
		ListUtil._handleCallUpdateFn();
	},

	isSublisted: (index, data) => {
		return ListUtil._getPinnedCount(index, data);
	},

	deslectAll: (list) => {
		list.items.forEach(it => it.elm.className = it.elm.className.replace(/list-multi-selected/g, ""));
	},

	forEachSelected: (list, forEachFunc) => {
		list.items
			.filter(it => it.elm.className.includes("list-multi-selected"))
			.map(it => {
				it.elm.className = it.elm.className.replace(/list-multi-selected/g, "");
				return it.elm.getAttribute(FLTR_ID);
			})
			.forEach(it => forEachFunc(it));
	},

	mapSelected (list, mapFunc) {
		return list.items
			.filter(it => it.elm.className.includes("list-multi-selected"))
			.map(it => {
				it.elm.className = it.elm.className.replace(/list-multi-selected/g, "");
				return it.elm.getAttribute(FLTR_ID);
			})
			.map(it => mapFunc(it));
	},

	getSelectedCount: (list) => {
		return list.items.filter(it => it.elm.className.includes("list-multi-selected")).length;
	},

	isAnySelected: (list) => {
		return !!list.items.find(it => it.elm.className.includes("list-multi-selected"));
	},

	_handleCallUpdateFn: () => {
		if (ListUtil._sublistChangeFn) ListUtil._sublistChangeFn();
	},

	_hasLoadedState: false,
	async pLoadState () {
		if (ListUtil._hasLoadedState) return;
		ListUtil._hasLoadedState = true;
		try {
			const store = await StorageUtil.pGetForPage("sublist");
			if (store && store.items) {
				ListUtil._pLoadSavedSublist(store.items);
			}
		} catch (e) {
			setTimeout(() => { throw e });
			await StorageUtil.pRemoveForPage("sublist");
		}
	},

	async _pLoadSavedSublist (items, additive) {
		if (!additive) await ListUtil.pDoSublistRemoveAll(true);

		const toLoad = items.map(it => {
			const $ele = History._getListElem(it.h);
			const itId = $ele ? $ele.attr("id") : null;
			if (itId != null) {
				const out = {index: itId, addCount: Number(it.c)};
				if (ListUtil._uidUnpackFn && it.uid) out.data = ListUtil._uidUnpackFn(it.uid);
				return out;
			}
			return null;
		}).filter(it => it);

		const promises = toLoad.map(it => ListUtil.pDoSublistAdd(it.index, false, it.addCount, it.data));
		return Promise.all(promises).then(async () => {
			await ListUtil._pFinaliseSublist(true);
		});
	},

	async pGetSelectedSources () {
		let store;
		try {
			store = await StorageUtil.pGetForPage("sublist");
		} catch (e) {
			setTimeout(() => { throw e });
		}
		if (store && store.sources) return store.sources;
	},

	initGenericPinnable: () => {
		ListUtil.initContextMenu(ListUtil.handleGenericContextMenuClick, FMT("util_popout"), FMT("util_pin"));
		ListUtil.initSubContextMenu(ListUtil.handleGenericSubContextMenuClick, FMT("util_popout"), FMT("util_unpin"), FMT("util_clearpins"), null, null/*FMT("util_downloadjson")*/);
	},

	handleGenericContextMenuClick: (evt, ele, $invokedOn, $selectedMenu) => {
		const itId = Number($invokedOn.attr(FLTR_ID));
		switch (Number($selectedMenu.data("ctx-id"))) {
			case 0:
				Renderer.hover.doPopout($invokedOn, ListUtil._allItems, itId, evt.clientX);
				break;
			case 1:
				Promise.all(ListUtil._primaryLists.map(l => Promise.all(ListUtil.mapSelected(l, (it) => ListUtil.isSublisted(it) ? Promise.resolve() : ListUtil.pDoSublistAdd(it)))))
					.then(async () => ListUtil._pFinaliseSublist());
				break;
		}
	},

	_isRolling: false,
	_rollSubListed () {
		const timerMult = RollerUtil.randomise(125, 75);
		const timers = [0, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 2, 2, 2, 2.5, 3, 4, -1] // last element is always sliced off
			.map(it => it * timerMult)
			.slice(0, -RollerUtil.randomise(4, 1));

		function generateSequence (array, length) {
			const out = [RollerUtil.rollOnArray(array)];
			for (let i = 0; i < length; ++i) {
				let next = RollerUtil.rollOnArray(array);
				while (next === out.last()) {
					next = RollerUtil.rollOnArray(array);
				}
				out.push(next);
			}
			return out;
		}

		if (!ListUtil._isRolling) {
			ListUtil._isRolling = true;
			const $eles = ListUtil.sublist.items
				.map(it => $(it.elm).find(`a`));

			if ($eles.length <= 1) {
				JqueryUtil.doToast({
					content: "Not enough entries to roll!",
					type: "danger"
				});
				return ListUtil._isRolling = false;
			}

			const $sequence = generateSequence($eles, timers.length);

			let total = 0;
			timers.map((it, i) => {
				total += it;
				setTimeout(() => {
					$sequence[i][0].click();
					if (i === timers.length - 1) ListUtil._isRolling = false;
				}, total);
			});
		}
	},

	handleGenericSubContextMenuClick: (evt, ele, $invokedOn, $selectedMenu) => {
		const itId = Number($invokedOn.attr(FLTR_ID));
		switch (Number($selectedMenu.data("ctx-id"))) {
			case 0:
				Renderer.hover.doPopout($invokedOn, ListUtil._allItems, itId, evt.clientX);
				break;
			case 1:
				ListUtil.pDoSublistRemove(itId);
				break;
			case 2:
				ListUtil.pDoSublistRemoveAll();
				break;
			case 3:
				ListUtil._handleJsonDownload();
				break;
		}
	},

	initGenericAddable: () => {
		ListUtil.initContextMenu(ListUtil.handleGenericMultiContextMenuClick, "彈出視窗", "加入");
		ListUtil.initSubContextMenu(ListUtil.handleGenericMultiSubContextMenuClick, "彈出視窗", "移除", "清除列表", null, "試試手氣？", null, "下載JSON");
	},

	handleGenericMultiContextMenuClick: (evt, ele, $invokedOn, $selectedMenu) => {
		const itId = Number($invokedOn.attr(FLTR_ID));
		switch (Number($selectedMenu.data("ctx-id"))) {
			case 0:
				Renderer.hover.doPopout($invokedOn, ListUtil._allItems, itId, evt.clientX);
				break;
			case 1:
				Promise.all(ListUtil._primaryLists.map(l => Promise.all(ListUtil.mapSelected(l, (it) => ListUtil.pDoSublistAdd(it)))))
					.then(async () => {
						await ListUtil._pFinaliseSublist();
						ListUtil.updateSelected();
					});
				break;
		}
	},

	handleGenericMultiSubContextMenuClick: (evt, ele, $invokedOn, $selectedMenu) => {
		const itId = Number($invokedOn.attr(FLTR_ID));
		const uid = $invokedOn.find(`.uid`).text();
		switch (Number($selectedMenu.data("ctx-id"))) {
			case 0:
				Renderer.hover.doPopout($invokedOn, ListUtil._allItems, itId, evt.clientX);
				break;
			case 1:
				if (uid) ListUtil.pDoSublistRemove(itId, {uid: uid});
				else ListUtil.pDoSublistRemove(itId);
				break;
			case 2:
				ListUtil.pDoSublistRemoveAll();
				break;
			case 3:
				ListUtil._rollSubListed();
				break;
			case 4:
				ListUtil._handleJsonDownload();
				break;
		}
	},

	_getDownloadName () {
		return `${UrlUtil.getCurrentPage().replace(".html", "")}-sublist`;
	},

	genericPinKeyMapper (pMapUid = ListUtil._pUidHandler) {
		return Object.entries(ListUtil.getSublisted()).map(([id, it]) => {
			return Object.keys(it).map(k => {
				const it = ListUtil._allItems[id];
				return k === "_" ? Promise.resolve(MiscUtil.copy(it)) : pMapUid(it, k);
			}).reduce((a, b) => a.concat(b), []);
		}).reduce((a, b) => a.concat(b), []);
	},

	_handleJsonDownload () {
		if (ListUtil._pUidHandler) {
			const promises = ListUtil.genericPinKeyMapper();

			Promise.all(promises).then(data => {
				data.forEach(cpy => DataUtil.cleanJson(cpy));
				DataUtil.userDownload(`${ListUtil._getDownloadName()}-data`, data);
			});
		} else {
			const out = ListUtil.getSublistedIds().map(id => {
				const cpy = JSON.parse(JSON.stringify(ListUtil._allItems[id]));
				DataUtil.cleanJson(cpy);
				return cpy;
			});
			DataUtil.userDownload(`${ListUtil._getDownloadName()}-data`, out);
		}
	},

	/**
	 * Assumes any other lists have been searched using the same term
	 */
	getSearchTermAndReset: (list, ...otherLists) => {
		let lastSearch = null;
		if (list.searched) {
			lastSearch = $(`#search`).val();
			list.search();
			otherLists.forEach(l => l.search());
		}
		list.filter();
		otherLists.forEach(l => l.filter());
		return lastSearch;
	},

	toggleCheckbox (evt, ele) {
		const $ipt = $(ele).find(`input`);
		$ipt.prop("checked", !$ipt.prop("checked"));
	},

	getCompleteSources (it) {
		return it.otherSources ? [it.source].concat(it.otherSources.map(src => src.source)) : it.source;
	},

	bindShowTableButton (id, title, dataList, colTransforms, filter, sorter) {
		$(`#${id}`).click("click", () => ListUtil.showTable(title, dataList, colTransforms, filter, sorter));
	},

	basicFilterGenerator () {
		const slIds = ListUtil.getSublistedIds();
		if (slIds.length) {
			const slIdSet = new Set(slIds);
			return slIdSet.has.bind(slIdSet);
		} else {
			const visibleIds = new Set(ListUtil.getVisibleIds());
			return visibleIds.has.bind(visibleIds);
		}
	},

	getVisibleIds () {
		return BrewUtil._lists.map(l => l.visibleItems.map(it => Number(it.elm.getAttribute(FLTR_ID)))).reduce((la, lb) => la.concat(lb), []);
	},

	showTable (title, dataList, colTransforms, filter, sorter) {
		const $modal = $(`<div class="modal__outer dropdown-menu"/>`);
		const $wrpModal = $(`<div class="modal__wrp">`).appendTo($(`body`)).click(() => $wrpModal.remove());
		$modal.appendTo($wrpModal);
		const $modalInner = $(`<div class="modal__inner"/>`).appendTo($modal).click((evt) => evt.stopPropagation());

		const $pnlControl = $(`<div class="split my-3"/>`).appendTo($modalInner);
		const $pnlCols = $(`<div class="flex" style="align-items: center;"/>`).appendTo($pnlControl);
		Object.values(colTransforms).forEach((c, i) => {
			const $wrpCb = $(`<label class="flex-${c.flex || 1} px-2 mr-2 no-wrap inline-flex">${c.name} </label>`).appendTo($pnlCols);
			const $cbToggle = $(`<input type="checkbox" class="ml-1" data-name="${c.name}" checked>`)
				.click(() => {
					const toToggle = $modalInner.find(`.col_${i}`);
					if ($cbToggle.prop("checked")) {
						toToggle.show();
					} else {
						toToggle.hide();
					}
				})
				.appendTo($wrpCb);
		});
		const $pnlBtns = $(`<div/>`).appendTo($pnlControl);
		function getAsCsv () {
			const headers = $pnlCols.find(`input:checked`).map((i, e) => $(e).data("name")).get();
			const rows = $modalInner.find(`.data-row`).map((i, e) => $(e)).get().map($e => {
				return $e.find(`td:visible`).map((j, d) => $(d).text()).get();
			});
			return DataUtil.getCsv(headers, rows);
		}
		const $btnCsv = $(`<button class="btn btn-primary mr-3">Download CSV</button>`).click(() => {
			DataUtil.userDownloadText(`${title}.csv`, getAsCsv());
		}).appendTo($pnlBtns);
		const $btnCopy = $(`<button class="btn btn-primary">Copy CSV to Clipboard</button>`).click(async () => {
			await MiscUtil.pCopyTextToClipboard(getAsCsv());
			JqueryUtil.showCopiedEffect($btnCopy);
		}).appendTo($pnlBtns);
		$modalInner.append(`<hr>`);

		if (typeof filter === "object" && filter.generator) filter = filter.generator();

		let temp = `<table class="table-striped stats stats-book" style="width: 100%;"><thead><tr>${Object.values(colTransforms).map((c, i) => `<th class="col_${i} px-2" colspan="${c.flex || 1}">${c.name}</th>`).join("")}</tr></thead><tbody>`;
		const listCopy = JSON.parse(JSON.stringify(dataList)).filter((it, i) => filter ? filter(i) : it);
		if (sorter) listCopy.sort(sorter);
		listCopy.forEach(it => {
			temp += `<tr class="data-row">`;
			temp += Object.keys(colTransforms).map((k, i) => {
				const c = colTransforms[k];
				return `<td class="col_${i} px-2" colspan="${c.flex || 1}">${c.transform === true ? it[k] : c.transform(k[0] === "_" ? it : it[k])}</td>`;
			}).join("");
			temp += `</tr>`;
		});
		temp += `</tbody></table>`;
		$modalInner.append(temp);
	},

	addListShowHide () {
		const toInjectShow = `
			<div class="col-12" id="showsearch">
				<button class="btn btn-block btn-default btn-xs" type="button">顯示搜尋</button>
				<br>
			</div>
		`;

		const toInjectHide = `
			<button class="btn btn-default" id="hidesearch">隱藏</button>
		`;

		$(`#filter-search-input-group`).find(`#reset`).before(toInjectHide);
		$(`#contentwrapper`).prepend(toInjectShow);

		const listContainer = $(`#listcontainer`);
		const showSearchWrpr = $("div#showsearch");
		const hideSearchBtn = $("button#hidesearch");
		// collapse/expand search button
		hideSearchBtn.click(function () {
			listContainer.hide();
			showSearchWrpr.show();
			hideSearchBtn.hide();
		});
		showSearchWrpr.find("button").click(function () {
			listContainer.show();
			showSearchWrpr.hide();
			hideSearchBtn.show();
		});
	}
};

// ENCODING/DECODING ===================================================================================================
UrlUtil = {
	encodeForHash (toEncode) {
		if (toEncode instanceof Array) {
			return toEncode.map(i => encodeForHashHelper(i)).join(HASH_LIST_SEP);
		} else {
			return encodeForHashHelper(toEncode);
		}

		function encodeForHashHelper (part) {
			return encodeURIComponent(part).toLowerCase();
		}
	},

	autoEncodeHash (obj) {
		const curPage = UrlUtil.getCurrentPage();
		const encoder = UrlUtil.URL_TO_HASH_BUILDER;
		if (!encoder) throw new Error(`No encoder found for page ${curPage}`);
		return encoder(obj);
	},

	getCurrentPage () {
		const pSplit = window.location.pathname.split("/");
		let out = pSplit[pSplit.length - 1];
		if (!out.toLowerCase().endsWith(".html")) out += ".html";
		return out;
	},

	/**
	 * All internal URL construction should pass through here, to ensure `static.5etools.com` is used when required.
	 *
	 * @param href the link
	 */
	link (href) {
		function addGetParam (curr) {
			if (href.includes("?")) return `${curr}&ver=${VERSION_NUMBER}`;
			else return `${curr}?ver=${VERSION_NUMBER}`;
		}

		return href;
	},

	unpackSubHash (subHash, unencode) {
		// format is "key:value~list~sep~with~tilde"
		if (subHash.includes(HASH_SUB_KV_SEP)) {
			const keyValArr = subHash.split(HASH_SUB_KV_SEP).map(s => s.trim());
			const out = {};
			let k = keyValArr[0].toLowerCase();
			if (unencode) k = decodeURIComponent(k);
			let v = keyValArr[1].toLowerCase();
			if (unencode) v = decodeURIComponent(v);
			out[k] = v.split(HASH_SUB_LIST_SEP).map(s => s.trim());
			if (out[k].length === 1 && out[k] === HASH_SUB_NONE) out[k] = [];
			return out;
		} else {
			throw new Error(`Baldy formatted subhash ${subHash}`)
		}
	},

	packSubHash (key, values, encode) {
		if (encode) {
			key = encodeURIComponent(key.toLowerCase());
			values = values.map(it => encodeURIComponent(it.toLowerCase()));
		}
		return `${key}${HASH_SUB_KV_SEP}${values.join(HASH_SUB_LIST_SEP)}`;
	},

	categoryToPage (category) {
		return UrlUtil.CAT_TO_PAGE[category];
	},
	/*
	bindLinkExportButton (filterBox) {
		const $btn = ListUtil.getOrTabRightButton(`btn-link-export`, `magnet`);
		$btn.addClass("btn-copy-effect")
			.off("click")
			.on("click", async evt => {
				let url = window.location.href;

				const toHash = filterBox.getAsSubHashes();
				let parts = Object.keys(toHash).map(hK => {
					const hV = toHash[hK];
					return UrlUtil.packSubHash(hK, hV, true);
				});
				if (evt.shiftKey) {
					const toEncode = JSON.stringify(ListUtil.getExportableSublist());
					const part2 = UrlUtil.packSubHash(ListUtil.SUB_HASH_PREFIX, [toEncode], true);
					parts = parts.concat(part2);
				}
				parts.unshift(url);

				await MiscUtil.pCopyTextToClipboard(parts.join(HASH_PART_SEP));
				JqueryUtil.showCopiedEffect($btn);
			})
			.attr("title", "複製篩選器連結（SHIFT以加入列表）")
	}*/
};
UrlUtil.URL_TO_HASH_BUILDER = (it) => UrlUtil.encodeForHash([it.name]);

// TODO refactor other misc utils into this
MiscUtil = {
	copy (obj) {
		return JSON.parse(JSON.stringify(obj));
	},

	async pCopyTextToClipboard (text) {
		function doCompatabilityCopy () {
			const $temp = $(`<textarea id="copy-temp" style="position: fixed; top: -1000px; left: -1000px; width: 1px; height: 1px;">${text}</textarea>`);
			$(`body`).append($temp);
			$temp.select();
			document.execCommand("Copy");
			$temp.remove();
		}

		if (navigator && navigator.permissions) {
			try {
				const access = await navigator.permissions.query({name: "clipboard-write"});
				if (access.state === "granted" || access.state === "prompt") {
					await navigator.clipboard.writeText(text);
				} else doCompatabilityCopy();
			} catch (e) { doCompatabilityCopy(); }
		} else doCompatabilityCopy();
	},

	getProperty (object, ...path) {
		for (let i = 0; i < path.length; ++i) {
			object = object[path[i]];
			if (object == null) return object;
		}
		return object;
	},

	clearSelection () {
		if (document.getSelection) {
			document.getSelection().removeAllRanges();
			document.getSelection().addRange(document.createRange());
		} else if (window.getSelection) {
			if (window.getSelection().removeAllRanges) {
				window.getSelection().removeAllRanges();
				window.getSelection().addRange(document.createRange());
			} else if (window.getSelection().empty) {
				window.getSelection().empty();
			}
		} else if (document.selection) {
			document.selection.empty();
		}
	},

	randomColor () {
		let r; let g; let b;
		const h = RollerUtil.randomise(30, 0) / 30;
		const i = ~~(h * 6);
		const f = h * 6 - i;
		const q = 1 - f;
		switch (i % 6) {
			case 0: r = 1; g = f; b = 0; break;
			case 1: r = q; g = 1; b = 0; break;
			case 2: r = 0; g = 1; b = f; break;
			case 3: r = 0; g = q; b = 1; break;
			case 4: r = f; g = 0; b = 1; break;
			case 5: r = 1; g = 0; b = q; break;
		}
		return `#${("00" + (~~(r * 255)).toString(16)).slice(-2)}${("00" + (~~(g * 255)).toString(16)).slice(-2)}${("00" + (~~(b * 255)).toString(16)).slice(-2)}`;
	},

	scrollPageTop () {
		document.body.scrollTop = document.documentElement.scrollTop = 0;
	},

	isInInput (event) {
		return event.target.nodeName === "INPUT" || event.target.nodeName === "TEXTAREA";
	},

	expEval (str) {
		// eslint-disable-next-line no-new-func
		return new Function(`return ${str.replace(/[^-()\d/*+.]/g, "")}`)();
	},

	parseNumberRange (input, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
		function errInvalid (input) {
			throw new Error(`Could not parse range input "${input}"`);
		}

		function errOutOfRange () {
			throw new Error(`Number was out of range! Range was ${min}-${max} (inclusive).`);
		}

		function isOutOfRange (num) {
			return num < min || num > max;
		}

		function addToRangeVal (range, num) {
			range.add(num);
		}

		function addToRangeLoHi (range, lo, hi) {
			for (let i = lo; i <= hi; ++i) range.add(i);
		}

		while (true) {
			if (input && input.trim()) {
				const clean = input.replace(/\s*/g, "");
				if (/^((\d+-\d+|\d+),)*(\d+-\d+|\d+)$/.exec(clean)) {
					const parts = clean.split(",");
					const out = new Set();

					for (const part of parts) {
						if (part.includes("-")) {
							const spl = part.split("-");
							const numLo = Number(spl[0]);
							const numHi = Number(spl[1]);

							if (isNaN(numLo) || isNaN(numHi) || numLo === 0 || numHi === 0 || numLo > numHi) errInvalid();

							if (isOutOfRange(numLo) || isOutOfRange(numHi)) errOutOfRange();

							if (numLo === numHi) addToRangeVal(out, numLo);
							else addToRangeLoHi(out, numLo, numHi);
						} else {
							const num = Number(part);
							if (isNaN(num) || num === 0) errInvalid();
							else {
								if (isOutOfRange(num)) errOutOfRange();
								addToRangeVal(out, num);
							}
						}
					}

					return out;
				} else errInvalid();
			} else return null;
		}
	},

	MONTH_NAMES: [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	],
	dateToStr (date, short) {
		const month = MiscUtil.MONTH_NAMES[date.getMonth()];
		return `${short ? month.substring(0, 3) : month} ${date.getDate()}, ${date.getFullYear()}`;
	},

	findCommonPrefix (strArr) {
		let prefix = null;
		strArr.forEach(s => {
			if (prefix == null) {
				prefix = s;
			} else {
				const minLen = Math.min(s.length, prefix.length);
				for (let i = 0; i < minLen; ++i) {
					const cp = prefix[i];
					const cs = s[i];
					if (cp !== cs) {
						prefix = prefix.substring(0, i);
						break;
					}
				}
			}
		});
		return prefix;
	},

	/**
	 * @param fgHexTarget Target/resultant color for the foreground item
	 * @param fgOpacity Desired foreground transparency (0-1 inclusive)
	 * @param bgHex Background color
	 */
	calculateBlendedColor (fgHexTarget, fgOpacity, bgHex) {
		const fgDcTarget = CryptUtil.hex2Dec(fgHexTarget);
		const bgDc = CryptUtil.hex2Dec(bgHex);
		return ((fgDcTarget - ((1 - fgOpacity) * bgDc)) / fgOpacity).toString(16);
	},

	/**
	 * @param func The function to debounce.
	 * @param waitTime Minimum duration between calls.
	 * @param immediate Trigger on leading edge, as opposed to trailing.
	 * @return {Function} The debounced function.
	 */
	debounce (func, waitTime, immediate) {
		let timeout;
		return function () {
			const context = this;
			const args = arguments;

			const later = function () {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};

			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, waitTime);
			if (callNow) func.apply(context, args);
		};
	},

	pDelay (msecs) {
		return new Promise(resolve => setTimeout(() => resolve(), msecs));
	}
};

JqueryUtil = {
	initEnhancements () {
		JqueryUtil.addSelectors();

		/**
		 * Template strings which can contain jQuery objects.
		 * Usage: $$`<div>Press this button: ${$btn}</div>`
		 */
		window.$$ = function (parts, ...args) { // TODO use this instead of .swap()
			const $eles = [];
			let ixArg = 0;

			const handleArg = (arg) => {
				if (arg instanceof $) {
					// TODO inject appropriate elements for the parent and remove "slot" specifier on replace selector
					// the places where these would be inserted usually can't support <slot>
					// TODO also doesn't work inside <select>
					if (arg.is("tr") || arg.is("td") || arg.is("th")) throw new Error(`Unsupported element type "${arg[0].tagName}"!`);
					$eles.push(arg);
					return `<slot data-r=true></slot>`;
				} else if (arg instanceof HTMLElement) {
					return handleArg($(arg));
				} else return arg
			};

			const raw = parts.reduce((html, p) => {
				const myIxArg = ixArg++;
				if (args[myIxArg] == null) return `${html}${p}`;
				if (args[myIxArg] instanceof Array) return `${html}${args[myIxArg].map(arg => handleArg(arg)).join("")}${p}`;
				else return `${html}${handleArg(args[myIxArg])}${p}`;
			});
			const $res = $(raw);
			$res.find(`slot[data-r=true]`).replaceWith(i => $eles[i]);
			return $res;
		};

		$.fn.extend({
			/**
			 * Has two modes; either:
			 * Takes a jQuery object and replaces elements with `data-r-<n>` with the nth position arg, e.g.
			 * $(`<div><div>my <span>initial</span> html <div data-r="0"/> <div data-r="1"/></div>`)
			 *
			 * or:
			 * Takes a jQuery object and replaces elements with `data-r-<id>` with the element at key id
			 * $(`<div><div>my <span>initial</span> html <div data-r="foo"/> <div data-r="bar"/></div>`)
			 */
			swap: function (...$toSwap) {
				if ($toSwap.length === 1 && !($toSwap[0] instanceof jQuery)) {
					Object.entries($toSwap[0]).forEach(([k, $v]) => {
						this.find(`[data-r="${k}"]`).replaceWith($v);
					});
				} else {
					$toSwap.forEach(ts => {
						this.find(`[data-r]`).first().replaceWith(ts);
					});
				}

				return this;
			},

			disableSpellcheck: function () {
				this.attr("autocomplete", "off").attr("autocapitalize", "off").attr("spellcheck", "false");
				return this;
			}
		});

		$.event.special.destroyed = {
			remove: function (o) {
				if (o.handler) o.handler();
			}
		}
	},

	addSelectors () {
		// Add a selector to match exact text (case insensitive) to jQuery's arsenal
		$.expr[':'].textEquals = (el, i, m) => {
			const searchText = m[3];
			const match = $(el).text().toLowerCase().trim().match(`^${RegExp.escape(searchText.toLowerCase().trim())}( [a-z0-9, ]+$)?$`);
			return match && match.length > 0;
		};

		// Add a selector to match contained text (case insensitive)
		$.expr[':'].containsInsensitive = (el, i, m) => {
			const searchText = m[3];
			const textNode = $(el).contents().filter((i, e) => {
				return e.nodeType === 3;
			})[0];
			if (!textNode) return false;
			const match = textNode.nodeValue.toLowerCase().trim().match(`${RegExp.escape(searchText.toLowerCase().trim())}`);
			return match && match.length > 0;
		};
	},

	showCopiedEffect ($ele, text = "Copied!", bubble) {
		const $temp = $(`<div class="copied-tip"><span>${text}</span></div>`).appendTo($(`body`));
		const offset = $temp.width() / 2;
		const top = $(window).scrollTop();
		const pos = $ele.offset();

		const animationOptions = {
			top: "-=8",
			opacity: 0
		};
		if (bubble) {
			animationOptions.left = `${Math.random() > 0.5 ? "-" : "+"}=${~~(Math.random() * 17)}`;
		}
		const seed = Math.random();
		const duration = bubble ? 250 + seed * 200 : 250;

		$temp.css({
			top: bubble ? (pos.top - 5) - top : (pos.top - 17) - top,
			left: pos.left - offset + ($ele.width() / 2)
		}).animate(
			animationOptions,
			{
				easing: "linear",
				duration,
				complete: () => $temp.remove(),
				progress: (_, progress) => { // progress is 0..1
					if (bubble) {
						const diffProgress = 0.5 - progress;
						animationOptions.top = `${diffProgress > 0 ? "-" : "+"}=40`;
						$temp.css("transform", `rotate(${seed > 0.5 ? "-" : ""}${seed * 500 * progress}deg)`);
					}
				}
			}
		);
	},

	_dropdownInit: false,
	bindDropdownButton ($ele) {
		if (!JqueryUtil._dropdownInit) {
			JqueryUtil._dropdownInit = true;
			document.addEventListener("click", () => [...document.querySelectorAll(`.open`)].filter(ele => !(ele.className || "").split(" ").includes(`dropdown--navbar`)).forEach(ele => ele.classList.remove("open")));
		}
		$ele.click(() => setTimeout(() => $ele.parent().addClass("open"), 1)); // defer to allow the above to complete
	},

	_activeToast: [],
	/**
	 * @param {Object} options
	 * @param {(jQuery|string)} options.content Toast contents. Support jQuery objects.
	 * @param {string} options.type Toast type. Can be any Bootstrap alert type ("success", "info", "warning", or "danger")
	 */
	doToast (options) {
		if (typeof options === "string") {
			options = {
				content: options,
				type: "info"
			};
		}
		options.type = options.type || "info";

		const doCleanup = ($toast) => {
			$toast.removeClass("toast--animate");
			setTimeout(() => $toast.remove(), 85);
			JqueryUtil._activeToast.splice(JqueryUtil._activeToast.indexOf($toast), 1);
		};

		const $btnToastDismiss = $(`<button class="btn toast__btn-close"><span class="glyphicon glyphicon-remove"/></button>`)
			.click(() => doCleanup($toast));

		const $toast = $(`
				<div class="toast alert-${options.type}">
					<div class="toast__wrp-content"><div data-r="$content"/></div>
					<div class="toast__wrp-control"><div data-r="$btnToastDismiss"/></div>
				</div>
			`)
			.swap({$content: options.content, $btnToastDismiss})
			.prependTo($(`body`))
			.data("pos", 0);

		setTimeout(() => $toast.addClass(`toast--animate`), 5);
		setTimeout(() => doCleanup($toast), 5000);

		if (JqueryUtil._activeToast.length) {
			JqueryUtil._activeToast.forEach($oldToast => {
				const pos = $oldToast.data("pos");
				$oldToast.data("pos", pos + 1);
				if (pos === 2) doCleanup($oldToast);
			});
		}

		JqueryUtil._activeToast.push($toast);
	}
};
if (typeof window !== "undefined") window.addEventListener("load", JqueryUtil.initEnhancements);


// STORAGE =============================================================================================================
// Dependency: localforage
StorageUtil = {
	_init: false,
	_initAsync: false,
	_fakeStorage: {},
	_fakeStorageAsync: {},

	getSyncStorage: () => {
		if (StorageUtil._init) {
			if (StorageUtil.__fakeStorage) return StorageUtil._fakeStorage;
			else return window.localStorage;
		}

		StorageUtil._init = true;

		try {
			return window.localStorage;
		} catch (e) {
			// if the user has disabled cookies, build a fake version
			StorageUtil.__fakeStorage = true;
			StorageUtil._fakeStorage = {
				isSyncFake: true,
				getItem: (k) => {
					return StorageUtil.__fakeStorage[k];
				},
				removeItem: (k) => {
					delete StorageUtil.__fakeStorage[k];
				},
				setItem: (k, v) => {
					StorageUtil.__fakeStorage[k] = v;
				}
			};
			return StorageUtil._fakeStorage;
		}
	},

	async getAsyncStorage () {
		if (StorageUtil._initAsync) {
			if (StorageUtil.__fakeStorageAsync) return StorageUtil._fakeStorageAsync;
			else return localforage;
		}

		StorageUtil._initAsync = true;

		try {
			await localforage.setItem("_storage_check", true);
			return localforage;
		} catch (e) {
			StorageUtil.__fakeStorageAsync = true;
			StorageUtil._fakeStorageAsync = {
				pIsAsyncFake: true,
				async setItem (k, v) {
					StorageUtil.__fakeStorageAsync[k] = v;
				},
				async getItem (k) {
					return StorageUtil.__fakeStorageAsync[k];
				},
				async remove (k) {
					delete StorageUtil.__fakeStorageAsync[k];
				}
			};
			return StorageUtil._fakeStorageAsync;
		}
	},

	// SYNC METHODS ////////////////////////////////////////////////////////////////////////////////////////////////////
	// Synchronous localStorage access, which should only be used for small amounts of data (metadata, config, etc)
	syncGet (key) {
		const rawOut = StorageUtil.getSyncStorage().getItem(key);
		if (rawOut && rawOut !== "undefined" && rawOut !== "null") return JSON.parse(rawOut);
		return null;
	},

	syncGetForPage (key) {
		return StorageUtil.syncGet(`${key}_${UrlUtil.getCurrentPage()}`);
	},

	syncSet (key, value) {
		StorageUtil.getSyncStorage().setItem(key, JSON.stringify(value));
		StorageUtil._syncTrackKey(key)
	},

	syncSetForPage (key, value) {
		StorageUtil.syncSet(`${key}_${UrlUtil.getCurrentPage()}`, value);
	},

	syncRemove (key) {
		StorageUtil.getSyncStorage().removeItem(key);
		StorageUtil._syncTrackKey(key, true);
	},

	isSyncFake () {
		return !!StorageUtil.getSyncStorage().isSyncFake
	},

	_syncTrackKey (key, isRemove) {
		const meta = StorageUtil.syncGet(StorageUtil._META_KEY) || {};
		if (isRemove) delete meta[key];
		else meta[key] = 1;
		StorageUtil.getSyncStorage().setItem(StorageUtil._META_KEY, JSON.stringify(meta));
	},

	syncGetDump () {
		const out = {};
		const meta = StorageUtil.syncGet(StorageUtil._META_KEY) || {};
		Object.entries(meta).filter(([key, isPresent]) => isPresent).forEach(([key]) => out[key] = StorageUtil.syncGet(key));
		return out;
	},

	syncSetFromDump (dump) {
		Object.entries(dump).forEach(([k, v]) => StorageUtil.syncSet(k, v));
	},
	// END SYNC METHODS ////////////////////////////////////////////////////////////////////////////////////////////////

	async pIsAsyncFake () {
		const storage = await StorageUtil.getAsyncStorage();
		return !!storage.pIsAsyncFake;
	},

	async pSetForPage (key, value) {
		const storage = await StorageUtil.getAsyncStorage();
		return storage.setItem(`${key}_${UrlUtil.getCurrentPage()}`, value);
	},

	async pSet (key, value) {
		StorageUtil._pTrackKey(key);
		const storage = await StorageUtil.getAsyncStorage();
		return storage.setItem(key, value);
	},

	async pGetForPage (key) {
		const storage = await StorageUtil.getAsyncStorage();
		return storage.getItem(`${key}_${UrlUtil.getCurrentPage()}`);
	},

	async pGet (key) {
		const storage = await StorageUtil.getAsyncStorage();
		return storage.getItem(key);
	},

	async pRemoveForPage (key) {
		const storage = await StorageUtil.getAsyncStorage();
		return storage.removeItem(`${key}_${UrlUtil.getCurrentPage()}`);
	},

	async pRemove (key) {
		StorageUtil._pTrackKey(key, true);
		const storage = await StorageUtil.getAsyncStorage();
		return storage.removeItem(key);
	},

	async _pTrackKey (key, isRemove) {
		const storage = await StorageUtil.getAsyncStorage();
		const meta = (await StorageUtil.pGet(StorageUtil._META_KEY)) || {};
		if (isRemove) delete meta[key];
		else meta[key] = 1;
		storage.setItem(StorageUtil._META_KEY, meta);
	},

	async pGetDump () {
		const out = {};
		const meta = (await StorageUtil.pGet(StorageUtil._META_KEY)) || {};
		await Promise.all(Object.entries(meta).filter(([key, isPresent]) => isPresent).map(async ([key]) => out[key] = await StorageUtil.pGet(key)));
		return out;
	},

	async pSetFromDump (dump) {
		return Promise.all(Object.entries(dump).map(([k, v]) => StorageUtil.pSet(k, v)));
	}
};
StorageUtil._META_KEY = "_STORAGE_META_STORAGE";
StorageUtil.getSyncStorage();

// ROLLING =============================================================================================================
RollerUtil = {
	isCrypto: () => {
		return typeof window !== "undefined" && typeof window.crypto !== "undefined";
	},

	randomise: (max, min = 1) => {
		if (min > max) return 0;
		if (max === min) return max;
		if (RollerUtil.isCrypto()) {
			return RollerUtil._randomise(min, max + 1);
		} else {
			return RollerUtil.roll(max) + min;
		}
	},

	rollOnArray (array) {
		return array[RollerUtil.randomise(array.length) - 1]
	},

	/**
	 * Cryptographically secure RNG
	 */
	_randomise: (min, max) => {
		const range = max - min;
		const bytesNeeded = Math.ceil(Math.log2(range) / 8);
		const randomBytes = new Uint8Array(bytesNeeded);
		const maximumRange = Math.pow(Math.pow(2, 8), bytesNeeded);
		const extendedRange = Math.floor(maximumRange / range) * range;
		let i;
		let randomInteger;
		while (true) {
			window.crypto.getRandomValues(randomBytes);
			randomInteger = 0;
			for (i = 0; i < bytesNeeded; i++) {
				randomInteger <<= 8;
				randomInteger += randomBytes[i];
			}
			if (randomInteger < extendedRange) {
				randomInteger %= range;
				return min + randomInteger;
			}
		}
	},

	/**
	 * Result in range: 0 to (max-1); inclusive
	 * e.g. roll(20) gives results ranging from 0 to 19
	 * @param max range max (exclusive)
	 * @param fn funciton to call to generate random numbers
	 * @returns {number} rolled
	 */
	roll: (max, fn = Math.random) => {
		return Math.floor(fn() * max);
	},

	addListRollButton: () => {
		const listWrapper = $("#listcontainer");

		const $btnRoll = $(`<button class="btn btn-default" id="feelinglucky" title="試試手氣？"><span class="glyphicon glyphicon-random"></span></button>`);
		$btnRoll.on("click", () => {
			if (listWrapper.data("lists")) {
				const allLists = listWrapper.data("lists").filter(l => l.visibleItems.length);
				if (allLists.length) {
					const rollX = RollerUtil.roll(allLists.length);
					const list = allLists[rollX];
					const rollY = RollerUtil.roll(list.visibleItems.length);
					window.location.hash = $(list.visibleItems[rollY].elm).find(`a`).prop("hash");
				}
			}
		});

		$(`#filter-search-input-group`).find(`#reset`).before($btnRoll);
	},

	isRollCol (colLabel) {
		if (typeof colLabel !== "string") return false;
		if (/^{@dice [^}]+}$/.test(colLabel.trim())) return true;
		return !!Renderer.dice.parseToTree(colLabel);
	},

	_DICE_REGEX_STR: "((([1-9]\\d*)?d([1-9]\\d*)(\\s*?[-+×x*]\\s*?(\\d,\\d|\\d)+)?))+?"
};
RollerUtil.DICE_REGEX = new RegExp(RollerUtil._DICE_REGEX_STR, "g");
RollerUtil.REGEX_DAMAGE_DICE = /(\d+)( \((?:{@dice |{@damage ))([-+0-9d ]*)(}\) [a-z]+( \([-a-zA-Z0-9 ]+\))?( or [a-z]+( \([-a-zA-Z0-9 ]+\))?)? damage)/gi;
RollerUtil.REGEX_DAMAGE_FLAT = /(Hit: |{@h})([0-9]+)( [a-z]+( \([-a-zA-Z0-9 ]+\))?( or [a-z]+( \([-a-zA-Z0-9 ]+\))?)? damage)/gi;


// STRING ==============================================================================================================
String.prototype.uppercaseFirst = String.prototype.uppercaseFirst ||
	function () {
		const str = this.toString();
		if (str.length === 0) return str;
		if (str.length === 1) return str.charAt(0).toUpperCase();
		return str.charAt(0).toUpperCase() + str.slice(1);
	};

String.prototype.lowercaseFirst = String.prototype.lowercaseFirst ||
	function () {
		const str = this.toString();
		if (str.length === 0) return str;
		if (str.length === 1) return str.charAt(0).toLowerCase();
		return str.charAt(0).toLowerCase() + str.slice(1);
	};

String.prototype.toTitleCase = String.prototype.toTitleCase ||
	function () {
		let str;
		str = this.replace(/([^\W_]+[^\s-/]*) */g, function (txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});

		if (!StrUtil._TITLE_LOWER_WORDS_RE) {
			StrUtil._TITLE_LOWER_WORDS_RE = StrUtil.TITLE_LOWER_WORDS.map(it => new RegExp(`\\s${it}\\s`, 'g'));
		}

		for (let i = 0; i < StrUtil.TITLE_LOWER_WORDS.length; i++) {
			str = str.replace(
				StrUtil._TITLE_LOWER_WORDS_RE[i],
				(txt) => {
					return txt.toLowerCase();
				});
		}

		if (!StrUtil._TITLE_UPPER_WORDS_RE) {
			StrUtil._TITLE_UPPER_WORDS_RE = StrUtil.TITLE_UPPER_WORDS.map(it => new RegExp(`\\b${it}\\b`, 'g'));
		}

		for (let i = 0; i < StrUtil.TITLE_UPPER_WORDS.length; i++) {
			str = str.replace(
				StrUtil._TITLE_UPPER_WORDS_RE[i],
				StrUtil.TITLE_UPPER_WORDS[i].toUpperCase()
			);
		}

		return str;
	};

String.prototype.escapeQuotes = String.prototype.escapeQuotes ||
	function () {
		return this.replace(/'/g, `&singlequot;`).replace(/"/g, `&quot;`);
	};
String.prototype.unescapeQuotes = String.prototype.unescapeQuotes ||
	function () {
		return this.replace(/&singlequot;/g, "\'").replace(/&quot;/g, "\"");
	};
String.prototype.isNumeric = String.prototype.isNumeric ||
	function () {
		return !isNaN(parseFloat(this)) && isFinite(this);
	};
String.prototype.last = String.prototype.last ||
	function () {
		return this[this.length - 1];
	};

RegExp.escape = function (string) {
	return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};
Array.prototype.last = function () {
		return this[this.length - 1];
	};
Array.prototype.flat = Array.prototype.flat ||
	function () {
		function flattenDeep (arr) {
			return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
		}
		return flattenDeep(this);
	};

function noModifierKeys (e) {
	return !e.ctrlKey && !e.altKey && !e.metaKey;
}
