# TUIDialog 组件

一个基于 Vue 3 的对话框组件，支持组件式和函数式两种调用方式。

## 特性

- 🎨 与项目设计系统完全一致的样式
- 🚀 支持组件式和函数式调用
- 🎭 支持遮罩层点击关闭
- 📱 响应式设计，支持移动端
- 🎬 流畅的动画效果
- 🔧 高度可定制化

## 组件式使用

```vue
<template>
  <TUIDialog
    v-model:visible="dialogVisible"
    title="用户信息"
    width="400px"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <p>这里是对话框内容</p>
  </TUIDialog>
</template>

<script setup>
import { ref } from 'vue';
import { TUIDialog } from '@/common/base/Dialog';

const dialogVisible = ref(false);

const handleConfirm = () => {
  console.log('确认');
};

const handleCancel = () => {
  console.log('取消');
};
</script>
```

## 函数式使用

### 基础对话框

```javascript
import { dialog } from '@/common/base/Dialog';

const instance = dialog({
  title: '提示',
  content: '这是一个对话框',
  onConfirm: () => {
    console.log('确认');
  },
  onCancel: () => {
    console.log('取消');
  }
});

// 手动关闭
instance.close();
```

### 快捷方法

```javascript
import { confirm, alert, info, success, warning, error } from '@/common/base/Dialog';

// 确认对话框
confirm({
  title: '删除确认',
  content: '确定要删除这个项目吗？',
  onConfirm: () => {
    // 执行删除操作
  }
});

// 警告对话框
alert({
  title: '警告',
  content: '操作不可逆，请谨慎操作！'
});

// 信息提示
info('操作成功完成！');
success('数据保存成功！');
warning('请检查输入信息！');
error('操作失败，请重试！');
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | boolean | false | 是否显示对话框 |
| title | string | '' | 对话框标题 |
| width | string \| number | '28rem' | 对话框宽度 |
| height | string \| number | 'auto' | 对话框高度 |
| maxWidth | string \| number | '90vw' | 最大宽度 |
| maxHeight | string \| number | '80vh' | 最大高度 |
| closable | boolean | true | 是否显示关闭按钮 |
| maskClosable | boolean | true | 点击遮罩层是否关闭 |
| showFooter | boolean | true | 是否显示底部按钮 |
| confirmText | string | 'Confirm' | 确认按钮文字 |
| cancelText | string | 'Cancel' | 取消按钮文字 |
| confirmLoading | boolean | false | 确认按钮加载状态 |
| destroyOnClose | boolean | false | 关闭时是否销毁 |
| zIndex | number | 1000 | 层级 |
| customClass | string | '' | 自定义样式类 |

## Events

| 事件名 | 说明 | 参数 |
|--------|------|------|
| update:visible | 显示状态改变 | (visible: boolean) |
| confirm | 点击确认按钮 | - |
| cancel | 点击取消按钮 | - |
| close | 对话框关闭 | - |

## Slots

| 插槽名 | 说明 |
|--------|------|
| default | 对话框内容 |
| footer | 自定义底部内容 |

## 样式定制

组件使用 CSS 变量，可以通过覆盖变量来定制样式：

```css
:root {
  --bg-color-operate: #1F2024;
  --stroke-color-primary: #3A3C42;
  --text-color-primary: #FFFFFF;
  --button-color-primary-default: #006EFF;
  --button-color-primary-hover: #0056CC;
}
```