import fs from 'fs';

const confusionPath = 'public/dictionaries/confusion-map.json';
const inflectionsPath = 'src/common/nlp/inflections.json';

const confusionData = JSON.parse(fs.readFileSync(confusionPath, 'utf8'));
const inflectionsData = JSON.parse(fs.readFileSync(inflectionsPath, 'utf8'));

// 简单的变形生成规则（覆盖常见情况）。
// legacy=true 复现旧的 substring POS 误判（'adverb'.includes('verb')、'pronoun'.includes('noun')），
// 仅用于计算需要清理的历史坏形。
const generateInflections = (word, entries, legacy = false) => {
  const result = new Set();
  const matchPos = (e, pos) => (legacy ? e.type.includes(pos) : e.type === pos);
  const isVerb = entries.some(e => matchPos(e, 'verb'));
  const isNoun = entries.some(e => matchPos(e, 'noun'));

  if (isNoun) {
    // 基础复数规则
    if (word.endsWith('y')) result.add(word.slice(0, -1) + 'ies');
    else if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch')) result.add(word + 'es');
    else result.add(word + 's');
  }

  if (isVerb) {
    // 基础动词规则
    if (word.endsWith('e')) {
      result.add(word + 's');
      result.add(word + 'd');
      result.add(word.slice(0, -1) + 'ing');
    } else {
      result.add(word + 's');
      result.add(word + 'ed');
      result.add(word + 'ing');
    }
  }
  return result;
};

let added = 0;
let removed = 0;
for (const word in confusionData) {
  const entries = confusionData[word].entries;
  const newIsVerb = entries.some(e => e.type === 'verb');
  const newIsNoun = entries.some(e => e.type === 'noun');
  const oldSet = generateInflections(word, entries, true);
  const newSet = generateInflections(word, entries, false);

  // 外科式清理：仅删除「旧 substring 逻辑生成、新逻辑不再生成、且当前指向本词」的坏形。
  // 安全判据——动词形态(ed/ing/d)仅当本词非动词才删；复数形态仅当本词非名词才删。
  // 这样真实名词的复数(如 way→ways)与形容词比较级永不被误删。
  oldSet.forEach(inf => {
    if (newSet.has(inf) || inflectionsData[inf] !== word) return;
    const isVerbForm = inf.endsWith('ed') || inf.endsWith('ing') || (word.endsWith('e') && inf === word + 'd');
    const safeToRemove = isVerbForm ? !newIsVerb : !newIsNoun;
    if (safeToRemove) {
      delete inflectionsData[inf];
      removed++;
    }
  });

  // 补入正确变形
  newSet.forEach(inf => {
    if (!inflectionsData[inf]) {
      inflectionsData[inf] = word;
      added++;
    }
  });
}

// Merge curated irregular inflections (being->be, said->say, children->child, ...).
const irregularPath = 'src/common/nlp/irregular-inflections.json';
const irregular = JSON.parse(fs.readFileSync(irregularPath, 'utf8'));
let irrAdded = 0;
for (const form in irregular) {
  if (inflectionsData[form] !== irregular[form]) {
    inflectionsData[form] = irregular[form];
    irrAdded++;
  }
}

fs.writeFileSync(inflectionsPath, JSON.stringify(inflectionsData, null, 2));
console.log(`Synced inflections.json: +${added} added, -${removed} removed (POS exact-match fix); merged ${irrAdded} irregular forms.`);
