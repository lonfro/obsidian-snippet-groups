import { App, Modal, Setting } from "obsidian";
import { SnippetGroup } from "types/Settings";
import { ConfirmationModal } from "./ConfirmationModal"
import { LocalisationManager } from "managers/LocalisationManager";
import SnippetGroupsPlugin from "main";

export class ManageGroupsModal extends Modal {
    plugin: SnippetGroupsPlugin
    PreselectedGroup: SnippetGroup | undefined

    constructor(app: App, plugin: SnippetGroupsPlugin, closeCallback: () => void, preselectedGroup?: SnippetGroup) {
        super(app);
        this.plugin = plugin;
        this.PreselectedGroup = preselectedGroup;
        this.setTitle(LocalisationManager.getNs("modals.manage-snippet-groups.title"));
        this.setCloseCallback(closeCallback)
    }

    onOpen() {
        this.contentEl.empty();
        this.plugin.settings.snippetGroups.forEach((group, i) => {
            let nameEntry: HTMLInputElement | undefined;
            new Setting(this.contentEl)
                .setName((i + 1).toString())
                .addText(text => {
                    text.setValue(group.name)
                        .setPlaceholder(LocalisationManager.getNs("modals.manage-snippet-groups.name-placeholder"))
                        .onChange(async value => {
                            group.name = value;
                            await this.plugin.saveSettings();
                        })
                    nameEntry = text.inputEl;
                })
                .addButton(button => button
                    .setIcon("arrow-up")
                    .onClick(async () => {
                        const arr = this.plugin.settings.snippetGroups;
                        if (i > 0) {
                            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                        }
                        await this.plugin.saveSettings();
                        this.onOpen();
                    })
                )
                .addButton(button => button
                    .setIcon("arrow-down")
                    .onClick(async () => {
                        const arr = this.plugin.settings.snippetGroups;
                        if (i < arr.length - 1) {
                            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        }
                        await this.plugin.saveSettings();
                        this.onOpen();
                    })
                )
                .addButton(button => button
                    .setIcon("delete")
                    .setWarning()
                    .onClick(() => {
                        async function onConfirmCallback(_this: ManageGroupsModal)
                        {
                            // confirmation callback
                            _this.plugin.settings.snippetGroups.remove(group);
                            await _this.plugin.saveSettings();
                            _this.onOpen();
                        }
                        new ConfirmationModal(
                            this.app,
                            LocalisationManager.getNsVars(
                                "modals.confirmation.delete",
                                null,
                                [{key: "snippet", value: group.name}]
                            ),
                            () => {
                                void onConfirmCallback(this).catch(console.error);
                            }).open()
                    })
                );
            if (group == this.PreselectedGroup && nameEntry)
            {
                requestAnimationFrame(() => {
                    (nameEntry as HTMLInputElement).focus();
                })
            }
        });

        new Setting(this.contentEl)
            .addButton(btn => btn
                .setButtonText(LocalisationManager.getNs("modals.manage-snippet-groups.add-btn"))
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.snippetGroups.push({
                        name: LocalisationManager.getNs("modals.manage-snippet-groups.default-group-name"),
                        snippets: [],
                        collapsed: true,
                        order: this.plugin.settings.snippetGroups.length
                    });
                    await this.plugin.saveSettings();
                    this.onOpen();
                })
            );
    }
}