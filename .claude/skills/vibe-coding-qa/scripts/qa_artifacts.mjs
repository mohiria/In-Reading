#!/usr/bin/env node

import { constants, copyFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, '..');
const templateDir = resolve(skillRoot, 'templates');

const templates = {
  'lightweight-test-design': {
    file: 'lightweight-test-design.md',
    description: 'Lightweight test design before generating scripts',
  },
  'regression-impact-analysis': {
    file: 'regression-impact-analysis.md',
    description: 'Expanded regression scope for complex changes',
  },
  'bug-report': {
    file: 'bug-report.md',
    description: 'Defect report with failure classification and test reinforcement',
  },
  'qa-test-report': {
    file: 'qa-test-report.md',
    description: 'Final QA test report and runtime validation summary',
  },
};

function usage() {
  console.log(`Usage:
  node scripts/qa_artifacts.mjs list
  node scripts/qa_artifacts.mjs create <template-name> <output-path>
  node scripts/qa_artifacts.mjs check <template-name> <artifact-path>

Available templates:`);
  listTemplates();
}

function listTemplates() {
  for (const [name, template] of Object.entries(templates)) {
    console.log(`  ${name.padEnd(28)} ${template.description}`);
  }
}

function fail(message, showUsage = false) {
  console.error(`Error: ${message}`);
  if (showUsage) {
    console.error('');
    usage();
  }
  process.exitCode = 1;
}

async function assertReadableFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`);
  }
  if (!statSync(path).isFile()) {
    throw new Error(`${label} is not a file: ${path}`);
  }
  await access(path, constants.R_OK);
}

async function createArtifact(templateName, outputPathArg) {
  const template = templates[templateName];
  if (!template) {
    fail(`Unknown template "${templateName}".`, true);
    return;
  }

  if (!outputPathArg) {
    fail('Missing <output-path>.', true);
    return;
  }

  const templatePath = resolve(templateDir, template.file);
  const outputPath = resolve(process.cwd(), outputPathArg);
  const outputDir = dirname(outputPath);

  try {
    await assertReadableFile(templatePath, 'Template file');
  } catch (error) {
    fail(error.message);
    return;
  }

  if (!existsSync(outputDir) || !statSync(outputDir).isDirectory()) {
    fail(`Output directory does not exist: ${outputDir}`);
    return;
  }

  if (existsSync(outputPath)) {
    fail(`Output file already exists: ${outputPath}`);
    return;
  }

  copyFileSync(templatePath, outputPath);
  console.log(`Created ${templateName} artifact: ${outputPath}`);
  console.log('Fill this template using the current project Spec, code, tests, and execution evidence. This script does not decide QA scope, risk, coverage, or results.');
}

function readArtifact(pathArg) {
  if (!pathArg) {
    throw new Error('Missing <artifact-path>.');
  }

  const artifactPath = resolve(process.cwd(), pathArg);
  if (!existsSync(artifactPath)) {
    throw new Error(`Artifact file does not exist: ${artifactPath}`);
  }
  if (!statSync(artifactPath).isFile()) {
    throw new Error(`Artifact path is not a file: ${artifactPath}`);
  }

  return {
    path: artifactPath,
    content: readFileSync(artifactPath, 'utf8'),
  };
}

function getSection(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startPattern = new RegExp(`^## ${escapedHeading}\\s*$`, 'm');
  const startMatch = content.match(startPattern);
  if (!startMatch || startMatch.index === undefined) {
    return null;
  }

  const sectionStart = startMatch.index + startMatch[0].length;
  const rest = content.slice(sectionStart);
  const nextMatch = rest.match(/^## /m);
  const sectionEnd = nextMatch && nextMatch.index !== undefined ? nextMatch.index : rest.length;
  return rest.slice(0, sectionEnd).trim();
}

function hasSection(content, heading) {
  return getSection(content, heading) !== null;
}

function tableRows(section) {
  if (!section) {
    return [];
  }

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .filter((line) => !/^\|\s*-+/.test(line))
    .slice(1);
}

function isPlaceholderCell(cell) {
  const value = cell.trim().replace(/`/g, '');
  if (!value) {
    return true;
  }

  const placeholderPatterns = [
    /^(yes|no|yes \/ no|yes \/ no \/ blocked|yes \/ no \/ not applicable)$/i,
    /^(pass|fail|blocked|pass \/ fail \/ blocked)$/i,
    /^(covered|uncovered|covered \/ blocked \/ uncovered)$/i,
    /^design \/ regression \/ both$/i,
    /^(lightweight design|separate regression analysis|lightweight design \/ separate regression analysis \/ both)$/i,
    /^(p0|p1|p2|p3|p0 \/ p1 \/ p2 \/ p3)$/i,
    /^unit \/ api\/integration \/ e2e$/i,
    /^unit \/ api\/integration \/ e2e \/ runtime$/i,
    /^red \/ green \/ pass \/ blocked$/i,
    /^command\/result\/report$/i,
    /^expected behavior gap, not setup failure$/i,
    /^path\/to\/test#name$/i,
    /^missing account \/ service \/ permission \/ env var \/ unsafe data setup path \/ browser \/ dependency$/i,
    /^page \/ route \/ modal \/ deep link$/i,
    /^empty \/ existing \/ archived \/ submitted \/ approved \/ rejected \/ locked$/i,
    /^create \/ edit \/ delete \/ search \/ submit \/ approve \/ reject \/ export$/i,
    /^success \/ denial \/ validation stop \/ conflict \/ empty \/ recovery$/i,
    /^cover with e2e \/ lower-layer only with reason \/ blocked$/i,
    /^fixture \/ factory \/ api \/ seed \/ safe test db \/ realistic synthetic data$/i,
    /^domain rule \/ persona \/ lifecycle \/ tenant \/ permission \/ workflow basis$/i,
    /^domain rule \/ persona \/ lifecycle \/ tenant \/ permission \/ workflow evidence$/i,
    /^unique prefix \/ tenant \/ transaction \/ container \/ storage state$/i,
    /^api cleanup \/ db cleanup \/ rollback \/ unique residual data$/i,
    /^ready \/ blocked with exact reason$/i,
    /^yes \/ no, with reason$/i,
    /^entry point -> operation -> visible outcome$/i,
    /^covered \/ blocked \/ lower-layer-only$/i,
    /^command \/ response \/ log \/ test helper$/i,
    /^ready \/ blocked$/i,
    /^existing tests \/ code \/ api contract \/ old spec$/i,
    /^active spec \/ prd \/ issue \/ user confirmation$/i,
    /^source or decision owner$/i,
    /^add \/ keep \/ modify \/ delete \/ blocked$/i,
    /^implement \/ keep \/ blocked$/i,
    /^extends \/ amends \/ supersedes \/ conflicts$/i,
    /^pure style \/ copy \/ low-risk display \/ one-time script \/ unrunnable ui or service$/i,
    /^review \/ snapshot \/ smoke \/ manual check \/ runtime validation$/i,
    /^code \/ test design \/ requirement change \/ data \/ environment \/ dependency \/ flaky \/ ambiguity$/i,
  ];

  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function rowHasNonPlaceholderContent(row) {
  const cells = row
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  if (cells.some((cell) => !cell)) {
    return false;
  }

  return cells.some((cell) => !isPlaceholderCell(cell));
}

function rowContainsValue(row, valuePattern) {
  return row
    .split('|')
    .slice(1, -1)
    .some((cell) => valuePattern.test(cell.trim()));
}

function rowCells(row) {
  return row
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function sectionHasNonPlaceholderTableRow(section) {
  return tableRows(section).some(rowHasNonPlaceholderContent);
}

function sectionHasIncompleteRowWithValue(section, valuePattern) {
  return tableRows(section).some((row) => rowContainsValue(row, valuePattern) && !rowHasNonPlaceholderContent(row));
}

function sectionHeaderCells(section) {
  const headerRow = (section || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('|') && line.endsWith('|'));

  if (!headerRow) {
    return [];
  }

  return headerRow
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function tableColumnIndex(section, columnName) {
  return sectionHeaderCells(section).findIndex((cell) => cell.toLowerCase() === columnName.toLowerCase());
}

function cellValue(row, section, columnName) {
  const columnIndex = tableColumnIndex(section, columnName);
  if (columnIndex < 0) {
    return '';
  }

  return rowCells(row)[columnIndex] || '';
}

function sectionHasNonPlaceholderColumnValue(section, columnName) {
  const columnIndex = tableColumnIndex(section, columnName);
  if (columnIndex < 0) {
    return false;
  }

  return tableRows(section).some((row) => {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const cell = cells[columnIndex] || '';
    return !isPlaceholderCell(cell);
  });
}

function sectionHasFilledField(section, fieldName) {
  if (!section) {
    return false;
  }

  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^-\\s*${escapedFieldName}:\\s*(.+)$`, 'im');
  const match = section.match(pattern);
  if (!match) {
    return false;
  }

  return !isPlaceholderCell(match[1]);
}

function sectionHasNonEmptyField(section, fieldName) {
  if (!section) {
    return false;
  }

  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^-\\s*${escapedFieldName}:\\s*(.+)$`, 'im');
  const match = section.match(pattern);
  return Boolean(match && match[1].trim());
}

function sectionFieldValue(section, fieldName) {
  if (!section) {
    return '';
  }

  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^-\\s*${escapedFieldName}:\\s*(.*)$`, 'im');
  const match = section.match(pattern);
  return match ? match[1].trim() : '';
}

function normalizedFieldValue(value) {
  return value.trim().replace(/`/g, '');
}

function isUnfilledChoiceField(value, placeholderPattern) {
  const normalized = normalizedFieldValue(value);
  return !normalized || placeholderPattern.test(normalized);
}

function sectionHasValueInNonPlaceholderRow(section, columnName) {
  const columnIndex = tableColumnIndex(section, columnName);
  if (columnIndex < 0) {
    return false;
  }

  return tableRows(section).some((row) => {
    if (!rowHasNonPlaceholderContent(row)) {
      return false;
    }

    const cells = row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    return Boolean(cells[columnIndex]);
  });
}

function requireColumn(findings, templateName, section, sectionName, columnName) {
  if (tableColumnIndex(section, columnName) < 0) {
    addFinding(findings, 'FAIL', templateName, `${sectionName} missing required column "${columnName}"`);
  }
}

function addFinding(findings, level, templateName, message) {
  findings.push({ level, templateName, message });
}

function requireSections(findings, templateName, content, headings) {
  for (const heading of headings) {
    if (!hasSection(content, heading)) {
      addFinding(findings, 'FAIL', templateName, `missing required section "${heading}"`);
    }
  }
}

function addRetainedExampleWarnings(findings, templateName, content) {
  // Detect retained template examples via the stable structural markers the
  // templates use to fence their example content. This intentionally avoids
  // matching specific example business prose so the checker does not drift when
  // template examples are reworded.
  const examplePatterns = [
    /Example only\./i,
    /^## Short Examples?/im,
    /Delete this section or replace it with project-specific rows/i,
  ];

  if (examplePatterns.some((pattern) => pattern.test(content))) {
    addFinding(findings, 'WARN', templateName, 'artifact appears to retain template example content; replace or delete examples before finalizing');
  }
}

function scopeHasLayer(scope, layerPattern) {
  return tableRows(scope).some((row) => {
    const cells = rowCells(row);
    return cells.length >= 2 && layerPattern.test(cells[0]) && /^yes$/i.test(cells[1]);
  });
}

function sectionHasLayerRow(section, layerPattern) {
  return tableRows(section).some((row) => rowHasNonPlaceholderContent(row) && layerPattern.test(row));
}

function businessRealismEvidenceIsWeak(value) {
  const normalized = value.trim().replace(/`/g, '').toLowerCase();
  if (!normalized) {
    return true;
  }

  const weakPatterns = [
    /\b(foo|bar|test123|asdf|lorem|acme inc\.?|张三)\b/i,
    /^test data (ready|created|setup)$/i,
    /^data (ready|created|setup)$/i,
    /^ready$/i,
    /^n\/a$/i,
    /^not applicable$/i,
    /^technical boundary$/i,
    /^minimal[- ]data exception$/i,
  ];

  return weakPatterns.some((pattern) => pattern.test(normalized));
}

function businessRealismEvidenceHasDomainSignal(value) {
  const domainSignals = [
    /api contract/i,
    /permission/i,
    /role/i,
    /persona/i,
    /workflow/i,
    /lifecycle/i,
    /tenant/i,
    /ownership/i,
    /owner/i,
    /state transition/i,
    /status/i,
    /persistence/i,
    /contract/i,
    /business rule/i,
    /relationship/i,
    /visible result/i,
    /entry point/i,
    /approval/i,
    /auth/i,
    /authorization/i,
    /customer/i,
    /account/i,
    /order/i,
    /invoice/i,
    /amount/i,
    /date/i,
    /state/i,
    /权限/,
    /角色/,
    /流程/,
    /生命周期/,
    /租户/,
    /归属/,
    /状态/,
    /业务/,
    /审批/,
    /金额/,
    /日期/,
  ];

  return domainSignals.some((pattern) => pattern.test(value));
}

function addBusinessRealismFindings(findings, templateName, section, options) {
  const {
    sectionName,
    evidenceColumn,
    required,
    layerPattern,
    layerLabel,
    rowMatches,
  } = options;

  if (!section) {
    if (required) {
      addFinding(findings, 'FAIL', templateName, `${sectionName} is required for ${layerLabel} data evidence`);
    }
    return;
  }

  const evidenceIndex = tableColumnIndex(section, evidenceColumn);
  if (evidenceIndex < 0) {
    addFinding(findings, 'FAIL', templateName, `${sectionName} missing required column "${evidenceColumn}"`);
    return;
  }

  const matchingRows = tableRows(section).filter((row) => {
    if (!rowHasNonPlaceholderContent(row)) {
      return false;
    }
    if (rowMatches) {
      return rowMatches(row, section);
    }
    return !layerPattern || layerPattern.test(row);
  });

  if (required && matchingRows.length === 0) {
    addFinding(findings, 'FAIL', templateName, `${sectionName} has no ${layerLabel} data evidence row`);
    return;
  }

  for (const row of matchingRows) {
    const evidence = rowCells(row)[evidenceIndex] || '';
    if (businessRealismEvidenceIsWeak(evidence)) {
      addFinding(findings, 'FAIL', templateName, `${sectionName} has weak ${layerLabel} business realism evidence: "${evidence}"`);
      continue;
    }
    if (!businessRealismEvidenceHasDomainSignal(evidence)) {
      addFinding(findings, 'WARN', templateName, `${sectionName} ${layerLabel} business realism evidence lacks an obvious business signal: "${evidence}"`);
    }
  }
}

function redFailureReasonIsInvalid(value) {
  const normalized = value.trim().replace(/`/g, '').toLowerCase();
  if (!normalized) {
    return false;
  }

  const invalidPatterns = [
    /compile error/i,
    /compilation/i,
    /does not compile/i,
    /nosuchmethod/i,
    /method not found/i,
    /class not found/i,
    /endpoint not found/i,
    /route not found because no route exists/i,
    /missing method/i,
    /missing class/i,
    /missing endpoint/i,
    /missing symbol/i,
    /cannot find symbol/i,
    /import error/i,
    /fixture/i,
    /environment/i,
    /db connection/i,
    /database connection/i,
    /setup failure/i,
    /阻塞型/,
    /编译缺失/,
    /编译失败/,
    /方法不存在/,
    /类不存在/,
    /端点不存在/,
    /导入错误/,
    /环境失败/,
    /数据库连接/,
  ];

  return invalidPatterns.some((pattern) => pattern.test(normalized));
}

function addInvalidRedReasonFindings(findings, templateName, section, sectionName) {
  if (!section) {
    return;
  }

  const redReasonIndex = tableColumnIndex(section, 'Red failure reason');
  if (redReasonIndex >= 0) {
    for (const row of tableRows(section)) {
      if (!rowHasNonPlaceholderContent(row)) {
        continue;
      }
      const reason = rowCells(row)[redReasonIndex] || '';
      if (redFailureReasonIsInvalid(reason)) {
        addFinding(findings, 'FAIL', templateName, `${sectionName} has invalid Red failure reason: "${reason}"`);
      }
    }
  }

  const expectedRedFailureReason = sectionFieldValue(section, 'Expected Red failure reason');
  if (redFailureReasonIsInvalid(expectedRedFailureReason)) {
    addFinding(findings, 'FAIL', templateName, `${sectionName} has invalid expected Red failure reason: "${expectedRedFailureReason}"`);
  }
}

function addPreCodeGateFindings(findings, templateName, content) {
  const gate = getSection(content, 'Pre-Code TDD Gate');
  if (!gate) {
    return;
  }

  const ready = sectionFieldValue(gate, 'Ready for production code change');
  const evidenceType = sectionFieldValue(gate, 'Gate evidence type');
  const evidence = sectionFieldValue(gate, 'Gate evidence');
  const redCommand = sectionFieldValue(gate, 'Red command/result');
  const redReason = sectionFieldValue(gate, 'Expected Red failure reason');
  const violationStatus = sectionFieldValue(gate, 'TDD violation status');

  if (isUnfilledChoiceField(ready, /^yes\s*\/\s*no\s*\/\s*blocked$/i)) {
    addFinding(findings, 'FAIL', templateName, 'Pre-Code TDD Gate has no ready-for-code decision');
  }

  if (isUnfilledChoiceField(evidenceType, /^red\s*\/\s*existing failing test\s*\/\s*non-tdd exception\s*\/\s*blocker$/i)) {
    addFinding(findings, 'FAIL', templateName, 'Pre-Code TDD Gate has no gate evidence type');
  }
  if (!evidence || isPlaceholderCell(evidence)) {
    addFinding(findings, 'FAIL', templateName, 'Pre-Code TDD Gate has no gate evidence');
  }

  if (/red/i.test(evidenceType)) {
    if (!redCommand || isPlaceholderCell(redCommand)) {
      addFinding(findings, 'FAIL', templateName, 'Pre-Code TDD Gate uses Red but has no Red command/result');
    }
    if (!redReason || isPlaceholderCell(redReason)) {
      addFinding(findings, 'FAIL', templateName, 'Pre-Code TDD Gate uses Red but has no expected Red failure reason');
    }
  }

  if (/^yes$/i.test(ready) && /blocker/i.test(evidenceType)) {
    addFinding(findings, 'FAIL', templateName, 'Pre-Code TDD Gate cannot be ready for production code change when gate evidence type is blocker');
  }

  if (isUnfilledChoiceField(violationStatus, /^none\s*\/\s*violation recorded\s*\/\s*not applicable$/i)) {
    addFinding(findings, 'WARN', templateName, 'Pre-Code TDD Gate has no TDD violation status');
  }

  addInvalidRedReasonFindings(findings, templateName, gate, 'Pre-Code TDD Gate');
}

function addTddSequenceFindings(findings, templateName, content) {
  const sequence = getSection(content, 'TDD Sequence Evidence');
  if (!sequence) {
    return;
  }

  const gateResult = sectionFieldValue(sequence, 'Production code change gate result');
  const evidenceType = sectionFieldValue(sequence, 'Pre-code evidence type');
  const evidence = sectionFieldValue(sequence, 'Pre-code evidence');
  const redCommand = sectionFieldValue(sequence, 'Red command/result');
  const redReason = sectionFieldValue(sequence, 'Expected Red failure reason');

  if (isUnfilledChoiceField(gateResult, /^passed\s*\/\s*blocked\s*\/\s*violation recorded\s*\/\s*not applicable$/i)) {
    addFinding(findings, 'FAIL', templateName, 'TDD Sequence Evidence has no production-code gate result');
  }
  if (isUnfilledChoiceField(evidenceType, /^red\s*\/\s*existing failing test\s*\/\s*non-tdd exception\s*\/\s*blocker$/i)) {
    addFinding(findings, 'FAIL', templateName, 'TDD Sequence Evidence has no pre-code evidence type');
  }
  if (!evidence || isPlaceholderCell(evidence)) {
    addFinding(findings, 'FAIL', templateName, 'TDD Sequence Evidence has no pre-code evidence');
  }
  if (/red/i.test(evidenceType)) {
    if (!redCommand || isPlaceholderCell(redCommand)) {
      addFinding(findings, 'FAIL', templateName, 'TDD Sequence Evidence uses Red but has no Red command/result');
    }
    if (!redReason || isPlaceholderCell(redReason)) {
      addFinding(findings, 'FAIL', templateName, 'TDD Sequence Evidence uses Red but has no expected Red failure reason');
    }
  }
  if (/^passed$/i.test(gateResult) && /blocker/i.test(evidenceType)) {
    addFinding(findings, 'FAIL', templateName, 'TDD Sequence Evidence cannot have a passed production-code gate when pre-code evidence type is blocker');
  }

  addInvalidRedReasonFindings(findings, templateName, sequence, 'TDD Sequence Evidence');
}

function checkQaTestReport(content) {
  const templateName = 'qa-test-report';
  const findings = [];
  requireSections(findings, templateName, content, [
    'Conclusion',
    'Scope',
    'TDD Summary',
    'TDD Sequence Evidence',
    'Tests Run',
    'User Scenario Coverage',
    'Test Data Setup Evidence',
    'Coverage Summary',
    'Regression Scope',
    'Remaining Risks',
    'Final Statement',
  ]);

  const testsRun = getSection(content, 'Tests Run');
  if (!sectionHasNonPlaceholderTableRow(testsRun)) {
    addFinding(findings, 'FAIL', templateName, 'Tests Run has no non-placeholder row');
  }
  requireColumn(findings, templateName, testsRun, 'Tests Run', 'Source');
  if (!sectionHasNonPlaceholderColumnValue(testsRun, 'Source')) {
    addFinding(findings, 'FAIL', templateName, 'Tests Run has no execution source');
  }

  const coverageSummary = getSection(content, 'Coverage Summary');
  if (!sectionHasNonPlaceholderTableRow(coverageSummary)) {
    addFinding(findings, 'FAIL', templateName, 'Coverage Summary has no non-placeholder row');
  }
  requireColumn(findings, templateName, coverageSummary, 'Coverage Summary', 'Source');
  if (!sectionHasNonPlaceholderColumnValue(coverageSummary, 'Source')) {
    addFinding(findings, 'FAIL', templateName, 'Coverage Summary has no coverage source');
  }

  const scope = getSection(content, 'Scope') || '';
  const apiInScope = scopeHasLayer(scope, /^API\/integration$/i);
  const e2eInScope = scopeHasLayer(scope, /^E2E$/i);
  if (e2eInScope) {
    const userScenarioCoverage = getSection(content, 'User Scenario Coverage');
    if (!sectionHasNonPlaceholderTableRow(userScenarioCoverage)) {
      addFinding(findings, 'FAIL', templateName, 'E2E is in scope but User Scenario Coverage has no non-placeholder row');
    }
  }

  const testDataSetupEvidence = getSection(content, 'Test Data Setup Evidence');
  if (!sectionHasNonPlaceholderTableRow(testDataSetupEvidence)) {
    addFinding(findings, 'WARN', templateName, 'Test Data Setup Evidence has no non-placeholder row');
  }
  requireColumn(findings, templateName, testDataSetupEvidence, 'Test Data Setup Evidence', 'Business realism evidence');
  if (!sectionHasNonPlaceholderColumnValue(testDataSetupEvidence, 'Business realism evidence')) {
    addFinding(findings, 'FAIL', templateName, 'Test Data Setup Evidence has no business realism evidence');
  }
  addBusinessRealismFindings(findings, templateName, testDataSetupEvidence, {
    sectionName: 'Test Data Setup Evidence',
    evidenceColumn: 'Business realism evidence',
    required: apiInScope,
    rowMatches: (row, section) => /api\/integration|api|integration/i.test(
      `${cellValue(row, section, 'Test / scenario')} ${cellValue(row, section, 'Required data')} ${cellValue(row, section, 'Business realism evidence')}`,
    ),
    layerLabel: 'API/integration',
  });
  addBusinessRealismFindings(findings, templateName, testDataSetupEvidence, {
    sectionName: 'Test Data Setup Evidence',
    evidenceColumn: 'Business realism evidence',
    required: e2eInScope,
    rowMatches: (row, section) => /e2e|workflow|browser|scenario/i.test(
      `${cellValue(row, section, 'Test / scenario')} ${cellValue(row, section, 'Required data')} ${cellValue(row, section, 'Business realism evidence')}`,
    ),
    layerLabel: 'E2E',
  });

  const tddSummary = getSection(content, 'TDD Summary');
  const nonTddExceptions = getSection(content, 'Non-TDD Exceptions');
  if (!sectionHasNonPlaceholderTableRow(tddSummary) && !sectionHasNonPlaceholderTableRow(nonTddExceptions)) {
    addFinding(findings, 'FAIL', templateName, 'TDD Summary has no non-placeholder row and no Non-TDD Exceptions are recorded');
  }
  addInvalidRedReasonFindings(findings, templateName, tddSummary, 'TDD Summary');
  addTddSequenceFindings(findings, templateName, content);

  if (/Overall result:\s*BLOCKED/i.test(content)) {
    const blockers = getSection(content, 'Tests Not Run / Blockers');
    if (!sectionHasNonPlaceholderTableRow(blockers)) {
      addFinding(findings, 'FAIL', templateName, 'Overall result is BLOCKED but Tests Not Run / Blockers has no non-placeholder row');
    }
  }

  if (/Overall result:\s*FAIL/i.test(content)) {
    const failureAnalysis = getSection(content, 'Failure Analysis');
    if (!sectionHasNonPlaceholderTableRow(failureAnalysis)) {
      addFinding(findings, 'FAIL', templateName, 'Overall result is FAIL but Failure Analysis has no non-placeholder row');
    }
  }

  const conflictReview = getSection(content, 'Requirement Authority / Conflict Review');
  if (sectionHasIncompleteRowWithValue(conflictReview, /^conflicts$/i)) {
    addFinding(findings, 'FAIL', templateName, 'Requirement Authority / Conflict Review has an incomplete conflicts row');
  }

  const runtimeValidation = getSection(content, 'Runtime QA Validation');
  if (runtimeValidation && !/does not count as Unit\/API\/E2E business coverage/i.test(runtimeValidation)) {
    addFinding(findings, 'WARN', templateName, 'Runtime QA Validation should state that it does not count as Unit/API/E2E business coverage');
  }

  addRetainedExampleWarnings(findings, templateName, content);
  return findings;
}

function checkLightweightTestDesign(content) {
  const templateName = 'lightweight-test-design';
  const findings = [];
  requireSections(findings, templateName, content, [
    'Context',
    'Input Sources Checked',
    'Requirement Authority / Conflict Gate',
    'Pre-Code TDD Gate',
    'Test Points',
    'User Scenario Matrix',
    'Test Data Plan',
    'TDD Candidates',
    'Regression Impact',
    'Coverage Closure',
  ]);
  addPreCodeGateFindings(findings, templateName, content);

  const testPoints = getSection(content, 'Test Points');
  if (!sectionHasNonPlaceholderTableRow(testPoints)) {
    addFinding(findings, 'FAIL', templateName, 'Test Points has no non-placeholder row');
  }
  const apiInDesign = sectionHasLayerRow(testPoints, /api\/integration/i);
  const e2eInDesign = sectionHasLayerRow(testPoints, /e2e/i) || sectionHasNonPlaceholderTableRow(getSection(content, 'E2E Scenarios'));

  const userScenarioMatrix = getSection(content, 'User Scenario Matrix');
  if (!sectionHasNonPlaceholderTableRow(userScenarioMatrix)) {
    addFinding(findings, 'WARN', templateName, 'User Scenario Matrix has no non-placeholder row');
  }

  const testDataPlan = getSection(content, 'Test Data Plan');
  if (!sectionHasNonPlaceholderTableRow(testDataPlan)) {
    addFinding(findings, 'WARN', templateName, 'Test Data Plan has no non-placeholder row');
  }
  requireColumn(findings, templateName, testDataPlan, 'Test Data Plan', 'Business realism basis');
  if (!sectionHasNonPlaceholderColumnValue(testDataPlan, 'Business realism basis')) {
    addFinding(findings, 'FAIL', templateName, 'Test Data Plan has no business realism basis');
  }
  addBusinessRealismFindings(findings, templateName, testDataPlan, {
    sectionName: 'Test Data Plan',
    evidenceColumn: 'Business realism basis',
    required: apiInDesign,
    rowMatches: (row, section) => /api\/integration|api|integration/i.test(
      `${cellValue(row, section, 'Test point / scenario')} ${cellValue(row, section, 'Required data state')} ${cellValue(row, section, 'Business realism basis')}`,
    ),
    layerLabel: 'API/integration',
  });
  addBusinessRealismFindings(findings, templateName, testDataPlan, {
    sectionName: 'Test Data Plan',
    evidenceColumn: 'Business realism basis',
    required: e2eInDesign,
    rowMatches: (row, section) => /e2e|workflow|browser|scenario/i.test(
      `${cellValue(row, section, 'Test point / scenario')} ${cellValue(row, section, 'Required data state')} ${cellValue(row, section, 'Business realism basis')}`,
    ),
    layerLabel: 'E2E',
  });

  const regressionImpact = getSection(content, 'Regression Impact');
  if (!sectionHasNonPlaceholderTableRow(regressionImpact)) {
    addFinding(findings, 'FAIL', templateName, 'Regression Impact has no non-placeholder row');
  }

  const conflictGate = getSection(content, 'Requirement Authority / Conflict Gate');
  const hasConflictRow = tableRows(conflictGate).some((row) => rowContainsValue(row, /^conflicts$/i));
  if (sectionHasIncompleteRowWithValue(conflictGate, /^conflicts$/i)) {
    addFinding(findings, 'FAIL', templateName, 'Requirement Authority / Conflict Gate has an incomplete conflicts row');
  }
  if (hasConflictRow && !/\bBLOCKED\b/.test(conflictGate || '')) {
    addFinding(findings, 'FAIL', templateName, 'Requirement Authority / Conflict Gate has a conflicts row without BLOCKED');
  }

  addRetainedExampleWarnings(findings, templateName, content);
  return findings;
}

function checkRegressionImpactAnalysis(content) {
  const templateName = 'regression-impact-analysis';
  const findings = [];
  requireSections(findings, templateName, content, [
    'Change Summary',
    'Impact Analysis',
    'Risk Level',
    'Selected Regression Tests',
    'Tests Not Run / Blockers',
    'Runtime QA Validation',
    'Regression Conclusion',
  ]);

  const impactAnalysis = getSection(content, 'Impact Analysis');
  if (!sectionHasNonPlaceholderTableRow(impactAnalysis)) {
    addFinding(findings, 'FAIL', templateName, 'Impact Analysis has no non-placeholder row');
  }

  const riskLevel = getSection(content, 'Risk Level');
  if (!sectionHasFilledField(riskLevel, 'Risk')) {
    addFinding(findings, 'FAIL', templateName, 'Risk Level has no concrete risk value');
  }
  if (!sectionHasFilledField(riskLevel, 'Rationale')) {
    addFinding(findings, 'FAIL', templateName, 'Risk Level has no rationale');
  }

  const selectedRegressionTests = getSection(content, 'Selected Regression Tests');
  if (!sectionHasNonPlaceholderTableRow(selectedRegressionTests)) {
    addFinding(findings, 'FAIL', templateName, 'Selected Regression Tests has no non-placeholder row');
  }
  requireColumn(findings, templateName, selectedRegressionTests, 'Selected Regression Tests', 'Result');
  if (!sectionHasValueInNonPlaceholderRow(selectedRegressionTests, 'Result')) {
    addFinding(findings, 'FAIL', templateName, 'Selected Regression Tests has no result');
  }
  requireColumn(findings, templateName, selectedRegressionTests, 'Selected Regression Tests', 'Evidence');
  if (!sectionHasNonPlaceholderColumnValue(selectedRegressionTests, 'Evidence')) {
    addFinding(findings, 'WARN', templateName, 'Selected Regression Tests has no evidence');
  }

  if (/Overall result:\s*BLOCKED/i.test(content)) {
    const blockers = getSection(content, 'Tests Not Run / Blockers');
    if (!sectionHasNonPlaceholderTableRow(blockers)) {
      addFinding(findings, 'FAIL', templateName, 'Overall result is BLOCKED but Tests Not Run / Blockers has no non-placeholder row');
    }
  }

  const conclusion = getSection(content, 'Regression Conclusion');
  if (!sectionHasNonEmptyField(conclusion, 'Overall result')) {
    addFinding(findings, 'FAIL', templateName, 'Regression Conclusion has no overall result');
  }
  if (!sectionHasFilledField(conclusion, 'Changed behavior covered')) {
    addFinding(findings, 'FAIL', templateName, 'Regression Conclusion has no changed behavior coverage statement');
  }
  if (!sectionHasFilledField(conclusion, 'Directly impacted old behavior covered')) {
    addFinding(findings, 'FAIL', templateName, 'Regression Conclusion has no old behavior coverage statement');
  }

  const runtimeValidation = getSection(content, 'Runtime QA Validation');
  if (runtimeValidation && /Unit\/API\/E2E business coverage/i.test(runtimeValidation)) {
    addFinding(findings, 'WARN', templateName, 'Runtime QA Validation should not be treated as Unit/API/E2E business coverage');
  }

  addRetainedExampleWarnings(findings, templateName, content);
  return findings;
}

function checkBugReport(content) {
  const templateName = 'bug-report';
  const findings = [];
  requireSections(findings, templateName, content, [
    'Summary',
    'Environment',
    'Reproduction Steps',
    'Expected Result',
    'Actual Result',
    'Evidence',
    'Failure Classification',
    'Impact',
    'Suggested Fix',
    'Effective Resolution Pattern',
    'Test Reinforcement',
    'Resolution',
  ]);

  const summary = getSection(content, 'Summary');
  if (!sectionHasFilledField(summary, 'Title')) {
    addFinding(findings, 'FAIL', templateName, 'Summary has no concrete title');
  }
  if (!sectionHasFilledField(summary, 'Related requirement / test point')) {
    addFinding(findings, 'WARN', templateName, 'Summary has no related requirement or test point');
  }

  const evidence = getSection(content, 'Evidence');
  if (!sectionHasNonPlaceholderTableRow(evidence)) {
    addFinding(findings, 'FAIL', templateName, 'Evidence has no non-placeholder row');
  }
  requireColumn(findings, templateName, evidence, 'Evidence', 'Evidence type');
  requireColumn(findings, templateName, evidence, 'Evidence', 'Location / snippet');

  const failureClassification = getSection(content, 'Failure Classification');
  if (!sectionHasNonPlaceholderTableRow(failureClassification)) {
    addFinding(findings, 'FAIL', templateName, 'Failure Classification has no non-placeholder row');
  }
  if (!/Root cause\s*\|[^|\n]+/i.test(failureClassification || '')) {
    addFinding(findings, 'FAIL', templateName, 'Failure Classification has no root cause');
  }

  const impact = getSection(content, 'Impact');
  if (!sectionHasFilledField(impact, 'Regression risk')) {
    addFinding(findings, 'WARN', templateName, 'Impact has no concrete regression risk');
  }

  const resolutionPattern = getSection(content, 'Effective Resolution Pattern');
  if (!sectionHasFilledField(resolutionPattern, 'Final effective fix')) {
    addFinding(findings, 'FAIL', templateName, 'Effective Resolution Pattern has no final effective fix');
  }
  if (!sectionHasFilledField(resolutionPattern, 'Why it fixed the root cause')) {
    addFinding(findings, 'FAIL', templateName, 'Effective Resolution Pattern has no root-cause fix explanation');
  }

  const testReinforcement = getSection(content, 'Test Reinforcement');
  if (!sectionHasNonPlaceholderTableRow(testReinforcement)) {
    addFinding(findings, 'FAIL', templateName, 'Test Reinforcement has no non-placeholder row');
  }
  requireColumn(findings, templateName, testReinforcement, 'Test Reinforcement', 'Layer');
  requireColumn(findings, templateName, testReinforcement, 'Test Reinforcement', 'Coverage artifact');

  const resolution = getSection(content, 'Resolution');
  if (!sectionHasFilledField(resolution, 'Tests run')) {
    addFinding(findings, 'FAIL', templateName, 'Resolution has no tests run');
  }
  if (!sectionHasFilledField(resolution, 'Final status')) {
    addFinding(findings, 'FAIL', templateName, 'Resolution has no final status');
  }

  addRetainedExampleWarnings(findings, templateName, content);
  return findings;
}

function printFindings(findings, templateName) {
  for (const finding of findings) {
    console.log(`${finding.level} ${finding.templateName}: ${finding.message}`);
  }

  if (!findings.some((finding) => finding.level === 'FAIL')) {
    console.log(`PASS ${templateName}: structure check completed`);
  }
}

async function runCheck(templateName, artifactPathArg) {
  const checkers = {
    'qa-test-report': checkQaTestReport,
    'lightweight-test-design': checkLightweightTestDesign,
    'regression-impact-analysis': checkRegressionImpactAnalysis,
    'bug-report': checkBugReport,
  };

  const checker = checkers[templateName];
  if (!checker) {
    fail(`Check is not supported for template "${templateName}". Supported templates: ${Object.keys(checkers).join(', ')}.`, true);
    return;
  }

  let artifact;
  try {
    artifact = readArtifact(artifactPathArg);
  } catch (error) {
    fail(error.message);
    return;
  }

  const findings = checker(artifact.content);

  printFindings(findings, templateName);

  if (findings.some((finding) => finding.level === 'FAIL')) {
    process.exitCode = 1;
  }
}

async function main() {
  const [command, templateName, outputPath] = process.argv.slice(2);

  if (command === 'list') {
    listTemplates();
    return;
  }

  if (command === 'create') {
    await createArtifact(templateName, outputPath);
    return;
  }

  if (command === 'check') {
    await runCheck(templateName, outputPath);
    return;
  }

  fail(command ? `Unknown command "${command}".` : 'Missing command.', true);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
