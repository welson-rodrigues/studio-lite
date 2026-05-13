// Mobile testing helper for Studio Lite
// Usage: load this file in the browser console, then call MobileTest.runSequence()
(function () {
    const byId = id => document.getElementById(id);
    const explorerBtn = byId('mobile-toggle-explorer');
    const propertiesBtn = byId('mobile-toggle-properties');
    const consoleBtn = byId('mobile-toggle-console');
    const rightPane = byId('rightPane');
    const propertiesPanel = byId('propertiesPanel');
    const consolePanel = byId('consolePanel');

    function isVisible(el) {
        if (!el) return false;
        return !(el.classList && el.classList.contains('panel-hidden')) && window.getComputedStyle(el).display !== 'none';
    }

    window.MobileTest = {
        clickExplorer() { if (explorerBtn) explorerBtn.click(); else console.warn('Explorer button not found'); return this; },
        clickProperties() { if (propertiesBtn) propertiesBtn.click(); else console.warn('Properties button not found'); return this; },
        clickConsole() { if (consoleBtn) consoleBtn.click(); else console.warn('Console button not found'); return this; },
        state() {
            return {
                explorer: isVisible(rightPane) && isVisible(rightPane.querySelector('.window')),
                properties: isVisible(propertiesPanel),
                console: isVisible(consolePanel),
                width: window.innerWidth
            };
        },
        printState() { console.log('MobileTest state:', this.state()); return this; },
        // Run a sequence of toggles with given delay (ms)
        async runSequence(delay = 500) {
            console.log('Running mobile toggle sequence...');
            this.printState();
            await new Promise(r => setTimeout(r, delay));
            this.clickExplorer(); this.printState();
            await new Promise(r => setTimeout(r, delay));
            this.clickProperties(); this.printState();
            await new Promise(r => setTimeout(r, delay));
            this.clickConsole(); this.printState();
            console.log('Sequence complete');
            return this.state();
        }
    };
})();
