export function hexToEmoji(hex: string): string {
    // HEX → RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // RGB → HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0, s = 0, l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r: h = ((g - b) / delta + (g < b ? 6 : 0)) * 60; break;
            case g: h = ((b - r) / delta + 2) * 60; break;
            case b: h = ((r - g) / delta + 4) * 60; break;
        }
    }

    // Entsättigte Farben → Weiß/Grau/Schwarz
    if (s < 0.15) {
        if (l > 0.85) return "⚪";
        if (l < 0.2) return "⚫";
        return "🟤"; // Mittelgrau → Braun als Fallback
    }

    // Farbton → Emoji
    if (h < 15 || h >= 345) return "🔴";
    if (h < 45) return "🟠";
    if (h < 65) return "🟡";
    if (h < 170) return "🟢";
    if (h < 255) return "🔵";
    if (h < 290) return "🟣";
    if (h < 345) return "🟤";

    return "⚪"; // Fallback
}

