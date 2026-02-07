import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to convert ArrayBuffer to Base64
// Helper removed

export const generatePDF = async (patternData, mode = 'user') => {
    const doc = new jsPDF();
    // Font loading logic removed to ensure standard ASCII output

    const { pattern, metadata } = patternData;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // --- COVER PAGE ---
    doc.setFontSize(24);
    doc.text("Cross Stitch Pattern", pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(16);
    const dateStr = metadata.created ? new Date(metadata.created).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Created: ${dateStr}`, pageWidth / 2, 55, { align: "center" });

    // Metadata Table
    const metaData = [
        ["Physical Size", `${metadata.widthCm || '?'}cm x ${metadata.heightCm || '?'}cm`],
        ["Stitch Count", `${pattern.width} x ${pattern.height}`],
        ["Colors", `${metadata.colors || '?'}`],
        ["Fabric Count", `${metadata.widthCm ? Math.round(pattern.width / (parseFloat(metadata.widthCm) / 2.54)) : '?'} count`]
    ];

    autoTable(doc, {
        startY: 70,
        head: [['Property', 'Value']],
        body: metaData,
        theme: 'striped',
        margin: { top: 70, bottom: 20, left: margin, right: margin },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        // styles: { font: 'NotoSansJP' } // Removed
    });

    // Add Preview Image if available
    if (patternData.previewImage) {
        const finalY = doc.lastAutoTable.finalY + 10;
        const maxImgHeight = pageHeight - finalY - 20; // 20px padding bottom
        const imgProps = doc.getImageProperties(patternData.previewImage);

        let imgWidth = pageWidth - (margin * 2);
        let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        // Scale down if too tall
        if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = (imgProps.width * imgHeight) / imgProps.height;
        }

        // Center image
        const x = (pageWidth - imgWidth) / 2;
        doc.addImage(patternData.previewImage, 'PNG', x, finalY, imgWidth, imgHeight);
    }

    doc.addPage();

    // --- PATTERN PAGES ---
    const stitchesPerPageX = 50; // Adjust based on symbol size
    const stitchesPerPageY = 60;
    const cellSize = (pageWidth - (margin * 2)) / stitchesPerPageX;

    // Calculate total pages needed
    const horizontalPages = Math.ceil(pattern.width / stitchesPerPageX);
    const verticalPages = Math.ceil(pattern.height / stitchesPerPageY);

    doc.setFontSize(10);

    for (let py = 0; py < verticalPages; py++) {
        for (let px = 0; px < horizontalPages; px++) {
            if (px > 0 || py > 0) doc.addPage();

            // Page Header
            doc.text(`Pattern Part (${px + 1}, ${py + 1})`, margin, margin);

            const startX = px * stitchesPerPageX;
            const startY = py * stitchesPerPageY;
            const endX = Math.min(startX + stitchesPerPageX, pattern.width);
            const endY = Math.min(startY + stitchesPerPageY, pattern.height);

            // Draw Grid
            doc.setFontSize(8); // Font size for rulers

            // Draw Top Ruler
            for (let x = startX; x <= endX; x++) {
                if (x > 0 && x % 10 === 0) {
                    const drawX = margin + (x - startX) * cellSize;
                    const drawY = margin + 8; // Slightly above grid
                    doc.text(`${x}`, drawX, drawY, { align: "center" });
                }
            }

            // Draw Left Ruler
            for (let y = startY; y <= endY; y++) {
                if (y > 0 && y % 10 === 0) {
                    const drawX = margin - 2; // Slightly left of grid
                    const drawY = margin + 10 + (y - startY) * cellSize;
                    doc.text(`${y}`, drawX, drawY, { align: "right", baseline: "middle" });
                }
            }

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const drawX = margin + (x - startX) * cellSize;
                    const drawY = margin + 10 + (y - startY) * cellSize; // +10 for header offset

                    // Cell Background (optional, maybe just symbols for B&W print)
                    // Drawing rect for grid
                    doc.setDrawColor(200); // Light gray
                    doc.setLineWidth(0.1);
                    if (x % 10 === 0) doc.setDrawColor(100); // Darker for major lines
                    doc.rect(drawX, drawY, cellSize, cellSize);

                    // Symbol
                    const cell = pattern.grid[y][x];
                    if (cell) {
                        doc.setTextColor(0);
                        // Cell size is in mm, setFontSize expects points. 1mm = ~2.83pt.
                        // We want ~80% of the cell height.
                        doc.setFontSize(cellSize * 2.83 * 0.8);
                        doc.text(cell.symbol, drawX + cellSize / 2, drawY + cellSize / 2, { align: "center", baseline: "middle" });
                    }
                }
            }

            // Draw Heavy Grid Lines (every 10)
            doc.setDrawColor(0);
            doc.setLineWidth(0.3);

            // Vertical heavy lines
            for (let x = startX - (startX % 10); x <= endX; x += 10) {
                if (x < startX) continue;
                const drawX = margin + (x - startX) * cellSize;
                const gridHeight = (endY - startY) * cellSize;
                doc.line(drawX, margin + 10, drawX, margin + 10 + gridHeight);
            }
            // Horizontal heavy lines
            for (let y = startY - (startY % 10); y <= endY; y += 10) {
                if (y < startY) continue;
                const drawY = margin + 10 + (y - startY) * cellSize;
                const gridWidth = (endX - startX) * cellSize;
                doc.line(margin, drawY, margin + gridWidth, drawY);
            }
        }
    }

    doc.addPage();

    // --- KEY / LEGEND ---
    doc.setFontSize(16);
    doc.text("Color Key", margin, 20);

    const legendData = pattern.palette.map(p => [
        p.symbol,
        mode === 'creator' ? (p.code + (p.col ? `\n(${p.col}-${p.row})` : '')) : p.code,
        p.name,
        // Count stitches for this color (optional optimization: calculate once before)
        pattern.grid.flat().filter(c => c?.code === p.code).length
    ]);

    autoTable(doc, {
        startY: 30,
        head: [['Symbol', 'DMC', 'Name', 'Count']],
        body: legendData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { halign: 'center' }
        }
    });

    doc.save(`pattern-${new Date().getTime()}.pdf`);
};
