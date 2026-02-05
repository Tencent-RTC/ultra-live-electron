<template>
  <div class="dialog-example">
    <h2>TUIDialog 使用示例</h2>
    
    <div class="example-section">
      <h3>组件式调用</h3>
      <button @click="showComponentDialog = true" class="example-btn">
        显示组件对话框
      </button>
      
      <TUIDialog
        v-model:visible="showComponentDialog"
        title="组件式对话框"
        width="400px"
        @confirm="handleComponentConfirm"
        @cancel="handleComponentCancel"
      >
        <p>这是一个使用组件方式调用的对话框。</p>
        <p>您可以在这里放置任何内容。</p>
      </TUIDialog>
    </div>

    <div class="example-section">
      <h3>函数式调用</h3>
      <div class="button-group">
        <button @click="showBasicDialog" class="example-btn">
          基础对话框
        </button>
        <button @click="showConfirmDialog" class="example-btn">
          确认对话框
        </button>
        <button @click="showInfoDialog" class="example-btn">
          信息提示
        </button>
        <button @click="showSuccessDialog" class="example-btn">
          成功提示
        </button>
        <button @click="showWarningDialog" class="example-btn">
          警告提示
        </button>
        <button @click="showErrorDialog" class="example-btn">
          错误提示
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TUIDialog, dialog, confirm, info, success, warning, error } from './index';

const showComponentDialog = ref(false);

const handleComponentConfirm = () => {
  console.log('组件对话框确认');
  showComponentDialog.value = false;
};

const handleComponentCancel = () => {
  console.log('组件对话框取消');
};

const showBasicDialog = () => {
  dialog({
    title: '基础对话框',
    content: '这是一个基础的对话框示例。',
    onConfirm: () => {
      console.log('基础对话框确认');
    },
    onCancel: () => {
      console.log('基础对话框取消');
    }
  });
};

const showConfirmDialog = () => {
  confirm({
    title: '删除确认',
    content: '确定要删除这个项目吗？此操作不可撤销。',
    onConfirm: () => {
      console.log('确认删除');
    },
    onCancel: () => {
      console.log('取消删除');
    }
  });
};

const showInfoDialog = () => {
  info('这是一个信息提示对话框。', '信息');
};

const showSuccessDialog = () => {
  success('操作成功完成！', '成功');
};

const showWarningDialog = () => {
  warning('请检查您的输入信息。', '警告');
};

const showErrorDialog = () => {
  error('操作失败，请重试。', '错误');
};
</script>

<style lang="scss" scoped>
.dialog-example {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;

  h2 {
    color: var(--text-color-primary);
    margin-bottom: 2rem;
  }

  .example-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 1px solid var(--stroke-color-primary);
    border-radius: 0.5rem;
    background-color: var(--bg-color-operate);

    h3 {
      color: var(--text-color-primary);
      margin-bottom: 1rem;
    }

    .button-group {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .example-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--stroke-color-primary);
      border-radius: 0.25rem;
      background-color: var(--bg-color-bubble-reciprocal);
      color: var(--text-color-primary);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: var(--button-color-primary-default);
        color: white;
        border-color: var(--button-color-primary-default);
      }
    }
  }
}
</style>