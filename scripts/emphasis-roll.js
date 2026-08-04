import { chooseEmphasisResult, TIEBREAKERS } from "./emphasis-logic.js";

const MODULE_ID = "yarpenart-emphasis-roll";
const EMPHASIS_MODIFIER = "em";
const MAX_TIE_REROLLS = 100;
const dialogClasses = new WeakMap();

const SETTINGS = Object.freeze({
  ABILITY_CHECKS: "abilityChecks",
  SKILL_CHECKS: "skillChecks",
  TOOL_CHECKS: "toolChecks",
  SAVING_THROWS: "savingThrows",
  DEATH_SAVES: "deathSavingThrows",
  ATTACK_ROLLS: "attackRolls",
  SHOW_DICE_TRAY: "showDiceTray",
  TIEBREAKER: "tiebreaker"
});

const ROLL_TYPES = Object.freeze({
  ability: SETTINGS.ABILITY_CHECKS,
  skill: SETTINGS.SKILL_CHECKS,
  tool: SETTINGS.TOOL_CHECKS,
  save: SETTINGS.SAVING_THROWS,
  death: SETTINGS.DEATH_SAVES,
  attack: SETTINGS.ATTACK_ROLLS
});

registerDiceTrayKeymapHook();

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("setup", () => {
  installEmphasisDieModifier();
  Hooks.on("dnd5e.preRoll", enableEmphasisDialog);
  Hooks.on("dnd5e.postRollConfiguration", labelEmphasisMessage);
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { roll: rollStandaloneEmphasis };

  if (game.modules.get("dice-calculator")?.active && game.settings.get(MODULE_ID, SETTINGS.SHOW_DICE_TRAY)) {
    Hooks.callAll("dice-calculator.forceRender");
  }
});

function registerSettings() {
  const booleanSettings = [
    [SETTINGS.ABILITY_CHECKS, true],
    [SETTINGS.SKILL_CHECKS, true],
    [SETTINGS.TOOL_CHECKS, true],
    [SETTINGS.SAVING_THROWS, true],
    [SETTINGS.DEATH_SAVES, false],
    [SETTINGS.ATTACK_ROLLS, true]
  ];

  for (const [key, defaultValue] of booleanSettings) {
    game.settings.register(MODULE_ID, key, {
      name: `EMPHASIS.Settings.${key}.Name`,
      hint: `EMPHASIS.Settings.${key}.Hint`,
      scope: "world",
      config: true,
      restricted: true,
      type: Boolean,
      default: defaultValue
    });
  }

  game.settings.register(MODULE_ID, SETTINGS.SHOW_DICE_TRAY, {
    name: "EMPHASIS.Settings.showDiceTray.Name",
    hint: "EMPHASIS.Settings.showDiceTray.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll("dice-calculator.forceRender")
  });

  game.settings.register(MODULE_ID, SETTINGS.TIEBREAKER, {
    name: "EMPHASIS.Settings.tiebreaker.Name",
    hint: "EMPHASIS.Settings.tiebreaker.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    choices: {
      [TIEBREAKERS.REROLL]: "EMPHASIS.Settings.tiebreaker.Reroll",
      [TIEBREAKERS.HIGHER]: "EMPHASIS.Settings.tiebreaker.Higher"
    },
    default: TIEBREAKERS.REROLL
  });
}

function installEmphasisDieModifier() {
  const BasicDie = CONFIG.Dice.BasicDie;
  if (!BasicDie || BasicDie.MODIFIERS?.[EMPHASIS_MODIFIER]) return;

  BasicDie.MODIFIERS[EMPHASIS_MODIFIER] = "emphasis";
  Object.defineProperty(BasicDie.prototype, "emphasis", {
    configurable: true,
    writable: true,
    value: emphasisDieModifier
  });
}

/** Foundry die modifier used by the native dnd5e D20Roll. */
async function emphasisDieModifier() {
  let pair = activeResults(this).slice(-2);
  if (pair.length !== 2) return;

  const tiebreaker = game.settings.get(MODULE_ID, SETTINGS.TIEBREAKER);
  let keptIndex = chooseEmphasisResult(pair[0].result, pair[1].result, tiebreaker);
  let rerolls = 0;

  while ((keptIndex === null) && (rerolls < MAX_TIE_REROLLS)) {
    pair.forEach(result => deactivateResult(result, { rerolled: true }));
    pair = [await rollEmphasisDie(this), await rollEmphasisDie(this)];
    keptIndex = chooseEmphasisResult(pair[0].result, pair[1].result, tiebreaker);
    rerolls += 1;
  }

  // An extremely unlikely safety fallback after 100 consecutive ties.
  if (keptIndex === null) keptIndex = pair[1].result > pair[0].result ? 1 : 0;

  pair.forEach((result, index) => {
    if (index === keptIndex) {
      result.active = true;
      delete result.discarded;
    } else deactivateResult(result, { discarded: true });
  });
}

function activeResults(die) {
  return die.results.filter(result => result.active !== false && !result.discarded && !result.rerolled);
}

function deactivateResult(result, flags = {}) {
  result.active = false;
  Object.assign(result, flags);
}

async function rollEmphasisDie(die) {
  await die.roll();
  let result = die.results.at(-1);

  // The dnd5e Halfling Lucky modifier has already run. Apply its one reroll to dice created by a tie reroll too.
  if (die.options.halflingLucky && result.result === 1) {
    deactivateResult(result, { rerolled: true });
    await die.roll();
    result = die.results.at(-1);
  }
  return result;
}

function enableEmphasisDialog(config, dialog) {
  const rollType = classifyRoll(config.hookNames ?? []);
  if (!rollType) return;

  const setting = ROLL_TYPES[rollType];
  if (!game.settings.get(MODULE_ID, setting)) return;

  const BaseDialog = dialog.applicationClass ?? CONFIG.Dice.D20Roll.DefaultConfigurationDialog;
  dialog.applicationClass = getEmphasisDialogClass(BaseDialog);
}

function classifyRoll(hookNames) {
  const names = new Set(hookNames.map(name => String(name).toLowerCase()));
  if (names.has("deathsave")) return "death";
  if (names.has("attack")) return "attack";
  if (names.has("skill")) return "skill";
  if (names.has("tool")) return "tool";
  if (names.has("savingthrow")) return "save";
  if (names.has("abilitycheck")) return "ability";
  return null;
}

function getEmphasisDialogClass(BaseDialog) {
  if (dialogClasses.has(BaseDialog)) return dialogClasses.get(BaseDialog);

  class EmphasisRollConfigurationDialog extends BaseDialog {
    async _prepareButtonsContext(context, options) {
      context = await super._prepareButtonsContext(context, options);
      context.buttons.emphasis = {
        default: false,
        label: game.i18n.localize("EMPHASIS.Button")
      };
      return context;
    }

    _finalizeRolls(action) {
      const rolls = super._finalizeRolls(action === "emphasis" ? "normal" : action);
      if (action !== "emphasis") return rolls;
      rolls.forEach(applyEmphasisToRoll);
      return rolls;
    }
  }

  dialogClasses.set(BaseDialog, EmphasisRollConfigurationDialog);
  return EmphasisRollConfigurationDialog;
}

function applyEmphasisToRoll(roll) {
  roll.options.advantage = false;
  roll.options.disadvantage = false;
  roll.options.advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
  roll.options.emphasis = true;
  roll.configureModifiers();

  const die = roll.d20;
  if (!die) return roll;

  die.number = 2;
  die.options.emphasis = true;
  die.modifiers = die.modifiers.filter(modifier => modifier !== EMPHASIS_MODIFIER);

  // Select the Emphasis die before minimum/maximum effects such as Reliable Talent are applied.
  const rangeIndex = die.modifiers.findIndex(modifier => /^(min|max)/i.test(modifier));
  die.modifiers.splice(rangeIndex === -1 ? die.modifiers.length : rangeIndex, 0, EMPHASIS_MODIFIER);
  die.options.flavor = [die.options.flavor, game.i18n.localize("EMPHASIS.DieFlavor")].filter(Boolean).join(" • ");
  roll.resetFormula();
  return roll;
}

function labelEmphasisMessage(rolls, _config, _dialog, message) {
  if (!rolls.some(roll => roll.options.emphasis)) return;
  message.data ??= {};
  const label = game.i18n.localize("EMPHASIS.MessageSuffix");
  message.data.flavor = `${message.data.flavor ?? ""} ${label}`.trim();
}

function registerDiceTrayKeymapHook() {
  Hooks.on("dice-calculator.keymaps", maps => {
    const BaseMap = maps.dnd5e;
    if (!BaseMap) return;

    maps.dnd5e = class EmphasisDiceTrayMap extends BaseMap {
      applyListeners(html) {
        const button = ensureDiceTrayButton(html);
        super.applyListeners(html);
        if (!button || button.dataset.emphasisBound === "true") return;

        button.dataset.emphasisBound = "true";
        button.addEventListener("click", async event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const modifier = Number(html.querySelector(".dice-tray__input")?.value) || 0;
          await rollStandaloneEmphasis({ modifier });
          CONFIG.DICETRAY.reset();
        }, { capture: true });
        button.addEventListener("contextmenu", event => {
          event.preventDefault();
          event.stopImmediatePropagation();
        }, { capture: true });
      }
    };
  });
}

function ensureDiceTrayButton(html) {
  const existing = html.querySelector(`[data-${MODULE_ID}]`);
  if (!game.settings.get(MODULE_ID, SETTINGS.SHOW_DICE_TRAY)) {
    existing?.remove();
    return null;
  }
  if (existing) return existing;

  const row = html.querySelector(".dice-tray__buttons");
  if (!row) return null;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("dice-tray__button", "emphasis-roll__tray-button");
  button.dataset[camelCaseDatasetKey(MODULE_ID)] = "true";
  button.dataset.formula = "emphasis";
  button.dataset.tooltip = game.i18n.localize("EMPHASIS.DiceTrayTooltip");
  button.dataset.tooltipDirection = "UP";
  button.innerHTML = `
    <span class="dice-tray__flag hide"></span>
    <div class="dice emphasis-roll__tray-icon"></div>
  `;

  const d20Button = row.querySelector('[data-formula="d20"]');
  if (d20Button) d20Button.insertAdjacentElement("afterend", button);
  else row.append(button);
  return button;
}

function camelCaseDatasetKey(value) {
  return value.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

async function rollStandaloneEmphasis({ modifier = 0, rollMode } = {}) {
  const numericModifier = Number(modifier) || 0;
  const roll = CONFIG.Dice.D20Roll.fromConfig({
    parts: numericModifier ? [String(numericModifier)] : [],
    data: {},
    options: { rollType: "emphasis" }
  }, {});

  applyEmphasisToRoll(roll);
  rollMode ??= CONFIG.Dice.BasicRoll.getMessageMode();

  return CONFIG.Dice.D20Roll.toMessage([roll], {
    flavor: game.i18n.localize("EMPHASIS.StandaloneFlavor"),
    speaker: ChatMessage.getSpeaker(),
    flags: {
      dnd5e: {
        messageType: "roll",
        roll: { type: "emphasis" }
      },
      [MODULE_ID]: { emphasis: true }
    }
  }, { rollMode });
}
