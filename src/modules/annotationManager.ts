import { NoteManager } from "./noteManager";
import { AnnotationGroup, GroupManager } from './groupManager';
import { getEmojiForColor, hexToEmoji } from "../utils/colorMapper";

// src/modules/annotationManager.ts
export class AnnotationManager {
    static async convertAllAnnotationsToNotes(pdfItem: Zotero.Item) {
        const parentItem = pdfItem.parentItem;
        if (!parentItem) {
            ztoolkit.log("No parent item found for PDF");
            return;
        }
        // ztoolkit.log("pdfItem", pdfItem);
        // ztoolkit.log('parentItem', parentItem);

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


            const noteGroups: AnnotationGroup[] = GroupManager.groupAnnotationsByPageAndColor(annotations);
            ztoolkit.log(noteGroups);

            noteGroups.forEach((group: AnnotationGroup, index: number) => {
                let noteContent = `<h1>${hexToEmoji(group.color)} Group (p.${group.pageLabel} | ${group.color})</h1>`;
                group.annotations.forEach((an: _ZoteroTypes.Annotations.AnnotationJson) => {
                    noteContent += this.formatSingleAnnotation(an, parentItem, pdfItem);
                });

                if (index % 5 === 0 || index === annotations.length - 1) {
                    progress.changeLine({
                        progress: (index / annotations.length) * 100,
                        text: `Processed ${index + 1}/${annotations.length}`,
                    });
                    Zotero.Promise.delay(10); // UI-Thread atmen lassen
                }

                const ignoreTags: string[] = ["unread", "read", "analyse"]
                const tags = parentItem.getTags().filter((element: any) => !ignoreTags.some(ignore => element.tag.toLowerCase().includes(ignore)));
                NoteManager.createNote(parentItem, noteContent, tags);

            });



            progress.changeLine({ text: "Done!", progress: 100, type: "success" });
        } catch (e: any) {
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
        annotation: _ZoteroTypes.Annotations.AnnotationJson,
        parentItem: Zotero.Item,
        pdfItem: Zotero.Item
    ): string {
        const pageLabel = annotation.pageLabel || "N/A";
        const citation = `${parentItem.getField("firstCreator")}, ${parentItem.getField("year")}, p. ${pageLabel}`;
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
        return annotations;
    }



}