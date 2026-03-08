# Superpowers 使用说明

Superpowers 是给 Cursor 里 AI 助手用的「技能工作流」：在做功能、修 bug、写计划、做 Code Review 时，会按固定流程（先想清楚再写代码、先写测试再实现等）来执行，而不是一上来就改代码。

---

## 一、你已经安装好了什么

- **技能库**：在 `~/.cursor/skills/superpowers/skills/` 下，包含多类技能（见下文）。
- **引导规则**：`~/.cursor/rules/superpowers-bootstrap.mdc`，会让 Cursor 在新对话里自动按「先判断技能、再执行」的方式工作。

**重要**：需要**新开一个 Cursor 对话**（或重启 Cursor）后，规则才会生效。装好后可以问一句：「你有 superpowers 吗？」若回答里提到技能和工作流，就说明已生效。

---

## 二、你「怎么用」——其实不用额外操作

你不用输入特殊命令或点按钮。只要在 **Agent 对话**里正常说你的需求，例如：

- 「帮我做一个 xxx 功能」
- 「这段报错怎么回事，帮忙看下」
- 「帮我规划一下这个需求的实现步骤」
- 「帮我 review 一下刚才改的代码」

AI 会先判断有没有对应的 Superpowers 技能，有的话会先读技能、再按技能里的步骤来做（比如先和你对齐设计、再写计划、再按 TDD 实现）。

---

## 三、技能列表与使用场景（什么时候会用到）

| 技能 | 用途 | 你大概会这样触发 |
|------|------|------------------|
| **brainstorming**（头脑风暴） | 先和你把需求、方案讨论清楚，再写代码 | 「做个 xxx 功能」「我们加一个 xxx」 |
| **test-driven-development**（测试驱动开发） | 先写失败测试，再写最少代码让测试通过，再重构 | 任何实现功能、修 bug 的编码过程 |
| **systematic-debugging**（系统化调试） | 按步骤定位根因（复现 → 假设 → 验证 → 修复） | 「报错了」「这段为什么不对」「帮忙查下 bug」 |
| **writing-plans**（写计划） | 把认可后的设计拆成可执行任务（含文件、步骤、验收） | 设计讨论完后、「帮我写个实现计划」 |
| **executing-plans**（执行计划） | 按计划一步步做，并在关键点给你检查 | 你说「按计划做」或「继续」 |
| **subagent-driven-development** | 用子任务/子代理拆任务、自检、再继续 | 复杂或多步骤需求时自动用 |
| **using-git-worktrees** | 用独立工作区/分支做隔离开发 | 需要单独分支、不污染主分支时 |
| **finishing-a-development-branch** | 收尾：跑测试、决定合并/PR/丢弃、清理 | 一个功能或分支做完时 |
| **dispatching-parallel-agents** | 多个子任务并行执行 | 可并行的多件事一起做时 |
| **requesting-code-review** | 提交前自检清单，方便你或他人 review | 「帮我 review」「提交前检查一下」 |
| **receiving-code-review** | 根据 review 意见改代码、回复 | 你给了 review 意见之后 |
| **verification-before-completion** | 做完后确认真的修好/实现好了 | 修 bug 或完成功能收尾时 |
| **writing-skills** | 按规范写新的自定义技能 | 「帮我写一个 superpowers 技能」 |

你不用记这些技能名，只要用自然语言说清楚「要做什么」或「遇到什么问题」即可。

---

## 四、典型使用流程举例

1. **做一个新功能**
   - 你说：「我想加一个 xxx 功能。」
   - AI 会先用 **brainstorming** 和你确认目标、范围、接口等；
   - 你认可后，会用 **writing-plans** 出实现计划；
   - 你说「开始做」后，会用 **test-driven-development** 等按计划实现，必要时用 **requesting-code-review** 自检。

2. **修一个 bug**
   - 你说：「这里报错，帮忙看下。」
   - AI 会用 **systematic-debugging** 复现、假设、验证、修复；
   - 修完后用 **verification-before-completion** 确认问题真的解决。

3. **做 Code Review**
   - 你说：「帮我 review 一下刚才的改动。」
   - AI 会用 **requesting-code-review** 的清单检查并给出意见；
   - 你根据意见让他改，他会用 **receiving-code-review** 逐条处理。

---

## 五、更新 Superpowers

技能库是 git 仓库，想拉取最新技能时在终端执行：

```bash
cd ~/.cursor/skills/superpowers && git pull
```

拉完新对话即可用上新版技能。

---

## 六、小结

- **你**：像平时一样在 Cursor Agent 里说需求或问题即可，无需记命令。
- **AI**：会自动选技能、按流程（先设计/计划再编码、先测试再实现、先根因再修）执行。
- **验证**：新开对话问「你有 superpowers 吗？」能确认是否生效。

如有新技能或流程，只需在 `~/.cursor/skills/superpowers` 里更新（或自己按 **writing-skills** 写技能），无需改项目代码。
