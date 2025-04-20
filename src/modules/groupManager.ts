import { AnnotationManager } from "./annotationManager";

export interface AnnotationGroup {
    color: string;
    pageLabel: string;
    pageIndex: number;
    annotations: _ZoteroTypes.Annotations.AnnotationJson[];
}

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

        // Note manuell erstellen und korrekt mit Parent verbinden
        const groupNote = new Zotero.Item("note");
        groupNote.libraryID = parentItem.libraryID;
        groupNote.setNote(groupNoteContent);
        groupNote.setTags([...tags, `Group:${groupName}`]);
        groupNote.parentID = parentItem.id;

        await groupNote.saveTx();

        // Annotationen mit Gruppen-ID im Feld "extra" markieren
        for (const id of annotationIDs) {
            const note = Zotero.Items.get(id);
            note.setField("extra", `Group:${groupNote.id}`);
            await note.save();
        }

        return groupNote;
    }

    static groupAnnotationsByPageAndColor(annotations: _ZoteroTypes.Annotations.AnnotationJson[]): AnnotationGroup[] {
        const grouped: any = {};

        annotations.forEach(annotation => {
            // Erstelle einen eindeutigen Schlüssel aus Farbe und Seitenzahl
            const key = `${annotation.pageLabel}_${annotation.color}`;

            // Wenn die Gruppe noch nicht existiert, erstelle sie
            if (!grouped[key]) {
                grouped[key] = {
                    color: annotation.color,
                    pageLabel: annotation.pageLabel,
                    pageIndex: annotation.position.pageIndex,
                    annotations: []
                };
            }

            // Füge die Annotation zur Gruppe hinzu
            grouped[key].annotations.push(annotation);
        });

        // Konvertiere das Objekt in ein Array von Gruppen
        return Object.values(grouped);
    }

}