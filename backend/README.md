# Century Room 排班后端

前端沿用现有 Vercel 网站，首页和 `/schedule.html` 均为排班入口，生日游戏保留在 `/birthday.html`；Cloudflare Worker `centuryroom-api` 使用 D1 `centuryroom-db`，通过 `api.centuryroom.cn` 提供接口。

新注册账号始终为 `viewer/pending`，管理员批准后只能查看已发布排班。管理员从数据库指定，不会因为第一个注册而自动产生。密码使用独立随机盐与 PBKDF2-SHA512（100,000 次，兼容 Workers Web Crypto），最少 15 字符。会话使用随机令牌，数据库只保存令牌摘要，Cookie 为 HttpOnly、Secure、SameSite=Lax，7 天到期。没有邮件验证或自助找回密码；目前账号以用户名登录。

`schema.sql` 为可重复执行的建表脚本。`node backend/test.mjs` 使用内存 SQLite 验证注册、审批、角色权限、草稿隔离、修改冲突、日期与搭档校验、注销、限流；不会写入线上数据库。

管理员保存每天 4/5/6 场演出、每场时段与两名鼓手、其他岗位安排、鼓手休息/鬼屋及备注。只有小哲、Ben 可以设置鼓手鬼屋任务；舞者鬼屋任务可在岗位安排填写。待定岗位只能保存草稿。版本号防止覆盖其他管理员的修改，操作写入审计记录。

首次管理员由站点负责人注册并确认账号后，通过 D1 Console 指定该用户为 `admin/approved`。日常账号审批在网站内进行。涉及账号恢复、管理员变更需由站点负责人在 Cloudflare 管理台处理。请不要在 Git 中保存密码或令牌。

上线前应先运行测试、执行 schema.sql、部署 Worker，再发布前端。数据库已有表时不要重建或删除。调整前端主域名时同步更新 Worker 的 ORIGINS 与本页 CSP connect-src。
