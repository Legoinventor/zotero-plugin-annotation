// Farbzuordnung zu Emojis (Grundfarben)
const colorEmojiMap: { [key: string]: string } = {
    red: "🔴",
    orange: "🟠",
    yellow: "🟡",
    green: "🟢",
    blue: "🔵",
    purple: "🟣",
    brown: "🟤",
    black: "⚫",
    white: "⚪",
};

// Hilfsfunktion: Bestimme die "nächste" Farbkategorie
function getClosestColorCategory(r: number, g: number, b: number): keyof typeof colorEmojiMap {
    const categories = {
        red: [255, 0, 0],
        orange: [255, 165, 0],
        yellow: [255, 255, 0],
        green: [0, 128, 0],
        blue: [0, 0, 255],
        purple: [128, 0, 128],
        brown: [139, 69, 19],
        black: [0, 0, 0],
        white: [255, 255, 255],
    };

    let closest: keyof typeof categories = "black";
    let minDistance = Infinity;

    for (const [key, [cr, cg, cb]] of Object.entries(categories)) {
        const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
        if (dist < minDistance) {
            minDistance = dist;
            closest = key as keyof typeof categories;
        }
    }

    return closest;
}

export function getEmojiForColor(hexColor: string): string {
    // Entferne das # falls vorhanden
    hexColor = hexColor.replace("#", "");

    if (hexColor.length !== 6) return "⚪"; // fallback bei ungültigem Code

    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    const category = getClosestColorCategory(r, g, b);
    return colorEmojiMap[category];
}
