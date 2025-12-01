const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    console.log('Story DSL extension activated!');
    
    const commandsPath = path.join(context.extensionPath, "commands.json");
    let COMPLETION_ITEMS = [];
    
    if (fs.existsSync(commandsPath)) {
        try {
            const commandsData = JSON.parse(fs.readFileSync(commandsPath, 'utf-8'));
            COMPLETION_ITEMS = [
                ...processItems(commandsData.commands || []),
                ...processItems(commandsData.variables || []),
                ...processItems(commandsData.configs || [])
            ];
            console.log('Loaded completion items:', COMPLETION_ITEMS.length);
        } catch (error) {
            console.error('Error loading commands.json:', error);
        }
    }

    function processItems(items) {
        return items.map(item => {
            if (typeof item === 'string') {
                return { 
                    name: item, 
                    template: item,
                    kind: getItemKind(item)
                };
            } else {
                return {
                    ...item,
                    kind: getItemKind(item.name)
                };
            }
        });
    }

    function getItemKind(name) {
        if (name.startsWith('$')) return vscode.CompletionItemKind.Variable;
        if (name.startsWith('\\')) return vscode.CompletionItemKind.Function;
        if (name.includes('=')) return vscode.CompletionItemKind.Property;
        return vscode.CompletionItemKind.Text;
    }

    const provider = vscode.languages.registerCompletionItemProvider(
        { language: "story" },
        {
            provideCompletionItems(document, position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                
                console.log('Completion triggered for:', linePrefix);

                // CASE 1: User baru saja mengetik \ atau $
                if (linePrefix.endsWith('\\') || linePrefix.endsWith('$')) {
                    const start = new vscode.Position(position.line, position.character - 1);
                    const end = position;
                    console.log('Case 1 - Trigger character');
                    return createCompletionItems(start, end);
                }

                // CASE 2: User sudah mengetik sebagian setelah \ atau $
                const triggerMatch = linePrefix.match(/([\\\$])(\w+)$/);
                if (triggerMatch) {
                    const triggerChar = triggerMatch[1];
                    const typedText = triggerMatch[2];
                    const startPos = position.character - typedText.length - 1;
                    const start = new vscode.Position(position.line, startPos);
                    const end = position;
                    console.log('Case 2 - Partial after trigger:', triggerChar, typedText);
                    return createCompletionItems(start, end);
                }

                // CASE 3: User mengetik tanpa trigger character
                const wordMatch = linePrefix.match(/(\s|^)(\w+)$/);
                if (wordMatch) {
                    const typedText = wordMatch[2];
                    const startPos = position.character - typedText.length;
                    const start = new vscode.Position(position.line, startPos);
                    const end = position;
                    console.log('Case 3 - Word only:', typedText);
                    return createCompletionItems(start, end);
                }

                return undefined;
            }
        },
        "\\", "$" // Trigger characters
    );

    function createCompletionItems(start, end) {
        return COMPLETION_ITEMS.map(itemData => {
            const completionItem = new vscode.CompletionItem(
                itemData.name, 
                itemData.kind
            );
            
            // Untuk item sederhana, gunakan insertText biasa
            if (typeof itemData.template === 'string' && !itemData.template.includes('${')) {
                completionItem.insertText = itemData.template;
            } else {
                // Untuk template dengan placeholder, gunakan snippet
                const snippetString = new vscode.SnippetString(itemData.template);
                completionItem.insertText = snippetString;
            }
            
            completionItem.range = new vscode.Range(start, end);
            
            if (itemData.description) {
                completionItem.detail = itemData.description;
                completionItem.documentation = new vscode.MarkdownString(itemData.description);
            } else {
                completionItem.detail = getDefaultDescription(itemData.name);
            }
            
            return completionItem;
        });
    }

    function getDefaultDescription(name) {
        if (name.startsWith('$')) return "Color Variable";
        if (name.startsWith('\\')) return "Story Command";
        if (name.includes('=')) return "Configuration Parameter";
        return "Story Element";
    }

    context.subscriptions.push(provider);
}

function deactivate() {
    console.log('Story DSL extension deactivated!');
}

module.exports = {
    activate,
    deactivate
};