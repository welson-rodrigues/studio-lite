import Stats from './thirdparty/three/stats.module.js';
import {
	StudioLiteRenderer,
	partClasses
} from './rendering/StudioLiteRenderer.js';
import {
	sleep,
	rgbToHex
} from './etc/Helpers.js';

const titleBar = document.body.querySelector(".title-bar");
const sstat = document.body.querySelector("#menuitem-stats");
const saxes = document.body.querySelector("#menuitem-axes");
const sbx2 = document.body.querySelector("#menuitem-hoverbox");
const sbox = document.body.querySelector("#menuitem-selectionbox");
const szoom = document.body.querySelector("#menuitem-zoomto");
const ssky = document.body.querySelector("#menuitem-skybox");
const log = document.body.querySelector(".log");
const msg = document.body.querySelector(".message");
const editor = document.body.querySelector(".editor");
const bar = document.body.querySelector(".status-bar-field > *[role=progressbar]");
const status = document.body.querySelector(".status-bar-field.status");
const menurender = document.body.querySelector("#menuitem-renderimage");
menurender.setAttribute("aria-disabled", true);
let sal = document.body.querySelector(".onboarding");
let statusLastText = "Ready";
szoom.setAttribute("aria-disabled", true);

var jsTreeData = [];

var ExplorerOpen = true;
var PropertiesOpen = true;
var ConsoleOpen = true;

const PANEL_WIDTH = 400;
const CONSOLE_TOTAL_HEIGHT = 200;
const TOP_CHROME_HEIGHT = 29 + 29;
const STATUS_BAR_HEIGHT = 25;

const threeIcons = {
	"AmbientLight": "Lighting",
	"DirectionalLight": "Lighting",
	"Mesh": "Part",
	"BoxHelper": "SelectionBox"
}

function threeNodeToTreeData(node) {
	let data = [];
	for (const child of node) {
		data.push({
			node: child,
			text: child.name.length > 0 ? child.name : child.type,
			icon: `content/icons/${threeIcons[child.type] ? threeIcons[child.type] : "BaseScript"}.png`,
			children: threeNodeToTreeData(child.children)
		});
	}
	return data;
}
let treeRefresh2 = () => { };

function isMobile() {
	return window.innerWidth < 768;
}

function getRightPaneWidth() {
	if (isMobile()) return (ExplorerOpen || PropertiesOpen) ? window.innerWidth : 0;
	return (ExplorerOpen || PropertiesOpen) ? PANEL_WIDTH : 0;
}

function getConsoleHeight() {
	if (!ConsoleOpen) return 0;
	return isMobile() ? Math.min(Math.round(window.innerHeight * 0.4), CONSOLE_TOTAL_HEIGHT) : CONSOLE_TOTAL_HEIGHT;
}

function getWorkspaceWidth() {
	return Math.max(0, window.innerWidth - getRightPaneWidth());
}

function getWorkspaceHeight() {
	return Math.max(0, window.innerHeight - TOP_CHROME_HEIGHT - STATUS_BAR_HEIGHT - getConsoleHeight());
}

function syncLayoutVars() {
	document.body.style.setProperty("--workspace-right-width", `${getRightPaneWidth()}px`);
	document.body.style.setProperty("--workspace-console-height", `${getConsoleHeight()}px`);
	document.body.style.setProperty("--workspace-width", `${getWorkspaceWidth()}px`);
	document.body.style.setProperty("--workspace-height", `${getWorkspaceHeight()}px`);
}

let renderer = new StudioLiteRenderer({
	get width() {
		return getWorkspaceWidth();
	},
	get height() {
		return getWorkspaceHeight();
	},
	sharedFunctions: {
		print: print,
		treeRefresh2: () => { treeRefresh2(); }
	},
	sharedObjects: {
		jsTreeData: jsTreeData
	}
});
document.body.appendChild(renderer.domElement);

const stats = Stats();
document.body.appendChild(stats.dom);
stats.dom.id = "stats";
stats.dom.style.display = "none";
if (sstat.checked) stats.dom.style.display = "block";
sstat.addEventListener("input", () => {
	if (sstat.checked) {
		stats.dom.style.display = "block";
	} else {
		stats.dom.style.display = "none";
	}
});

let rendering = false;
var animate = function () {
	if (rendering) renderer.render();
	stats.update();
}

renderer.setAnimationLoop(animate);

function print(s) {
	const date = new Date();
	const el = document.createElement("span");
	const br = document.createElement("br");
	if (typeof s === "object") s = JSON.stringify(s);
	el.innerText = `${date.toLocaleTimeString("us")}.${date.getMilliseconds().toString().padStart(3, '0')} - ${s}`;
	log.appendChild(el);
	log.appendChild(br);
	log.scrollTo(0, log.scrollHeight);
}

window.console.log = (...args) => {
	let s = "";
	for (let t of args) {
		if (typeof t === "object") t = JSON.stringify(t);
		s += t + " ";
	}
	s = s.substring(0, s.length - 1).split("\n");
	for (const t of s) print(t);
}

function setTitle(t) {
	t = `${t} - Studio Lite (alpha-1)`;
	document.title = t;
	titleBar.querySelector(".title-bar-text").innerText = t;
}

let file = "";

let placeName = "Start Page";

function barError() {
	bar.classList.add("error");
}

function objToTreeData(obj) {
	let keys = Object.keys(obj);
	let data = [];
	for (let key of keys) {
		let d = {};
		d.text = key;
		if (typeof obj[key] === "object") {
			d.children = objToTreeData(obj[key]);
		} else {
			d.text += ": " + obj[key].toString();
			d.children = [];
		}
		data.push(d);
	}
	return data;
}

async function start() {
	bar.className = "marquee paused";
	status.innerText = "Busy";
	rendering = false;
	titleBar.classList.add("active");
	try { document.body.removeChild(document.body.querySelector("#remoteload")); } catch (ignored) { };
	document.body.removeChild(sal);
	sal = null;
	msg.querySelector("span").innerText = "Loading Place. Please wait...";
	msg.style.display = "flex";
	const url = new URL(file, window.location.href);
	try {
		if (typeof file === "string") {
			print(`DataModel Loading ${url}`);
			placeName = url.href.split("/").pop();
			status.innerText = `Fetching ${placeName}`;
			let fileData = null;
			try {
				fileData = await fetch(url);
				if (fileData.status !== 200) throw new Error();
			} catch (ignored) {
				print('Failed to fetch. Please reload.');
				barError();
				throw new Error("Failed to fetch. Please reload.");
			}
			window.data = await fileData.arrayBuffer();
			// we read it successfully, make the bar green from now on!
			bar.classList.remove("paused");
			status.innerText = `Loading ${placeName}`;
			await sleep(200);
		} else {
			print(`DataModel Loading ${file.name}`);
			placeName = file.name;
			status.innerText = `Fetching ${placeName}`;
			window.data = await file.arrayBuffer();
			// we read it successfully, make the bar green from now on!
			bar.classList.remove("paused");
			status.innerText = `Loading ${placeName}`;
			await sleep(200);
		}
	} catch (ignored) {
		print('The file could not be read. Please reload.');
		barError();
		throw new Error("The file could not be read. Please reload.");
	}
	setTitle(placeName);
	statusLastText = status.innerText;
	try {
		await renderer.loadPlace(window.data);
	} catch (ignored) {
		print('The file could not be read. Please reload.');
		barError();
		throw new Error("The file could not be read. Please reload.");
	}
	delete window.data;

	document.body.classList.add('ui-loaded');

	renderer.toggleAxes(saxes.checked);
	saxes.addEventListener("input", () => {
		renderer.toggleAxes(saxes.checked);
		treeRefresh2();
	})

	renderer.showSkybox(ssky.checked);
	ssky.addEventListener("input", () => {
		renderer.showSkybox(ssky.checked);
	})
	renderer.useSelectionBox = sbox.checked;
	sbox.addEventListener("input", () => {
		renderer.useSelectionBox = sbox.checked;
		renderer.removeSelectionBoxesIfNeeded();
	})
	renderer.useSelectionBox2 = sbx2.checked;
	sbx2.addEventListener("input", () => {
		renderer.useSelectionBox2 = sbx2.checked;
		renderer.removeSelectionBoxesIfNeeded();
	})

	$(".tree").jstree({
		'core': {
			'data': jsTreeData
		}
	});

	let treeRef = $(".tree").jstree(true);

	const zoomTo = () => {
		try {
			const instance = treeRef.get_selected(true)[0].original.instance;
			if (partClasses.indexOf(instance.ClassName) !== -1) {
				try {
					renderer.zoomTo(instance.CFrame || instance.CoordinateFrame, false);
				} catch (ignored) { };
			}
		} catch (ignored) { };
	};

	szoom.setAttribute("aria-disabled", true);
	szoom.addEventListener("click", zoomTo);
	document.addEventListener("keydown", e => {
		switch (e.code) {
			case "KeyF":
				zoomTo();
				break;
		}
	});

	const hiddenProperties = ["Children", "Source", "CollisionGroupData", "PhysicsGrid", "SmoothGrid", "MaterialColors"];
	const dropdownProperties = [
		"BackSurface", "BackSurfaceInput", "BottomSurfaceInput",
		"FrontSurface", "FrontSurfaceInput", "LeftSurface",
		"LeftSurfaceInput", "Material", "RightSurface",
		"RightSurfaceInput", "TopSurface", "TopSurfaceInput",
		"Shape", "Classic", "DevCameraOcclusionMode",
		"DevComputerCameraMovementMode", "DevComputerMovementMode", "DevTouchCameraMovementMode",
		"DevTouchMovementMode", "EnableDynamicHeads", "GameSettingsAvatar",
		"GameSettingsR15Collision", "ScreenOrientation", "VirtualCursorMode",
		"Technology", "VolumetricAudio", "AmbientReverb",
		"ClientAnimatorThrottling", "InterpolationThrottling", "InterpolationThrottling",
		"MeshPartHeadsAndAccessories", "ModelStreamingMode", "PhysicsSteppingMethod",
		"RejectCharacterDeletions", "ReplicateInstanceDestroySetting", "Retargeting",
		"StreamOutBehavior", "StreamingIntegrityMode", "Face",
		"RenderFidelity", "CameraType", "FieldOfViewMode",
		"RunContext", "SelectionBehaviorDown", "SelectionBehaviorLeft",
		"SelectionBehaviorRight", "SelectionBehaviorUp", "SizingMode",
		"ZIndexBehavior", "RollOffMode", "AutomaticSize",
		"BorderMode", "SizeConstraint", "Style",
		"LevelOfDetail", "HorizontalAlignment", "VerticalAlignment",
		"TextXAlignment", "TextYAlignment", "ScaleType",
		"AspectType", "DominantAxis", "BottomSurface",
		"CollisionType", "DisplayDistanceType", "HealthDisplayType",
		"NameOcclusion", "RigType"
	];
	const colorProperties = [
		"Color3", "TintColor", "Ambient", "ColorShift_Top", "ColorShift_Bottom",
		"FogColor", "OutdoorAmbient", "BackgroundColor3", "BorderColor3", "ImageColor3",
		"TextColor3", "PlaceholderColor3", "TextStrokeColor3"
	];

	function parsePropValue(prop, value) {
		switch (prop) {
			default:
				return value.toString();
		}
	}

	$('.tree').on("changed.jstree", async function (e, data) {
		const original = treeRef.get_node(data.selected[0]).original;
		let instance = original.instance;
		(async () => {
			if (original.id) renderer.updateSelectionBox(renderer.getThreeId(original.id));
		})();
		if (instance.CFrame) renderer.setAxesPosition(instance.CFrame.Position.X, instance.CFrame.Position.Y, instance.CFrame.Position.Z);
		if (partClasses.indexOf(instance.ClassName) !== -1 && (instance.CFrame || instance.CoordinateFrame))
			szoom.removeAttribute("aria-disabled");
		else
			szoom.setAttribute("aria-disabled", true);
		document.body.querySelector("#propertiesTitle").innerText = `Properties - ${instance.ClassName} "${instance.Name}"`;
		let keys = Object.keys(instance);
		let objviewIndex = 0;
		let treedatatemp = null;
		propTable.innerHTML = "";
		propSpinner.style.display = "block";
		propTable.style.display = "none";
		if (["Script", "LocalScript", "ModuleScript"].indexOf(instance.ClassName) !== -1) {
			setTitle(instance.Name);
			editor.style.display = "block";
			editor.innerHTML = "";
			const pre = document.createElement("pre");
			pre.innerText = instance.Source;
			editor.appendChild(pre);
			rendering = false;
		} else {
			rendering = true;
			setTitle(placeName);
			editor.innerHTML = "";
			editor.style.display = "none";
		}
		for (let key of keys) {
			if (hiddenProperties.indexOf(key) === -1) {
				let row = document.createElement("tr");
				let one = document.createElement("td");
				let two = document.createElement("td");
				one.innerText = key;
				if (typeof instance[key] === "object") {
					let objview = document.createElement("div");
					if (colorProperties.indexOf(key) !== -1) {
						const val = instance[key];
						let clr = document.createElement("input");
						clr.type = "color";
						clr.disabled = true;
						clr.value = rgbToHex(val.R * 255, val.G * 255, val.B * 255);
						two.appendChild(clr);
					}
					two.appendChild(objview);
					objview.id = `objview-${objviewIndex}`;
					treedatatemp = {
						'core': {
							'data': objToTreeData(instance[key])
						}
					};
				} else if ([true, false].indexOf(instance[key]) !== -1) {
					let chk = document.createElement("input");
					chk.disabled = "true";
					chk.type = "checkbox";
					chk.id = "checkbox-" + key;
					if (instance[key]) chk.checked = true;
					let txt = document.createElement("label");
					txt.for = "checkbox-" + key;
					two.appendChild(chk);
					two.appendChild(txt);
				} else if (typeof instance[key] === "number") {
					let nr = document.createElement("input");
					nr.type = "number";
					nr.min = instance[key];
					nr.max = instance[key];
					nr.value = instance[key];
					nr.disabled = true;
					two.appendChild(nr);
				} else if (dropdownProperties.indexOf(key) !== -1) {
					let sel = document.createElement("select");
					let opt = document.createElement("option");
					opt.innerText = instance[key];
					opt.selected = true;
					sel.disabled = true;
					sel.appendChild(opt);
					two.appendChild(sel);
				} else {
					two.innerText = parsePropValue(key, instance[key]);
				}
				row.appendChild(one);
				row.appendChild(two);
				propTable.appendChild(row);
				if (treedatatemp !== null) {
					$(`#objview-${objviewIndex}`).jstree(treedatatemp);
					objviewIndex++;
					treedatatemp = null;
				}
			}
		}
		propSpinner.style.display = "none";
		propTable.style.display = "table-row-group";
	});

	rendering = true;
	msg.style.display = "none";
	statusLastText = "Busy";
	status.innerText = "Busy";

	async function postQueue() {
		if (renderer.mAssetManager.hasRbxGameAsset) print("This Place contains rbxgameasset:// paths. Studio Lite cannot resolve them, as they are relative to the published game!");
		if (renderer.mAssetManager.computeMissingAssetsList()) print("Some assets failed to load! See File > Missing assets for more info.");
		treeRefresh2();
		menurender.removeAttribute("aria-disabled");
		menurender.addEventListener("click", () => {
			rendering = false;
			const dlg = document.body.querySelector("#render");
			const btn = dlg.querySelector("#dorender");
			const img = dlg.querySelector("img");
			const width = dlg.querySelector("#renderwidth");
			const height = dlg.querySelector("#renderheight");
			width.value = renderer.conf.width;
			height.value = renderer.conf.height;
			let doRender = () => {
				img.src = renderer.renderImage(width.value, height.value);
			}
			let close = () => {
				dlg.removeEventListener("cancel", close);
				dlg.querySelector(".close").removeEventListener("click", close);
				dlg.querySelector(".ok").removeEventListener("click", close);
				btn.removeEventListener("click", doRender);
				img.src = "";
				dlg.close();
				titleBar.classList.add("active");
				rendering = true;
			}
			dlg.addEventListener("cancel", close);
			titleBar.classList.remove("active");
			dlg.showModal();
			dlg.querySelector(".close").addEventListener("click", close);
			dlg.querySelector(".ok").addEventListener("click", close);
			btn.addEventListener("click", doRender);
		});
	}

	let waitForQueuedOps = setInterval(() => {
		if (renderer.queueSize === 0) {
			clearInterval(waitForQueuedOps);
			waitForQueuedOps = null;
			bar.className = "animate";
			statusLastText = "Ready";
			status.innerText = "Ready";
			postQueue();
		}
	}, 1000);
}

sal.style.display = "flex";

const menuabout = document.body.querySelector("#menuitem-about");
document.body.querySelector("#menuitem-reload").addEventListener("click", () => window.location.reload());
menuabout.addEventListener("click", () => {
	const dlg = document.body.querySelector("#about");
	let close = () => {
		dlg.removeEventListener("cancel", close);
		dlg.querySelector(".close").removeEventListener("click", close);
		dlg.querySelector(".ok").removeEventListener("click", close);
		dlg.querySelector(".view-notice").removeEventListener("click", viewNotice);
		dlg.close();
		titleBar.classList.add("active");
	}
	dlg.addEventListener("cancel", close);
	titleBar.classList.remove("active");
	dlg.showModal();
	dlg.querySelector(".close").addEventListener("click", close);
	dlg.querySelector(".ok").addEventListener("click", close);
	dlg.querySelector(".view-notice").addEventListener("click", viewNotice);
});

const menuassets = document.body.querySelector("#menuitem-missingassets");
menuassets.addEventListener("click", () => {
	openNotepad("missing_assets.txt", renderer.mAssetManager.missingAssets);
});

function viewNotice() {
	openNotepad("notice.txt", `Studio Lite is built upon MrSprinkleToes' rbxBinaryParser [https://github.com/MrSprinkleToes/rbxBinaryParser].
Additionally, some code from roblox-in-webbrowser [https://github.com/MrSprinkleToes/roblox-in-webbrowser] and roblox-web-viewer [https://github.com/MrSprinkleToes/roblox-web-viewer] is used.
Please see the README for more information.

The THREE.js library [https://threejs.org] is used for rendering the game view.
The THREE.js add-ons PointerLockControls and Stats are also included within the application.

jsTree [https://www.jstree.com] is used for displaying interactive trees in the Explorer and Properties views.

7.css [https://khang-nd.github.io/7.css] is used for theming the user interface.

Roblox Studio icons and other assets stored within the content/ directory, as well as the favicon.ico, are Copyright © Roblox Corporation.
The assets saved within the asset/ directory and the example files in examples/ are copyright of their respective owners.

Studio Lite is not affiliated in any way, shape or form with Roblox Corporation.`, true);
}

function openNotepad(fileName, text, nested = false) {
	const dlg = document.body.querySelector("#notepad");
	const title = dlg.querySelector("#dialog-title");
	const textarea = dlg.querySelector("textarea");
	title.innerText = `${fileName} - Notepad`;
	textarea.value = text;
	let close = () => {
		dlg.removeEventListener("cancel", close);
		dlg.querySelector(".close").removeEventListener("click", close);
		dlg.close();
		title.innerText = "Notepad";
		textarea.innerText = "";
		if (!nested) titleBar.classList.add("active");
	}
	dlg.addEventListener("cancel", close);
	titleBar.classList.remove("active");
	dlg.showModal();
	dlg.querySelector(".close").addEventListener("click", close);
}

const menuchangelog = document.body.querySelector("#menuitem-changelog");
menuchangelog.addEventListener("click", () => openNotepad("changelog.txt", `Studio Lite Changelog

New in alpha-1:
- Initial release.`));

const examples = [
	"examples/Classic-Crossroads.rbxl",
	"examples/City.rbxl",
	"examples/Suburban.rbxl",
	"examples/Western-Lounge.rbxm",
	"examples/Dilapidated-House.rbxm"
];

const buttons = sal.querySelectorAll("button");
buttons[0].addEventListener("click", async () => {
	let dlg = document.body.querySelector("#remoteload");
	let txt = dlg.querySelector("input");
	let btn = dlg.querySelector(".open");
	let exp = dlg.querySelector("#examples");
	exp.innerHTML = "";
	for (const e of examples) {
		let el = document.createElement("li");
		el.role = "option";
		el.innerText = e;
		el.addEventListener("click", () => {
			txt.value = el.innerText;
			txt.dispatchEvent(new Event("input"));
		});
		exp.appendChild(el);
	}
	let close = () => {
		dlg.removeEventListener("cancel", close);
		dlg.querySelector(".close").removeEventListener("click", close);
		dlg.querySelector(".cancel").removeEventListener("click", close);
		btn.removeEventListener("click", doLoad);
		txt.removeEventListener("keyup", keyup);
		txt.removeEventListener("input", input);
		titleBar.classList.add("active");
		dlg.close();
	}
	dlg.addEventListener("cancel", close);
	titleBar.classList.remove("active");
	dlg.showModal();
	dlg.querySelector(".close").addEventListener("click", close);
	dlg.querySelector(".cancel").addEventListener("click", close);
	let doLoad = () => {
		doLoad = null;
		file = txt.value;
		close(); close = null;
		try { document.body.removeChild(dlg); } catch (ignored) { };
		dlg = null; txt = null; btn = null;
		start();
	};
	btn.addEventListener("click", doLoad);
	let keyup = ({ key }) => {
		if (!btn.disabled && key === "Enter") doLoad();
	};
	txt.addEventListener("keyup", keyup);
	let input = () => {
		if (txt.value.trim().length > 0) {
			btn.disabled = false;
		} else {
			btn.disabled = true;
		}
	};
	txt.addEventListener("input", input);
})

const browse = sal.querySelector("input[type=file]");
browse.addEventListener("input", () => {
	file = browse.files[0];
	start();
})

window.addEventListener("resize", () => {
	applyResponsiveLayout();
})

// --- Mobile / responsive panel state management ---
const rightPaneEl = document.getElementById('rightPane');
const explorerPanelEl = document.getElementById('explorerPanel') || (rightPaneEl ? rightPaneEl.querySelector('.window') : null);
const propertiesPanelEl = document.getElementById('propertiesPanel');
const consolePanelEl = document.getElementById('consolePanel');
const mobileToolbar = document.getElementById('mobileToolbar');
const mobileBtnExplorer = document.getElementById('mobile-toggle-explorer');
const mobileBtnProperties = document.getElementById('mobile-toggle-properties');
const mobileBtnConsole = document.getElementById('mobile-toggle-console');
const desktopBtnExplorer = document.getElementById('desktop-toggle-explorer');
const desktopBtnProperties = document.getElementById('desktop-toggle-properties');
const desktopBtnConsole = document.getElementById('desktop-toggle-console');
const windowMinimizeButton = document.getElementById('windowMinimizeButton');
const windowMaximizeButton = document.getElementById('windowMaximizeButton');
const windowCloseButton = document.getElementById('windowCloseButton');

let compactSnapshot = null;

function showEl(el) { if (!el) return; el.classList.remove('panel-hidden'); }
function hideEl(el) { if (!el) return; el.classList.add('panel-hidden'); }

function setCompactMode(enabled) {
	if (enabled) {
		if (!compactSnapshot) {
			compactSnapshot = { ExplorerOpen, PropertiesOpen, ConsoleOpen };
		}
		ExplorerOpen = false;
		PropertiesOpen = false;
		ConsoleOpen = false;
		document.body.classList.add('ui-compact');
	} else {
		document.body.classList.remove('ui-compact');
		if (compactSnapshot) {
			ExplorerOpen = compactSnapshot.ExplorerOpen;
			PropertiesOpen = compactSnapshot.PropertiesOpen;
			ConsoleOpen = compactSnapshot.ConsoleOpen;
			compactSnapshot = null;
		}
	}
	applyResponsiveLayout();
}

async function toggleFullscreen() {
	try {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await document.documentElement.requestFullscreen();
		}
	} catch (ignored) { }
}

function updateWindowButtons() {
	if (windowMinimizeButton) windowMinimizeButton.classList.toggle('active', document.body.classList.contains('ui-compact'));
	if (windowMaximizeButton) windowMaximizeButton.classList.toggle('active', !!document.fullscreenElement);
}

function applyResponsiveLayout() {
	// mobile: only one panel visible at a time (tabs behavior)
	if (isMobile()) {
		if (mobileToolbar) mobileToolbar.setAttribute('aria-hidden', 'false');
		// determine which panel to show: priority Explorer -> Properties -> Console
		if (ExplorerOpen) {
			showEl(explorerPanelEl);
			showEl(rightPaneEl);
			hideEl(propertiesPanelEl);
			hideEl(consolePanelEl);
		} else if (PropertiesOpen) {
			hideEl(explorerPanelEl);
			showEl(rightPaneEl);
			showEl(propertiesPanelEl);
			hideEl(consolePanelEl);
		} else if (ConsoleOpen) {
			hideEl(explorerPanelEl);
			hideEl(propertiesPanelEl);
			hideEl(rightPaneEl);
			showEl(consolePanelEl);
		} else {
			// default fallback
			ExplorerOpen = true;
			applyResponsiveLayout();
		}
	} else {
		// desktop: toolbar hidden, panels independent
		if (mobileToolbar) mobileToolbar.setAttribute('aria-hidden', 'true');
		// rightPane contains explorer + properties; show/hide each according to state
		if (ExplorerOpen) showEl(explorerPanelEl); else hideEl(explorerPanelEl);
		if (PropertiesOpen) showEl(propertiesPanelEl); else hideEl(propertiesPanelEl);
		if (ConsoleOpen) showEl(consolePanelEl); else hideEl(consolePanelEl);
		// ensure rightPane is visible if either explorer or properties is open
		if (ExplorerOpen || PropertiesOpen) showEl(rightPaneEl); else hideEl(rightPaneEl);
	}
	syncLayoutVars();
	if (renderer && renderer.resize) renderer.resize();
	updateMobileButtons();
}

function togglePanel(panelName) {
	if (isMobile()) {
		// mobile: opening one closes others
		ExplorerOpen = (panelName === 'explorer');
		PropertiesOpen = (panelName === 'properties');
		ConsoleOpen = (panelName === 'console');
	} else {
		// desktop: toggle independent
		if (panelName === 'explorer') ExplorerOpen = !ExplorerOpen;
		if (panelName === 'properties') PropertiesOpen = !PropertiesOpen;
		if (panelName === 'console') ConsoleOpen = !ConsoleOpen;
	}
	applyResponsiveLayout();
}

function updateMobileButtons() {
	if (!mobileBtnExplorer || !mobileBtnProperties || !mobileBtnConsole) return;
	// active when the panel would be visible
	if (ExplorerOpen && isMobile()) mobileBtnExplorer.classList.add('active'); else mobileBtnExplorer.classList.remove('active');
	if (PropertiesOpen && isMobile()) mobileBtnProperties.classList.add('active'); else mobileBtnProperties.classList.remove('active');
	if (ConsoleOpen && isMobile()) mobileBtnConsole.classList.add('active'); else mobileBtnConsole.classList.remove('active');
	// update desktop toolbar buttons if present (reflect state)
	if (desktopBtnExplorer) {
		if (ExplorerOpen) desktopBtnExplorer.classList.add('active'); else desktopBtnExplorer.classList.remove('active');
	}
	if (desktopBtnProperties) {
		if (PropertiesOpen) desktopBtnProperties.classList.add('active'); else desktopBtnProperties.classList.remove('active');
	}
	if (desktopBtnConsole) {
		if (ConsoleOpen) desktopBtnConsole.classList.add('active'); else desktopBtnConsole.classList.remove('active');
	}
	updateWindowButtons();
}

if (mobileBtnExplorer) mobileBtnExplorer.addEventListener('click', () => togglePanel('explorer'));
if (mobileBtnProperties) mobileBtnProperties.addEventListener('click', () => togglePanel('properties'));
if (mobileBtnConsole) mobileBtnConsole.addEventListener('click', () => togglePanel('console'));
if (desktopBtnExplorer) desktopBtnExplorer.addEventListener('click', () => togglePanel('explorer'));
if (desktopBtnProperties) desktopBtnProperties.addEventListener('click', () => togglePanel('properties'));
if (desktopBtnConsole) desktopBtnConsole.addEventListener('click', () => togglePanel('console'));
if (windowMinimizeButton) windowMinimizeButton.addEventListener('click', () => setCompactMode(!document.body.classList.contains('ui-compact')));
if (windowMaximizeButton) windowMaximizeButton.addEventListener('click', () => toggleFullscreen());
if (windowCloseButton) windowCloseButton.addEventListener('click', () => window.location.reload());

// Virtual movement controls for mobile/touch
const pressedKeys = {};

function simulateKeyEvent(key, isDown) {
	const eventType = isDown ? 'keydown' : 'keyup';
	const event = new KeyboardEvent(eventType, {
		code: key,
		key: key,
		bubbles: true,
		cancelable: true
	});
	window.dispatchEvent(event);
	pressedKeys[key] = isDown;
}

// Analog joystick control
const joystick = document.getElementById('joystick');
const joystickInner = document.getElementById('joystick-inner');

if (joystick) {
	const JOYSTICK_RADIUS = 60;
	const THUMB_RADIUS = 25;
	const DEADZONE = 0.2;

	let isJoystickActive = false;
	let joystickCenterX = 0;
	let joystickCenterY = 0;
	const currentPressedKeys = { w: false, a: false, s: false, d: false };

	function updateJoystickPosition(x, y) {
		const dx = x - joystickCenterX;
		const dy = y - joystickCenterY;
		const distance = Math.hypot(dx, dy);
		const maxDistance = JOYSTICK_RADIUS - THUMB_RADIUS;

		let normalizedX = distance > 0 ? (dx / distance) : 0;
		let normalizedY = distance > 0 ? (dy / distance) : 0;
		const normalizedDistance = Math.min(distance / maxDistance, 1);

		if (normalizedDistance < DEADZONE) {
			// Stop all movement in deadzone
			if (currentPressedKeys.w) simulateKeyEvent('KeyW', false);
			if (currentPressedKeys.a) simulateKeyEvent('KeyA', false);
			if (currentPressedKeys.s) simulateKeyEvent('KeyS', false);
			if (currentPressedKeys.d) simulateKeyEvent('KeyD', false);
			currentPressedKeys.w = false;
			currentPressedKeys.a = false;
			currentPressedKeys.s = false;
			currentPressedKeys.d = false;
		} else {
			// Check forward/backward
			if (normalizedY < -0.4) {
				if (!currentPressedKeys.w) simulateKeyEvent('KeyW', true);
				currentPressedKeys.w = true;
			} else if (currentPressedKeys.w) {
				simulateKeyEvent('KeyW', false);
				currentPressedKeys.w = false;
			}

			if (normalizedY > 0.4) {
				if (!currentPressedKeys.s) simulateKeyEvent('KeyS', true);
				currentPressedKeys.s = true;
			} else if (currentPressedKeys.s) {
				simulateKeyEvent('KeyS', false);
				currentPressedKeys.s = false;
			}

			// Check left/right
			if (normalizedX < -0.4) {
				if (!currentPressedKeys.a) simulateKeyEvent('KeyA', true);
				currentPressedKeys.a = true;
			} else if (currentPressedKeys.a) {
				simulateKeyEvent('KeyA', false);
				currentPressedKeys.a = false;
			}

			if (normalizedX > 0.4) {
				if (!currentPressedKeys.d) simulateKeyEvent('KeyD', true);
				currentPressedKeys.d = true;
			} else if (currentPressedKeys.d) {
				simulateKeyEvent('KeyD', false);
				currentPressedKeys.d = false;
			}
		}

		// Move thumb visually
		const thumbX = (dx / distance) * Math.min(distance, maxDistance);
		const thumbY = (dy / distance) * Math.min(distance, maxDistance);
		joystickInner.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
	}

	joystick.addEventListener('touchstart', (e) => {
		if (e.touches.length !== 1) return;
		isJoystickActive = true;
		const rect = joystick.getBoundingClientRect();
		joystickCenterX = rect.left + rect.width / 2;
		joystickCenterY = rect.top + rect.height / 2;
		joystickInner.classList.add('active');
		updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
	}, { passive: false });

	joystick.addEventListener('touchmove', (e) => {
		if (!isJoystickActive || e.touches.length !== 1) return;
		e.preventDefault();
		updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
	}, { passive: false });

	joystick.addEventListener('touchend', (e) => {
		isJoystickActive = false;
		joystickInner.classList.remove('active');
		joystickInner.style.transform = 'translate(0, 0)';
		// Stop all movement
		if (currentPressedKeys.w) simulateKeyEvent('KeyW', false);
		if (currentPressedKeys.a) simulateKeyEvent('KeyA', false);
		if (currentPressedKeys.s) simulateKeyEvent('KeyS', false);
		if (currentPressedKeys.d) simulateKeyEvent('KeyD', false);
		currentPressedKeys.w = false;
		currentPressedKeys.a = false;
		currentPressedKeys.s = false;
		currentPressedKeys.d = false;
	});

	// Mouse support for desktop testing
	joystick.addEventListener('mousedown', (e) => {
		isJoystickActive = true;
		const rect = joystick.getBoundingClientRect();
		joystickCenterX = rect.left + rect.width / 2;
		joystickCenterY = rect.top + rect.height / 2;
		joystickInner.classList.add('active');
		updateJoystickPosition(e.clientX, e.clientY);
	});

	document.addEventListener('mousemove', (e) => {
		if (!isJoystickActive) return;
		updateJoystickPosition(e.clientX, e.clientY);
	});

	document.addEventListener('mouseup', () => {
		if (!isJoystickActive) return;
		isJoystickActive = false;
		joystickInner.classList.remove('active');
		joystickInner.style.transform = 'translate(0, 0)';
		// Stop all movement
		if (currentPressedKeys.w) simulateKeyEvent('KeyW', false);
		if (currentPressedKeys.a) simulateKeyEvent('KeyA', false);
		if (currentPressedKeys.s) simulateKeyEvent('KeyS', false);
		if (currentPressedKeys.d) simulateKeyEvent('KeyD', false);
		currentPressedKeys.w = false;
		currentPressedKeys.a = false;
		currentPressedKeys.s = false;
		currentPressedKeys.d = false;
	});
}

// Zoom controls
const zoomInBtn = document.getElementById('mobile-zoom-in');
const zoomOutBtn = document.getElementById('mobile-zoom-out');
const ZOOM_SENSITIVITY = 4;
const MIN_FOV = 10;
const MAX_FOV = 120;

function zoom(direction) {
	if (!renderer || !renderer.camera) return;
	const camera = renderer.camera;
	const newFov = Math.max(MIN_FOV, Math.min(MAX_FOV, camera.fov + direction * ZOOM_SENSITIVITY));
	camera.fov = newFov;
	camera.updateProjectionMatrix();
}

if (zoomInBtn) {
	zoomInBtn.addEventListener('touchstart', (e) => {
		e.preventDefault();
		zoom(-1);
		zoomInBtn.classList.add('pressed');
	});
	zoomInBtn.addEventListener('touchend', (e) => {
		e.preventDefault();
		zoomInBtn.classList.remove('pressed');
	});
	zoomInBtn.addEventListener('mousedown', () => {
		zoom(-1);
		zoomInBtn.classList.add('pressed');
	});
	zoomInBtn.addEventListener('mouseup', () => zoomInBtn.classList.remove('pressed'));
	zoomInBtn.addEventListener('mouseleave', () => zoomInBtn.classList.remove('pressed'));
}

if (zoomOutBtn) {
	zoomOutBtn.addEventListener('touchstart', (e) => {
		e.preventDefault();
		zoom(1);
		zoomOutBtn.classList.add('pressed');
	});
	zoomOutBtn.addEventListener('touchend', (e) => {
		e.preventDefault();
		zoomOutBtn.classList.remove('pressed');
	});
	zoomOutBtn.addEventListener('mousedown', () => {
		zoom(1);
		zoomOutBtn.classList.add('pressed');
	});
	zoomOutBtn.addEventListener('mouseup', () => zoomOutBtn.classList.remove('pressed'));
	zoomOutBtn.addEventListener('mouseleave', () => zoomOutBtn.classList.remove('pressed'));
}

// Mouse wheel zoom (works on desktop and some mobile browsers)
window.addEventListener('wheel', (e) => {
	if (!renderer || !renderer.camera) return;
	if (e.ctrlKey || e.metaKey) {
		e.preventDefault();
		const direction = e.deltaY > 0 ? 1 : -1;
		zoom(direction);
	}
}, { passive: false });

// Pinch-to-zoom support on touch devices
let lastPinchDistance = 0;

window.addEventListener('touchmove', (e) => {
	if (e.touches.length !== 2) return;
	if (!renderer || !renderer.camera) return;

	const touch1 = e.touches[0];
	const touch2 = e.touches[1];
	const currentDistance = Math.hypot(
		touch1.clientX - touch2.clientX,
		touch1.clientY - touch2.clientY
	);

	if (lastPinchDistance === 0) {
		lastPinchDistance = currentDistance;
		return;
	}

	const delta = currentDistance - lastPinchDistance;
	if (Math.abs(delta) > 5) {
		const direction = delta > 0 ? 1 : -1;
		zoom(direction * 0.5);
		lastPinchDistance = currentDistance;
	}
}, { passive: false });

window.addEventListener('touchend', () => {
	lastPinchDistance = 0;
});

document.addEventListener('fullscreenchange', () => {
	updateWindowButtons();
	renderer.resize();
});

// initialize responsive layout on load
window.addEventListener('load', () => {
	// default: keep panels visible on desktop; on mobile show only explorer
	if (isMobile()) {
		ExplorerOpen = true; PropertiesOpen = false; ConsoleOpen = false;
	}
	syncLayoutVars();
	applyResponsiveLayout();
	renderer.resize();
	updateMobileButtons();
	updateWindowButtons();
});

const tree = document.body.querySelector(".tree");
const tree2 = document.body.querySelector(".tree2");
const datamodeltab = document.body.querySelector("button[aria-controls=datamodel-explorer]");
const scenetab = document.body.querySelector("button[aria-controls=scene-explorer]");
tree2.style.display = "none";
datamodeltab.addEventListener("mousedown", () => {
	datamodeltab.ariaSelected = true;
	scenetab.ariaSelected = false;
	tree2.style.display = "none";
	tree.style.display = "block";
});
let treeRefresh2Pending = false;
scenetab.addEventListener("mousedown", () => {
	datamodeltab.ariaSelected = false;
	scenetab.ariaSelected = true;
	tree.style.display = "none";
	rendering = true;
	setTitle(placeName);
	editor.innerHTML = "";
	editor.style.display = "none";
	tree2.style.display = "block";
	(async () => {
		if (treeRefresh2Pending) {
			treeRefresh2();
			treeRefresh2Pending = false;
		}
	})();
});
datamodeltab.disabled = false;
scenetab.disabled = false;

$(".tree2").jstree({
	'core': {
		'data': []
	}
});

let treeRef2 = $(".tree2").jstree(true);
let propTable = document.body.querySelector(".properties > table > tbody");
let propSpinner = document.body.querySelector(".properties > .loader");

treeRefresh2 = () => {
	// don't render what we can't see!
	if (tree2.style.display === "none") { treeRefresh2Pending = true; return; }
	treeRef2.settings.core.data = threeNodeToTreeData([renderer.scene]);
	treeRef2.refresh();
}

$('.tree2').on("changed.jstree", async function (e, data) {
	let node = treeRef2.get_node(data.selected[0]).original;
	if (node) { } else return;
	node = node.node.object;
	document.body.querySelector("#propertiesTitle").innerText = `Properties - ${node.type} "${node.name ? node.name : node.type}"`;
	let keys = Object.keys(node);
	let objviewIndex = 0;
	let treedatatemp = null;
	propTable.innerHTML = "";
	propSpinner.style.display = "block";
	propTable.style.display = "none";
	for (let key of keys) {
		if (key !== "children") {
			let row = document.createElement("tr");
			let one = document.createElement("td");
			let two = document.createElement("td");
			one.innerText = key;
			if (typeof node[key] === "object") {
				let objview = document.createElement("div");
				two.appendChild(objview);
				objview.id = `objview-${objviewIndex}`;
				treedatatemp = {
					'core': {
						'data': objToTreeData(node[key])
					}
				};
			} else if (key === "color") {
				let clr = document.createElement("input");
				clr.type = "color";
				clr.disabled = true;
				clr.value = "#" + node[key].toString(16);
				two.appendChild(clr);
				let span = document.createElement("span");
				span.innerHTML = `&nbsp;${clr.value}`;
				two.appendChild(span);
			} else if ([true, false].indexOf(node[key]) !== -1) {
				let chk = document.createElement("input");
				chk.disabled = "true";
				chk.type = "checkbox";
				chk.id = "checkbox-" + key;
				if (node[key]) chk.checked = true;
				let txt = document.createElement("label");
				txt.for = "checkbox-" + key;
				two.appendChild(chk);
				two.appendChild(txt);
			} else if (typeof node[key] === "number") {
				let nr = document.createElement("input");
				nr.type = "number";
				nr.min = node[key];
				nr.max = node[key];
				nr.value = node[key];
				nr.disabled = true;
				two.appendChild(nr);
			} else {
				two.innerText = node[key].toString();
			}
			row.appendChild(one);
			row.appendChild(two);
			propTable.appendChild(row);
			if (treedatatemp !== null) {
				$(`#objview-${objviewIndex}`).jstree(treedatatemp);
				objviewIndex++;
				treedatatemp = null;
			}
		}
	}
	propSpinner.style.display = "none";
	propTable.style.display = "table-row-group";
});

setTitle("Start Page");
print("Welcome to Studio Lite (alpha-1)!");

rendering = true;

treeRefresh2();