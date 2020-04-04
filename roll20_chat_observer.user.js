// ==UserScript==
// @name         Roll20 Chat Observer for Splittermond
// @version      1.0
// @description  replaces fails and triumphs in the roll20 chat accordingly
// @author       Joshua Sangmeister
// @match        https://app.roll20.net/editor/
// ==/UserScript==

// ignore the warnings that $ is undefined, roll20 uses jquery
$(init);

function init() {
    var targetNode = $("#textchat")[0];
    if (targetNode) {
        var observer = new MutationObserver(records => {
            records.forEach(record => {
                var list = record.addedNodes;
                var i = list.length - 1;

                for ( ; i > -1; i-- ) {
                    var message = $(list[i]);
                    if (message.is(".message")) {
                        console.log("new message: ", list[i]);
                        var rolltemplate = message.find(".sheet-rolltemplate-splittermond_generic, .sheet-rolltemplate-splittermond_aktiveabwehr");
                        if (rolltemplate.length) {
                            console.log("patching message");
                            patchRollTemplate(rolltemplate.first());
                        } else if (message.is(".rollresult")) {
                            console.log("patching message");
                            patchRawRoll(message);
                        }
                    }
                }
            });
        });
        observer.observe(targetNode, { childList: true, subtree: true });;
        console.log("ROLL20_CHAT_OBSERVER_INITIALIZED");
    } else {
        setTimeout(init, 500);
    }
}

function patchRollTemplate(node) {
    var result = node.find("span.inlinerollresult.showtip").first(); // first ist always the roll
    var tooltip = result.attr("title") || result.attr("original-title");
    var html = $(tooltip);
    var rolls = html.filter(".basicdiceroll");
    var dropped = rolls.filter(".dropped");

    result.removeClass("fullfail fullcrit importantroll");
    if (rolls.length === 2 && dropped.length === 1) {
        removeExtraRows(node);
        return;
    }

    var maybeFailRolls;
    if (rolls.length === 2) {
        maybeFailRolls = rolls;
    } else {
        maybeFailRolls = dropped;
    }
    var total = +maybeFailRolls.first().text() + +maybeFailRolls.last().text();

    if (total <= 3) {
        addOrReplaceLastRow(node, true);
    } else {
        var maybeTriumphRolls;
        if (rolls.length === 2) {
            maybeTriumphRolls = rolls;
        } else {
            maybeTriumphRolls = rolls.filter(":not(.dropped)");
        }
        total = +maybeTriumphRolls.first().text() + +maybeTriumphRolls.last().text();

        if (total >= 19) {
            addOrReplaceLastRow(node, false);
        } else {
            removeExtraRows(node);
        }
    }
}

function addOrReplaceLastRow(node, fail) {
    var color = fail ? "red" : "green";
    var text = fail ? "PATZER!" : "TRIUMPH!";
    var classname = fail ? "fullfail" : "fullcrit";

    var lastCell = node.find("table tbody tr:last td");
    if (!lastCell.text().includes("überprüfen")) {
        var tbody = node.find("table tbody");
        tbody.append("<tr><td>&nbsp;</td></tr><tr><td></td></tr>");
        lastCell = node.find("table tbody tr:last td");
    }

    lastCell.attr("colspan", "2").css({
        "font-size": "20px",
        "color": color,
        "text-align": "center"
    }).text(text);
    node.find("span.inlinerollresult.showtip").addClass(classname);
    console.log("marked as " + text);
}

function removeExtraRows(node) {
    var lastRow = node.find("table tbody tr:last");
    if (lastRow.text().includes("überprüfen")) {
        lastRow.remove();
        console.log("extra row removed");
    }
    lastRow = node.find("table tbody tr:last");
    if (!lastRow.text().trim()) {
        lastRow.remove();
    }
}

function patchRawRoll(node) {
    var formula = node.children(".formula:not(.formattedformula)").text();
    var rolls = node.find(".formula.formattedformula .dicegrouping .diceroll")
    var potentialSuccessRolls = rolls.filter(":not(.dropped)").find(".dicon .didroll");
    var result = +potentialSuccessRolls.first().text() + +potentialSuccessRolls.last().text();
    console.debug(formula, result);
    if (formula.match(/rolling 4d10kh?2.*/)) {
        // risk roll
        console.debug("risk roll");
        var dropped = rolls.filter(".dropped").find(".dicon .didroll");
        var total = +dropped.first().text() + +dropped.last().text();
        if (total <= 3) {
            addExtraToRawRoll(node, true);
        } else if (result >= 19) {
            addExtraToRawRoll(node, false);
        }
    } else if (formula.match(/rolling 2d10.*/)) {
        // normal roll
        console.debug("normal roll");
        if (result <= 3) {
            addExtraToRawRoll(node, true);
        } else if (result >= 19) {
            addExtraToRawRoll(node, false);
        }
    }
}

function addExtraToRawRoll(node, fail) {
    var color = fail ? "red" : "green";
    var text = fail ? "PATZER!" : "TRIUMPH!";

    var field = $("<span>");
    field.css({
        "font-size": "1.4em",
        "margin-left": "15px",
        "color": color
    });
    field.text(text);
    node.append(field);
}
