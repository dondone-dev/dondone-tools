# 投胎模拟器设计规格

## 目标

新增一个“投胎模拟器”趣味数据工具。用户点击按钮后，工具按照某一年度全球出生人数的比例，模拟一个新生儿随机出生在哪个国家或地区，并展示国家、国旗、出生概率、出生人数、出生率、数据年份与来源说明。

产品定位为“趣味 + 数据科普”，不是命运预测、国家排名或生活质量评价。

## 产品决策

- 默认统计口径：按年度出生人数加权抽样，而不是按国家数量等概率抽样，也不是直接按出生率抽样。
- 默认数据年份：最新完整历史年度；首版数据基线固定为 2023，并在界面明确显示年份。
- 默认数据来源：联合国 World Population Prospects 2024 的年度出生人数数据。
- 出生率：作为辅助指标展示，不用于默认抽签权重。
- 第一版不提供分享图片、分享链接、Web Share、复制结果、登录、历史记录、地图热力图、年份切换、地区筛选、实时 API、3D 地球或国家好坏评分。
- 第一版只提供“开始投胎”“再投一次”“查看数据说明”三个核心操作。

## 用户体验

### 首屏

页面采用深色宇宙感背景与克制的数据卡片：

- 深墨蓝或近黑色背景；
- 低对比度星点、轨道线或简化地球轮廓作为装饰；
- 青蓝与暖金作为强调色；
- 主内容最大宽度约 720px；
- 主按钮为“开始投胎”；
- 页面显示“基于全球年度出生数据的趣味模拟”；
- 页面显示“数据年份：2023 · 联合国数据”。

首屏不放复杂设置，保证首次操作只有一个明确动作。

### 抽取动画

总时长约 1.5–2 秒，分为三个阶段：

1. 启动：按钮进入 loading，显示“正在计算全球出生权重……”；
2. 抽取：国家名称快速轮换，速度先快后慢，国旗区域保持固定尺寸；
3. 揭晓：最终国家和国旗轻微放大，统计数字依次出现。

动画必须支持 `prefers-reduced-motion`。减少动画时可以直接短暂显示状态后揭晓结果。抽取期间禁止重复触发。

### 结果卡片

结果包含：

- “你的出生坐标”标题；
- 国旗与本地化国家名称；
- 所属地区；
- 全球新生儿中的出生概率；
- “约每 X 个新生儿，就有 1 个来自这里”；
- 年度出生人数；
- 出生率；
- 数据年份；
- 数据来源链接；
- 中性文案“这一次，生命从这里开始。”；
- “再投一次”；
- “查看数据说明”。

不出现“幸运”“困难”“失败”“高级”等价值判断。

### 响应式

桌面端使用单列居中的结果区域，结果卡片宽度约 560–640px。移动端保持单列，统计字段自动堆叠，按钮可以换行，不允许横向滚动。

## 数据模型

每条国家数据至少包含：

```ts
type BirthCountry = {
  code: string          // ISO alpha-2 或稳定内部代码
  name: string          // 默认语言名称
  region: string        // 地区
  births: number        // 年度出生人数
  birthRate?: number    // 每千人出生数，仅辅助展示
  year: number          // 数据年份
  source: string        // 数据来源标识
  flagCode?: string     // 国旗资源代码
}
```

纳入统计的实体必须有稳定唯一代码。国家与地区的统计边界保持一致，避免同一人口因不同实体层级被重复计入。缺失或无效出生人数的实体不参与抽样，并在数据说明中记录处理规则。

## 计算逻辑

默认概率：

```text
国家出生概率 = 该国年度出生人数 / 纳入统计的年度全球出生人数
```

抽样使用累计权重：

```ts
function pickCountry(
  countries: WeightedCountry[],
  random = Math.random,
): WeightedCountry
```

实现要求：

- 加载数据时校验并建立总权重与累计权重；
- 点击时生成 `[0, totalBirths)` 内的随机值；
- 顺序查找第一个累计权重大于随机值的国家；
- 总权重必须大于 0；
- 出生人数必须是有限正数；
- 国家代码必须唯一；
- 保留计算精度，显示时再格式化；
- `Math.random()` 足够满足趣味模拟用途，不声称是安全抽签或密码学随机。

建议使用 `BirthDistribution` 保存预计算结果：

```ts
type PreparedCountry = BirthCountry & {
  cumulativeBirths: number
}

type BirthDistribution = {
  countries: PreparedCountry[]
  totalBirths: number
  year: number
}
```

不需要为首版几十到几百个实体引入二分查找或复杂采样结构。

## 数据流与加载

数据采用构建时整理、运行时本地读取或直接打包的方式，不在用户点击时请求第三方 API：

```text
本地出生数据
  → 数据校验与标准化
  → 累计权重表
  → 用户点击
  → 加权随机抽样
  → 读取国家展示信息
  → 动画与结果卡片
```

这样可以避免外部接口限流、跨域、网络失败和响应格式变化，并保证预渲染与离线场景稳定。

推荐数据源：

- [World Population Prospects 2024](https://population.un.org/wpp/)
- [UN World Population Prospects 2024 Dataset](https://www.un.org/development/desa/pd/content/World-Population-Prospects-2024)
- [UNdata: Number of births, both sexes combined](https://data.un.org/Data.aspx?d=PopDiv&f=variableID%3A51)
- [World Bank: Birth rate, crude](https://data.worldbank.org/indicator/SP.DYN.CBRT.IN)

联合国出生人数数据以千人为单位时，导入阶段必须转换为实际人数，并在数据处理文件中记录单位转换。

## 国旗资源

推荐使用本地打包的 `lipis/flag-icons` SVG 资源：

- 使用 ISO 3166-1 alpha-2 代码作为关联键；
- 资源本地托管，不依赖运行时 CDN；
- MIT 许可需保留在依赖或项目许可证记录中；
- 不将该图标库描述为 ISO 官方国旗图稿；
- 国旗加载失败时显示国家名称与代码占位，不影响结果。

国旗替代文本使用本地化国家名称。

## 页面与项目集成

遵循现有工具架构：

- 新增纯逻辑模块到 `src/lib/tools/`；
- 新增页面到 `src/pages/`；
- 在 `src/lib/routes.ts` 与 `src/lib/tools-config.ts` 注册；
- 在 `src/AppRoutes.tsx` 添加路由；
- 在 9 个 locale 的 `tools.json` 增加翻译键；
- 遵循 `ToolLayout`、`ToolStatus`、`ToolError` 与现有按钮尺寸规范；
- 页面文本全部使用 `useTranslation`，明确指定 `ns: 'tools'`。

建议工具 ID：`birthplace-simulator`。

建议路由：`/fun/birthplace-simulator`，最终分类与现有工具注册约定保持一致。

## 错误处理

数据文件加载失败时显示：

> 暂时无法加载出生数据，请稍后再试。

数据校验失败时显示：

> 出生数据暂时不可用。

生产环境不显示堆栈、内部路径或原始异常。开发环境可以记录详细错误。国旗加载失败只影响图片，不影响国家名称、概率和统计结果。

## 无障碍

- 使用真实 `<button>`；
- 结果更新区域使用 `aria-live="polite"`；
- 抽取状态使用 `role="status"`；
- 错误使用项目已有 `ToolError`；
- 所有图标按钮有可访问名称；
- 不用颜色单独表达结果；
- 支持键盘操作与可见焦点环；
- 遵循 `prefers-reduced-motion`；
- 深色背景与文字满足对比度要求；
- 页面不产生横向溢出。

## 国际化

在 `tools` 命名空间中新增所有 9 种语言的键，至少包括：

```text
birthSimulator.title
birthSimulator.subtitle
birthSimulator.start
birthSimulator.retry
birthSimulator.resultLabel
birthSimulator.birthProbability
birthSimulator.birthCount
birthSimulator.birthRate
birthSimulator.perBirths
birthSimulator.dataYear
birthSimulator.dataSource
birthSimulator.dataMethod
birthSimulator.loading
birthSimulator.error
birthSimulator.details
birthSimulator.reducedMotion
```

国家名称不得在 React 组件中硬编码。数据层提供本地化名称，或接入项目现有的国家名称处理方式。

## 测试

纯逻辑测试放在 `src/lib/tools/`：

- 单国家数据始终返回该国家；
- 等权数据的固定边界结果正确；
- 明显权重差异符合预期累计区间；
- `0` 命中首项，接近 `1` 命中末项；
- 空列表、负数、`NaN`、无穷大、重复代码、总权重为零均返回明确错误；
- 大数字与小概率格式化稳定；
- “约每 X 人 1 个”不出现除零或无穷值。

不为纯布局增加组件测试。需要手动验证：初始状态、抽取禁用、结果展示、再投一次、数据说明、加载错误、国旗失败、键盘操作、减少动画、浅色/深色模式与窄屏布局。

## 验证

实施完成后运行：

```bash
pnpm test:run
pnpm build
pnpm lint
```

另外手动启动实际应用并验证首屏、抽取动画、结果卡片、再投一次、数据说明、移动端和 `prefers-reduced-motion`。确认 9 个 locale 均包含新增翻译键，确认国旗资源在本地构建中可加载。

## 明确不做的事项

以下事项不作为首版隐性后续任务：

- 分享图片或分享链接；
- 用户登录与云端保存；
- 实时外部 API；
- 自定义年份与地区筛选；
- 按出生率切换算法；
- 复杂地图或 3D 地球；
- 结果排行榜；
- 国家幸福度、发展程度或人生难度评价。
