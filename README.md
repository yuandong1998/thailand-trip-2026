# 慢游泰国

2026 年 9 月 29 日至 10 月 8 日，6 人的旅行手册。城市顺序为曼谷 → 芭堤雅 → 清迈。各城市停留日期和每日活动由旅行者填写，不预设景点。

## 功能

- 每日行程：选择城市，添加、编辑、删除时间 / 地点 / 停留时长 / 交通 / 备注。
- 三城真实天气：Open-Meteo，无 API Key；最多获取未来 16 天，优先显示旅行日期范围，范围外显示最近 7 天，按停留日期标记旅行日。失败时显示明确状态，不使用虚构数据。
- 路程：城际参考与 Google Maps 导航；连续两个有地址的安排可查询两站路线。
- 行李清单：28 件初始物品、自定义物品、进度、尚未准备筛选。
- JSON 导入导出、打印完整行程、本地自动保存。
- 手机、平板和电脑布局；键盘操作与表单标签。

机票和酒店已预订，具体信息待补充。

## 本地查看

无需安装依赖：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

访问 `http://127.0.0.1:4173/`。不要用 file:// 打开，以保证浏览器存储和网络请求行为一致。

## 发布到 GitHub Pages

本项目使用 GitHub Pages 内置的分支发布。将本目录内容上传至 GitHub 仓库根目录，进入 Settings → Pages → Build and deployment → Deploy from a branch，选 `main` 与 `/(root)`。根目录 `.nojekyll` 已包含，无需安装依赖或自定义构建工作流。提交更新后 GitHub 自动重新发布。

资源使用相对路径，可部署到 `https://用户名.github.io/仓库名/`。

## 数据保存与分享

这是无后端的静态网页。修改保存到当前网站域名下的浏览器 localStorage；不自动写入 GitHub，也不会在六个人或多设备之间实时同步。

在「每日行程」导出 JSON 进行备份或发给同行人，其他人可以在相同网页导入。导入前会提示替换当前数据。清理浏览器数据、隐私模式或更换网址可能导致本地数据不可用，请保留导出文件。日程中如填写了私人信息，分享前自行检查。

## 内容与照片来源

交通时间仅为规划参考，非实时路况或已订安排。公开网页不含酒店地址、航班号和个人证件信息。

- 天气：[Open-Meteo](https://open-meteo.com/)，CC BY 4.0。
- 曼谷—芭堤雅距离：[泰国旅游局](https://www.tourismthailand.org/Destinations/Provinces/Pattaya/469)。
- 曼谷—清迈航线：[泰国航空](https://www.thaiairways.com/flights/en-th/flights-from-bangkok-to-chiang-mai)。
- 曼谷照片：[Wat Arun Sunset](https://commons.wikimedia.org/wiki/File:Wat_Arun_Sunset.jpg)，miketnorton，[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)。
- 芭堤雅照片：[Pattaya Beach, Thailand](https://commons.wikimedia.org/wiki/File:Pattaya_Beach,_Thailand.jpg)，© Vyacheslav Argenberg，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。
- 清迈照片：[Doi Suthep Temple Chiang Mai Thailand](https://commons.wikimedia.org/wiki/File:Doi_Suthep_Temple_Chiang_Mai_Thailand.jpg)，Philip Nalangan，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

照片已缩放，并在界面中裁切显示。照片本地托管，天气、Google Fonts 与地图导航需要联网。
