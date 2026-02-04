const fs = require('fs');
const path = require('path');

const QUICK_START_MODE = 'quick-start';
const filePath = path.join(__dirname, '../src/router/index.ts');
const args = process.argv.slice(2);
const mode = args[0] || 'default';

try {
  let content = fs.readFileSync(filePath, 'utf-8');
  const defaultImport = "import Login from '../views/Login/Index.vue';";
  const tocImport = "import Login from '../views/Login/IndexToC.vue';";

  if (mode === QUICK_START_MODE) {
    if (content.includes(defaultImport)) {
      content = content.replace(defaultImport, tocImport);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Successfully switched to Quick Start mode (IndexToC.vue).');
    } else {
      console.log('Already in Quick Start mode or target string not found.');
    }
  } else {
    if (content.includes(tocImport)) {
      content = content.replace(tocImport, defaultImport);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Successfully switched to Default mode (Index.vue).');
    } else {
      console.log('Already in Default mode or target string not found.');
    }
  }
} catch (error) {
  console.error('Error processing file:', error);
}
