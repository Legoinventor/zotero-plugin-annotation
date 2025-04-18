// src/modules/annotationManager.ts
export class AnnotationManager {
    static async convertAllAnnotationsToNotes(pdfItem: Zotero.Item) {
        const parentItem = pdfItem.parentItem;
        if (!parentItem) {
            ztoolkit.log("No parent item found for PDF");
            return;
        }

        const progress = new ztoolkit.ProgressWindow("Converting Annotations");
        progress.createLine({ text: "Starting...", progress: 0 }).show();

        try {
            const annotations = await this.getAllAnnotations(pdfItem.id);
            ztoolkit.log(`Found ${annotations.length} annotations`);

            if (annotations.length === 0) {
                progress.changeLine({ text: "No annotations found", type: "fail" });
                return;
            }

            progress.changeLine({ text: `Processing ${annotations.length} annotations...` });

            // Note-Content schrittweise aufbauen
            let noteContent = this.formatAnnotationsAsNoteHeader();
            for (let i = 0; i < annotations.length; i++) {
                noteContent += this.formatSingleAnnotation(annotations[i], parentItem, pdfItem);

                // Fortschritt aktualisieren (alle 5 Annotationen oder am Ende)
                if (i % 5 === 0 || i === annotations.length - 1) {
                    progress.changeLine({
                        progress: (i / annotations.length) * 100,
                        text: `Processed ${i + 1}/${annotations.length}`,
                    });
                    await Zotero.Promise.delay(10); // UI-Thread atmen lassen
                }
            }

            // Note erstellen
            await ztoolkit.Item.addNote(parentItem.id, {
                note: noteContent,
                tags: parentItem.getTags().map(t => ({ tag: t.tag })),
            });

            progress.changeLine({ text: "Done!", progress: 100, type: "success" });
        } catch (e) {
            progress.changeLine({ text: `Error: ${e.message}`, type: "fail" });
            ztoolkit.log(e);
        } finally {
            progress.startCloseTimer(3000); // Nach 3 Sekunden schließen
        }
    }

    private static formatAnnotationsAsNoteHeader(): string {
        const date = new Date().toLocaleString();
        return `<h1># Annotations</h1><p>(${date})</p><ul>`;
    }

    private static formatSingleAnnotation(
        annotation: Zotero.Annotation,
        parentItem: Zotero.Item,
        pdfItem: Zotero.Item
    ): string {
        const pageLabel = annotation.pageLabel || "N/A";
        const citation = `(${parentItem.getField("creatorSummary")}, ${parentItem.getField("year")}, p. ${pageLabel})`;
        const pdfLink = `zotero://open-pdf/library/items/${pdfItem.key}?page=${pageLabel}&annotation=${annotation.key}`;
        const itemLink = `zotero://select/library/items/${parentItem.key}`;

        return `
        <li>
          “${annotation.text}” ${citation}
          (<a href="${itemLink}">Zotero</a>)
          (<a href="${pdfLink}">PDF</a>)
        </li>
      `;
    }


    static async getAllAnnotations(pdfItemID: number) {
        if (typeof Zotero.Annotations?.getAll === 'function') {
            return Zotero.Annotations.getAll(pdfItemID); // Zotero 7+
        } else {
            return this.getAnnotationsLegacy(pdfItemID); // Zotero 6
        }
    }

    private static async getAnnotationsLegacy(itemID: number): Promise<any[]> {
        const sql = `
        SELECT name FROM sqlite_master WHERE type=?;
        `;
        // SELECT * FROM itemAnnotations
        // JOIN items ON itemAnnotations.itemID = items.itemID
        // WHERE parentItemID = ?

        try {
            const annotations = await Zotero.DB.queryAsync(sql, ['table']);
            // const annotations = await Zotero.DB.queryAsync(sql, [itemID]);
            ztoolkit.log("Tables:", annotations);
            return annotations.map(ann => ({
                text: ann.text,
                pageLabel: ann.pageLabel,
                key: Zotero.Items.get(ann.itemID).key
            }));
        } catch (e) {
            ztoolkit.log("Error fetching annotations:", e);
            return [];
        }
    }
}