/* 该脚本流程面板生成 */
//开始 Flow 生成代码
light.on('start',function (entityManager, eventManager, scriptSystem) {
   var context = new light.NodeContext(entityManager, eventManager, scriptSystem);
   // 实例化
   let code_SwitchObject_2 = context.create("code/SwitchObject");
   let code_Start_1 = context.create("code/Start");
   // 属性赋值
   code_SwitchObject_2.entityToDisplay = [18,23,39];
   // 数据连接
   // 事件连接
   context.connectEvent(code_Start_1, "Run", code_SwitchObject_2, "Run")
   code_Start_1.Run();
});