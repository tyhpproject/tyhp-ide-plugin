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

test("tyhp grammar highlights struct bracket initializers", () => {
    const grammarPath = locateGrammar();
    const document = JSON.parse(fs.readFileSync(grammarPath, "utf8")) as {
        repository: Record<string, Rule>;
    };
    const repository = document.repository;

    const codeBody = includesOf(repository["tyhp-code-body"]);
    const classMember = includesOf(repository["tyhp-class-member"]);
    for (const include of [
        "#new-anonymous-struct-initializer",
        "#new-generic-struct-initializer",
        "#new-struct-initializer",
    ]) {
        assert.equal(codeBody.indexOf(include) >= 0, true, include);
        assert.equal(codeBody.indexOf(include) < codeBody.indexOf("source.tyhp.php#new-expression"), true, include);
        assert.equal(classMember.indexOf(include) >= 0, true, include);
        assert.equal(classMember.indexOf(include) < classMember.indexOf("source.tyhp.php#new-expression"), true, include);
    }

    const parameterList = includesOf(repository["parameter-list"]);
    for (const include of [
        "#new-anonymous-struct-initializer",
        "#new-generic-struct-initializer",
        "#new-struct-initializer",
    ]) {
        assert.equal(parameterList.indexOf(include) >= 0, true, include);
        assert.equal(parameterList.indexOf(include) < parameterList.indexOf("#type-expression"), true, include);
    }

    const named = repository["new-struct-initializer"];
    assert.equal(named.beginCaptures?.["1"].name, "keyword.other.new.php");
    assert.equal(containsScope(named.beginCaptures?.["2"], "support.class.php"), true);
    assert.equal(named.beginCaptures?.["3"].name, "punctuation.section.array.begin.php");
    assert.equal(named.begin?.includes("(?!(?i:self|static|parent|class)\\b)"), true);
    assert.equal(named.end, "(\\])");

    const generic = repository["new-generic-struct-initializer"];
    assert.equal(containsScope(generic.beginCaptures?.["2"], "support.class.php"), true);
    assert.equal(generic.beginCaptures?.["3"].name, "punctuation.definition.generic.begin.tyhp");
    assert.equal(generic.beginCaptures?.["5"].name, "punctuation.definition.generic.end.tyhp");
    assert.equal(generic.beginCaptures?.["6"].name, "punctuation.section.array.begin.php");
    assert.equal(includes(generic.beginCaptures?.["4"], "#type-expression"), true);

    const anonymous = repository["new-anonymous-struct-initializer"];
    assert.equal(anonymous.beginCaptures?.["1"].name, "keyword.other.new.php");
    assert.equal(anonymous.beginCaptures?.["2"].name, "storage.type.struct.tyhp");
    assert.equal(anonymous.beginCaptures?.["6"].name, "punctuation.section.array.begin.php");
    assert.equal(includes(anonymous.beginCaptures?.["4"], "#tyhp-class-member"), true);

    const key = repository["struct-entry-key"];
    assert.equal(key.captures?.["1"].name, "variable.other.property.php");
    assert.equal(key.match?.includes("(?==>)"), true);
    assert.equal(key.match?.includes("(?<!\\$)"), true);
    assert.equal(key.match?.includes("class"), true);

    const withList = repository["with-struct-initializer"];
    assert.equal(withList.beginCaptures?.["1"].name, "keyword.operator.with.tyhp");
    assert.equal(withList.beginCaptures?.["2"].name, "punctuation.section.array.begin.php");
    assert.equal(includes(withList, "#struct-initializer-content"), true);

    const keywords = repository["keyword-tyhp"];
    assert.equal(keywords.patterns?.[0].include, "#with-struct-initializer");
    const plainWith = keywords.patterns?.find((pattern) => pattern.match === "\\b(?i:with)\\b");
    assert.equal(plainWith?.name, "keyword.operator.with.tyhp");
});

interface Rule {
    begin?: string;
    end?: string;
    match?: string;
    include?: string;
    name?: string;
    patterns?: Rule[];
    beginCaptures?: Record<string, { name?: string }>;
    captures?: Record<string, { name?: string }>;
}

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

function includesOf(element: unknown): string[] {
    if (element !== null && typeof element === "object" && !Array.isArray(element)) {
        const record = element as { patterns?: unknown };
        if (Array.isArray(record.patterns)) {
            return record.patterns.flatMap((pattern) => includesOf(pattern));
        }
        const include = (element as { include?: unknown }).include;
        return typeof include === "string" ? [include] : [];
    }
    return [];
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
