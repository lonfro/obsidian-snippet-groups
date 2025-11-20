import { Notice, Menu } from "obsidian";
import { SnippetGroup } from "types/Settings";
import { ManageGroupsModal, ConfirmationModal } from "modals"
import SnippetGroupsPlugin from "main";

export class AppearanceHookManager {
    static scrollState: number | null;
    static SaveScrollState = (container: HTMLElement) => { this.scrollState = container.scrollTop; }
    static RestoreScrollState = (container: HTMLElement) => { container.scrollTop = this.scrollState ?? 0; }

    static RedrawAppearanceMenu(_plugin: SnippetGroupsPlugin)
    {
        const _settings = _plugin.settings;

        const Header = Array.from(document.querySelectorAll(".setting-item.setting-item-heading"))
                            .find(e => e.querySelector(".setting-item-name")?.textContent == "CSS snippets");
        const MenuContents = Header?.parentElement;
    
        if (!MenuContents || !Header) return;
    
        // Plugin Buttons
        const HeaderControls = Header?.querySelector(".setting-item-control");
        let ManageGroupsBtn: HTMLDivElement | null;
        const ReloadSnippetsBtn = HeaderControls?.querySelector("[aria-label=\"Reload snippets\"]");
        if (HeaderControls)
        {
            ManageGroupsBtn = document.createElement("div");
            ManageGroupsBtn.className = "clickable-icon extra-setting-button";
            ManageGroupsBtn.ariaLabel = "Manage snippet groups";
            ManageGroupsBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" style="width: var(--icon-size); height: var(--icon-size);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-group-icon lucide-group">
                <path d="M12 5.56006H22" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M14.22 2H19.78C21.56 2 22 2.44 22 4.2V8.31C22 10.07 21.56 10.51 19.78 10.51H14.22C12.44 10.51 12 10.07 12 8.31V4.2C12 2.44 12.44 2 14.22 2Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M2 17.0601H12" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M4.22 13.5H9.78C11.56 13.5 12 13.94 12 15.7V19.81C12 21.57 11.56 22.01 9.78 22.01H4.22C2.44 22.01 2 21.57 2 19.81V15.7C2 13.94 2.44 13.5 4.22 13.5Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M22 15C22 18.87 18.87 22 15 22L16.05 20.25" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M2 9C2 5.13 5.13 2 9 2L7.95001 3.75" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>`;
            ManageGroupsBtn.style.maxWidth = (HeaderControls.childNodes[0] as HTMLElement).style.width;
            ManageGroupsBtn.style.maxHeight = (HeaderControls.childNodes[0] as HTMLElement).style.height;
            HeaderControls.insertBefore(ManageGroupsBtn, HeaderControls.childNodes[0]);
    
            ManageGroupsBtn.addEventListener("click", () => {
                new ManageGroupsModal(_plugin.app, _plugin, () => {
                    // this.RefreshSnippets(snippets, groups, MenuContents);
                    // this.RefreshGroups(groups);
                    this.SaveScrollState(MenuContents);
                    (ReloadSnippetsBtn as HTMLElement).click();
                    this.RestoreScrollState(MenuContents);
                }).open();
            })
    
            if (ReloadSnippetsBtn)
            {
                ReloadSnippetsBtn.addEventListener("click", () => {
                    this.SaveScrollState(MenuContents);
                    _plugin.noticeObserver.reconnect(MenuContents);
                }, { once: true })
            }
        }
    
        const groups: HTMLElement[] = [];
        const snippets: HTMLElement[] = [];
        
        // collect snippets
        let _s = Header?.nextElementSibling;
        while (_s)
        {
            snippets.push(_s as HTMLElement)
            _s = _s.nextElementSibling;
        }
    
        for (const group of _settings.snippetGroups) {
            const groupElement = this.NewGroupElement(_plugin, group);
            Header?.parentElement?.append(groupElement);
            groups.push(groupElement);
    
            // context menu
            groupElement.oncontextmenu = (e: MouseEvent) => {
                new Menu()
                    .addItem(item => item
                        .setTitle("Rename group")
                        .onClick(() => {
                            if (ManageGroupsBtn)
                            {
                                /* Separate from managegroupsbtn.click(), since we need
                                    to preselect the group. */
                                new ManageGroupsModal(_plugin.app, _plugin, () => {
                                    (ReloadSnippetsBtn as HTMLElement).click();
                                }, group).open();
                            }
                        })
                    )
                    .addItem(item => item
                        .setTitle("Delete group")
                        .setWarning(true)
                        .onClick(() => {
                            new ConfirmationModal(_plugin.app, `Are you sure you want to delete "${group.name}"?`, async () => {
                                // confirmation callback
                                _settings.snippetGroups.remove(group);
                                await _plugin.saveSettings();
                                (ReloadSnippetsBtn as HTMLElement).click();
                            }).open()
                        })
                    )
                    .showAtMouseEvent(e)
            }
    
            // drag n drop
            //#region
            let dragCounter = 0;
            groupElement.ondragenter = (e: DragEvent) => {
                dragCounter++;
                groupElement.classList.add("is-being-dragged-over");
            }
            groupElement.ondragover = (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
            }
            groupElement.ondragleave = (e: DragEvent) => {
                dragCounter--;
                if (dragCounter == 0) groupElement.classList.remove("is-being-dragged-over");
            }
            groupElement.ondrop = async (e: DragEvent) => {
                dragCounter = 0;
                e.stopPropagation();
                groupElement.classList.remove("is-being-dragged-over");
                const snippet = snippets[parseInt(e.dataTransfer?.getData("text/plain") ?? "-1")];
                const arrivingSnippetName = snippet.querySelector(".setting-item-name")?.textContent;
                if (snippet && arrivingSnippetName && snippet.parentElement)
                {
                    // is it already in another group?
                    if (snippet.parentElement.className == "tree-item-children"
                        && snippet.parentElement.parentElement?.parentElement)
                    {
                        const fromGroup = groups.indexOf(snippet.parentElement.parentElement?.parentElement);
                        if (fromGroup != -1)
                        {
                            _settings.snippetGroups[fromGroup].snippets.remove(arrivingSnippetName);
                            group.snippets.push(arrivingSnippetName);
                            await _plugin.saveSettings();
                        }
                    }
                    groupElement.querySelector(".tree-item-children")?.appendChild(snippet);
                    group.snippets.push(arrivingSnippetName);
                    await _plugin.saveSettings();
                }
                this.RefreshSnippets(_plugin, snippets, groups, MenuContents);
                this.RefreshGroups(_plugin, groups);
            }
            //#endregion
        }
    
        for (const snippet of snippets)
        {
            // move groups context menu
            snippet.oncontextmenu = (e) => {
                e.stopPropagation();
                new Menu()
                    .addItem(item => item
                        .setTitle("Move snippet to...")
                        .setIcon("send-to-back")
                        .onClick((e) => {
                            const snippetsMenu = new Menu();
                            snippetsMenu.addItem(item => item
                                .setTitle("None")
                                .onClick(() => {
                                    const name = snippet.querySelector(".setting-item-name")?.textContent;
                                    if (name)
                                    {
                                        // remove from old group
                                        const isInGroup = _settings.snippetGroups.find((g: SnippetGroup) => g.snippets.includes(name));
                                        if (isInGroup)
                                        {
                                            isInGroup.snippets.remove(name);
                                        }
                                        this.RefreshSnippets(_plugin, snippets, groups, MenuContents);
                                        this.RefreshGroups(_plugin, groups);
                                        new Notice(`Moved css snippet "${name}" into root area.`);
                                    }
                                })
                            )
                            snippetsMenu.addItem(item => item
                                .setTitle("New group")
                                .onClick(() => {
                                    ManageGroupsBtn?.click();
                                })
                            )
                            snippetsMenu.addSeparator();
                            // make option for each group
                            _settings.snippetGroups.forEach((g: SnippetGroup) => {
                                snippetsMenu.addItem(item => item
                                    .setTitle(g.name)
                                    .onClick(() => {
                                        const name = snippet.querySelector(".setting-item-name")?.textContent;
                                        if (name)
                                        {
                                            // remove from old group
                                            const isInGroup = _settings.snippetGroups.find((g: SnippetGroup) => g.snippets.includes(name));
                                            if (isInGroup)
                                            {
                                                isInGroup.snippets.remove(name);
                                            }
                                            g.snippets.push(name);
                                            this.RefreshSnippets(_plugin, snippets, groups, MenuContents);
                                            this.RefreshGroups(_plugin, groups);
                                            new Notice(`Moved css snippet "${name}" into snippet group "${g.name}".`);
                                        }
                                    })
                                )
                            })
                            snippetsMenu.showAtMouseEvent(e as MouseEvent);
                        })
                    )
                    .showAtMouseEvent(e);
            }
    
            // drag n drop
            snippet.draggable = true;
            snippet.ondragstart = (e) => {
                e.dataTransfer?.setData("text/plain", snippets.indexOf(snippet).toString());
            }
        }
    
        // drag n drop outside
        //#region
        MenuContents.ondragover = (e) => {
            e.preventDefault();
            MenuContents.classList.add("is-being-dragged-over");
        }
        MenuContents.ondragleave = (e) => {
            MenuContents.classList.remove("is-being-dragged-over");
        }
        MenuContents.ondrop = async (e) => {
            MenuContents.classList.remove("is-being-dragged-over");
            const snippet = snippets[parseInt(e.dataTransfer?.getData("text/plain") ?? "-1")];
            const arrivingSnippetName = snippet.querySelector(".setting-item-name")?.textContent;
            if (snippet && arrivingSnippetName && snippet.parentElement)
            {
                // is it already in another group?
                if (snippet.parentElement.className == "tree-item-children"
                    && snippet.parentElement.parentElement?.parentElement)
                {
                    const fromGroup = groups.indexOf(snippet.parentElement.parentElement?.parentElement);
                    if (fromGroup != -1)
                    {
                        _settings.snippetGroups[fromGroup].snippets.remove(arrivingSnippetName);
                        await _plugin.saveSettings();
                    }
                }
    
                MenuContents.appendChild(snippet);
            }
            this.RefreshSnippets(_plugin, snippets, groups, MenuContents);
            this.RefreshGroups(_plugin, groups);
        }
        //#endregion
    
        const scrollHeight = MenuContents?.scrollHeight ?? null;
    
        this.RefreshSnippets(_plugin, snippets, groups, MenuContents);
        this.RefreshGroups(_plugin, groups, true);
        
        // scroll height maintainer
        if (scrollHeight)
        {
            const ScrollMaintainer = document.createElement("div");
            Object.assign(ScrollMaintainer.style, {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: scrollHeight + "px",
                pointerEvents: "none",
                visibility: "hidden",
                zIndex: "0",
            });
            MenuContents?.appendChild(ScrollMaintainer);
        }
    }

    static RefreshSnippets(_plugin: SnippetGroupsPlugin, snippets: HTMLElement[], groups: HTMLElement[], MenuContents: HTMLElement)
    {
        for (const snippet of snippets)
        {
            const name = snippet.querySelector(".setting-item-name")?.textContent;
            if (name)
            {
                const group = _plugin.settings.snippetGroups.find(g => g.snippets.includes(name));
                if (group)
                {
                    groups[_plugin.settings.snippetGroups.indexOf(group)].querySelector(".tree-item-children")?.append(snippet);
                }
                else
                {
                    MenuContents?.append(snippet);
                }
            }
            else
            {
                MenuContents?.append(snippet);
            }
        }
    }

    static RefreshGroups(_plugin: SnippetGroupsPlugin, groups: HTMLElement[], skipAnimation?: boolean)
    {
        groups.forEach(groupElement => {
            // resize
            const name = groupElement.querySelector(".setting-item-name");
            const group = _plugin.settings.snippetGroups.find(g => g.name == name?.textContent);
            if (group)
            {
                const collapsed = this.RedrawGroupSize(groupElement, group.collapsed, skipAnimation);
                group.collapsed = collapsed;
            }
            else
            {
                this.RedrawGroupSize(groupElement, undefined, skipAnimation);
            }
            // snippets count on hover
            if (name?.parentElement)
            {
                name.parentElement.ariaLabel = `${groupElement.querySelector(".tree-item-children")?.childElementCount} Snippets`;
            }
        })
    }

    static NewGroupElement(_plugin: SnippetGroupsPlugin, group: SnippetGroup)
    {
        const groupElement = document.createElement("div");
        groupElement.className = "setting-item  nav-folder";

        const infoDiv = groupElement.createEl("div", { cls: "setting-item-info" });

        const titleDiv = infoDiv.createEl("div", { cls: "nav-file-title" });

        titleDiv.setAttr("style", "display: inline-flex; padding-left: 0px; width: 100%;");

        const collapseDiv = titleDiv.createEl("div", { cls: "collapse-icon is-collapsed" });
        collapseDiv.setAttr("style", "max-width: fit-content; margin-right: 10px");

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "svg-icon right-triangle");
        collapseDiv.appendChild(svg);
        svg.setAttrs({
            xmlns: "http://www.w3.org/2000/svg",
            width: "24",
            height: "24",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        });
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M3 8L12 17L21 8");
        svg.appendChild(path);

        const nameDiv = titleDiv.createEl("div", { cls: "setting-item-name" });
        nameDiv.setAttr("style", "max-width: fit-content;");
        nameDiv.setText(group.name);

        // Tree children container
        const childrenDiv = infoDiv.createEl("div", { cls: "tree-item-children" });
        childrenDiv.setAttr(
            "style",
            "padding-left: 3em; overflow: hidden; height: 0; display: none; margin-left: 4.5px; transition: height var(--anim-duration-moderate) var(--anim-motion-smooth);"
        );

        const style = document.createElement("style");
        style.textContent = `
        .setting-item-info > .tree-item-children > div {
            padding-top: 0.75em;
            padding-bottom: 0.75em;
        }`;
        document.head.appendChild(style);

        groupElement.querySelector(".nav-file-title")?.addEventListener("click", HandleGroupClick.bind(this));
        if (group.collapsed == false) this.RedrawGroupSize(groupElement, false);

        function HandleGroupClick()
        {
            group.collapsed = !group.collapsed;
            group.collapsed = this.RedrawGroupSize(groupElement, group.collapsed);
            _plugin.saveSettings();
        }

        return groupElement;
    }

    static RedrawGroupSize(groupElement: HTMLElement, shouldDrawCollapsed?: boolean, skipAnimation?: boolean)
    {
        const container = groupElement.querySelector(".tree-item-children") as HTMLElement;
        const collapseIcon = groupElement.querySelector(".collapse-icon") as HTMLElement;
        const empty = container.childElementCount <= 0;

        if (shouldDrawCollapsed == null) shouldDrawCollapsed = container.style.height == "0px";
        if (empty) shouldDrawCollapsed = true;
        
        container.style.display = "";

        if (shouldDrawCollapsed)
        {
            container.style.height = "0px";
            collapseIcon.classList.add("is-collapsed");
        } 
        else
        {
            const svg = collapseIcon.querySelector("svg");
            const currentHeight = container.offsetHeight;
            container.style.height = "auto"
            // Directly setting auto doesnt animate, so we need to find its height
            // then set it back to normal, and then set the height in pixels.
            requestAnimationFrame(() => {
                const fitHeight = container.scrollHeight;
                container.style.height = currentHeight + "px";
                collapseIcon.classList.remove("is-collapsed");
                if (skipAnimation)
                {
                    container.style.height = fitHeight + "px";
                    if (svg)
                    {
                        svg.style.transition = "none";
                    }
                }
                requestAnimationFrame(() => {
                    container.style.height = fitHeight + "px";
                    if (skipAnimation && svg)
                    {
                        svg.style.transition = "";
                    }
                })
            })
        }

        container.addEventListener("transitionend", OnTransitionEnd);
        function OnTransitionEnd()
        {
            const isNowCollapsed = container.style.height == "0px";
            if (isNowCollapsed)
            {
                container.style.display = "none";
                container.removeEventListener("transitionend", OnTransitionEnd)
            }
        }

        return shouldDrawCollapsed;
    }
}