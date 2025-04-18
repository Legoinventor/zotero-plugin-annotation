// src/modules/ui.ts
import { AnnotationManager } from "./annotationManager";

export class AnnotationUI {
    static registerContextMenuForPDFs() {

        // ztoolkit.log(`chrome://${config.addonRef}/content/icons/Art_And_Design_Transformation-1024.png`);
        ztoolkit.Menu.register("item", {
            tag: "menuitem",
            id: "convert-annotations-to-notes",
            label: "Transform annotations into notes",
            icon: `chrome://${addon.data.config.addonRef}/content/icons/Art_And_Design_Transformation-1024.png`, // Icon hinzufügen
            condition: (selectedItems) => {
                const ZoteroPane = Zotero.getActiveZoteroPane(); // Korrektur hier
                return selectedItems.some(item => item.isAttachment() && item.attachmentContentType === "application/pdf");
            },
            commandListener: async () => {
                const ZoteroPane = Zotero.getActiveZoteroPane(); // Korrektur hier
                const pdfItem = ZoteroPane.getSelectedItems()[0];
                await AnnotationManager.convertAllAnnotationsToNotes(pdfItem);
            },
        });
    }
}