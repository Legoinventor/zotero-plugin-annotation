export async function openKnowledgeItemsWindow(mainWin: _ZoteroTypes.MainWindow, collection: Zotero.Collection) {
    const win = mainWin.openDialog(
        `chrome://${addon.data.config.addonRef}/content/knowledgeItems/knowledgeItems.html`,
        "knowledgeItems",
        "chrome,resizable,centerscreen",
        collection.id // Übergabe der Collection-ID
    );
}
