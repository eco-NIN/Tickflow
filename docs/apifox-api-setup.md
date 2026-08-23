# Focusly Apifox 配置说明

本文档以当前 [api.js](../src/services/api.js) 的实际请求为准，用于在 Apifox 中创建 Mock 接口、定义响应结构并完成前端联调。

## 1. 前端请求约定

- Axios `baseURL`：`import.meta.env.VITE_API_BASE_URL || '/api'`
- 请求超时：`VITE_API_TIMEOUT`，未配置时为 `5000` 毫秒。
- 所有接口均返回 JSON，成功条件是顶层 `code` **为数字** `200`。
- 当前前端只读取 `payload.data`；`msg` 用于 Apifox 文档和人工排查。
- 请求路径在服务层均不带 `/api` 前缀，例如 `'/task/list'`。最终 URL 由 `baseURL + url` 组成。

统一成功响应外层：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

> 注意：`"200"`（字符串）不通过当前前端校验；必须返回数字 `200`。

## 2. 数据模型

### 2.1 TimerConfig

| 字段 | 类型 | 必填 | 枚举 | 最小值 | 最大值 | 示例 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `studyDuration` | integer | 是 | 无 | 1 | 180 | `25` |
| `restDuration` | integer | 是 | 无 | 1 | 60 | `5` |

```json
{
  "studyDuration": 25,
  "restDuration": 5
}
```

### 2.2 Task

| 字段 | 类型 | 必填 | 枚举 | 最小值 | 最大值 | 示例 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `id` | string | 是 | 无 | 1 个字符 | 无 | `"1722470400000"` |
| `content` | string | 是 | 非空文本 | 1 个字符 | 80 个字符 | `"完成高数作业"` |
| `description` | string | 否 | 无 | 0 个字符 | 200 个字符 | `"完成第 3 章习题 1-10"` |
| `status` | string | 是 | `"0"` 未完成；`"1"` 已完成 | - | - | `"0"` |
| `createTime` | string | 是 | ISO 8601 日期时间 | - | - | `"2026-08-23T09:30:00.000Z"` |

```json
{
  "id": "1722470400000",
  "content": "完成高数作业",
  "description": "完成第 3 章习题 1-10",
  "status": "0",
  "createTime": "2026-08-23T09:30:00.000Z"
}
```

### 2.3 ClockRecord

`ClockRecord` 表示每日打卡汇总记录。同一个 `date` 在业务上应唯一；新增同一天记录时，服务端应更新该日期记录，而不是创建重复记录。

| 字段 | 类型 | 必填 | 枚举 | 最小值 | 最大值 | 示例 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `date` | string | 是 | `YYYY-MM-DD` | 10 个字符 | 10 个字符 | `"2026-08-23"` |
| `studyTime` | integer | 是 | 无 | 0 | 无 | `120` |
| `createTime` | string | 是 | ISO 8601 日期时间 | - | - | `"2026-08-23T12:00:00.000Z"` |

```json
{
  "date": "2026-08-23",
  "studyTime": 120,
  "createTime": "2026-08-23T12:00:00.000Z"
}
```

### 2.4 StatisticItem

远端统计接口原始数据可使用 `date + studyTime`。前端收到成功响应后会归一化为图表所需的 `{ label, value }`；`label` 对应日期，`value` 对应分钟数。

| 字段 | 类型 | 必填 | 枚举 | 最小值 | 最大值 | 示例 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `date` | string | 是 | `YYYY-MM-DD` | 10 个字符 | 10 个字符 | `"2026-08-23"` |
| `studyTime` | integer | 是 | 无 | 0 | 无 | `90` |

```json
{
  "date": "2026-08-23",
  "studyTime": 90
}
```

## 3. 响应模型

所有响应都包含 `code`（number）、`msg`（string）和 `data`。

| 响应模型 | `data` 类型 | 适用接口 |
| --- | --- | --- |
| `TimerConfigResponse` | `TimerConfig` | 获取、保存计时器配置 |
| `TaskResponse` | `Task` | 新增、更新任务 |
| `TaskListResponse` | `Task[]` | 获取任务列表 |
| `ClockResponse` | `ClockRecord` | 新增每日打卡 |
| `ClockListResponse` | `ClockRecord[]` | 获取打卡记录 |
| `StatisticListResponse` | `StatisticItem[]` | 周统计、月统计 |
| `EmptyResponse` | `null` | 删除任务 |

`TaskListResponse`、`ClockListResponse`、`StatisticListResponse` 的 `data` 必须是数组，即使为空也应返回 `[]`，不要返回 `{}` 或 `null`。

## 4. 接口清单

| 序号 | 方法 | 路径 | 参数位置 | 请求模型 | 响应模型 |
| ---: | --- | --- | --- | --- | --- |
| 1 | GET | `/timer/config` | 无 | 无 | `TimerConfigResponse` |
| 2 | PUT | `/timer/config` | JSON Body | `TimerConfig` | `TimerConfigResponse` |
| 3 | GET | `/task/list` | 无 | 无 | `TaskListResponse` |
| 4 | POST | `/task/add` | JSON Body | `Task` | `TaskResponse` |
| 5 | PUT | `/task/update` | JSON Body | `Task` 的部分字段，必须含 `id` | `TaskResponse` |
| 6 | DELETE | `/task/delete` | **Query** | `id: string` | `EmptyResponse` |
| 7 | GET | `/clock/list` | 无 | 无 | `ClockListResponse` |
| 8 | POST | `/clock/add` | JSON Body | `ClockRecord` | `ClockResponse` |
| 9 | GET | `/stat/week` | 无 | 无 | `StatisticListResponse` |
| 10 | GET | `/stat/month` | 无 | 无 | `StatisticListResponse` |

> 重点：`DELETE /task/delete` 的 `id` 必须配置在 **Query 参数** 中。当前前端调用为 `params: { id }`，最终请求形式是 `/task/delete?id=1722470400000`，不是 JSON Body。

## 5. 各接口 Apifox 配置与成功响应示例

### 5.1 GET /timer/config

- 参数：无。
- 成功响应：`TimerConfigResponse`。

```json
{
  "code": 200,
  "msg": "获取计时器配置成功",
  "data": {
    "studyDuration": 25,
    "restDuration": 5
  }
}
```

### 5.2 PUT /timer/config

- JSON Body：`TimerConfig`。

```json
{
  "studyDuration": 50,
  "restDuration": 10
}
```

- 成功响应：`TimerConfigResponse`。

```json
{
  "code": 200,
  "msg": "保存计时器配置成功",
  "data": {
    "studyDuration": 50,
    "restDuration": 10
  }
}
```

### 5.3 GET /task/list

- 参数：无。
- 成功响应：`TaskListResponse`。

```json
{
  "code": 200,
  "msg": "获取任务列表成功",
  "data": [
    {
      "id": "1722470400000",
      "content": "完成高数作业",
      "description": "完成第 3 章习题 1-10",
      "status": "0",
      "createTime": "2026-08-23T09:30:00.000Z"
    }
  ]
}
```

### 5.4 POST /task/add

- JSON Body：`Task`。

```json
{
  "id": "1722470400000",
  "content": "完成高数作业",
  "description": "完成第 3 章习题 1-10",
  "status": "0",
  "createTime": "2026-08-23T09:30:00.000Z"
}
```

- 成功响应：`TaskResponse`。

```json
{
  "code": 200,
  "msg": "新增任务成功",
  "data": {
    "id": "1722470400000",
    "content": "完成高数作业",
    "description": "完成第 3 章习题 1-10",
    "status": "0",
    "createTime": "2026-08-23T09:30:00.000Z"
  }
}
```

### 5.5 PUT /task/update

- JSON Body：必须含 `id`，其余字段可按修改内容传递。

```json
{
  "id": "1722470400000",
  "content": "完成高数作业并订正错题",
  "description": "完成第 3 章习题并整理错题",
  "status": "1"
}
```

- 成功响应：`TaskResponse`。

```json
{
  "code": 200,
  "msg": "更新任务成功",
  "data": {
    "id": "1722470400000",
    "content": "完成高数作业并订正错题",
    "description": "完成第 3 章习题并整理错题",
    "status": "1",
    "createTime": "2026-08-23T09:30:00.000Z"
  }
}
```

### 5.6 DELETE /task/delete

- Query 参数：`id`，string，必填。
- 请求示例：`DELETE /task/delete?id=1722470400000`
- JSON Body：无。
- 成功响应：`EmptyResponse`。

```json
{
  "code": 200,
  "msg": "删除任务成功",
  "data": null
}
```

### 5.7 GET /clock/list

- 参数：无。
- 成功响应：`ClockListResponse`。

```json
{
  "code": 200,
  "msg": "获取打卡记录成功",
  "data": [
    {
      "date": "2026-08-23",
      "studyTime": 120,
      "createTime": "2026-08-23T12:00:00.000Z"
    }
  ]
}
```

### 5.8 POST /clock/add

- JSON Body：`ClockRecord`。

```json
{
  "date": "2026-08-23",
  "studyTime": 120,
  "createTime": "2026-08-23T12:00:00.000Z"
}
```

- 成功响应：`ClockResponse`。

```json
{
  "code": 200,
  "msg": "提交打卡成功",
  "data": {
    "date": "2026-08-23",
    "studyTime": 120,
    "createTime": "2026-08-23T12:00:00.000Z"
  }
}
```

### 5.9 GET /stat/week

- 参数：无。
- 成功响应：`StatisticListResponse`。`data` 必须为按日期从旧到新排序的连续 7 条数组。

```json
{
  "code": 200,
  "msg": "获取近 7 天统计成功",
  "data": [
    { "date": "2026-08-17", "studyTime": 60 },
    { "date": "2026-08-18", "studyTime": 0 },
    { "date": "2026-08-19", "studyTime": 90 },
    { "date": "2026-08-20", "studyTime": 120 },
    { "date": "2026-08-21", "studyTime": 30 },
    { "date": "2026-08-22", "studyTime": 0 },
    { "date": "2026-08-23", "studyTime": 75 }
  ]
}
```

### 5.10 GET /stat/month

- 参数：无。
- 成功响应：`StatisticListResponse`。

```json
{
  "code": 200,
  "msg": "获取近 30 天统计成功",
  "data": [
    { "date": "2026-07-25", "studyTime": 60 },
    { "date": "2026-07-26", "studyTime": 0 }
  ]
}
```

上例仅展示数组格式。真实响应必须按照下一节规则补齐完整 30 条，不能只返回有学习记录的日期。

## 6. 统计日期生成规则

### 6.1 周统计

`GET /stat/week` 必须返回以请求当天为终点的连续 7 个自然日：

1. 从当天向前倒推 6 天。
2. 按日期从旧到新排列。
3. 每天输出一条 `StatisticItem`。
4. 没有记录的日期仍返回该日期，并令 `studyTime` 为 `0`。
5. 日期使用本地自然日的 `YYYY-MM-DD` 格式。

例如请求日为 `2026-08-23`，返回范围为 `2026-08-17` 至 `2026-08-23`，共 7 条。

### 6.2 月统计

`GET /stat/month` 必须返回以请求当天为终点的连续 30 个自然日：

1. 从当天向前倒推 29 天。
2. 按日期从旧到新排列。
3. 每天输出一条 `StatisticItem`，即 `data.length === 30`。
4. 无记录日期补 `{ "date": "YYYY-MM-DD", "studyTime": 0 }`。
5. 跨月、跨年时继续按自然日递减，不能只取当前自然月。

例如请求日为 `2026-08-23`，范围是 `2026-07-25` 至 `2026-08-23`，包含首尾共 30 条。

建议在 Apifox 高级 Mock 中按当前日期生成该数组；若使用固定 Mock，则手动配置 30 条连续日期并定期更新。

## 7. Apifox Mock 的 CRUD 持久化限制

普通 Apifox Mock 通常是根据接口定义、示例和 Mock 规则生成响应的静态或随机模拟，并不天然维护共享可变状态。因此：

- `POST /task/add` 后，后续 `GET /task/list` **不会自动出现新增任务**。
- `PUT /task/update` 后，后续列表也不会自动反映修改。
- `DELETE /task/delete` 后，后续列表不会自动移除对应任务。
- 同理，计时器配置和打卡记录也不会自动持久化。

项目当前前端会在请求成功后自行镜像数据到 LocalStorage，并在离线时回退到该缓存；这不等同于 Apifox Mock 的远端 CRUD 持久化。

若需要真实的跨请求 CRUD 验证，应使用以下之一：

1. Apifox 支持的脚本、数据库或云端 Mock 状态能力，并确认同一环境下读写共享数据。
2. 本地 Mock Server，使用内存或 JSON 文件保存状态。
3. 真实后端服务。

普通静态 Mock 适合验证 URL、方法、Query、JSON Body 和响应 schema；不适合验证真实 CRUD 状态迁移。

## 8. `.env` 配置

### 8.1 推荐：Apifox Mock URL 已包含 `/api`

若 Apifox 提供的环境域名为：

```text
https://mock.apifox.com/m1/123456-0-default/api
```

则 `.env` 应填写：

```dotenv
VITE_API_BASE_URL=https://mock.apifox.com/m1/123456-0-default/api
VITE_API_TIMEOUT=5000
```

最终请求为：

```text
https://mock.apifox.com/m1/123456-0-default/api/task/list
```

### 8.2 本地 Vite 代理使用 `/api`

若 Vite 已配置把 `/api` 代理到 Mock 服务，则 `.env` 应填写：

```dotenv
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=5000
```

最终浏览器请求为：

```text
http://localhost:5173/api/task/list
```

### 8.3 避免 `/api/api`

当前服务层路径已经是 `/timer/config`、`/task/list` 等，不会额外拼接 `/api`。因此：

- 可填写 `https://mock.example.com/api`，最终是 `https://mock.example.com/api/task/list`。
- 不要填写 `https://mock.example.com/api/api`。
- 不要在 Apifox 接口路径中再定义为 `/api/task/list`，同时又将环境 Base URL 配成以 `/api` 结尾；否则最终会出现 `/api/api/task/list`。

建议在 Apifox 中：环境 Base URL 设置到 `/api`，接口路径只写 `/task/list`、`/timer/config` 等相对路径。

修改 `.env` 后必须重启 Vite 开发服务器，Vite 才会重新注入 `import.meta.env`。

## 9. 浏览器 Network 面板验证

1. 启动前端，并在浏览器打开 Focusly。
2. 打开开发者工具的 **Network** 面板，勾选 **Preserve log**，过滤类型选择 **Fetch/XHR**。
3. 刷新页面，确认出现：
   - `GET /timer/config`
   - `GET /task/list`
   - `GET /stat/week`
4. 点击保存计时设置，确认：
   - Request Method 为 `PUT`
   - Request Payload 是 JSON Body
   - Response 的 `code` 是数字 `200`
5. 新增任务，确认：
   - Request Method 为 `POST`
   - Request Payload 含 `id`、`content`、`description`、`status`、`createTime`
6. 切换任务状态或保存编辑，确认：
   - Request Method 为 `PUT`
   - Request Payload 至少含 `id` 和修改字段。
7. 删除任务，确认：
   - Request Method 为 `DELETE`
   - Request URL 包含 `?id=...`
   - Request Payload 为空。
8. 切换近 7 天和近 30 天，确认请求分别为 `GET /stat/week` 和 `GET /stat/month`，并检查响应 `data` 是数组，长度分别为 7 和 30。
9. 在响应预览中检查：
   - 顶层 `code` 为 `200` 数字；
   - 获取列表和统计接口的 `data` 为数组；
   - `DELETE /task/delete` 的 `id` 位于 URL Query；
   - 最终请求 URL 没有 `/api/api`。
10. 若请求失败，检查 Console 和 Application > Local Storage：前端会回退到 `focusly:` 前缀缓存，并将离线写操作记录在 `focusly:pending`。
