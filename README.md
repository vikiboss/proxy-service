# Viki 的 Proxy 服务

## 使用方法

将需要代理的链接的 `host` 换成 `proxy.viki.moe`，并加上 `proxy-host` 参数即可。

```diff
- https://example.com/path/to/page?param=value
+ https://proxy.viki.moe/path/to/page?param=value&proxy-host=example.com
```

## 参数选项

同时支持 URL `searchParams` 和自定义 `headers`，**任选其一**设置即可。

- `proxy-host` 需要代理的 `host`
- `proxy-protocol` 协议，默认 `https`，可空
- `proxy-port` 端口，HTTPS 默认为 `443`，可空

## 举例

比如某哈游的原神卡池数据：

```plain
https://proxy.viki.moe/hk4e/gacha_info/cn_gf01/gacha/list.json?proxy-host=webstatic.mihoyo.com
```

以上链接将 `webstatic.mihoyo.com` 换成了 `proxy.viki.moe`，并添加 `proxy-host` 指明了原来的 `host`。

写这玩意完全是为了应付公司对部分域名的屏蔽策略（逃
