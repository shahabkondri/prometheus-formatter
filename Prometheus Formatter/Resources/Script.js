function show(enabled, useSettingsInsteadOfPreferences) {
	if (useSettingsInsteadOfPreferences) {
		document.querySelector('.state-on').innerText = "🚀 Prometheus Formatter is active! Metrics are highlighted and ready for action. Explore your enhanced metrics view below.";
		document.querySelector('.state-off').innerText = "🛠️ Prometheus Formatter is currently inactive. Activate it in Safari Settings > Extensions to enhance your metrics view!";
		document.querySelector('.state-unknown').innerText = "🔍 Ready to spotlight those Prometheus metrics? Enable Prometheus Formatter in Safari Settings > Extensions!";
		document.querySelector('.open-preferences').innerText = "⚙️ Open Safari Extensions Preferences";
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

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
