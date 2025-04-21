import { KnowledgeItemsManager } from "./knowledgeItemsManager";


// Zugriff auf übergebenes Argument
Window.addEventListener("load", () => {
    const collectionId = Window.arguments?.[0]; // kommt von openDialog
    if (!collectionId) {
        console.error("Keine Collection-ID übergeben!");
        return;
    }

    const manager = new KnowledgeItemsManager(window, collectionId);
    manager.init().catch(console.error);
});
