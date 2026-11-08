# feiji 部署计划（Ubuntu 22.04 / Nginx / PM2）

本文是一份面向 `brotherlouis.site` 的部署教程与执行计划，把项目部署到
`https://feiji.brotherlouis.site`。代码目录 `/var/www/feiji`，数据目录默认放在项目内
`/var/www/feiji/var`。

> 目标服务器：Ubuntu 22.04 x64，IP `8.134.124.55`，在国内。
> 已具备：Node.js 22.23.3、pnpm 12.11.2、pm2 7.0.4、nginx 1.18.0。运行用户：root。
> 代码通过 FinalShell 图形化上传（第 4 节），单文件上限按 100M 配置。

---

## 1. 架构与拓扑

项目后端（Fastify）在**同一个端口**上同时提供 API、媒体文件和生产构建产物，
因此 nginx 只做反向代理，不需要单独配置静态资源目录。

```
浏览器
  └─ https://feiji.brotherlouis.site
       └─ Nginx (80/443, 反代 + 大文件放行)
            └─ 127.0.0.1:3001  ← PM2 运行的 feiji 进程
                 ├─ /            → dist/（vite 构建产物）
                 ├─ /api/*       → Fastify API
                 └─ /media/*     → var/media（图片/视频）
数据：/var/www/feiji/var/journal.sqlite + var/media/
```

关键事实（来自代码，不是猜测）：

- 启动入口 `server/index.ts`，默认 `HOST=127.0.0.1`、`PORT=3001`。
- 静态页与 API 都在 3001，前端用相对路径 `/api`、`/media`，无需配置 `BASE_URL` 或子路径。
- 环境变量**不会自动加载 `.env`**，必须由 PM2 进程环境注入（第 7 节）。
- 上传走 `@fastify/multipart` 流式保存，nginx 默认 `client_max_body_size 1m` 会拦掉视频，必须放行（第 8 节）。
- `sharp` 已在代码里限制并发为 1、缓存 32MB，2GB 小内存机器也能跑。
- 前端 `dist/` 在**本地构建**后上传；服务器只装依赖并用 `tsx` 跑后端源码，不执行 `vite build`。

---

## 2. 前提条件检查

SSH 登录服务器后逐条确认：

```bash
node -v          # 需 >= 22.12.0（engines 要求）
npm -v
pnpm -v          # 若无输出，见第 3 节安装
pm2 -v
nginx -v
whoami           # 已确认为 root
```

> 注意：Ubuntu 22.04 默认 apt 的 node 版本偏老（v12/v18）。如果 `node -v` 不满足，
> 需要先通过 nvm 或 NodeSource 升级到 22.x，再继续。

---

## 3. 服务器准备：pnpm、国内镜像、运行用户

### 3.1 安装 pnpm

项目使用 pnpm（`package.json` 的 `build` 脚本写死 `pnpm run typecheck`，且仓库只有
`pnpm-lock.yaml`）。服务器若没有 pnpm，任选一种方式安装：

```bash
# 方式 A：corepack（Node 22 自带，推荐）
sudo corepack enable
sudo corepack prepare pnpm@latest --activate

# 方式 B：npm 全局安装
sudo npm i -g pnpm
```

### 3.2 配置国内镜像（本服务器在国内，必做）

不配镜像时，`sharp`、`better-sqlite3` 的预编译二进制会从 GitHub 下载，极易卡住或失败。
最省事的做法是**把镜像写进项目的 `.npmrc`**（pnpm 安装时自动读取），代码解压后在项目根目录创建：

```bash
cd /var/www/feiji
cat > .npmrc <<'EOF'
registry=https://registry.npmmirror.com
sharp_binary_host=https://npmmirror.com/mirrors/sharp
sharp_libvips_binary_host=https://npmmirror.com/mirrors/sharp-libvips
better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3
EOF
```

> `.npmrc` 只影响下载来源，不影响运行；下次重新上传代码不会覆盖它。

### 3.3 运行用户（已选定：root）

PM2 的进程列表**按用户隔离**：用什么用户启动，就必须一直用同一用户管理，否则会「看不到进程」。
本计划已选定直接用 `root` 运行（个人小站可接受），后续所有命令都以 root 直接执行，不再切换用户。

> 安全提示：以 root 跑服务需确保服务器只开放 22 / 80 / 443 端口，且应用只监听 127.0.0.1（第 8 节）。

---

## 4. 用 FinalShell 上传（图形化）

先在本地构建出 `dist/`（若本地没装依赖，先 `pnpm install`）：

```powershell
cd C:\Users\丰文\Desktop\feiji
pnpm run build        # 生成 dist/
```

### 服务器先建目录

在 FinalShell 的终端里执行：

```bash
mkdir -p /var/www/feiji
```

### 需要上传的文件（3 个文件夹 + 4 个文件）

用 FinalShell 的 SFTP 面板，把这些内容传到 `/var/www/feiji` 下：

| 类型 | 名称 | 传到服务器的位置 | 作用 |
| --- | --- | --- | --- |
| 文件夹 | `server/` | `/var/www/feiji/server/` | 后端源码，`tsx` 直接运行 |
| 文件夹 | `shared/` | `/var/www/feiji/shared/` | 日期计算（`dates.ts`）与类型（`types.ts`），前后端共用 |
| 文件夹 | `dist/` | `/var/www/feiji/dist/` | 本地构建的前端产物（含 `index.html`、`config.json`、静态资源） |
| 文件 | `package.json` | `/var/www/feiji/package.json` | 依赖清单与启动脚本 |
| 文件 | `pnpm-lock.yaml` | `/var/www/feiji/pnpm-lock.yaml` | 锁定依赖版本，`pnpm install` 依赖它 |
| 文件 | `tsconfig.json` | `/var/www/feiji/tsconfig.json` | 供 `tsx` 读取（保险起见） |
| 文件 | `ecosystem.config.cjs` | `/var/www/feiji/ecosystem.config.cjs` | PM2 启动配置 |

### 不需要上传

`web/`、`public/`、`docs/`、`index.html`、`vite.config.ts`、
`README.md`、`.editorconfig`、`.gitignore`、`.git/`、`node_modules/`、`var/`。

- `web/`、`public/`、`index.html`、`vite.config.ts` 只用于本地构建，产物已合并进 `dist/`。
- `node_modules/` 在服务器用 `pnpm install` 重新安装（原生模块必须匹配 Linux）。
- `var/` 是数据库/媒体，服务器首次运行会自动生成，不要上传本地数据。
- `.npmrc` 不随上传，在服务器上按第 3.2 节创建。

root 上传后文件属主即为 root，运行用户也是 root，无需再改属主。

---

## 5. 服务器安装依赖（无需构建）

前端 `dist/` 已在本地构建并随上传带来，服务器**只装依赖、不执行 `vite build`**。
先确认 `.npmrc` 已按第 3.2 节创建，再安装：

```bash
cd /var/www/feiji
pnpm install          # 安装完整依赖（含 tsx、fastify、sharp、better-sqlite3，运行必需）
```

确认上传的构建产物存在：

```bash
ls dist/index.html dist/config.json
```

先手动跑一次确认能启动（前台，Ctrl+C 退出）：

```bash
cd /var/www/feiji
pnpm start            # 等价于 tsx server/index.ts，默认 127.0.0.1:3001
```

另开一个终端验证：

```bash
curl -I http://127.0.0.1:3001/
curl -s http://127.0.0.1:3001/api/bootstrap | head -c 300
```

---

## 6. 环境变量与数据目录

| 变量 | 推荐值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 只监听本机，由 nginx 反代，避免暴露 |
| `PORT` | `3001` | API 与静态页共用端口 |
| `DATA_DIR` | `/var/www/feiji/var` | 绝对路径，存放 `journal.sqlite` 与 `media/` |
| `MAX_UPLOAD_BYTES` | 可选，建议 `104857600`(100M) | 单个上传字节上限，与 nginx 上限保持一致；代码默认不设该值（受磁盘/网络/代理限制），需在 `ecosystem.config.cjs` 取消注释启用 |

数据目录默认就是项目内 `var/`，与代码同目录，git/上传时都会被忽略，方便整体备份。
若想数据与代码分离，可改成 `/var/www/feiji-data` 并确保该目录可写。

---

## 7. 用 PM2 启动并开机自启

在 `/var/www/feiji/ecosystem.config.cjs` 新建：

```js
module.exports = {
  apps: [
    {
      name: 'feiji',
      cwd: '/var/www/feiji',
      script: 'server/index.ts',
      interpreter: 'node',
      node_args: ['--import', 'tsx'],
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3001',
        DATA_DIR: '/var/www/feiji/var',
        // MAX_UPLOAD_BYTES: '104857600',
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
```

启动并设为开机自启：

```bash
cd /var/www/feiji
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup          # 按提示复制执行它输出的那条 systemd 命令
```

常用运维命令：

| 命令 | 作用 |
| --- | --- |
| `pm2 status` / `pm2 list` | 查看状态 |
| `pm2 logs feiji` | 看日志 |
| `pm2 restart feiji` | 重启 |
| `pm2 stop feiji` / `pm2 delete feiji` | 停止 / 删除 |

> 注意：pnpm 的 `node_modules/.bin/tsx` 是 **shell 脚本 shim**，不能直接交给 `node` 执行，
> 否则会报 `SyntaxError: Invalid or unexpected token`。因此用 `node --import tsx` 启动，
> 而不是把 `.bin/tsx` 当作脚本。

---

## 8. Nginx 反向代理

项目根目录的 `feiji.brotherlouis.site.conf` 是**含 80 跳转 + 443 SSL 的最终配置**（证书需先按第 9 节放好，否则 `nginx -t` 会报找不到证书）。

若还没配证书、只想先验证反代是否通，可先只部署下面这份 80 端口配置：

```nginx
server {
    listen 80;
    server_name feiji.brotherlouis.site;

    # 关键：放行视频等大文件上传（nginx 默认 1m 会返回 413；单文件按 ≤100M）
    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 大文件上传 / 长视频播放的超时
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # 视频与流式上传建议关闭缓冲，避免大文件占满内存/磁盘
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

启用并重载：

```bash
ln -s /etc/nginx/sites-available/feiji.brotherlouis.site.conf /etc/nginx/sites-enabled/feiji.brotherlouis.site.conf
sudo nginx -t
sudo systemctl reload nginx
```

> 说明：项目只用一个端口服务全部内容，所以无需为 `/media`、`/api` 单独写 location，
> 全部反代即可；后端自己处理 SPA history 路由回退和视频 Range。

---

## 9. SSL 证书（阿里云个人测试证书）

阿里云下载的 Nginx 格式含两个文件：
- `feiji.brotherlouis.site.pem`：证书（含中间证书链）
- `feiji.brotherlouis.site.key`：私钥

### 9.1 上传并放置证书

用 FinalShell 把两个文件传到 `/tmp/`，然后：

```bash
mkdir -p /etc/nginx/cert
mv /tmp/feiji.brotherlouis.site.pem /etc/nginx/cert/
mv /tmp/feiji.brotherlouis.site.key /etc/nginx/cert/
chmod 600 /etc/nginx/cert/feiji.brotherlouis.site.key
chmod 644 /etc/nginx/cert/feiji.brotherlouis.site.pem
```

### 9.2 部署最终 nginx 配置（80 跳转 + 443 SSL）

用项目根 `feiji.brotherlouis.site.conf` 覆盖：

```bash
cp /上传路径/feiji.brotherlouis.site.conf /etc/nginx/sites-available/feiji.brotherlouis.site.conf
nginx -t
systemctl reload nginx
```

配置内容（与项目根文件一致）：

```nginx
# HTTP 跳转到 HTTPS
server {
    listen 80;
    server_name feiji.brotherlouis.site;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name feiji.brotherlouis.site;

    ssl_certificate     /etc/nginx/cert/feiji.brotherlouis.site.pem;
    ssl_certificate_key /etc/nginx/cert/feiji.brotherlouis.site.key;

    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

> nginx 1.18 的 HTTP/2 写法是 `listen 443 ssl http2;`，不要用新版语法 `http2 on;`。

### 9.3 验证

```bash
curl -I https://feiji.brotherlouis.site/
openssl s_client -connect feiji.brotherlouis.site:443 -servername feiji.brotherlouis.site </dev/null 2>/dev/null | openssl x509 -noout -dates
```

第二条会输出 `notBefore` / `notAfter`，确认与阿里云证书有效期一致。

### 9.4 证书到期更换（约明年 1 月过期）

阿里云个人测试证书有效期较短（通常 3 个月）且**不会自动续期**，到期前 1~2 周重新申请替换：

1. 登录阿里云「数字证书管理服务」，为同一域名重新申请一张（个人测试证书可反复申请，有额度限制）。
2. 审核通过后下载 **Nginx 格式**，解压得到新的 `.pem` 与 `.key`。
3. **保持文件名不变**，覆盖服务器上的旧文件：

```bash
cp /tmp/feiji.brotherlouis.site.pem /etc/nginx/cert/feiji.brotherlouis.site.pem
cp /tmp/feiji.brotherlouis.site.key /etc/nginx/cert/feiji.brotherlouis.site.key
chmod 600 /etc/nginx/cert/feiji.brotherlouis.site.key
chmod 644 /etc/nginx/cert/feiji.brotherlouis.site.pem
nginx -t
systemctl reload nginx
```

4. 用 9.3 的 `openssl` 命令确认新的到期时间。

> 关键：文件名保持一致，换证只需「覆盖文件 + reload」，不用改 nginx 配置；
> 若新证书文件名不同，改 nginx 里 `ssl_certificate` / `ssl_certificate_key` 两行路径即可。

---

## 10. DNS 解析

在域名 `brotherlouis.site` 的 DNS 服务商处新增一条记录：

| 类型 | 主机记录 | 记录值 | TTL |
| --- | --- | --- | --- |
| A | `feiji` | `8.134.124.55` | 默认（如 600） |

生效后验证：

```bash
ping feiji.brotherlouis.site     # 应解析到 8.134.124.55
```

---

## 11. 上线验证清单

```bash
# 1) 进程与端口
pm2 status
ss -lntp | grep 3001

# 2) 本机后端
curl -I http://127.0.0.1:3001/

# 3) 公网 HTTPS
curl -I https://feiji.brotherlouis.site/
curl -s https://feiji.brotherlouis.site/config.json
```

浏览器端完整验证：

- 打开 `https://feiji.brotherlouis.site`，能加载页面、输入入口口令进入。
- 上传一张图片、一个 MP4 视频，能成功且能回放（验证 nginx 大小限制与 Range）。
- 手机浏览器访问同样域名，完成一次记录同步。
- 重启服务器后 `pm2 status` 显示 `feiji` 自动拉起（验证 `pm2 startup`）。

---

## 12. 更新与回滚

日常更新（新版本代码，手动上传）：

```bash
# 本地：pnpm run build 生成新 dist → FinalShell 重新上传 server/ shared/ dist/ 及变更文件
# 上传覆盖后：
cd /var/www/feiji
pnpm install        # 依赖有变化时才需要；无变化可跳过
pm2 restart feiji
```

回滚要点：

- 数据库结构用 `user_version` 保护，`database.ts` 检测到版本高于应用时会拒绝启动，**不要直接降级覆盖数据**。
- 升级前先备份 `var/`（见第 13 节），出问题可整体回滚代码 + 还原 `var/`。
- 重建 `dist/` 会重新从 `public/config.json` 生成 `config.json`，换口令的持久位置是
  `public/config.json`（改完在本地重新 build），或临时直接改 `dist/config.json`（下次本地 build 会被覆盖）。

---

## 13. 备份

真正需要备份的是 `var/`（数据库 + 媒体），不是代码（代码在本地）。

简单方案：每天凌晨 tar 打包到 `/var/backups/feiji`，保留最近 7 份，cron 执行：

```bash
sudo mkdir -p /var/backups/feiji
```

`/etc/cron.d/feiji-backup`：

```cron
0 3 * * * root tar -czf /var/backups/feiji/feiji-$(date +\%F).tar.gz -C /var/www/feiji var && find /var/backups/feiji -name '*.tar.gz' -mtime +7 -delete
```

更强方案：再把 `/var/backups/feiji` 用 rclone/rsync 同步到对象存储或另一台机器。数据库是 SQLite + WAL，
备份前如需一致性可先 `pm2 stop feiji`（或依赖 `sqlite3 .backup`），二人小站低峰期直接打包即可。

---

## 14. 安全提示

- 该项目目前只有**前端口令校验，不是真正的鉴权**：静态资源可拿到口令、路由守卫可绕过、
  API 与媒体 URL 可直接访问。公网部署前请再次知情确认是否接受这一现状（README 已明确）。
- 不要把真实账户密码填入口令；入口口令在 `public/config.json` 的 `entryPassword`。
- 应用只监听 `127.0.0.1`，避免 3001 端口直接暴露公网。
- 本项目以 root 运行 PM2（第 3.3 节已选定），务必确认服务器只开放 22/80/443 端口。

---

## 15. 常见问题

**`pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS` / `Ignored build scripts: esbuild`**：pnpm 新版本
默认不执行依赖的构建脚本（供应链安全）。交互式批准即可：

```bash
cd /var/www/feiji
pnpm approve-builds     # 空格选中 esbuild，回车确认
pnpm install
```

> 非交互环境可在项目根 `pnpm-workspace.yaml` 写 `onlyBuiltDependencies: [esbuild]` 后重新安装。

**`pnpm install` 很慢 / 下载 sharp、better-sqlite3 二进制失败**：确认第 3.2 节镜像已配置。
若当时漏配，可临时导出后重装：

```bash
export npm_config_sharp_binary_host="https://npmmirror.com/mirrors/sharp"
export npm_config_sharp_libvips_binary_host="https://npmmirror.com/mirrors/sharp-libvips"
export npm_config_better_sqlite3_binary_host="https://npmmirror.com/mirrors/better-sqlite3"
pnpm install
```

**上传视频返回 413**：nginx 的 `client_max_body_size` 没改或太小；若设置了
`MAX_UPLOAD_BYTES`，检查它是否过小（改后 `pm2 restart feiji`）。

**`sharp` 报错 / 图片上传失败**：确认在 Linux 上重新 `pnpm install`，不要复用 Windows/macOS
的 `node_modules`；必要时安装 `build-essential python3` 后重装。

**443 起不来 / 证书失败**：确认 80 端口放行、DNS 已解析到本机，`sudo certbot --nginx` 重试。

**PM2 看不到进程 / 换了用户后丢进程**：PM2 按用户隔离，换用户后进程列表不同。用同一个
用户（第 3.3 节）执行所有 pm2 命令；`pm2 save` 后再 `pm2 resurrect` 可恢复。

---

## 16. 已确认结论

| 项 | 决定 |
| --- | --- |
| 代码上传 | FinalShell 图形化上传（第 4 节） |
| 单文件大小 | ≤ 100M，nginx 与 `MAX_UPLOAD_BYTES` 均按 100M 配置 |
| 服务器网络 | 国内，安装依赖前先配镜像（第 3.2 节） |
| 运行用户 | `root`（已确定） |
| 前端构建 | 本地构建 `dist/` 后上传；服务器不执行 `vite build` |
