import { dmcColors } from './dmcColors';

// Simple RGB distance
function getDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

// Map a single color to nearest DMC color
function getNearestColor(r, g, b) { // accepts number, number, number
    let minDistance = Infinity;
    let nearest = null;

    for (const color of dmcColors) {
        const dist = getDistance({ r, g, b }, color);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = color;
        }
    }
    return nearest;
}

// Map a color to nearest from a RESTRICTED palette
function getNearestFromPalette(r, g, b, palette) {
    let minDistance = Infinity;
    let nearest = null;

    for (const color of palette) {
        // Palette contains DMC objects
        const dist = getDistance({ r, g, b }, color);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = color;
        }
    }
    return nearest;
}


// Convert image data to pattern data
export function processImage(ctx, width, height, maxColors = 30) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 1. Initial Pass: Map every pixel to the nearest VALID DMC color
    // We store the DMC index or code in a temporary grid
    // and count frequencies.
    const tempGrid = new Array(height * width);
    const frequencies = {};

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) {
                tempGrid[y * width + x] = null;
            } else {
                const dmc = getNearestColor(r, g, b);
                const code = dmc.code;
                tempGrid[y * width + x] = dmc;

                if (!frequencies[code]) {
                    frequencies[code] = { count: 0, color: dmc };
                }
                frequencies[code].count++;
            }
        }
    }

    // 2. Reduce Palette Logic
    // Sort colors by frequency
    const sortedColors = Object.values(frequencies).sort((a, b) => b.count - a.count);

    // Take top N colors
    // If we have fewer than maxColors, we use all of them.
    const finalPaletteItems = sortedColors.slice(0, maxColors);

    // ASCII-safe symbols for PDF generation (Standard fonts don't support Unicode)
    const SYMBOLS = [
        'X', 'O', '+', '-', '=', '*', '#', '@', '%', '$', '&', '!', '?', '/', '\\',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'Y', 'Z',
        'a', 'b', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 't'
    ];

    // Create map of code -> { color, symbol }
    const finalPaletteMap = new Map();
    finalPaletteItems.forEach((item, index) => {
        finalPaletteMap.set(item.color.code, {
            ...item.color,
            symbol: SYMBOLS[index % SYMBOLS.length]
        });
    });

    const finalPaletteCodes = new Set(finalPaletteMap.keys());

    // 3. Second Pass: Remap pixels that are NOT in the final palette
    // to the nearest color that IS in the final palette.
    const finalGrid = [];

    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const initialDmc = tempGrid[y * width + x];

            if (!initialDmc) {
                row.push(null);
                continue;
            }

            if (finalPaletteCodes.has(initialDmc.code)) {
                // Keep it (store the full object with symbol)
                row.push(finalPaletteMap.get(initialDmc.code));
            } else {
                // Remap to nearest in restricted palette
                // We use the RGB of the *DMC thread* we found initially
                const validColorObjects = Array.from(finalPaletteMap.values());
                const remapped = getNearestFromPalette(initialDmc.r, initialDmc.g, initialDmc.b, validColorObjects);
                // Use the one from our map to ensure we have the symbol
                row.push(finalPaletteMap.get(remapped.code));
            }
        }
        finalGrid.push(row);
    }

    return {
        width,
        height,
        grid: finalGrid, // 2D array of DMC objects with symbols
        palette: Array.from(finalPaletteMap.values()) // Array of objects with symbols
    };
}
