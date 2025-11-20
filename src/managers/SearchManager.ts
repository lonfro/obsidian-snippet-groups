import { Setting } from "obsidian";

export class SearchManager {
    static CreateSearchElement(parentContainer: HTMLElement, changeCallback: (input: string) => void): HTMLElement
    {
        return new Setting(parentContainer)
            .setName("Search css snippets")
            .setDesc("Filter css snippets by name.")
            .addSearch(s => s
                .setPlaceholder("Search css snippets...")
                .onChange(value => {
                    changeCallback(value);
                })
            ).settingEl;
    }

    static FilterSnippetsByInput(snippets: HTMLElement[], input: string): HTMLElement[]
    {
        const groupsWithResults: HTMLElement[] = [];

        snippets.forEach(s => {
            const nameEl = s.querySelector(".setting-item-name");
            if (nameEl)
            {
                if (nameEl.textContent.toLowerCase().contains(input.toLowerCase()))
                {
                    s.removeClass("snippetgroups-displaynone");

                    // suggestion
                    if (!input || input.trim() == "")
                    {
                        nameEl.textContent = (nameEl as HTMLElement)?.dataset?.originalText ?? nameEl.textContent;
                    }
                    else
                    {
                        const originalText = nameEl.textContent;
                        (nameEl as HTMLElement).dataset.originalText = originalText;
                        nameEl.empty();
                        nameEl.textContent = "";
                        const start = originalText.toLowerCase().indexOf(input.toLowerCase());
                        const end = start + input.length;
                        nameEl.appendChild(document.createTextNode(originalText.slice(0, start)));

                        const suggestionSpan = document.createElement("span")
                        suggestionSpan.addClass("suggestion-highlight");
                        suggestionSpan.textContent = originalText.slice(start, end);
                        nameEl.appendChild(suggestionSpan);

                        nameEl.appendChild(document.createTextNode(originalText.slice(end)));
                    }

                    // group hiding/showing
                    let snippetsContainer = s.parentElement;
                    if (snippetsContainer?.hasClass("tree-item-children") && snippetsContainer.parentElement)
                        if (!groupsWithResults.contains(snippetsContainer))
                            groupsWithResults.push(snippetsContainer.parentElement);
                }
                else
                {
                    nameEl.textContent = (nameEl as HTMLElement)?.dataset?.originalText ?? nameEl.textContent;
                    s.addClass("snippetgroups-displaynone");
                }
            }
            else
            {
                s.addClass("snippetgroups-displaynone");
            }
        })

        return groupsWithResults;
    }
}