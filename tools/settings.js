/**
 * frSettings — global TTS settings (voice + rate) persisted in localStorage.
 * Include this script in any page to get:
 *   - frSettings.getRate()  → saved speech rate (default 0.85)
 *   - frSettings.getVoice() → saved SpeechSynthesisVoice or null
 *   - frSettings.speak(text, onEnd?) → cancel + speak with saved settings
 *   - A floating ⚙️ button injected into every page
 */
(function () {
    const KEY = 'fr_settings';
    const DEF = { rate: 0.85, voiceURI: '' };

    window.frSettings = {
        _get() {
            try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); }
            catch { return Object.assign({}, DEF); }
        },
        _set(s) { localStorage.setItem(KEY, JSON.stringify(s)); },
        getRate() { return parseFloat(this._get().rate) || DEF.rate; },
        getVoice() {
            const uri = this._get().voiceURI;
            return uri ? (speechSynthesis.getVoices().find(v => v.voiceURI === uri) || null) : null;
        },
        speak(text, onEnd) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'fr-FR';
            u.rate = this.getRate();
            const v = this.getVoice();
            if (v) u.voice = v;
            if (onEnd) u.onend = onEnd;
            speechSynthesis.speak(u);
            return u;
        }
    };

    /* ── Inject UI ─────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #fr-cfg-btn {
                position: fixed; top: 12px; right: 12px; z-index: 9999;
                width: 38px; height: 38px; border-radius: 50%; border: none;
                background: white; cursor: pointer; font-size: 17px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.18);
                display: flex; align-items: center; justify-content: center;
                transition: box-shadow 0.15s, transform 0.15s;
            }
            #fr-cfg-btn:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.22); transform: rotate(20deg); }
            #fr-cfg-overlay {
                display: none; position: fixed; inset: 0; z-index: 9998;
                background: rgba(0,0,0,0.25);
            }
            #fr-cfg-panel {
                display: none; position: fixed; top: 58px; right: 12px;
                z-index: 9999; background: white; border-radius: 14px;
                padding: 20px 22px 18px; width: 276px;
                box-shadow: 0 6px 28px rgba(0,0,0,0.16);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            #fr-cfg-panel h3 {
                margin: 0 0 16px; font-size: 0.95rem; color: #1c1e21;
                display: flex; align-items: center; gap: 7px;
            }
            .fr-cfg-row { margin-bottom: 14px; }
            .fr-cfg-row label { display: block; font-size: 0.8rem; color: #65676b; font-weight: 600; margin-bottom: 5px; }
            .fr-cfg-row select {
                width: 100%; padding: 7px 9px; font-size: 0.88rem;
                border: 1.5px solid #d8dde4; border-radius: 8px; outline: none;
                background: #fafafa;
            }
            .fr-cfg-row select:focus { border-color: #1877f2; }
            .fr-speed-row { display: flex; align-items: center; gap: 10px; }
            .fr-speed-row input[type=range] { flex: 1; cursor: pointer; }
            .fr-speed-row span { font-size: 0.85rem; font-weight: 700; color: #1877f2; min-width: 36px; }
            #fr-cfg-save {
                width: 100%; padding: 9px; background: #1877f2; color: white;
                border: none; border-radius: 9px; font-size: 0.9rem; font-weight: 700;
                cursor: pointer; margin-top: 4px; transition: background 0.15s;
            }
            #fr-cfg-save:hover { background: #0e5fc0; }
            #fr-cfg-save.saved { background: #22a050; }
        `;
        document.head.appendChild(style);

        // Floating button
        const btn = document.createElement('button');
        btn.id = 'fr-cfg-btn';
        btn.title = '全局设置 / Settings';
        btn.innerHTML = '⚙️';
        btn.onclick = togglePanel;
        document.body.appendChild(btn);

        // Overlay (click-outside to close)
        const overlay = document.createElement('div');
        overlay.id = 'fr-cfg-overlay';
        overlay.onclick = closePanel;
        document.body.appendChild(overlay);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'fr-cfg-panel';
        panel.innerHTML = `
            <h3>⚙️ 全局设置</h3>
            <div class="fr-cfg-row">
                <label>🗣 朗读声音</label>
                <select id="fr-cfg-voice"><option value="">— 系统默认 —</option></select>
            </div>
            <div class="fr-cfg-row">
                <label>🎚 朗读速度</label>
                <div class="fr-speed-row">
                    <input type="range" id="fr-cfg-speed" min="0.4" max="1.5" step="0.05" value="0.85">
                    <span id="fr-cfg-speed-val">0.85×</span>
                </div>
            </div>
            <button id="fr-cfg-save" onclick="frCfgSave()">保存设置</button>
        `;
        document.body.appendChild(panel);

        // Populate voice list
        function fillVoices() {
            const sel = document.getElementById('fr-cfg-voice');
            const saved = frSettings._get().voiceURI;
            const voices = speechSynthesis.getVoices();
            // Remove previous dynamic options
            while (sel.options.length > 1) sel.remove(1);
            // French voices first, then rest
            const fr = voices.filter(v => v.lang.startsWith('fr'));
            const other = voices.filter(v => !v.lang.startsWith('fr'));
            [...fr, ...other].forEach(v => {
                const o = document.createElement('option');
                o.value = v.voiceURI;
                o.textContent = `${v.name} (${v.lang})`;
                if (v.voiceURI === saved) o.selected = true;
                sel.appendChild(o);
            });
        }
        fillVoices();
        speechSynthesis.addEventListener('voiceschanged', fillVoices);

        // Init speed slider from saved settings
        const saved = frSettings._get();
        const speedSlider = document.getElementById('fr-cfg-speed');
        const speedVal   = document.getElementById('fr-cfg-speed-val');
        speedSlider.value = saved.rate;
        speedVal.textContent = parseFloat(saved.rate).toFixed(2) + '×';
        speedSlider.addEventListener('input', function () {
            speedVal.textContent = parseFloat(this.value).toFixed(2) + '×';
        });

        window.frCfgSave = function () {
            frSettings._set({
                rate:     parseFloat(document.getElementById('fr-cfg-speed').value),
                voiceURI: document.getElementById('fr-cfg-voice').value,
            });
            const saveBtn = document.getElementById('fr-cfg-save');
            saveBtn.textContent = '✓ 已保存';
            saveBtn.classList.add('saved');
            setTimeout(() => {
                saveBtn.textContent = '保存设置';
                saveBtn.classList.remove('saved');
                closePanel();
            }, 1000);
        };
    });

    function togglePanel() {
        const open = document.getElementById('fr-cfg-panel').style.display === 'block';
        document.getElementById('fr-cfg-panel').style.display  = open ? 'none' : 'block';
        document.getElementById('fr-cfg-overlay').style.display = open ? 'none' : 'block';
    }
    function closePanel() {
        document.getElementById('fr-cfg-panel').style.display  = 'none';
        document.getElementById('fr-cfg-overlay').style.display = 'none';
    }
})();
