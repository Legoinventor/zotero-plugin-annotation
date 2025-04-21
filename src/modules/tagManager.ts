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
        const allTags = await TagManager.getTagsFromCollection(collection);

        const chapterTags = allTags
            .filter(tag => tag.startsWith("Kap | "))
            .sort();

        const noteGroups: { [tag: string]: Zotero.Item[] } = {
            "<<Kein Kapitel>>": [],
        };
        for (const tag of chapterTags) noteGroups[tag] = [];

        for (const note of allNotes) {
            const chapterTag = note.getTags().find(t => t.tag.startsWith("Kap | "));
            if (chapterTag) {
                noteGroups[chapterTag.tag]?.push(note);
            } else {
                noteGroups["<<Kein Kapitel>>"].push(note);
            }
        }
        ztoolkit.log(noteGroups);

        const dialogData: any = {
            selectedChapter: "<<Kein Kapitel>>",
            loadCallback: () => ztoolkit.log("Dialog geöffnet"),
            unloadCallback: () => ztoolkit.log("Dialog geschlossen"),
        };

        const dialog = new ztoolkit.Dialog(30, 3);

        // Spalte 0: Kapitel-Filter (Radiobuttons)
        let row = 0;
        dialog.addCell(row++, 0, {
            tag: "h2",
            properties: { innerHTML: "Kapitelübersicht" },
        });

        dialog.addCell(row++, 0, {
            tag: "div",
            id: "chapter-filter",
            properties: { innerHTML: "" },
        });

        dialog.addButton(row++, 0, {
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
                    await this.showAdvancedTaggingDialog(collection); // Neu laden
                },
            }],
        });

        // Leere Wrapper für Spalte 1 und 2 (mittig und rechts)
        dialog.addCell(0, 1, {
            tag: "div",
            id: "note-list",
            properties: { innerHTML: "" },
            attributes: { rowspan: "50" },
        });
        dialog.addCell(0, 2, {
            tag: "div",
            id: "chapter-selects",
            properties: { innerHTML: "" },
            attributes: { rowspan: "50" },
        });

        // Dynamisches Rendering nach Auswahl
        const renderDynamicContent = (selectedTag: string) => {
            const document = Zotero.getMainWindow().document;

            const noteListDiv = document.getElementById("note-list");
            const selectsDiv = document.getElementById("chapter-selects");
            if (!noteListDiv || !selectsDiv) return;

            const selectedNotes = noteGroups[selectedTag] || [];

            noteListDiv.innerHTML = "";
            selectsDiv.innerHTML = "";

            selectedNotes.forEach((note, index) => {
                const textPreview = note.getNote().replace(/(<([^>]+)>)/gi, "").slice(0, 60);

                const noteP = document.createElement("p");
                noteP.innerText = textPreview;
                noteP.id = `note-preview-${note.id}`;
                noteListDiv.appendChild(noteP);

                const select = document.createElement("select");
                select.setAttribute("data-note-id", note.id.toString());
                select.addEventListener("change", async (e) => {
                    const value = (e.target as HTMLSelectElement).value;
                    const currentNote = allNotes.find(n => n.id === note.id);
                    if (!currentNote) return;
                    const currentTags = currentNote.getTags().filter(t => !t.tag.startsWith("Kap | "));
                    if (value !== "<<Kein Kapitel>>") currentTags.push({ tag: value });
                    currentNote.setTags(currentTags);
                    await currentNote.saveTx();
                });

                const noChapterSelected = note.getTags().every(t => !t.tag.startsWith("Kap | "));
                const allOptions = [
                    ...[
                        {
                            tag: "<<Kein Kapitel>>",
                            selected: noChapterSelected,
                        },
                    ],
                    ...chapterTags.map(tag => ({
                        tag,
                        selected: note.hasTag(tag),
                    })),
                ];

                allOptions.forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt.tag;
                    option.innerText = opt.tag;
                    if (opt.selected) option.selected = true;
                    select.appendChild(option);
                });

                selectsDiv.appendChild(select);
            });
        };

        // Kapitel-Filter als Radiobuttons rendern
        const renderChapterFilter = () => {
            const document = Zotero.getMainWindow().document;
            const filterContainer = document.getElementById("chapter-filter");
            if (!filterContainer) return;
            filterContainer.innerHTML = "";

            Object.keys(noteGroups).forEach((tag, i) => {
                const radio = document.createElement("input");
                const id = `radio-${i}`;
                radio.type = "radio";
                radio.name = "chapter-radio";
                radio.value = tag;
                radio.id = id;
                radio.checked = tag === dialogData.selectedChapter;
                radio.addEventListener("change", () => {
                    dialogData.selectedChapter = tag;
                    renderDynamicContent(tag);
                });

                const label = document.createElement("label");
                label.setAttribute("for", id);
                label.innerText = tag;

                filterContainer.appendChild(radio);
                filterContainer.appendChild(label);
                filterContainer.appendChild(document.createElement("br"));
            });
        };

        renderChapterFilter();
        renderDynamicContent(dialogData.selectedChapter);

        dialog.setDialogData(dialogData);
        dialog.open("Kapitel-Tags verwalten");
        addon.data.dialog = dialog;

        await dialogData.unloadLock?.promise;
        addon.data.dialog = undefined;
    }


}

