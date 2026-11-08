# 开源项目与技术调研

调研日期：2026-09-30（2026-11-08 补充实际选型结果）。用途：为两人使用、Vue 开发、2GB 轻量服务器的恋爱网站选型。

需求更新：用户已选择前端固定口令校验、公历和开始日第 1 天、图片与视频、不提供原片下载、移动端优先兼容 PC；沿用现有阿里云服务器，暂缓容量与备份规划。前端入口不保证私密访问。项目已实现首个可运行版本（v1.2.2），实际选型见第 3 节末尾的「实际选型结果」。以下开源事实保留，原调研涉及认证和备份的能力不代表本项目一期会实现。

## 1. 调研口径与结论

- 优先核对项目仓库、官方文档及 GitHub API，不把转载教程或搜索摘要当作实现证据。
- 本轮是桌面调研：读取公开资料，未克隆、安装、运行候选项目，也未进行代码安全审计或性能测试。
- README 列出的功能属于作者声明，不代表已经实测可用。GitHub 的 `pushed_at` 是最近推送时间，不等于稳定版发布日期或持续维护承诺。
- 许可证标识与实际代码、图片、字体、音乐的授权需要分别核查。不能把“源码能下载”当作“允许任意复制分发”。
- 结论（最终落地）：**自建 Vue 前端和小型 API；日历、图片灯箱与视频播放均为自建组件，未复用候选 UI 库，仅采用 sharp、better-sqlite3 等工具库。成品情侣站主要用于功能与视觉参考。**

## 2. 情侣主题项目

### 2.1 LikeGirl：最贴近主题，但版本来源必须区分

| 项目 | 直接核查结果 |
| --- | --- |
| [Gitee：kiCode111/likegirl-stable](https://gitee.com/kiCode111/likegirl-stable) | README 标注 v5.2.1-Stable、最终版本，并声明自 2024-11-07 起停止功能更新和 bug 修复。页面包含 PHP、JavaScript、CSS、SQL 初始化文件。 |
| 功能 | README 展示恋爱事件、文章、相册、留言板、后台样式配置、相册分页加载、Pjax 音乐连续播放等。未验证是否有“按日期留言”的完整日历模块。 |
| 授权 | Gitee 页面展示 AGPL-3.0 及正文，同时 README 含禁售表述，存在授权措辞冲突。不能把“禁售”当作 AGPL 的标准条款。 |
| [GitHub：Like-Girl/LikeGirl](https://github.com/Like-Girl/LikeGirl) | 页面显示另一份代码，标识 Apache-2.0。**不能把此授权套用到 Gitee 版本，或认定两者代码一致。** |
| 维护核查限制 | GitHub API 对该仓库返回限流；网页正文不足以确证归档状态，因此不采信转载文章的“已归档”断言。 |

**可以参考：** 首页情侣信息、事件清单、留言入口、纪念照片的内容组织。

**不建议直接作为底座：** 不是 Vue 工程；Gitee 版本明确停止维护；默认凭据、私密访问与依赖状态需要审计；跨仓库授权不同。

若以后复制 AGPL 覆盖代码并修改后通过网络提供交互服务，需要评估向远程使用者提供对应源码的义务。这不等于公开照片、日记或密钥。此处不是法律意见；最简单的路线是只参考功能概念、自行设计实现，不复制代码与素材。

### 2.2 DOGOLD/love-space：功能丰富，但明显超出本项目范围

仓库：<https://github.com/DOGOLD/love-space>

- README 声明：Vue 3、Tailwind CSS、Node.js、Express、SQLite3、Multer、JWT；未核实完整源码实现及版本。
- 情侣功能包括绑定关系、恋爱开始日期、纪念日、相册、日记、心愿、音乐；另有农场、宠物等大量游戏功能。
- GitHub API：未归档，最近推送 `2026-05-10T11:15:14Z`。
- README 写 MIT，但 API 未返回 SPDX 许可证标识，网页目录也未见独立授权文件。**本轮不能确认许可证完整性。**
- 部署说明存在需要人工检查的端口一致性、服务运行用户、默认管理员凭据等问题；不是已完成安全评估的成品。

**可以参考：** 双人内容共用、记录入口、主题切换。

**不建议整站移植：** 多用户绑定、管理后台、游戏经济系统都不是当前需求，会增加维护面；Vue 3 的声明不等于适合直接复用的 Vite 组件工程。若复用代码，先补查授权和接口边界。

### 2.3 lovebai/Girl：Go 版情侣站，适合观察轻量部署思路

仓库：<https://github.com/lovebai/Girl>

- README 技术栈：Go、Gin、Gorm、Bootstrap、JavaScript、CSS、HTML；前端 UI 主要来自 Like_Girl V5.1.0。
- 提供后台、安装页面、二进制及容器部署说明；不是 Vue 前端工程。
- GitHub API：未归档，最近推送 `2025-11-02T03:30:56Z`；未返回许可证标识，首页未见完整授权文本。
- 当前读取材料未明确具体数据库，不能仅从 Gorm 或 `data` 目录推断 SQLite。
- 未实测恋爱日历、纪念日等全部目标功能；需进一步读取源码确认。

**可以参考：** 单服务部署、管理端与展示端分离的组织方式。

**不建议作为首选：** 需要切换到 Go 维护后端，前端仍要重写；本项目及上游 UI 授权需分别核实。

### 2.4 Rainbow Cats：适合二期互动灵感，不是网页底座

仓库：<https://github.com/UxxHans/Rainbow-Cats-Personal-WeChat-MiniProgram>

- 原生微信小程序与微信云开发路线，涉及云函数、云数据库、OpenID、模板消息，不是 Vue 网站。
- 核心是任务、对方确认、积分、商品兑换和核销，而非本期日历相册。
- GitHub API：MIT，未归档，最近推送 `2023-08-16T04:15:24Z`。
- README 提及网络图片和商用联系作者；代码许可不能代替素材授权，使用时需替换成自有内容并核查原文。

**可以参考：** 二期愿望清单、一起完成的小目标、可兑换的小礼物。

**不建议移植：** 微信身份和服务依赖不匹配独立域名网站；不要为了参考此项目额外引入云开发平台。

## 3. 真正值得复用的开源组件

| 组件 | 核查依据 | 本项目建议 | 边界 |
| --- | --- | --- | --- |
| [VCalendar](https://github.com/nathanreyes/v-calendar) | 仓库标识 MIT；[安装文档](https://vcalendar.io/getting-started/installation.html)要求 Vue 3.2+，介绍 3.x；README 展示圆点、高亮、条形标记、插槽 | 恋爱日历首选候选。用日期标记展示有记录、生日、纪念日 | 只有日历 UI，不提供日记数据库。安装页仍有 `@next` 示例，实施时核对稳定版、peer dependencies 和维护状态，不照搬可变标签。API 本轮限流，未取得可靠推送日期。 |
| [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe) | API 标识 MIT、未归档，最近推送 `2025-12-04T07:31:46Z`；[官方文档](https://photoswipe.com/getting-started/)说明独立缩略图/大图和 Core 动态加载 | 相册灯箱首选候选，Vue 中薄封装，页面卸载时销毁实例 | 需要预先给出大图宽高；不提供上传和权限。捏合/双击等具体手势在实施时用目标手机验收。本次文档提及 v6 开发中，不据此选未发布版本。 |
| [Swiper](https://github.com/nolimits4web/swiper) | MIT，README 有 Vue 示例、触摸滑动和分页/导航功能 | 只有首页确定需要横滑照片时再加 | 不与 PhotoSwipe 同时承担大图浏览；不是相册后端，不为炫技加载全部特效。 |
| [Day.js](https://day.js.org/docs/en/plugin/timezone) | 官方说明 timezone 依赖 utc，设置默认时区不改变普通 `dayjs()` 行为 | 统一日期和业务时区处理 | 不是农历换算库。年度重复、闰日策略属于业务逻辑。 |
| [sharp](https://sharp.pixelplumbing.com/api-output/) | 官方说明支持 WebP 输出，默认移除包括 EXIF 的元数据；HEIC/HEVC 有额外构建依赖 | 服务端生成缩略图、浏览图，限制处理并发 | 2GB 内存下需测峰值；不可假设普通安装就兼容所有 iPhone HEIC。 |

日历备选：若 VCalendar 的样式或依赖适配成本较高，自写仅“月视图＋日期标记”的 Vue 组件。必须保留键盘导航、正确周起始日与日期运算测试。没有排班、资源调度需求，不引入大型专业排程组件。

### 实际选型结果（2026-11-08）

首个可运行版本（v1.2.2）实际采用：Vue 3、TypeScript、Vite、Vue Router、Fastify 5、better-sqlite3、sharp、lucide-vue-next（图标）、@fastify/multipart、@fastify/static、tsx。**未采用** VCalendar、PhotoSwipe、Swiper、Day.js：月历、图片灯箱与日期计算分别由自建 Vue 组件、原生 `video` 和原生 Intl/纯日期函数（`shared/dates.ts`）实现。本表保留为选型历史依据。

## 4. 后端路线比较

| 路线 | 优点 | 代价与限制 | 本项目判断 |
| --- | --- | --- | --- |
| 静态 Vue＋JSON/Markdown | 部署极简；无业务后端 | 浏览器不能直接持久化到服务器；两人手机留言和上传需额外后台；前端密码不是访问控制 | 不满足主要使用方式，除非改成由开发者手动更新内容 |
| **Vue＋Node.js/Fastify＋SQLite** | 全栈 JS/TS；双人记录模型简单；单机媒体存储直观 | 自己实现 CRUD、媒体接口和迁移；原生依赖需匹配部署平台。按最新范围不做后端会话，暂缓备份 | **首选建议，技术栈待确认；前端密码已确认** |
| Vue＋PocketBase | 单可执行文件，带 SQLite、管理后台、认证、文件管理及 API，少写 CRUD | 原生账户认证不完全等同于昵称选择＋一个固定密码；适配会增加规则/钩子；1.0 前兼容性有警告 | 若优先最快做出后台，可选，不与自建 API 混搭起步 |
| Vue＋托管 BaaS | 减少一部分服务器维护 | 额外平台账号、访问链路、配额与费用；现有服务器未充分利用；共享密码需求仍需处理 | 本轮不推荐，不连接任何服务 |
| Nuxt 全栈 | 同栈 API 和路由整合方便 | 面向两人、不以搜索收录为目标，SSR 对本期收益有限 | 熟悉 Nuxt 时也可选，但不为此迁移学习成本 |

### PocketBase 核查补充

来源：[官方仓库](https://github.com/pocketbase/pocketbase)、[生产部署文档](https://pocketbase.io/docs/going-to-production/)。

- API 许可证 MIT，未归档，最近推送 `2026-09-28T19:09:36Z`。
- README 明确 1.0 前不保证完整向后兼容。所读材料不足以确认其他“关键生产用途”警告的现行完整措辞，不虚构引用。
- 官方生产文档没有给出最低内存；`GOMEMLIMIT=512MiB` 是软内存限制示例，不是“512MB 必定够用”的容量承诺。
- 内置备份包含本地上传文件，不包含 S3 存储的上传文件；备份文件可以另外存到 S3，这是不同概念。
- 没有官方 Docker 镜像；若采用容器，应自行固定版本构建并正确持久化。
- “软件轻量”不能保证内容不丢失；异机备份与恢复演练是一般性技术建议。用户已决定暂缓备份，本项目一期不实现，也不承诺恢复能力。

## 5. 官方实现资料索引

| 编号 | 来源 | 用于哪些判断 |
| --- | --- | --- |
| S1 | [Vite Guide](https://vite.dev/guide/) | Vue/TS 模板、静态构建、页面列出的 Node 20.19+ / 22.12+ 要求；当前本机 Node 22.23.1 满足此门槛，实施时仍查目标版本 engines。 |
| S2 | [Fastify LTS](https://fastify.dev/docs/latest/Reference/LTS/) | Fastify 5 的 Node 22 支持；所有插件还需单独核对兼容矩阵。 |
| S3 | [SQLite Online Backup API](https://www.sqlite.org/backup.html) | 在线一致性备份，不能直接复制正在写入的数据库当作可靠备份。 |
| S4 | [sharp Output options](https://sharp.pixelplumbing.com/api-output/) | WebP、元数据默认移除、HEIC 依赖限制。 |
| S5 | [Day.js Timezone](https://day.js.org/docs/en/plugin/timezone) | 显式时区、UTC 插件依赖、默认时区的行为。 |
| S6 | [PhotoSwipe Getting Started](https://photoswipe.com/getting-started/) | 图像尺寸、动态加载、缩略图和大图分离。 |
| S7 | [VCalendar Installation](https://vcalendar.io/getting-started/installation.html) | Vue 3 支持和版本安装注意事项。 |
| S8 | [PocketBase Going to production](https://pocketbase.io/docs/going-to-production/) | 部署、备份覆盖范围、内存限制语义。 |

## 6. 不确定性与复查清单

1. 开始编码时再锁定依赖精确版本和锁文件，不把调研当日页面示例当作永久兼容组合。
2. 本轮 GitHub API 部分请求受到共享出口限流。无许可证字段代表本次未检测到，不等于法律意义上的“绝对没有授权”。
3. 没有通过 star 数判断质量；没有测试仓库安装成功率、漏洞或实际运行内存。
4. 正式选用任何现成代码时，查看所选 commit 的 LICENSE、依赖和素材，不跨分支、跨镜像套用授权。
5. 服务器系统、架构、剩余磁盘、带宽和已有服务未知，因此没有承诺固定吞吐量、运行内存或零额外费用。
6. 所有页面均于调研时访问；网页动态变化、缓存与信息省略可能影响结果，后续以最终锁定版本复核。

## 7. 视频支持补充调研（2026-09-30）

根据用户补充，视频纳入一期；不提供原片下载，暂不做容量或扩容规划。

| 官方来源 | 核查结论 | 实施建议 |
| --- | --- | --- |
| [MDN Web video codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs) | 容器和编码不是同一回事；MP4 可封装不同视频编码。H.264＋AAC 是广泛兼容目标，HEVC 和特殊编码规格依赖具体设备/系统 | 先用双方手机样片验证 MP4/H.264/AAC 或无音轨视频；检查真实媒体信息，不仅看后缀；不能承诺不转码播放任意原片 |
| [MDN HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests) | Range 请求按字节获取部分内容；支持时返回 206 和 Content-Range，无可满足范围时返回 416。服务端也可能忽略范围而返回完整 200 | 使用标准文件服务实现视频读取，实测拖动、HEAD、区间长度和错误响应，不把整段视频读入内存 |

- 播放器建议用原生 `video`，提供 controls 和 playsinline，手动开始播放；列表只展示封面或占位，不批量加载完整视频。
- PhotoSwipe 用于图片灯箱，sharp 用于图片处理，二者都不是现成的视频处理后端。
- 不预先引入 HLS、自适应清晰度、转码集群或商业视频服务；不兼容时提供导出为兼容格式的提示，而非原片下载兜底。
- “不提供下载按钮”不等于禁止保存，浏览器播放必然接收媒体数据；前端入口密码也不能保护直接媒体请求。
- “不考虑大小”是暂缓产品配额与容量设计，不是忽略服务端/代理默认限额、超时、内存和磁盘异常。
- 本补充仍为官方文档调研，未上传或测试真实视频文件。
