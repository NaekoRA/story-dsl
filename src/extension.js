const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context){
    const commandsPath = path.join(context.extensionPath, "commands.json");
    let FUNCTIONS = [];
    if(fs.existsSync(commandsPath)){
        FUNCTIONS = JSON.parse(fs.readFileSync(commandsPath,'utf-8'));
    }

    const provider = vscode.languages.registerCompletionItemProvider(
        {language:"story"},
        {
            provideCompletionItems(document, position){
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                
                // Cari posisi backslash terakhir
                const backslashPos = linePrefix.lastIndexOf('\\');
                
                let start, end;
                
                if (backslashPos !== -1) {
                    // Case 1: Ada backslash - ganti dari backslash sampai kursor
                    start = new vscode.Position(position.line, backslashPos);
                    end = position;
                } else {
                    // Case 2: Tidak ada backslash - ganti dari awal kata sampai kursor
                    // Cari awal kata (setelah spasi atau awal line)
                    const wordMatch = linePrefix.match(/(\s|^)(\w*)$/);
                    if (!wordMatch) return undefined;
                    
                    const wordStart = position.character - wordMatch[2].length;
                    start = new vscode.Position(position.line, wordStart);
                    end = position;
                }
                
                return FUNCTIONS.map(cmd=>{
                    const item = new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Function);
                    
                    // SELALU hasilkan dengan format \command
                    item.insertText = cmd;
                    item.range = new vscode.Range(start, end);
                    item.detail = "Story DSL Command";
                    
                    return item;
                });
            }
        },
        "\\" // Trigger character, tapi juga bisa tanpa trigger
    );

    context.subscriptions.push(provider);
}

function deactivate(){}

module.exports = {activate, deactivate};