function show(enabled, useSettingsInsteadOfPreferences) {
	if (useSettingsInsteadOfPreferences) {
		document.querySelector('.state-on').innerText = "Prometheus Formatter is active.";
		document.querySelector('.state-off').innerText = "Prometheus Formatter is inactive. Enable it in Safari Settings > Extensions.";
		document.querySelector('.state-unknown').innerText = "Enable Prometheus Formatter in Safari Settings > Extensions.";
		document.querySelector('.open-preferences .button-label').innerText = "Open Safari Extensions Preferences";
	}

	if (typeof enabled === "boolean") {
		document.body.classList.toggle('state-on', enabled);
		document.body.classList.toggle('state-off', !enabled);
	} else {
		document.body.classList.remove('state-on');
		document.body.classList.remove('state-off');
	}
}

function openPreferences() {
	webkit.messageHandlers.controller.postMessage("open-preferences");
}

function openReviewPage() {
	webkit.messageHandlers.controller.postMessage("open-review-page");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
document.querySelector("button.open-review-page").addEventListener("click", openReviewPage);
