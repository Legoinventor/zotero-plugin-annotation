// src/modules/annotationManager.ts
export class AnnotationManager {
    static async convertAllAnnotationsToNotes(pdfItem: Zotero.Item) {
        ztoolkit.log("pdfItem", pdfItem);
        const parentItem = pdfItem.parentItem;
        if (!parentItem) {
            ztoolkit.log("No parent item found for PDF");
            return;
        }
        ztoolkit.log(parentItem.getDisplayTitle());

        const progress = new ztoolkit.ProgressWindow("Converting Annotations");
        progress.createLine({ text: "Starting...", progress: 0 }).show();

        try {
            const annotations = await this.getAnnotationsZotero7(pdfItem);
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

            const noteItem = new Zotero.Item("note");
            noteItem.libraryID = parentItem.libraryID;
            noteItem.setNote(noteContent);
            const tags = parentItem.getTags().filter((element) => !element.tag.toLowerCase().includes("unread"));
            noteItem.setTags(tags);
            // noteItem.setRelations({
            //     "dc:relation": [`zotero://select/library/items/${parentItem.key}`],
            // });
            ztoolkit.log(noteItem.parentID, parentItem.id);
            noteItem.parentID = parentItem.id; // wichtig!
            await noteItem.saveTx();


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
        annotation: _ZoteroTypes.Annotations,
        parentItem: Zotero.Item,
        pdfItem: Zotero.Item
    ): string {
        const pageLabel = annotation.pageLabel || "N/A";
        const citation = `${parentItem.getField("sortCreator")}, ${parentItem.getField("year")}, p. ${pageLabel}`;
        const pdfLink = `zotero://open-pdf/library/items/${pdfItem.key}?page=${pageLabel}&annotation=${annotation.key}`;
        // const itemLink = `zotero://select/library/items/${parentItem.key}`;

        return `
        <li>
          <b>“${annotation.text}”</b> 
          (${citation}, <a href="${pdfLink}">PDF</a>)
        </li>
        `;

        // return `
        // <li>
        //   “${annotation.text}” ${citation}
        //   (<a href="${itemLink}">Zotero</a>)
        //   (<a href="${pdfLink}">PDF</a>)
        // </li>
        // `;
    }


    private static async getAnnotationsZotero7(pdfItem: Zotero.Item): Promise<_ZoteroTypes.Annotations.AnnotationJson[]> {
        const annotationItems = await pdfItem.getAnnotations();
        const annotations = await Promise.all(annotationItems.map(i => Zotero.Annotations.toJSON(i)));

        for (const a of annotations) {
            ztoolkit.log(a);
            // ztoolkit.log(a.text, a.comment, a.pageLabel, a.color);
        }

        return annotations;
    }


}