# dondone tools

一组轻量的浏览器端工具。所有计算均在本地完成，不上传用户输入的数据。

## 功能

- 加密与签名：AES、Server JWT Token、Client Sign
- 哈希计算：MD5、SHA-2、SHA-3、BLAKE、xxHash3
- 编码转换：Base64、Base64 Image、Base58、QR Code
- 安全检查：Password Strength
- 文本与生成：String Length、Ugly Avatar

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Vitest

## 本地开发

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
pnpm test:run
pnpm build
pnpm lint
```

## 数据说明

密码强度检测使用 SecLists `10k-most-common.txt` 与 SplashData 年度弱密码榜单作为本地弱密码库。数据随前端资源一起加载，仅用于浏览器内匹配。

## 隐私

本项目不包含后端服务。工具输入、文件处理和密码检测均在浏览器本地执行。
