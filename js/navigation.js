"use strict";

class NavBar {
	static init () {
		// render the visible elements ASAP
		window.addEventListener(
			"DOMContentLoaded",
			function () {
				NavBar.initElements();
				NavBar.highlightCurrentPage();
			}
		);
		window.addEventListener("load", NavBar.initHandlers);
	}

	static initElements () {
		const navBar = document.getElementById("navbar");
		
		const ulHome = addDropdown(navBar, FMT("nav_home"));
		addLi(ulHome, "index.html", FMT("nav_home"));
		addLi(ulHome, "document.html", FMT("pep_talk"));
		
		// Getting Started
		addLi(navBar, "document.html", FMT("section_0"), true, "getting_started");
		
		// Building Pilots and Mechs
		const ulBuild = addDropdown(navBar, FMT("section_1"));
		addLi(ulBuild, "document.html", FMT("section_1"), true, "building_pilots_and_mechs");	
		addLi(ulBuild, "backgrounds.html", FMT("backgrounds"));
		
		// Mission, Uptime and Downtime
		addLi(navBar, "document.html", FMT("section_2"), true, "missions_uptime_and_downtime");
		
		// Mech Combat
		const ulCombat = addDropdown(navBar, FMT("section_3"));
		addLi(ulCombat, "document.html", FMT("section_3"), true, "mech_combat");
		addLi(ulCombat, "actions.html", FMT("actions"));
		addLi(ulCombat, "effects.html", FMT("effects"));
		addLi(ulCombat, "terminology.html", FMT("terminology"));
		
		// Compendium

		/*
		// single link & parameter
		addLi(navBar, "(url)", FMT("nav_basic_rules"), true, "basic");
		*/
		// dropdown
		const ulComp = addDropdown(navBar, FMT("section_4"));
		//addLi(ulExample, "data-page.html", "Data-page Example");
		//addDivider(ulExample);
		addLi(ulComp, "document.html", FMT("section_4"), true, "compendium");
		addLi(ulComp, "talents.html", FMT("talents"));
		addLi(ulComp, "tags.html", FMT("tags"));
		addLi(ulComp, "gears.html", FMT("gears"));

		// License
		addLi(navBar, "document.html", FMT("title_license"), true, "licensing");

		// Settings
		const ulSettings = addDropdown(navBar, FMT("nav_settings"));
		addButton(
			ulSettings,
			{
				html: styleSwitcher.getActiveStyleSheet() === StyleSwitcher.STYLE_DAY ? FMT("night_mode") : FMT("day_mode"),
				click: (evt) => {
					evt.preventDefault();
					styleSwitcher.toggleActiveStyleSheet();
				},
				className: "nightModeToggle"
			}
		);
		const ulLanguage = addDropdown(ulSettings, FMT("set_language"), true);
		addButton(
			ulLanguage,
			{
				html: "繁體中文",
				click: (evt) => {
					evt.preventDefault();
					languageParser.setActiveLanguage("tw");
					window.location.reload();
				},
			}
		);
		addButton(
			ulLanguage,
			{
				html: "English",
				click: (evt) => {
					evt.preventDefault();
					languageParser.setActiveLanguage("en");
					window.location.reload();
				},
			}
		);

		/**
		 * Adds a new item to the navigation bar. Can be used either in root, or in a different UL.
		 * @param appendTo - Element to append this link to.
		 * @param aHref - Where does this link to.
		 * @param aText - What text does this link have.
		 * @param [isSide] - True if this item
		 * @param [aHash] - Optional hash to be appended to the base href
		 */
		function addLi (appendTo, aHref, aText, isSide, aHash) {
			const hashPart = aHash ? `#${aHash}`.toLowerCase() : "";

			const li = document.createElement("li");
			li.setAttribute("role", "presentation");
			li.setAttribute("id", aText.toLowerCase().replace(/\s+/g, ""));
			li.setAttribute("data-page", `${aHref}${hashPart}`);
			if (isSide) {
				li.onmouseenter = function () { NavBar.handleSideItemMouseEnter(this) }
			} else {
				li.onmouseenter = function () { NavBar.handleItemMouseEnter(this) };
				li.onclick = function () { NavBar._dropdowns.forEach(ele => ele.classList.remove("open")) }
			}

			const a = document.createElement("a");
			a.href = `${aHref}${hashPart}`;
			a.innerHTML = aText;

			li.appendChild(a);
			appendTo.appendChild(li);
		}

		function addDivider (appendTo) {
			const li = document.createElement("li");
			li.setAttribute("role", "presentation");
			li.className = "divider";

			appendTo.appendChild(li);
		}

		/**
		 * Adds a new dropdown starting list to the navigation bar
		 * @param {String} appendTo - Element to append this link to.
		 * @param {String} text - Dropdown text.
		 * @param {boolean} [isSide=false] - If this is a sideways dropdown.
		 */
		function addDropdown (appendTo, text, isSide = false) {
			const li = document.createElement("li");
			li.setAttribute("role", "presentation");
			li.className = "dropdown dropdown--navbar";
			if (isSide) {
				li.onmouseenter = function () { NavBar.handleSideItemMouseEnter(this); };
			} else {
				li.onmouseenter = function () { NavBar.handleItemMouseEnter(this); };
			}

			const a = document.createElement("a");
			a.className = "dropdown-toggle";
			a.href = "#";
			a.setAttribute("role", "button");
			a.onclick = function (event) { NavBar.handleDropdownClick(this, event, isSide); };
			if (isSide) {
				a.onmouseenter = function () { NavBar.handleSideDropdownMouseEnter(this); };
				a.onmouseleave = function () { NavBar.handleSideDropdownMouseLeave(this); };
			}
			a.innerHTML = `${text} <span class="caret ${isSide ? "caret--right" : ""}"></span>`;

			const ul = document.createElement("li");
			ul.className = `dropdown-menu ${isSide ? "dropdown-menu--side" : ""}`;
			ul.onclick = function (event) { event.stopPropagation(); };

			li.appendChild(a);
			li.appendChild(ul);
			appendTo.appendChild(li);
			return ul;
		}

		/**
		 * Special LI for buttong
		 * @param appendTo The element to append to.
		 * @param options Options.
		 * @param options.html Button text.
		 * @param options.click Button click handler.
		 * @param options.title Button title.
		 * @param options.className Additional button classes.
		 */
		function addButton (appendTo, options) {
			const li = document.createElement("li");
			li.setAttribute("role", "presentation");

			const a = document.createElement("a");
			a.href = "#";
			if (options.className) a.className = options.className;
			a.onclick = options.click;
			a.innerHTML = options.html;

			if (options.title) li.setAttribute("title", options.title);

			li.appendChild(a);
			appendTo.appendChild(li);
		}
	}

	static highlightCurrentPage () {
		let currentPage = window.location.pathname;
		currentPage = currentPage.substr(currentPage.lastIndexOf("/") + 1);

		if (!currentPage) currentPage = "index.html";

		let isSecondLevel = false;
		if (currentPage.toLowerCase() === "document.html") {
			const hashPart = window.location.hash.split(",")[0];
			currentPage += hashPart.toLowerCase();
		}

		try {
			let current = document.querySelector(`li[data-page="${currentPage}"]`);
			current.parentNode.childNodes.forEach(n => n.classList && n.classList.remove("active"));
			current.classList.add("active");



			let closestLi = current.parentNode;
			const setNearestParentActive = () => {
				while (closestLi !== null && (closestLi.nodeName !== "LI" || !closestLi.classList.contains("dropdown"))) closestLi = closestLi.parentNode;
				closestLi && closestLi.classList.add("active");
			};
			setNearestParentActive();
			if (isSecondLevel) {
				closestLi = closestLi.parentNode;
				setNearestParentActive();
			}
		} catch (ignored) { setTimeout(() => { throw ignored }); }
	}

	static initHandlers () {
		NavBar._dropdowns = [...document.getElementById("navbar").querySelectorAll(`li.dropdown--navbar`)];
		document.addEventListener("click", () => NavBar._dropdowns.forEach(ele => ele.classList.remove("open")));
		document.addEventListener("mousemove", evt => {
			NavBar._mouseX = evt.clientX;
			NavBar._mouseY = evt.clientY;
		});

		NavBar._clearAllTimers();
	}

	static handleDropdownClick (ele, event, isSide) {
		event.preventDefault();
		event.stopPropagation();
		if (isSide) return;
		NavBar._openDropdown(ele);
	}

	static _openDropdown (fromLink) {
		const noRemove = new Set();
		let parent = fromLink.parentNode;
		parent.classList.add("open");
		noRemove.add(parent);

		while (parent.nodeName !== "NAV") {
			parent = parent.parentNode;
			if (parent.nodeName === "LI") {
				parent.classList.add("open");
				noRemove.add(parent);
			}
		}

		NavBar._dropdowns.filter(ele => !noRemove.has(ele)).forEach(ele => ele.classList.remove("open"));
	}

	static handleItemMouseEnter (ele) {
		const $ele = $(ele);
		const timerIds = $ele.siblings("[data-timer-id]").map((i, e) => ({$ele: $(e), timerId: $(e).data("timer-id")})).get();
		timerIds.forEach(({$ele, timerId}) => {
			if (NavBar._timersOpen[timerId]) {
				clearTimeout(NavBar._timersOpen[timerId]);
				delete NavBar._timersOpen[timerId];
			}

			if (!NavBar._timersClose[timerId] && $ele.hasClass("open")) {
				const getTimeoutFn = () => {
					if (NavBar._timerMousePos[timerId]) {
						const [xStart, yStart] = NavBar._timerMousePos[timerId];
						// for generalised use, this should be made check against the bounding box for the side menu
						// and possibly also check Y pos; e.g.
						// || NavBar._mouseY > yStart + NavBar.MIN_MOVE_PX
						if (NavBar._mouseX > xStart + NavBar.MIN_MOVE_PX) {
							NavBar._timerMousePos[timerId] = [NavBar._mouseX, NavBar._mouseY];
							NavBar._timersClose[timerId] = setTimeout(() => getTimeoutFn(), NavBar.DROP_TIME / 2);
						} else {
							$ele.removeClass("open");
							delete NavBar._timersClose[timerId];
						}
					} else {
						$ele.removeClass("open");
						delete NavBar._timersClose[timerId];
					}
				};

				NavBar._timersClose[timerId] = setTimeout(() => getTimeoutFn(), NavBar.DROP_TIME);
			}
		});
	}

	static handleSideItemMouseEnter (ele) {
		const timerId = $(ele).closest(`li.dropdown`).data("timer-id");
		if (NavBar._timersClose[timerId]) {
			clearTimeout(NavBar._timersClose[timerId]);
			delete NavBar._timersClose[timerId];
			delete NavBar._timerMousePos[timerId];
		}
	}

	static handleSideDropdownMouseEnter (ele) {
		const $ele = $(ele);
		const timerId = $ele.parent().data("timer-id") || NavBar._timerId++;
		$ele.parent().attr("data-timer-id", timerId);

		if (NavBar._timersClose[timerId]) {
			clearTimeout(NavBar._timersClose[timerId]);
			delete NavBar._timersClose[timerId];
		}

		if (!NavBar._timersOpen[timerId]) {
			NavBar._timersOpen[timerId] = setTimeout(() => {
				NavBar._openDropdown(ele);
				delete NavBar._timersOpen[timerId];
				NavBar._timerMousePos[timerId] = [NavBar._mouseX, NavBar._mouseY];
			}, NavBar.DROP_TIME);
		}
	}

	static handleSideDropdownMouseLeave (ele) {
		const $ele = $(ele);
		if (!$ele.parent().data("timer-id")) return;
		const timerId = $ele.parent().data("timer-id");
		clearTimeout(NavBar._timersOpen[timerId]);
		delete NavBar._timersOpen[timerId];
	}

	static _clearAllTimers () {
		Object.entries(NavBar._timersOpen).forEach(([k, v]) => {
			clearTimeout(v);
			delete NavBar._timersOpen[k];
		});
	}
}

NavBar.DROP_TIME = 250;
NavBar.MIN_MOVE_PX = 7;
NavBar._timerId = 1;
NavBar._timersOpen = {};
NavBar._timersClose = {};
NavBar._timerMousePos = {};
NavBar._mouseX = null;
NavBar._mouseY = null;
NavBar.init();
