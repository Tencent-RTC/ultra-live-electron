console.log('process.env.VUE_APP_RUNTIME_SCENE:', process.env.VUE_APP_RUNTIME_SCENE);

export const isInnerScene = process.env.VUE_APP_RUNTIME_SCENE !== 'outer';