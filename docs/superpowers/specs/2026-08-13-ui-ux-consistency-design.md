# dondone-tools UI/UX Consistency Design

## Goal

建立一套可复用、可检查的 dondone-tools 工具页交互基线，消除输入框尺寸与自动撑高、输出区域滚动、按钮密度、错误反馈和复制反馈上的重复分歧，同时保留代码编辑器、图片处理和文件上传工具必要的专用布局。

## Baseline findings

- `src/components/ui/textarea.tsx` 使用 `field-sizing-content` 与 `min-h-16`，空输入高度和输入后高度不稳定。
- 工具页自行叠加了 `min-h-[100px]`、`min-h-[120px]`、`min-h-60`、`max-h-64`、`max-h-[200px]` 以及不同的 `resize-*` 和滚动策略。
- `Input`、`SelectTrigger` 和 `Button` 的基础尺寸已经存在，但页面通过 `h-8`、`h-7`、`h-6` 等局部 class 改写，缺少语义化变体。
- 错误提示、可复制结果和结果字段在多个页面重复实现，字号、内边距、换行和复制按钮尺寸不同。
- 文件上传/拖放区域与结果状态是工具类型的合理差异，不应被文本工具的控件规范强行覆盖。

## Design decisions

### 1. Text input sizing

`Textarea` 默认采用固定起始高度、纵向可调整、达到上限后内部滚动：

| Variant | Default height | Max height | Use |
| --- | --- | --- | --- |
| `default` | 8rem | 24rem | 普通文本、哈希、编码和短配置输入 |
| `compact` | 6rem | 16rem | Base64、短 token、窄字段 |
| `editor` | 16rem | 32rem | JSON、JWT、Markdown、差异对比、敏感信息等长文本 |

所有变体都使用 `resize-y overflow-y-auto`，不再使用 `field-sizing-content`。页面通过 `variant` 表达意图，不再直接写高度、最大高度和滚动 class。输出文本区域如果需要只读展示，仍使用专门的 output primitive，不把输入控件当作输出控件。

### 2. Single-line controls

- `Input` 默认高度保持 2.25rem。
- `SelectTrigger` 默认高度保持 2.25rem；紧凑工具设置使用 `size="sm"`，不写 `h-8`。
- `Button` 使用已有的 `default`、`sm`、`icon-sm` 等语义尺寸；复制/次要动作至少保持 2rem 的可触达高度，图标按钮必须提供 `aria-label`。
- 页面不再用任意 `h-*` 覆盖共享控件尺寸，除非该尺寸属于共享 primitive 已声明的变体。

### 3. Shared feedback and output

新增工具级共享组件：

- `ToolError`：统一 `role="alert"`、错误背景、间距和字号；调用方只传本地化后的 message。
- `ToolResultField`：统一标签、复制按钮、复制成功状态、等宽字体、换行与选择行为；支持 `multiline`/`maxHeight` 语义变体。
- `ToolStatus`：用于加载、处理中和可取消状态的统一布局；文件处理的进度条仍由具体工具提供。

先迁移已有重复度最高且代表性强的文本工具（Hash、Base64、Base58、AES、BP JWT/BP Sign、JSON、JWT、URL、UUID、敏感信息、OCR/二维码文本结果），再用审计规则确保新页面优先复用这些组件。复杂表格、图片预览和图表保持自己的布局，但沿用统一的错误、按钮和 focus 规则。

### 4. Page composition

工具页继续通过 `ToolLayout` 负责标题、分类、收藏和页间距；页面内容按以下稳定顺序组织：

1. 输入或设置区
2. 主操作区
3. 错误/状态反馈
4. 结果或下载区

相邻控件使用统一的 `gap-3`，区域之间使用 `space-y-4`；移动端操作按钮允许换行，不能导致水平滚动。

### 5. Accessibility and responsive behavior

- 每个输入控件有可见 `Label` 或等价的可访问名称；不能只依赖 placeholder。
- 所有可交互元素保留可见 `focus-visible` 状态，图标按钮提供 `aria-label`。
- 错误使用 `role="alert"`，异步状态使用 `role="status"` 或明确的状态文本。
- 44px 触控目标适用于主要操作；工具内部的紧凑复制动作最低使用 32px 高度并保留足够间距。
- 文本输出允许断行或内部滚动，避免把页面撑出水平滚动；图片与文件工具继续使用 `object-contain` 和明确的最大预览高度。
- 尊重 `prefers-reduced-motion`，不新增只为装饰的动画。

## Implementation boundary

### In scope

- 更新共享 `Textarea`、`SelectTrigger` 和必要的按钮使用方式。
- 新增并迁移共享错误、状态和结果字段组件。
- 统一所有文本工具的 textarea 变体，清理页面级高度/滚动重复 class。
- 保留并记录图片、文件上传、表格和图表工具的专用布局规则。
- 创建项目 UI/UX 规范文档与可自动发现的 `dondone-tools-ui-ux` Skill。
- 将新增工具检查清单加入项目约束，并运行测试、构建、lint 和浏览器 smoke review。

### Out of scope

- 更换品牌色、字体或整体视觉风格。
- 重写纯计算逻辑、路由结构或国际化文案。
- 把所有页面强制改成同一种输入/输出布局。

## Verification criteria

- 空 textarea 在同一变体下首屏高度一致，输入增长不会在达到上限前无限撑高。
- 所有文本工具的高度策略能通过 `variant` 读懂；页面中不再存在未解释的 textarea 高度/滚动覆盖。
- 错误提示和复制结果在迁移页面具有一致的视觉与键盘行为。
- 主要控件具备可见 focus、合适的 aria 语义和移动端不溢出布局。
- `pnpm test:run`、`pnpm build` 和 `pnpm lint` 通过。
- Skill 的触发描述、规范内容和新增工具检查清单与实际实现一致。
