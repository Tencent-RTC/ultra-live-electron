import { addI18n } from 'tuikit-atomicx-vue3-electron';
import CoGuestPanelPC from './CoGuestPanelDialog.vue';
import { enResource, zhResource } from './i18n';
addI18n('en-US', { translation: enResource });
addI18n('zh-CN', { translation: zhResource });
const CoGuestPanel = CoGuestPanelPC;
export default CoGuestPanel;
