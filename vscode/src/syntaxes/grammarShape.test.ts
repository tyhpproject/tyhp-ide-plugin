import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("tyhp grammar highlights block extends and adaptation operators only", () => {
    const grammarPath = locateGrammar();
    const document = JSON.parse(fs.readFileSync(grammarPath, "utf8")) as {
        repository: Record<string, unknown>;
    };
    const repository = document.repository;

    const extensionDeclaration = repository["extension-declaration"];
    assert.equal(includes(extensionDeclaration, "#extension-body"), true);
    assert.equal(includes(extensionDeclaration, "#class-body"), false);

    const extensionBody = repository["extension-body"];
    assert.equal(includes(extensionBody, "#extension-target-group"), true);

    const targetGroup = repository["extension-target-group"] as {
        begin: string;
        beginCaptures: { "1": { name: string } };
    };
    assert.equal(targetGroup.begin.includes("extends"), true);
    assert.equal(targetGroup.beginCaptures["1"].name, "storage.modifier.extends.php");

    const operatorOverload = repository["operator-overload"];
    assert.equal(includes(operatorOverload, "#generic-type-arguments"), false);

    const useExtension = repository["use-extension"];
    assert.equal(containsScope(useExtension, "meta.operator-adaptation.tyhp"), true);
    assert.equal(containsScope(useExtension, "keyword.other.hide.tyhp"), true);
});

function locateGrammar(): string {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        const candidate = path.join(dir, "syntaxes", "tyhp.tmLanguage.json");
        if (fs.existsSync(candidate)) {
            return candidate;
        }
        dir = path.dirname(dir);
    }
    throw new Error("Could not locate syntaxes/tyhp.tmLanguage.json");
}

function includes(element: unknown, include: string): boolean {
    if (element !== null && typeof element === "object" && !Array.isArray(element)) {
        const record = element as Record<string, unknown>;
        if (record.include === include) {
            return true;
        }
        return Object.values(record).some((child) => includes(child, include));
    }
    if (Array.isArray(element)) {
        return element.some((child) => includes(child, include));
    }
    return false;
}

function containsScope(element: unknown, scope: string): boolean {
    if (typeof element === "string") {
        return element === scope;
    }
    if (Array.isArray(element)) {
        return element.some((child) => containsScope(child, scope));
    }
    if (element !== null && typeof element === "object") {
        return Object.values(element as Record<string, unknown>).some((child) => containsScope(child, scope));
    }
    return false;
}
