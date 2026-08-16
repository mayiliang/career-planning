# Google Cloud 台湾双线路私人 VPN 搭建与排障手册

更新时间：2026-08-11

本文记录一套面向 Windows 的私人网络方案：Google Cloud 台湾虚拟机同时运行 Hysteria 2 和 Xray，Windows 使用 Clash Verge Rev/Mihomo 的 TUN 模式完成系统级分流。

最终目标：

- 中国大陆网站和私有网络直接连接。
- GitHub、YouTube、Netflix 等外部服务从台湾服务器访问。
- 浏览器、命令行、桌面客户端和支持 TUN 的游戏统一接管。
- Hysteria 2 作为高性能主线路，并通过 UDP 端口跳跃降低单端口失效的影响。
- VLESS Reality TCP 443 作为可靠回退线路。
- 配置中不依赖固定的 Windows 网卡名称，避免更换网络后失效。

本文仅用于管理自己拥有或获准使用的设备和云资源。使用前请确认符合所在地法律、Google Cloud 服务条款及目标服务条款。

## 版本基线

本文配置在以下组合上完成实测：

| 组件 | 实测版本或环境 |
| --- | --- |
| 服务端系统 | Ubuntu 24.04 LTS x86_64 |
| Xray | 26.3.27 |
| Hysteria 2 | 2.12.1 |
| Clash Verge Rev | 2.5.2，服务模式 |
| 客户端系统 | Windows 11 |

后续版本可能调整字段名称和默认值。升级前先查阅文末官方资料，并保留已验证配置。特别是 Xray Reality 的 `target`、密钥输出标签以及 Mihomo 的代理字段，不能盲目套用旧版教程。

## 快速导航

- 第 1～4 节：方案选择、云主机和防火墙。
- 第 5～7 节：Ubuntu、Xray、Hysteria 2。
- 第 8～10 节：下载私密片段、组合 Mihomo、导入 Clash。
- 第 11～13 节：验收、运维和故障恢复。
- 第 14 节：26 个常见问题。
- 第 15～17 节：安全清单、最终验收、官方资料。

## 1. 为什么最终采用双线路

本次搭建经历了四个阶段：

1. 新加坡 WireGuard 可以工作，但大陆到新加坡的往返延迟约 246～259 ms，网页 TLS 握手明显迟缓。
2. 台湾 WireGuard 把往返延迟降至约 47～48 ms，吞吐也显著提高；但固定 UDP 51820 和后来更换的 UDP 443 都曾被运营商逐个限制。
3. VLESS Reality + XTLS Vision 使用 TCP 443，稳定性较好，实测下载约 15.8 MiB/s，作为回退线路很合适。
4. Hysteria 2 使用 UDP、BBR 和端口跳跃，实测下载约 22.3 MiB/s，GitHub 平均总耗时约 0.47 秒，最终成为主线路。

最终结构如下：

```text
Windows 应用
    |
    v
Clash Verge Rev / Mihomo TUN
    |
    +-- 中国域名、CN IP、局域网 ------> DIRECT
    |
    +-- 普通外网 --------------------> PROXY-AUTO
    |                                  1. Hysteria 2 UDP 端口跳跃
    |                                  2. Xray Reality TCP 443
    |
    +-- 外国 UDP --------------------> UDP-AUTO
    |                                  1. Hysteria 2
    |                                  2. Xray XUDP
    |
    +-- YouTube / Netflix -----------> STREAMING-AUTO
                                       1. Hysteria 2
                                       2. Xray Reality
```

WireGuard 并不是不安全，而是它的固定 UDP 流量特征和固定端口在本次网络环境中不够耐用。旧 WireGuard 可保留为实验或内网工具，但不再作为默认公网入口。

## 2. 需要准备的内容

### 2.1 云端

- 一个启用结算的 Google Cloud 项目。
- 一台位于台湾区域的 Compute Engine 虚拟机。
- Ubuntu 24.04 LTS x86_64。
- 一个静态外部 IPv4 地址。
- 至少 2 vCPU；本次使用 `e2-standard-2`。

Google Cloud 的虚拟机带宽上限与机器系列、vCPU、流量目标、包大小和网络拥塞有关，标称上限不是实际速度保证。不要仅靠升级 CPU 猜测速度，应先测试线路。[Google Cloud 网络带宽说明](https://docs.cloud.google.com/compute/docs/network-bandwidth)

### 2.2 Windows 客户端

- Windows 10/11。
- Clash Verge Rev，已安装服务模式。
- OpenSSH Client，用于 `ssh.exe` 和 `scp.exe`。
- 一个仅保存在本机的 SSH 私钥。
- 一个只存放私密配置的目录，例如：

```text
E:\vpn-private
```

不要把该目录同步到 Git、网盘、聊天软件或截图中。

### 2.3 建议的应急访问

在新线路完全验证前，保留一条独立的管理通道，例如已有商业代理、IAP SSH 或 Google Cloud 串行控制台。不要在唯一管理通道尚未确认回退能力时关闭旧线路。

## 3. 创建 Google Cloud 虚拟机

在 Compute Engine 中创建实例：

| 项目 | 推荐值 |
| --- | --- |
| 区域 | 台湾区域中从本地实测延迟最低者 |
| 系统 | Ubuntu 24.04 LTS |
| 机器类型 | `e2-standard-2` 起步 |
| 启动盘 | 20 GB balanced persistent disk |
| 外部 IPv4 | 静态区域地址 |
| 网络层级 | Premium |
| IP 栈 | IPv4 即可 |

静态地址能避免关机或重建后客户端入口变化。Google Cloud 支持为实例绑定预留的区域静态 IPv4。[静态外部 IP 官方说明](https://docs.cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address)

创建完成后，在 Windows 直连测试：

```powershell
$ServerIp = "<SERVER_IPV4>"

ping.exe -n 20 $ServerIp
tracert.exe -d -h 8 $ServerIp
```

延迟主要取决于本地运营商、时间段、跨境路由和区域，不是“台湾”三个字就一定更快。必要时先创建临时实例测试不同可用区，再决定保留哪台。

## 4. 配置 Google Cloud 防火墙

给虚拟机添加网络标记：

```text
vpn-tw
```

创建以下入站规则：

| 名称 | 目标标记 | 来源 | 协议和端口 | 用途 |
| --- | --- | --- | --- | --- |
| `allow-vpn-reality-443` | `vpn-tw` | `0.0.0.0/0` | TCP 443 | Xray Reality |
| `allow-vpn-hy2-hop` | `vpn-tw` | `0.0.0.0/0` | UDP 24000-24100 | Hysteria 2 端口跳跃 |

SSH 22 不建议无条件向全网开放。可以限制为自己的公网 IP、使用 IAP，或至少使用公钥认证并关闭密码登录。

网络标记能让规则只应用到指定虚拟机，而不是整个 VPC。[Google Cloud VPC 防火墙规则](https://docs.cloud.google.com/firewall/docs/using-firewalls)

不要继续保留已经不用的测试规则，例如 TCP 8443、UDP 51820 或 UDP 443。删除规则前先确认相应服务确实不再依赖它。

## 5. 初始化 Ubuntu

连接服务器：

```bash
ssh -i /path/to/private_key <LINUX_USER>@<SERVER_IPV4>
```

更新系统并安装基础工具：

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl jq openssl nftables ca-certificates
```

确认时钟正常。Reality 对客户端时间有容忍范围，但严重的系统时间错误仍会导致握手失败：

```bash
timedatectl status
systemctl is-active systemd-timesyncd
```

### 5.1 启用内核 BBR 和 FQ

这主要改善 Xray TCP 线路；Hysteria 2 还有自己的用户态拥塞控制。

```bash
sudo tee /etc/sysctl.d/99-vpn-network.conf >/dev/null <<'EOF'
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
EOF

sudo sysctl --system
sysctl net.core.default_qdisc
sysctl net.ipv4.tcp_congestion_control
```

预期：

```text
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
```

## 6. 部署 Xray Reality TCP 443

Xray 是回退线路。即使运营商限制 UDP，TCP 443 仍可能继续工作。

### 6.1 安装 Xray

使用 XTLS 官方安装脚本：

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

默认文件位置：

```text
/usr/local/bin/xray
/usr/local/etc/xray/config.json
/etc/systemd/system/xray.service
```

官方脚本和文件布局见 [XTLS/Xray-install](https://github.com/XTLS/Xray-install)。

### 6.2 生成 Reality 参数并写入配置

下面的脚本会：

- 生成 VLESS UUID。
- 生成 Reality X25519 密钥对。
- 生成 16 位十六进制 Short ID。
- 写入服务端配置。
- 在登录用户主目录生成 Mihomo 客户端片段。

先把脚本开头的两个值替换成自己的信息。生成的客户端文件包含凭据，不要输出到聊天中。

```bash
sudo bash <<'XRAY_SETUP'
set -euo pipefail

SERVER_IP="<SERVER_IPV4>"
CLIENT_USER="<LINUX_USER>"
CLIENT_HOME="$(getent passwd "$CLIENT_USER" | cut -d: -f6)"

UUID="$(/usr/local/bin/xray uuid)"
SHORT_ID="$(openssl rand -hex 8)"
XRAY_KEYS="$(/usr/local/bin/xray x25519 2>&1)"

REALITY_PRIVATE="$(
  printf '%s\n' "$XRAY_KEYS" |
  awk -F: '
    tolower($1) ~ /^[[:space:]]*privatekey[[:space:]]*$/ {
      value=substr($0, index($0, ":") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      print value
      exit
    }
  '
)"

REALITY_PUBLIC="$(
  printf '%s\n' "$XRAY_KEYS" |
  awk -F: '
    tolower($1) ~ /publickey/ {
      value=substr($0, index($0, ":") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      print value
      exit
    }
  '
)"

test "${#UUID}" -eq 36
test "${#REALITY_PRIVATE}" -eq 43
test "${#REALITY_PUBLIC}" -eq 43
test "${#SHORT_ID}" -eq 16

if [ -f /usr/local/etc/xray/config.json ]; then
  cp -a /usr/local/etc/xray/config.json \
    "/usr/local/etc/xray/config.json.backup.$(date +%Y%m%d-%H%M%S)"
fi

cat > /usr/local/etc/xray/config.json <<CONFIG
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "tag": "vless-reality-in",
      "listen": "0.0.0.0",
      "port": 443,
      "protocol": "vless",
      "settings": {
        "users": [
          {
            "id": "${UUID}",
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "target": "www.bing.com:443",
          "xver": 0,
          "serverNames": [
            "www.bing.com"
          ],
          "privateKey": "${REALITY_PRIVATE}",
          "shortIds": [
            "${SHORT_ID}"
          ]
        }
      }
    }
  ],
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom"
    },
    {
      "tag": "block",
      "protocol": "blackhole"
    }
  ]
}
CONFIG

chown root:nogroup /usr/local/etc/xray/config.json
chmod 640 /usr/local/etc/xray/config.json

umask 077
cat > "${CLIENT_HOME}/vless-reality-mihomo.yaml" <<CLIENT
proxies:
  - name: "VLESS-TW-443"
    type: vless
    server: "${SERVER_IP}"
    port: 443
    uuid: "${UUID}"
    network: tcp
    udp: true
    tls: true
    servername: "www.bing.com"
    client-fingerprint: chrome
    flow: xtls-rprx-vision
    packet-encoding: xudp
    reality-opts:
      public-key: "${REALITY_PUBLIC}"
      short-id: "${SHORT_ID}"
    encryption: ""
CLIENT

chown "${CLIENT_USER}:${CLIENT_USER}" \
  "${CLIENT_HOME}/vless-reality-mihomo.yaml"
chmod 600 "${CLIENT_HOME}/vless-reality-mihomo.yaml"
XRAY_SETUP
```

Reality 当前服务端字段推荐使用 `target`；旧字段 `dest` 仍是别名。`serverNames` 通常应与目标证书可接受的 SNI 一致。[Xray Reality 配置参考](https://xtls.github.io/en/config/transports/reality.html)

Reality 会把未通过认证的连接转发到 `target`。选择目标前应用 `xray tls ping <DOMAIN>` 检查兼容性，避免随意使用可能让服务器变成公共 CDN 转发器的目标。官方文档建议优先考虑同 ASN 的合适目标；如果使用不同目标，必须重新同步服务端 `target`、`serverNames` 和客户端 `servername`。

### 6.3 检查并启动 Xray

```bash
sudo /usr/local/bin/xray run \
  -test \
  -config /usr/local/etc/xray/config.json

sudo systemctl enable xray
sudo systemctl restart xray

sudo systemctl is-active xray
sudo ss -ltnp '( sport = :443 )'
sudo journalctl -u xray -n 30 --no-pager
```

预期配置检查为 `Configuration OK`，服务为 `active`，TCP 443 由 Xray 监听。

## 7. 部署 Hysteria 2 UDP 端口跳跃

Hysteria 2 是高性能主线路。端口跳跃用于缓解“运营商只限制某一个持续 UDP 端口”的情况；如果运营商限制全部 UDP 或服务器 IP，端口跳跃无效，届时由 Xray 回退。[Hysteria 2 端口跳跃说明](https://v2.hysteria.network/docs/advanced/Port-Hopping/)

### 7.1 安装 Hysteria 2

```bash
sudo apt-get install -y curl openssl nftables
HYSTERIA_USER=root bash <(curl -fsSL https://get.hy2.sh/)
```

使用 root 是因为 Hysteria 的内置端口范围需要修改 nftables/iptables。更严格的环境可以改用专用用户加 `CAP_NET_ADMIN`。官方脚本说明见 [Hysteria 2 Server Installation Script](https://v2.hysteria.network/docs/getting-started/Server-Installation-Script/)。

### 7.2 生成证书、密码和配置

先替换脚本开头的服务器 IP 和登录用户名：

```bash
sudo bash <<'HY2_SETUP'
set -euo pipefail

SERVER_IP="<SERVER_IPV4>"
CLIENT_USER="<LINUX_USER>"
CLIENT_HOME="$(getent passwd "$CLIENT_USER" | cut -d: -f6)"

install -d -m 700 /etc/hysteria/certs

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -sha256 \
  -days 3650 \
  -keyout /etc/hysteria/certs/server.key \
  -out /etc/hysteria/certs/server.crt \
  -subj "/CN=hy2.tw.private" \
  -addext "subjectAltName=DNS:hy2.tw.private,IP:${SERVER_IP}" \
  >/dev/null 2>&1

chmod 600 /etc/hysteria/certs/server.key
chmod 644 /etc/hysteria/certs/server.crt

AUTH_PASSWORD="$(openssl rand -hex 32)"
OBFS_PASSWORD="$(openssl rand -hex 32)"

if [ -f /etc/hysteria/config.yaml ]; then
  cp -a /etc/hysteria/config.yaml \
    "/etc/hysteria/config.yaml.backup.$(date +%Y%m%d-%H%M%S)"
fi

umask 077
cat > /etc/hysteria/config.yaml <<CONFIG
listen: :24000-24100

tls:
  cert: /etc/hysteria/certs/server.crt
  key: /etc/hysteria/certs/server.key
  sniGuard: strict

obfs:
  type: salamander
  salamander:
    password: "${OBFS_PASSWORD}"

auth:
  type: password
  password: "${AUTH_PASSWORD}"

congestion:
  type: bbr
  bbrProfile: standard

speedTest: false
disableUDP: false
udpIdleTimeout: 60s
CONFIG

CERT_FINGERPRINT="$(
  openssl x509 \
    -noout \
    -fingerprint \
    -sha256 \
    -in /etc/hysteria/certs/server.crt |
  cut -d= -f2
)"

cat > "${CLIENT_HOME}/hysteria2-mihomo.yaml" <<CLIENT
proxies:
  - name: "HY2-TW-HOP"
    type: hysteria2
    server: "${SERVER_IP}"
    port: 24000
    ports: "24000-24100"
    hop-interval: "15-30"
    password: "${AUTH_PASSWORD}"
    bbr-profile: standard
    obfs: salamander
    obfs-password: "${OBFS_PASSWORD}"
    sni: hy2.tw.private
    skip-cert-verify: true
    fingerprint: "${CERT_FINGERPRINT}"
    alpn:
      - h3
    ip-version: ipv4
CLIENT

chown "${CLIENT_USER}:${CLIENT_USER}" \
  "${CLIENT_HOME}/hysteria2-mihomo.yaml"
chmod 600 "${CLIENT_HOME}/hysteria2-mihomo.yaml"

systemctl daemon-reload
systemctl enable --now hysteria-server.service
systemctl restart hysteria-server.service
HY2_SETUP
```

虽然客户端对自签名证书使用了 `skip-cert-verify: true`，但同时使用 SHA-256 `fingerprint` 固定证书，不能删除该指纹字段。Mihomo 的 Hysteria 2 节点字段见 [官方配置文档](https://wiki.metacubex.one/en/config/proxies/hysteria2/)。

### 7.3 验证 Hysteria 服务端

```bash
hysteria version
sudo systemctl is-active hysteria-server.service
sudo systemctl is-enabled hysteria-server.service
sudo ss -lunp | grep 24000
sudo nft list ruleset | grep -E '24000|24100|hysteria'
sudo ufw status
sudo journalctl -u hysteria-server.service -n 30 --no-pager
```

正常情况下：

- 服务为 `active`、`enabled`。
- UDP 24000 正在监听。
- nftables 中存在 `24001-24100` 重定向到 `24000` 的规则。
- 日志显示 `server up and running`。

## 8. 安全下载客户端片段

在 Windows PowerShell 中：

```powershell
$VpnDir = "E:\vpn-private"
$ServerIp = "<SERVER_IPV4>"
$LinuxUser = "<LINUX_USER>"
$SshKey = "<PATH_TO_SSH_PRIVATE_KEY>"

New-Item -ItemType Directory -Force -Path $VpnDir | Out-Null

if (-not (Test-Path -LiteralPath $SshKey)) {
    throw "SSH 私钥不存在"
}

scp.exe -i $SshKey -o IdentitiesOnly=yes `
  "${LinuxUser}@${ServerIp}:/home/${LinuxUser}/vless-reality-mihomo.yaml" `
  "$VpnDir\vless-reality-mihomo.yaml"

scp.exe -i $SshKey -o IdentitiesOnly=yes `
  "${LinuxUser}@${ServerIp}:/home/${LinuxUser}/hysteria2-mihomo.yaml" `
  "$VpnDir\hysteria2-mihomo.yaml"

Get-Item `
  "$VpnDir\vless-reality-mihomo.yaml", `
  "$VpnDir\hysteria2-mihomo.yaml" |
  Select-Object FullName, Length, LastWriteTime
```

不要使用 `Get-Content` 把文件内容复制到聊天或终端日志。

## 9. 组合 Mihomo 完整配置

将下面模板保存到私密目录，例如：

```text
E:\vpn-private\mihomo-tw-hy2-auto.yaml
```

替换所有尖括号占位符。Xray 和 Hysteria 节点值来自前面下载的两个片段。

```yaml
# 私密文件：包含 UUID、Reality 公钥、认证密码和证书指纹。
mixed-port: 7897
allow-lan: false
mode: rule
log-level: warning
ipv6: false
find-process-mode: strict
unified-delay: true
tcp-concurrent: true
keep-alive-interval: 15
keep-alive-idle: 15

profile:
  store-selected: true
  store-fake-ip: true

geodata-mode: true
geo-auto-update: true
geo-update-interval: 24

tun:
  # 第一次导入时保持关闭，验证本地代理后再从 UI 打开。
  enable: false
  stack: mixed
  auto-route: true
  auto-detect-interface: true
  strict-route: true
  mtu: 1380
  endpoint-independent-nat: false
  dns-hijack:
    - any:53
    - tcp://any:53
  route-exclude-address:
    - 10.0.0.0/8
    - 172.16.0.0/12
    - 192.168.0.0/16
    - 100.64.0.0/10

dns:
  enable: true
  cache-algorithm: arc
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  use-hosts: true
  use-system-hosts: true
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  proxy-server-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver-policy:
    "geosite:cn,private":
      - "https://dns.alidns.com/dns-query#DIRECT"
      - "https://doh.pub/dns-query#DIRECT"
  nameserver:
    - "https://1.1.1.1/dns-query#PROXY"
    - "https://8.8.8.8/dns-query#PROXY"
  direct-nameserver:
    - "https://dns.alidns.com/dns-query#DIRECT"
    - "https://doh.pub/dns-query#DIRECT"
  direct-nameserver-follow-policy: true
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - localhost
    - "+.msftconnecttest.com"
    - "+.msftncsi.com"

proxies:
  - name: VLESS-TW-443
    type: vless
    server: "<SERVER_IPV4>"
    port: 443
    uuid: "<VLESS_UUID>"
    network: tcp
    udp: true
    tls: true
    servername: "www.bing.com"
    client-fingerprint: chrome
    flow: xtls-rprx-vision
    packet-encoding: xudp
    reality-opts:
      public-key: "<REALITY_PUBLIC_KEY>"
      short-id: "<REALITY_SHORT_ID>"
    encryption: ""

  - name: HY2-TW-HOP
    type: hysteria2
    server: "<SERVER_IPV4>"
    port: 24000
    ports: "24000-24100"
    hop-interval: "15-30"
    password: "<HY2_AUTH_PASSWORD>"
    bbr-profile: standard
    obfs: salamander
    obfs-password: "<HY2_OBFS_PASSWORD>"
    sni: hy2.tw.private
    skip-cert-verify: true
    fingerprint: "<CERT_SHA256_FINGERPRINT>"
    alpn:
      - h3
    ip-version: ipv4

proxy-groups:
  - name: PROXY-AUTO
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 120
    timeout: 5000
    lazy: false
    proxies:
      - HY2-TW-HOP
      - VLESS-TW-443

  - name: PROXY
    type: select
    proxies:
      - PROXY-AUTO
      - HY2-TW-HOP
      - VLESS-TW-443
      - DIRECT

  - name: UDP-AUTO
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 120
    timeout: 5000
    lazy: false
    proxies:
      - HY2-TW-HOP
      - VLESS-TW-443

  - name: UDP-PROXY
    type: select
    proxies:
      - UDP-AUTO
      - HY2-TW-HOP
      - VLESS-TW-443
      - DIRECT

  - name: STREAMING-AUTO
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    proxies:
      - HY2-TW-HOP
      - VLESS-TW-443

  - name: NETFLIX
    type: select
    proxies:
      - STREAMING-AUTO
      - HY2-TW-HOP
      - VLESS-TW-443

rules:
  # 必须位于代理规则之前，防止 TUN 把代理服务器连接再次送进代理。
  - IP-CIDR,<SERVER_IPV4>/32,DIRECT,no-resolve

  - IP-CIDR,0.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,100.64.0.0/10,DIRECT,no-resolve
  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,169.254.0.0/16,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - GEOSITE,private,DIRECT
  - GEOSITE,youtube,STREAMING-AUTO
  - GEOSITE,netflix,NETFLIX
  - GEOSITE,cn,DIRECT
  - GEOIP,CN,DIRECT,no-resolve
  - NETWORK,udp,UDP-PROXY
  - MATCH,PROXY
```

不要添加固定的 `interface-name`。Mihomo 的 `auto-detect-interface` 会自动寻找真实出站网卡；固定成某个中文网卡名容易在 Wi-Fi、网线、代理虚拟网卡变化后形成错误路由。

Fallback 组会优先使用列表中第一个健康节点，当前节点超时后选择下一个可用节点。[Mihomo Fallback 说明](https://wiki.metacubex.one/en/config/proxy-groups/fallback/)

## 10. Clash Verge Rev 导入顺序

### 10.1 初次导入

1. 保留应急代理，不要卸载。
2. 断开 Windows 原生 WireGuard。
3. 在 Clash Verge Rev 中安装服务模式。
4. 关闭 TUN。
5. 导入完整 YAML。
6. 激活配置。
7. 打开“系统代理”。
8. 在 `PROXY` 中先选择 `VLESS-TW-443`，验证 TCP 回退线路。
9. 再选择 `HY2-TW-HOP`，验证 UDP 主线路。

### 10.2 本地代理测试

```powershell
curl.exe -x http://127.0.0.1:7897 `
  --max-time 15 `
  https://api.ipify.org

1..5 | ForEach-Object {
    curl.exe -x http://127.0.0.1:7897 `
      --http1.1 -4 -o NUL -sS `
      --max-time 15 `
      -w "tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s`n" `
      "https://github.com/?test=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
}
```

分别选择 HY2 和 VLESS 跑一次，保存数据，避免凭感觉调优。

### 10.3 开启 TUN

确认两个节点都可用后：

1. 关闭 FlyintPro 等其他 TUN 软件。
2. 确认原生 WireGuard 已断开。
3. 将 `PROXY` 设为 `PROXY-AUTO`。
4. 将 `UDP-PROXY` 设为 `UDP-AUTO`。
5. 将 `NETFLIX` 设为 `STREAMING-AUTO`。
6. 关闭 Clash“系统代理”，避免重复处理。
7. 打开 Clash TUN。

Mihomo TUN 字段和平台注意事项见 [Mihomo TUN 文档](https://wiki.metacubex.one/en/config/inbound/tun/)。

## 11. 验收测试

### 11.1 国内直连

```powershell
curl.exe --noproxy "*" `
  --max-time 15 `
  https://myip.ipip.net

tracert.exe -d -h 5 223.5.5.5
```

预期显示本地运营商地址，国内 DNS 路由保持本地低延迟。

### 11.2 国外出口

```powershell
curl.exe --noproxy "*" `
  --max-time 15 `
  https://api.ipify.org
```

预期显示服务器公网地址。

### 11.3 GitHub 延迟

```powershell
1..5 | ForEach-Object {
    curl.exe --noproxy "*" `
      --http1.1 -4 -o NUL -sS `
      --max-time 15 `
      -w "tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s`n" `
      "https://github.com/?test=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
}
```

### 11.4 下载速度

```powershell
curl.exe --noproxy "*" `
  --http1.1 -L --max-time 60 -o NUL `
  -w "speed=%{speed_download} bytes/sec total=%{time_total}s`n" `
  "https://cachefly.cachefly.net/100mb.test"
```

`10 MB/s` 约等于 `80 Mbps`。`speed_download` 输出单位是 bytes/s：

```text
10,485,760 bytes/s ≈ 10 MiB/s
```

不要使用只返回几字节错误页的测速地址判断带宽。先检查 HTTP 状态和 `Content-Length`，再相信结果。

## 12. 运维和升级

### 12.1 日常状态检查

```bash
sudo systemctl is-active xray
sudo systemctl is-active hysteria-server.service
sudo ss -ltnp '( sport = :443 )'
sudo ss -lunp | grep 24000
sudo journalctl -u xray -n 30 --no-pager
sudo journalctl -u hysteria-server.service -n 30 --no-pager
```

### 12.2 升级前备份

```bash
sudo install -d -m 700 /root/vpn-backup

sudo cp -a \
  /usr/local/etc/xray/config.json \
  "/root/vpn-backup/xray-config.$(date +%Y%m%d-%H%M%S).json"

sudo cp -a \
  /etc/hysteria/config.yaml \
  "/root/vpn-backup/hysteria-config.$(date +%Y%m%d-%H%M%S).yaml"

sudo cp -a \
  /etc/hysteria/certs \
  "/root/vpn-backup/hysteria-certs.$(date +%Y%m%d-%H%M%S)"
```

备份目录同样包含秘密，不能上传到公开仓库。

### 12.3 升级 Xray

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

sudo /usr/local/bin/xray run \
  -test \
  -config /usr/local/etc/xray/config.json

sudo systemctl restart xray
sudo systemctl is-active xray
```

### 12.4 升级 Hysteria 2

```bash
HYSTERIA_USER=root bash <(curl -fsSL https://get.hy2.sh/)
sudo systemctl restart hysteria-server.service
hysteria version
sudo systemctl is-active hysteria-server.service
```

升级时一次只动一个服务，并在每次升级后完成客户端验证。不要同时升级 Xray、Hysteria 和 Mihomo。

### 12.5 费用管理

- 设置 Google Cloud 月度预算和告警。
- 关注 Compute Engine 运行费、静态 IPv4 费和互联网出站流量费。
- 大文件测速会产生真实出站流量，不要高频自动运行。
- 停止虚拟机不一定停止静态 IP 或磁盘计费。

## 13. 故障恢复顺序

当代理突然不可用时，按以下顺序处理：

1. 关闭 Clash TUN，避免错误路由影响全部网络。
2. 打开保留的应急代理。
3. 在 Clash 中选择旧的、已验证配置。
4. 将 `PROXY` 手动选择为 `VLESS-TW-443`。
5. 测试 `api.ipify.org` 和 GitHub。
6. 通过应急代理或云控制台登录服务器。
7. 分别检查 Xray 和 Hysteria，不要同时重启全部服务。

如果只有 Hysteria 失败，不要修改正常工作的 Xray。如果只有 Xray 失败，也不要先破坏 Hysteria。保持至少一条已知可用路径。

## 14. 常见问题 QA

### Q1：为什么称为 VPN，但客户端使用的是 Mihomo？

这里的“VPN”指系统级网络接管体验。Mihomo TUN 创建虚拟网卡，接管浏览器和桌面客户端流量，再根据规则送往 HY2、VLESS 或 DIRECT。它不是传统单协议 VPN，但对 Windows 应用提供类似的全局网络体验。

### Q2：为什么需要 HY2 和 VLESS 两条线路？

HY2 在丢包网络中的吞吐和响应通常更好，但依赖 UDP；VLESS Reality 使用 TCP 443，速度略低却更适合作为 UDP 不可用时的回退。两者放在不同传输协议上，降低单点失效风险。

### Q3：端口跳跃能保证不再被封吗？

不能。它只能缓解针对某个 UDP 端口的限制。如果运营商限制全部 UDP、识别协议或封锁服务器 IP，端口跳跃无效。此时依靠 TCP 443 回退，必要时更换服务器 IP、区域或合规的网络服务。

### Q4：为什么 UDP 51820 和 UDP 443 一开始能用，后来失效？

固定 UDP 端口可能被运营商限速、丢弃或分类处理。`Test-NetConnection -Port 443` 默认测试 TCP，不代表 UDP 443 可用，也不代表 WireGuard 握手成功。

### Q5：TCP 443 测试成功，为什么 Reality 仍无法连接？

TCP 端口可达只证明三次握手成功。Reality 还要求 UUID、Flow、SNI、Public Key、Short ID、目标站点和客户端时间全部匹配。需要同时看 Xray 日志和客户端日志。

### Q6：Xray 日志显示 `handshake did not complete successfully` 怎么办？

依次检查：

1. 客户端 UUID 是否等于服务端 UUID。
2. 客户端 Public Key 是否由当前服务端 Private Key 派生。
3. Short ID 是否一致、字符数为偶数、最多 16 个十六进制字符。
4. `servername` 是否属于服务端 `serverNames`。
5. `target` 是否可从服务器正常访问。
6. Windows 和服务器时间是否准确；若服务端设置了 `maxTimeDiff`，时间偏差尤其重要。
7. Mihomo 配置是否错误固定了 `interface-name`。

如果日志在证书阶段反复失败，并出现异常大的 `Certificate` 记录，可换一个兼容目标重新测试。本次把目标从 Microsoft 站点换成 `www.bing.com:443` 后恢复，但这不是所有故障的通用答案。

### Q7：为什么 `xray x25519` 提取不到 Public Key？

不同版本的输出标签可能不同。本次 Xray 输出的是：

```text
PrivateKey: ...
Password (PublicKey): ...
Hash32: ...
```

不要只匹配 `Public key:` 或 `Password:`。脚本应匹配包含 `publickey` 的字段名，并检查最终长度是否为 43。

### Q8：为什么添加 `interface-name` 后 Reality 握手失败？

固定网卡名可能让 Mihomo 把代理服务器连接拨到 FlyintPro 虚拟网卡、旧以太网或错误接口，造成代理套代理或路由循环。优先使用：

```yaml
auto-detect-interface: true
```

除非已确认网卡生命周期和路由，否则不要写 `interface-name`。

### Q9：为什么 `api.ipify.org` 显示台湾，而 `myip.ipip.net` 显示大陆？

这是正确的国内外分流：`api.ipify.org` 命中外网代理规则；`myip.ipip.net` 属于中国站点，命中 `GEOSITE,cn` 或 `GEOIP,CN` 后直连。

### Q10：为什么浏览器能用，某些客户端不能用？

只开启“系统代理”时，只有遵守系统 HTTP/SOCKS 代理设置的软件会使用代理。打开服务模式和 TUN 后，才能接管大多数不支持代理设置的客户端。某些带内核驱动、反作弊或自带 VPN 的应用仍可能绕过或冲突。

### Q11：为什么 TUN 一开就断网？

常见原因：

- FlyintPro、WireGuard 或其他 TUN 同时运行。
- 缺少 Clash 服务模式权限。
- 代理服务器 IP 没有置于最前面的 DIRECT 规则。
- DNS 劫持与其他安全软件冲突。
- 配置固定了错误网卡。

先关闭 TUN，恢复旧配置和应急代理，再逐项检查。

### Q12：为什么启用 TUN 后国内网站延迟仍然很高？

检查：

- 国内域名是否命中 `GEOSITE,cn,DIRECT`。
- 国内 IP 是否命中 `GEOIP,CN,DIRECT`。
- 浏览器是否启用了自带安全 DNS，导致解析路径不同。
- 目标是否使用海外 CDN 或被规则库归类为海外服务。
- `PROXY` 是否被错误设成全局模式。

可在 Clash 连接列表查看具体命中规则，再为个别域名添加 `DOMAIN-SUFFIX,...,DIRECT`，不要一开始堆积上万条静态路由。

### Q13：为什么 Clash 启动或关闭很慢？

最常见原因是多个虚拟网卡和路由管理器同时争用系统路由。只保留一个活动 TUN；安装 Clash 服务模式；避免同时启动原生 WireGuard、FlyintPro 和 Clash TUN。刚切换配置后的前几次请求还可能包含健康检查和连接预热。

### Q14：Hysteria 服务是 active，客户端仍无法连接怎么办？

检查四层：

1. Google Cloud 是否放行整个 UDP `24000-24100`。
2. 服务器 `ss` 是否监听 UDP 24000。
3. nftables 是否把 `24001-24100` 重定向到 24000。
4. 客户端 `ports`、认证密码、混淆密码、SNI 和证书指纹是否一致。

若所有配置一致但运营商阻断全部 UDP，直接使用 VLESS 回退。

### Q15：怎么确认端口跳跃真的工作？

服务器安装 `tcpdump` 后观察一段时间内的目标 UDP 端口：

```bash
sudo timeout 50 tcpdump \
  -ni ens4 \
  -nn \
  -l \
  'udp dst portrange 24000-24100'
```

Windows 同时持续产生 HY2 流量。应看到目标端口周期性变化。分享日志前删除客户端公网 IP。

### Q16：为什么 `scp` 显示 `Permission denied (publickey)`？

服务器只允许公钥认证，而 Windows 没有使用对应私钥。显式指定：

```powershell
scp.exe -i $SshKey -o IdentitiesOnly=yes `
  "user@server:/absolute/remote/path" `
  "E:\vpn-private\file.yaml"
```

确认 `$SshKey` 已赋值且文件存在。使用绝对远端路径可以避免 `~` 和引号解析差异。

### Q17：为什么 `scp` 只打印 usage？

常见原因是 PowerShell 变量为空、反引号后还有空格、源路径被拆成多个参数，或私钥路径没有加引号。先执行：

```powershell
$SshKey
Test-Path -LiteralPath $SshKey
```

再把完整命令作为一条 PowerShell 语句执行。

### Q18：为什么 Windows curl 不支持 `socks5h`？

部分 Windows curl 构建不包含该 URL scheme。使用参数形式：

```powershell
curl.exe --socks5-hostname 127.0.0.1:1080 https://example.com
```

当前方案主要使用 Mihomo `mixed-port: 7897`，通常直接写：

```powershell
curl.exe -x http://127.0.0.1:7897 https://example.com
```

### Q19：为什么 Cloudflare、Fast.com 和文件下载速度差很多？

它们的服务器位置、CDN 调度、并发数、协议和运营商互联不同。Cloudflare 的高分不代表 Netflix 路径同样快。至少同时测：单文件下载、GitHub 延迟、Cloudflare loaded latency 和实际视频播放。

### Q20：为什么测速只下载了 1 字节或几百字节？

通常拿到的是错误页、重定向或不再支持的测速接口。检查：

```powershell
curl.exe -I "<TEST_URL>"
```

确认状态码和 `Content-Length` 与预期一致，再记录速度。

### Q21：Netflix 能否保证解锁？

不能。Google Cloud 地址属于数据中心 IP，Netflix 等服务会独立判断代理、版权区域和账号地区。网络速度正常也不等于一定能播放全部地区内容。

### Q22：游戏为什么仍可能出现 IP 波动？

如果游戏同时使用 TCP、UDP、IPv4、IPv6，或某些流量直连、某些流量代理，就可能看到不同出口。本模板关闭 IPv6，并让外国 UDP 统一进入 `UDP-PROXY`。特定游戏仍应根据进程名和服务器区域添加规则，例如：

```yaml
- PROCESS-NAME,ExampleGame.exe,UDP-PROXY
```

国内游戏应明确指定 `DIRECT`。添加前先在 Clash 连接列表确认真实进程名。

### Q23：应该使用 Hysteria 的 `standard`、`conservative` 还是 `aggressive`？

先用 `standard`。只有在满载延迟和丢包测试中发现明显卡顿，再 A/B 测试 `conservative`；只有线路稳定且确实需要更高吞吐时才考虑 `aggressive`。不要在没有基线数据时同时修改 MTU、BBR、端口和 DNS。

### Q24：如何轮换泄露的秘密？

- Xray：生成新 UUID、X25519 密钥对和 Short ID，同时更新服务端和客户端。
- Hysteria：生成新认证密码、混淆密码和证书，并更新客户端证书指纹。
- SSH：移除服务器 `authorized_keys` 中泄露的公钥，生成新密钥。

轮换时保留另一条工作线路，先更新并验证新客户端，再删除旧凭据。

### Q25：是否需要开放管理面板或 Clash API 到公网？

不需要。Mihomo 控制端口、流量统计接口、Hysteria Traffic Stats 和内部 SOCKS 服务都应绑定回环或私网，并设置认证。不要为方便排障把它们暴露到 `0.0.0.0/0`。

### Q26：Google Cloud 账单为什么突然增加？

视频、测速和代理下载都产生互联网出站流量费。检查账单分项和预算告警；停止频繁测速；确认服务器没有因弱密码成为公共代理；必要时立即轮换凭据并检查日志。

## 15. 安全检查清单

- [ ] SSH 只允许公钥登录，私钥仅保存在受保护设备。
- [ ] Xray UUID、Reality Private Key、Short ID 未进入 Git。
- [ ] HY2 认证密码、混淆密码、证书私钥未进入 Git。
- [ ] Windows 私密 YAML 不在同步目录。
- [ ] GCP 只开放 TCP 443、UDP 跳跃范围和必要的 SSH。
- [ ] 未开放 Mihomo API、Hysteria Stats、Dante SOCKS 等管理或内部端口。
- [ ] 服务端配置备份权限为 `600` 或等效限制。
- [ ] 已设置 Google Cloud 预算告警。
- [ ] 已保留独立应急管理通道。
- [ ] 已记录一份不含秘密的恢复步骤。

## 16. 最终验收清单

- [ ] `xray` 为 `active`，TCP 443 正在监听。
- [ ] `hysteria-server` 为 `active`，UDP 24000 正在监听。
- [ ] nftables 端口范围重定向存在。
- [ ] 本地代理模式下 VLESS 和 HY2 分别验证通过。
- [ ] TUN 开启后，国内 IP 显示本地运营商。
- [ ] TUN 开启后，国外 IP 显示台湾服务器。
- [ ] 国内 DNS 或常用站点延迟未明显升高。
- [ ] HY2 失效时可以手动选择 VLESS 恢复。
- [ ] 单文件下载达到自己的目标，而不是只看多线程测速。
- [ ] YouTube/Netflix/实际客户端完成体验验证。
- [ ] FlyintPro 等应急工具保留但日常关闭。

## 17. 官方参考资料

- [Google Cloud：Compute Engine 网络带宽](https://docs.cloud.google.com/compute/docs/network-bandwidth)
- [Google Cloud：配置静态外部 IP](https://docs.cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address)
- [Google Cloud：VPC 防火墙规则](https://docs.cloud.google.com/firewall/docs/using-firewalls)
- [XTLS：Xray 官方安装脚本](https://github.com/XTLS/Xray-install)
- [XTLS：REALITY 配置](https://xtls.github.io/en/config/transports/reality.html)
- [XTLS：VLESS 与 XTLS Vision](https://xtls.github.io/en/config/inbounds/vless.html)
- [Hysteria 2：服务端安装脚本](https://v2.hysteria.network/docs/getting-started/Server-Installation-Script/)
- [Hysteria 2：完整服务端配置](https://v2.hysteria.network/docs/advanced/Full-Server-Config/)
- [Hysteria 2：端口跳跃](https://v2.hysteria.network/docs/advanced/Port-Hopping/)
- [Mihomo：Hysteria 2 节点](https://wiki.metacubex.one/en/config/proxies/hysteria2/)
- [Mihomo：VLESS 节点](https://wiki.metacubex.one/en/config/proxies/vless/)
- [Mihomo：Fallback 代理组](https://wiki.metacubex.one/en/config/proxy-groups/fallback/)
- [Mihomo：TUN](https://wiki.metacubex.one/en/config/inbound/tun/)
