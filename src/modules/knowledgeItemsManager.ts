import { TagManager } from "./tagManager";

export class KnowledgeItemsManager {
    private win: Window;
    private collection: Zotero.Collection;

    constructor(win: Window, collection: Zotero.Collection) {
        this.win = win;
        this.collection = collection;
    }

    async init() {
        const notes = await TagManager.getNotesFromCollection(this.collection);
        const tags = await TagManager.getTagsFromCollection(this.collection);

        const kapitelTags = tags.filter(tag => tag.startsWith("Kap | "));
        kapitelTags.sort(); // oder nach Nummer sortieren

        this.renderChapters(kapitelTags);
        this.renderNotes(notes, kapitelTags);
    }

    renderChapters(kapitelTags: string[]) {
        const list = this.win.document.getElementById("chapter-list");
        if (!list) return;

        kapitelTags.forEach(tag => {
            const radio = this.win.document.createElement("input");
            radio.type = "radio";
            radio.name = "chapter-filter";
            radio.value = tag;
            list.appendChild(radio);

            const label = this.win.document.createElement("label");
            label.textContent = tag;
            list.appendChild(label);
        });
    }

    renderNotes(notes: Zotero.Item[], kapitelTags: string[]) {
        const container = this.win.document.getElementById("note-list");
        if (!container) return;

        notes.forEach(note => {
            const div = this.win.document.createElement("div");
            div.textContent = note.getNote(); // oder Teil davon
            container.appendChild(div);

            const select = this.win.document.createElement("select");
            const emptyOpt = new Option("<<Kein Kapitel>>", "");
            select.appendChild(emptyOpt);

            kapitelTags.forEach(tag => {
                select.appendChild(new Option(tag, tag));
            });

            // Vorbelegung mit aktuellem Tag
            const currentTag = note.getTags().find(t => t.tag.startsWith("Kap | "));
            if (currentTag) select.value = currentTag.tag;

            // Bei Änderung: Kapitel-Tag neu setzen
            select.addEventListener("change", async () => {
                const tag = select.value;
                await note.setTags([]); // oder gezielt entfernen
                if (tag) await note.addTag(tag);
                await note.saveTx();
            });

            container.appendChild(select);
        });
    }
}
