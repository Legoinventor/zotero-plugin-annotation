
export class NoteManager {

    static async createNote(parentItem: Zotero.Item, noteContent: string, tags: any) {
        const noteItem = new Zotero.Item("note");
        noteItem.libraryID = parentItem.libraryID;
        noteItem.setNote(noteContent);
        noteItem.setTags(tags);
        // noteItem.setRelations({
        //     "dc:relation": [`zotero://select/library/items/${parentItem.key}`],
        // });
        // ztoolkit.log(noteItem.parentID, parentItem.id);
        noteItem.parentID = parentItem.id; // wichtig!
        await noteItem.saveTx();
    }
}