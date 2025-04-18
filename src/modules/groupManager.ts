import { AnnotationManager } from "./annotationManager";

export class GroupManager {
    /**
     * Erstellt eine Gruppen-Note und verknüpft Annotationen damit.
     * @param parentItem Zotero-Eintrag
     * @param annotationIDs IDs der Notes, die gruppiert werden sollen
     * @param groupName Name der Gruppe (optional)
     * @param tags Tags der Gruppe (vom Parent übernommen + Gruppen-Tag)
     */
    static async createGroupNote(
        parentItem: Zotero.Item,
        annotationIDs: number[],
        groupName: string = "Unbenannte Gruppe",
        tags: string[]
    ): Promise<Zotero.Item> {
        const groupNoteContent = `
      <h1>Group: ${groupName}</h1>
      <p>Enthält ${annotationIDs.length} Annotationen.</p>
    `;

        const groupNote = await ztoolkit.Item.addNote(parentItem.id, {
            note: groupNoteContent,
            tags: [...tags, `Group:${groupName}`],
        });

        // Verknüpfe Annotation-Notes mit der Gruppe
        for (const id of annotationIDs) {
            const note = Zotero.Items.get(id);
            note.setField('extra', `Group:${groupNote.id}`);
            await note.save();
        }

        return groupNote;
    }
}