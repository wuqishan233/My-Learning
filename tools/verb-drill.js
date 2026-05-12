function say(btn) {
    const txt = btn.closest('.item').querySelector('.fr').textContent;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = 'fr-FR';
    utterance.rate = frSettings.getRate();
    const _fv = frSettings.getVoice(); if (_fv) utterance.voice = _fv;
    window.speechSynthesis.speak(utterance);
}
