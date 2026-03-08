# Superadmin 与 Gateway 修改说明

## Superadmin 模块（web）

- **位置**：`web/app/(superadmin)/`
- **作用**：超管后台，管理模型、供应商、定价与状态查看。
- **子菜单**：Dashboard、模型状态、供应商管理、配置价格。
- **模型状态页**：展示网关是否通、各模型是否可访问及响应时间；数据来源为 Gateway 实时探测 + 历史用量统计（优先用网关探测结果）。

## Gateway 修改

- **新接口**：`GET /health/models`
  - 对每个上游 Provider 请求其 `/models`（或等价）端点，带认证，并测一次响应时间。
  - 返回各模型的 `status`（ok / no_key / auth_failed / unreachable）和 `latency_ms`。
- **实现**：在 `startup/healthcheck.rs` 中增加带耗时的探测逻辑和 `probe_all_providers_for_api()`，新增 `api/health_models.rs` 按模型展开结果并注册路由。

## 数据流

- 模型状态页请求 `/api/superadmin/status` → 后端并行请求 Gateway `GET /health`、`GET /v1/models`、`GET /health/models` 与 DB 用量统计 → 合并后返回；前端优先用网关的「是否通」和「响应时间」展示。
