import { getLocaleID, getString } from "../utils/locale";

export class TagManager {
    /**
     * Holt alle Notes innerhalb einer Collection (rekursiv).
     */
    static async getNotesFromCollection(collection: Zotero.Collection): Promise<Zotero.Item[]> {
        const allItems = await collection.getChildItems(false, false); // false = nicht rekursiv
        let noteIDs: number[] = [];

        for (const item of allItems) {
            if (!item.isNote())
                noteIDs.push(...item.getNotes(false)); // false = nur direkte Notes
        }

        const noteItems = await Zotero.Items.get(noteIDs); // Holt echte Items aus DB
        return noteItems;
    }

    static async getTagsFromCollection(collection: Zotero.Collection): Promise<string[]> {
        const items = await collection.getChildItems(false, false); // true = rekursiv
        const tagSet = new Set<string>();

        for (const item of items) {
            const tags = item.getTags(); // returns Array of { tag: string }
            for (const t of tags) {
                tagSet.add(t.tag); // Nur den Namen speichern
            }
        }

        return Array.from(tagSet);
    }




    /**
     * Fügt einer Note ein Kapitel-Tag hinzu (z.B. "Kapitel:Einleitung").
     */
    static async addChapterTag(note: Zotero.Item, chapterTag: string): Promise<void> {
        const existingTags = note.getTags();
        const newTags = [...existingTags, { tag: `Kapitel:${chapterTag}` }];
        note.setTags(newTags);
        await note.saveTx();
    }


    static async showTaggingDialog(collection: Zotero.Collection) {
        const notes: Zotero.Item[] = await TagManager.getNotesFromCollection(collection);

        const dialogData: { [key: string | number]: any } = {
            inputValue: "test",
            checkboxValue: true,
            loadCallback: () => {
                ztoolkit.log(dialogData, "Dialog Opened!");
            },
            unloadCallback: () => {
                ztoolkit.log(dialogData, "Dialog closed!");
            },
        };

        const dialog = new ztoolkit.Dialog(10, 2);
        dialog.addCell(0, 0, {
            tag: "h1",
            properties: { innerHTML: "Kapitel-Tags zu Notes hinzufügen" },
            attributes: { colspan: "2" },
        });

        notes.forEach((note, index) => {
            const textPreview = note.getNote().replace(/(<([^>]+)>)/gi, "").slice(0, 60);

            dialog.addCell(1 + index, 0, {
                tag: "p",
                properties: { innerHTML: textPreview },
            });

            dialog.addCell(1 + index, 1, {
                tag: "input",
                namespace: "html",
                attributes: {
                    "data-bind": `chapterInputs.${index}`,
                    "data-prop": "value",
                    type: "text",
                    placeholder: "Kapitelname...",
                },
            });
        });

        dialog.addButton("Tags setzen", "apply", {
            callback: async () => {
                for (let i = 0; i < notes.length; i++) {
                    const input = dialogData.chapterInputs[i];
                    if (input) await TagManager.addChapterTag(notes[i], input);
                }
                Zotero.alert(null, "Fertig!", "Kapitel-Tags wurden gesetzt.");
            },
        });

        dialog.addButton("Abbrechen", "cancel");
        dialog.setDialogData(dialogData);
        dialog.open("Kapitel-Tags setzen");

        addon.data.dialog = dialog;
        await dialogData.unloadLock.promise;
        addon.data.dialog = undefined;
        if (addon.data.alive)
            ztoolkit.getGlobal("alert")(
                `Close dialog with ${dialogData._lastButtonId}.\nCheckbox: ${dialogData.checkboxValue}\nInput: ${dialogData.inputValue}.`,
            );
        ztoolkit.log(dialogData);
    }

    static async showAdvancedTaggingDialog(collection: Zotero.Collection) {
        const allNotes: Zotero.Item[] = await TagManager.getNotesFromCollection(collection);
        ztoolkit.log("allNotes", allNotes);
        const allTags = await TagManager.getTagsFromCollection(collection); // Hole alle Tags
        ztoolkit.log("allTags", allTags);

        const chapterTags = allTags
            .filter(tag => tag.startsWith("Kap | "))
            .sort();
        ztoolkit.log("chapterTags", chapterTags);

        // Gruppiere Notes nach Kapitel-Tag
        const noteGroups: { [tag: string]: Zotero.Item[] } = {
            "<<Kein Kapitel>>": [],
        };
        for (const tag of chapterTags) {
            noteGroups[tag] = [];
        }

        for (const note of allNotes) {
            const tags = note.getTags();
            const chapterTag = tags.find(t => t.tag.startsWith("Kap | "));
            if (chapterTag) {
                noteGroups[chapterTag.tag]?.push(note);
            } else {
                noteGroups["<<Kein Kapitel>>"].push(note);
            }
        }
        ztoolkit.log("noteGroups", noteGroups);

        const dialogData: any = {
            selectedChapter: "<<Kein Kapitel>>",
            unloadCallback: () => ztoolkit.log("Dialog geschlossen"),
            loadCallback: () => ztoolkit.log("Dialog geöffnet"),
        };

        const dialog = new ztoolkit.Dialog(30, 3);

        // Linke Spalte: Kapitel-Filter (Radiobuttons)
        let row = 0;
        dialog.addCell(row++, 0, {
            tag: "h2",
            properties: { innerHTML: "Kapitelübersicht" },
        });

        Object.keys(noteGroups).forEach((tag, i) => {
            const id = `chapter-radio-${i}`;
            dialog.addCell(row, 0, {
                tag: "input",
                namespace: "html",
                id,
                attributes: {
                    type: "radio",
                    name: "chapterFilter",
                    value: tag,
                    "data-bind": "selectedChapter",
                    "data-prop": "value",
                },
                listeners: [
                    {
                        type: "change",
                        listener: () => {
                            // Dialog neustarten mit gefilterten Notes
                            addon.data.dialog?.openedWindow?.close();
                            this.showAdvancedTaggingDialog(collection);
                        },
                    },
                ],
            });
            dialog.addCell(row++, 1, {
                tag: "label",
                attributes: { for: id },
                properties: { innerHTML: tag },
            });
        });

        // Button: neues Kapitel erzeugen
        dialog.addCell(row++, 0, {
            tag: "button",
            properties: { innerHTML: "➕ Kapitel hinzufügen" },
            listeners: [{
                type: "click",
                listener: async () => {
                    const name = prompt("Name für neues Kapitel:");
                    if (!name) return;
                    const tagName = `Kap | ${name}`;
                    const note = new Zotero.Item("note");
                    note.setNote(`Globale Notiz für Kapitel: ${name}`);
                    note.setCollections([collection.id]);
                    await note.saveTx();
                    await note.addTag(tagName);
                    await note.saveTx();
                    // dialog.close();
                    this.showAdvancedTaggingDialog(collection);
                },
            }],
        });

        // Mittlere Spalte: Notes für ausgewähltes Kapitel
        const selectedNotes = noteGroups[dialogData.selectedChapter || "<<Kein Kapitel>>"] || [];
        selectedNotes.forEach((note, index) => {
            const textPreview = note.getNote().replace(/(<([^>]+)>)/gi, "").slice(0, 60);
            dialog.addCell(index, 1, {
                tag: "p",
                properties: { innerHTML: textPreview },
            });

            // Rechte Spalte: Dropdown zum Kapitel setzen
            const options = chapterTags.map(tag => ({
                tag: "option",
                properties: { value: tag.tag, innerHTML: tag.tag },
                attributes: note.hasTag(tag.tag) ? { selected: "true" } : {},
            }));
            options.unshift({
                tag: "option",
                properties: { value: "<<Kein Kapitel>>", innerHTML: "<<Kein Kapitel>>" },
                attributes: note.getTags().every(t => !t.tag.startsWith("Kap | ")) ? { selected: "true" } : {},
            });

            dialog.addCell(index, 2, {
                tag: "select",
                namespace: "html",
                attributes: { "data-note-id": note.id },
                children: options,
                listeners: [
                    {
                        type: "change",
                        listener: async (e: Event) => {
                            const value = (e.target as HTMLSelectElement).value;
                            const currentNote = allNotes.find(n => n.id === note.id);
                            if (!currentNote) return;
                            const currentTags = currentNote.getTags().filter(t => !t.tag.startsWith("Kap | "));
                            if (value !== "<<Kein Kapitel>>") currentTags.push({ tag: value });
                            currentNote.setTags(currentTags);
                            await currentNote.saveTx();
                        },
                    },
                ],
            });
        });

        dialog.setDialogData(dialogData);
        dialog.open("Kapitel-Tags verwalten");
        addon.data.dialog = dialog;

        await dialogData.unloadLock?.promise;
        addon.data.dialog = undefined;
    }

}

