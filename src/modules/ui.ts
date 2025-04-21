// src/modules/ui.ts
import { AnnotationManager } from "./annotationManager";
import { TagManager } from "./tagManager";

export class UI_Manager {
    static registerContextMenuForPDFs() {

        // ztoolkit.log(`chrome://${config.addonRef}/content/icons/Art_And_Design_Transformation-1024.png`);
        ztoolkit.Menu.register("item", {
            tag: "menuitem",
            id: "convert-annotations-to-notes",
            label: "Transform annotations into notes",
            icon: `chrome://${addon.data.config.addonRef}/content/icons/Art_And_Design_Transformation-1024.png`, // Icon hinzufügen
            // condition: (selectedItems) => {
            //     const ZoteroPane = Zotero.getActiveZoteroPane(); // Korrektur hier
            //     return selectedItems.some(item => item.isAttachment() && item.attachmentContentType === "application/pdf");
            // },
            commandListener: async () => {
                const ZoteroPane = Zotero.getActiveZoteroPane(); // Korrektur hier
                const pdfItem = ZoteroPane.getSelectedItems().filter(item => item.isAttachment() && item.attachmentContentType === "application/pdf")[0];
                // ztoolkit.log(pdfItem);
                await AnnotationManager.convertAllAnnotationsToNotes(pdfItem);
            },
        });
    }

    static registerContextMenuForTagging() {

        // ztoolkit.log(`chrome://${config.addonRef}/content/icons/Art_And_Design_Transformation-1024.png`);
        ztoolkit.Menu.register("collection", {
            tag: "menuitem",
            id: "tag-manager",
            label: "Map notes to tags",
            icon: `chrome://${addon.data.config.addonRef}/content/icons/Art_And_Design_Transformation-1024.png`,

            commandListener: async () => {
                const ZoteroPane = Zotero.getActiveZoteroPane(); // Korrektur hier
                const collection = ZoteroPane.getSelectedCollection();
                ztoolkit.log(collection);
                if (collection) await TagManager.showAdvancedTaggingDialog(collection);
            },
        });
    }
}