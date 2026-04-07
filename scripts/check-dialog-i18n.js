/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { parse, compileTemplate } = require('vue/compiler-sfc');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
      return;
    }
    if (entry.isFile() && fullPath.endsWith('.vue')) {
      out.push(fullPath);
    }
  });
  return out;
}

function walkTemplateNodes(nodeOrNodes, visitor) {
  if (!nodeOrNodes) {
    return;
  }

  if (Array.isArray(nodeOrNodes)) {
    nodeOrNodes.forEach((node) => walkTemplateNodes(node, visitor));
    return;
  }

  const node = nodeOrNodes;
  switch (node.type) {
    case 0: // Root
      walkTemplateNodes(node.children, visitor);
      break;
    case 1: // Element
      visitor(node);
      walkTemplateNodes(node.children, visitor);
      break;
    case 9: // If
      (node.branches || []).forEach((branch) => walkTemplateNodes(branch, visitor));
      break;
    case 10: // IfBranch
      walkTemplateNodes(node.children, visitor);
      break;
    case 11: // For
      walkTemplateNodes(node.children, visitor);
      break;
    default:
      break;
  }
}

function hasDialogTextProp(dialogNode, names) {
  for (const prop of dialogNode.props || []) {
    if (prop.type === 6 && names.has(prop.name)) {
      return true;
    }

    if (
      prop.type === 7
      && prop.name === 'bind'
      && prop.arg
      && prop.arg.type === 4
      && names.has(prop.arg.content)
    ) {
      return true;
    }
  }
  return false;
}

function isFooterSlotTemplate(node) {
  for (const prop of node.props || []) {
    if (prop.type === 6 && prop.name === 'slot' && prop.value && prop.value.content === 'footer') {
      return true;
    }

    if (
      prop.type === 7
      && prop.name === 'slot'
      && prop.arg
      && prop.arg.type === 4
      && prop.arg.content === 'footer'
    ) {
      return true;
    }
  }

  return false;
}

function hasFooterSlot(dialogNode) {
  let found = false;
  walkTemplateNodes(dialogNode.children || [], (node) => {
    if (found) {
      return;
    }
    if (node.tag === 'template' && isFooterSlotTemplate(node)) {
      found = true;
    }
  });
  return found;
}

function getLineNumberByOffset(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function isIgnorableSfcParseError(error) {
  return String(error).includes('At least one <template> or <script> is required');
}

function collectViolationsInFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { descriptor, errors: parseErrors } = parse(source, { filename: filePath });

  if (parseErrors.length > 0) {
    if (parseErrors.every(isIgnorableSfcParseError)) {
      return [];
    }
    return [
      {
        file: path.relative(projectRoot, filePath),
        line: 1,
        message: `SFC parse failed: ${String(parseErrors[0])}`,
      },
    ];
  }

  if (!descriptor.template) {
    return [];
  }

  const compiled = compileTemplate({
    source: descriptor.template.content,
    filename: filePath,
    id: 'demo-dialog-i18n-check',
  });

  if (compiled.errors.length > 0) {
    const firstError = compiled.errors[0];
    const line = typeof firstError === 'object' && firstError?.loc?.start?.line
      ? descriptor.template.loc.start.line + firstError.loc.start.line - 1
      : descriptor.template.loc.start.line;
    const message = typeof firstError === 'string' ? firstError : firstError.message;
    return [
      {
        file: path.relative(projectRoot, filePath),
        line,
        message: `Template compile failed: ${message}`,
      },
    ];
  }

  const violations = [];
  const templateStartOffset = descriptor.template.loc.start.offset;

  walkTemplateNodes(compiled.ast, (node) => {
    if (node.tag !== 'TUIDialog') {
      return;
    }
    if (hasFooterSlot(node)) {
      return;
    }

    const hasCancelText = hasDialogTextProp(node, new Set(['cancelText', 'cancel-text']));
    const hasConfirmText = hasDialogTextProp(node, new Set(['confirmText', 'confirm-text']));

    if (hasCancelText && hasConfirmText) {
      return;
    }

    const missing = [];
    if (!hasCancelText) {
      missing.push('cancelText/cancel-text');
    }
    if (!hasConfirmText) {
      missing.push('confirmText/confirm-text');
    }

    const offset = templateStartOffset + (node.loc?.start?.offset || 0);
    violations.push({
      file: path.relative(projectRoot, filePath),
      line: getLineNumberByOffset(source, offset),
      message: `Missing ${missing.join(' and ')}`,
    });
  });

  return violations;
}

function main() {
  const vueFiles = walk(srcDir);
  const violations = [];

  vueFiles.forEach((filePath) => {
    violations.push(...collectViolationsInFile(filePath));
  });

  if (violations.length > 0) {
    console.error('Dialog i18n check failed. Please provide explicit i18n button text.');
    violations.forEach((item) => {
      console.error(`- ${item.file}:${item.line} ${item.message}`);
    });
    process.exit(1);
  }

  console.log('Dialog i18n check passed.');
}

main();
