# 演出排班后端

前端首页与 /schedule.html 共用排班界面，生日游戏位于 /birthday.html。Vercel 托管前端，Cloudflare Worker centuryroom-api 使用 D1 centuryroom-db，通过 api.centuryroom.cn 提供接口。

每天 4–6 场，每场记录车头、车尾、MC、小号和两名 Dancer，所有位置允许留空。保存后立即对已批准账号可见，没有草稿或发布步骤。个人休息由管理员明确标记，空白不自动算休息。彭俊维、哲的晚场可单独填写鬼或休息，与白天演出互不冲突。演员选项与验证位于 model.mjs，版本 2 排班以 format=2 标记。

新注册账号始终是 viewer/pending；管理员批准后可查看，普通账号不能编辑。管理员由站点负责人在 D1 指定，不会自动授予首个注册账号。现有密码加密、7 天 HttpOnly/Secure 会话、来源限制、登录限流和审批权限保持不变。

node backend/test.mjs 使用内存 SQLite 检查账号权限、空位保存、Dancer 与鼓手重复、个人休息冲突、晚场独立、旧数据转换、历史备份和版本冲突，不修改线上数据。

schema.sql 可重复执行。部署前需建好 schedule_archive 并备份旧数据；保存排班时自动保留前一版本。旧格式在读取时转换，未识别的演员名字不猜测对应关系，原始信息在历史表保留。数据库 published 列保留以兼容历史存储，新界面和接口不再使用它区分可见性。

Worker 支持多文件项目。用 Wrangler 发布 backend/wrangler.json 即可；Cloudflare 网页编辑器部署时，将 model.mjs 去除 export 前缀后放到 worker.mjs 前，并删除 worker.mjs 第一行 import，形成独立模块。