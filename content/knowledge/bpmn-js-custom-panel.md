---
title: bpmn-js 自定义属性面板
domain: 流程引擎
project: 珂阳工作流平台
date: 2026-09-15
tags: [bpmn-js, 流程引擎, 组件]
---

## 问题

bpmn-js 官方的 properties-panel 只覆盖标准 BPMN 属性，业务上要加「审批人来源」「超时策略」这类自定义字段，还要把设计器抽成组件供外部调用。

## 结论

自定义属性分两步：**先用 moddle 声明字段，再写 provider 渲染表单**。

### 第一步：moddle 扩展

```json
{
  "name": "FlowExt",
  "prefix": "flow",
  "uri": "http://flow.ext",
  "xml": { "tagAlias": "lowerCase" },
  "types": [
    {
      "name": "Approver",
      "extends": ["bpmn:UserTask"],
      "properties": [
        { "name": "source", "type": "String" },
        { "name": "timeout", "type": "String" }
      ]
    }
  ]
}
```

```ts
import flowModdle from './flow.json'
const modeler = new BpmnModeler({
  moddleExtensions: { flow: flowModdle },
})
```

不加 moddle 直接写属性，导出 XML 时会丢——这是最常见的坑。

### 第二步：provider

```ts
function ApproverProps(props) {
  const { element, injector } = props
  const modeling = injector.get('modeling')
  const businessObject = element.businessObject

  const setValue = (key, value) => {
    modeling.updateProperties(element, { [key]: value })
  }

  return <div>…</div>
}

ApproverProps.$inject = ['element', 'injector']
```

**必须用 `modeling.updateProperties` 改**，直接改 `businessObject` 不会进 undo 栈，撤销功能就废了。

## 抽成组件给别人用时要注意

1. **Modeler 实例要暴露出去** —— 外部要调 `saveXML()`、`importXML()`，用 `ref` 或 `defineExpose` 挂出去
2. **样式要单独引** —— `bpmn-js/dist/assets/diagram-js.css` 和 properties-panel 的 css 常常被漏掉
3. **销毁要调 `modeler.destroy()`** —— 否则事件监听和 DOM 会残留，在微前端场景下尤其明显

## 待补充

- 自定义元素（Custom Elements）的 palette 注册
- 属性校验怎么在导出前拦截
