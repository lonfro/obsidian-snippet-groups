import { App, Modal, Setting } from "obsidian";

export class ConfirmationModal extends Modal {
    submitCallback: () => void;

    constructor(app: App, title: string, submitCallback: () => void) {
        super(app);
        this.setTitle(title);
        this.submitCallback = submitCallback;
    }

    onOpen() {
        new Setting(this.contentEl)
            .addButton(button => button
                .setButtonText("No")
                .onClick(() => {
                    this.close();
                })
            )
            .addButton(button => button
                .setButtonText("Yes")
                .setWarning()
                .onClick(() => {
                    this.submitCallback();
                    this.close();
                })
            )
    }
}