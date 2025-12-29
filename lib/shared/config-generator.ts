
import type { Node } from './types';
import yaml from 'js-yaml';

/**
 * 本地配置生成器
 * 替代外部 Subconverter API，提供原生配置生成
 * 支持客户端：Clash Meta, Sing-Box, Surge, Loon
 * 支持协议：VLESS Reality, Hysteria2, VMess, Trojan, Shadowsocks, TUIC, AnyTLS
 */
export class ConfigGenerator {

    // ==================== Clash Meta 配置生成 ====================

    /**
     * 生成 Clash Meta (Mihomo) 配置
     * 使用 YAML 格式，包含 Rule Providers 和丰富策略组
     */
    static generateClashMeta(nodes: Node[], _subName: string, _userConfig: any = {}): string {
        const proxies = nodes
            .map(node => this.nodeToClashProxy(node))
            .filter(p => p !== null);

        const proxyNames = proxies.map(p => p.name);
        if (proxyNames.length === 0) proxyNames.push('DIRECT');

        // 定义策略组
        const autoGroup = {
            name: '♻️ 自动选择',
            type: 'url-test',
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            tolerance: 50,
            proxies: proxyNames
        };

        const createSelectGroup = (name: string, ico: string, includeAuto = true) => ({
            name: `${ico} ${name}`,
            type: 'select',
            proxies: includeAuto ? ['♻️ 自动选择', ...proxyNames, 'DIRECT'] : [...proxyNames, 'DIRECT']
        });

        const groups = [
            createSelectGroup('节点选择', '🚀'),
            autoGroup,
            createSelectGroup('电报信息', '📲'),
            createSelectGroup('OpenAI', '🤖'),
            createSelectGroup('奈飞视频', '🎬'),
            createSelectGroup('油管视频', '📹'),
            createSelectGroup('苹果服务', '🍎'),
            createSelectGroup('微软服务', 'Ⓜ️'),
            createSelectGroup('国外媒体', '🌍'),
            {
                name: '🐟 漏网之鱼',
                type: 'select',
                proxies: ['🚀 节点选择', '♻️ 自动选择', ...proxyNames, 'DIRECT']
            }
        ];

        // 基础配置
        const general = {
            'port': 7890,
            'socks-port': 7891,
            'allow-lan': true,
            'mode': 'rule',
            'log-level': 'info',
            'external-controller': '127.0.0.1:9090',
            'dns': {
                'enable': true,
                'listen': '0.0.0.0:1053',
                'purn': true,
                'ipv6': false,
                'enhanced-mode': 'fake-ip',
                'fake-ip-range': '198.18.0.1/16',
                'nameserver': ['223.5.5.5', '119.29.29.29'],
                'fallback': ['8.8.8.8', '1.1.1.1', 'tls://1.0.0.1:853', 'tls://dns.google:853'],
                'fallback-filter': { 'geoip': true, 'ipcidr': ['240.0.0.0/4', '0.0.0.0/32'] }
            }
        };

        let yamlOutput = yaml.dump(general);

        // 代理节点 (使用 Flow Style 紧凑格式)
        if (proxies.length > 0) {
            yamlOutput += '\nproxies:\n';
            for (const p of proxies) {
                yamlOutput += `  - ${yaml.dump(p, { flowLevel: 0, lineWidth: -1 }).trim()}\n`;
            }
        }

        // 策略组
        yamlOutput += '\n' + yaml.dump({ 'proxy-groups': groups });

        // Rule Providers & Rules
        const rulesParams = {
            'rule-providers': {
                'reject': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ads-all.yaml", path: "./ruleset/reject.yaml", interval: 86400
                },
                'telegram': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/telegram.yaml", path: "./ruleset/telegram.yaml", interval: 86400
                },
                'youtube': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/youtube.yaml", path: "./ruleset/youtube.yaml", interval: 86400
                },
                'netflix': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/netflix.yaml", path: "./ruleset/netflix.yaml", interval: 86400
                },
                'openai': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/openai.yaml", path: "./ruleset/openai.yaml", interval: 86400
                },
                'apple': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/apple.yaml", path: "./ruleset/apple.yaml", interval: 86400
                },
                'microsoft': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/microsoft.yaml", path: "./ruleset/microsoft.yaml", interval: 86400
                },
                'cn': {
                    type: 'http', behavior: 'domain', url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/cn.yaml", path: "./ruleset/cn.yaml", interval: 86400
                }
            },
            'rules': [
                'RULE-SET,reject,REJECT',
                'RULE-SET,openai,🤖 OpenAI',
                'RULE-SET,telegram,📲 电报信息',
                'RULE-SET,netflix,🎬 奈飞视频',
                'RULE-SET,youtube,📹 油管视频',
                'RULE-SET,apple,🍎 苹果服务',
                'RULE-SET,microsoft,Ⓜ️ 微软服务',
                'RULE-SET,cn,DIRECT',
                'GEOIP,LAN,DIRECT',
                'GEOIP,CN,DIRECT',
                'MATCH,🐟 漏网之鱼'
            ]
        };

        yamlOutput += '\n' + yaml.dump(rulesParams);

        return yamlOutput;
    }

    /**
     * Clash 节点转换
     * 将 Node 对象转换为 Clash 代理配置
     */
    private static nodeToClashProxy(node: Node): any {
        if (!node.url) return null;

        let proxy = node.originalProxy ? { ...node.originalProxy } : null;

        if (!proxy) {
            proxy = this.urlToClashProxy(node.url, node.name, node.protocol || 'unknown');
        } else {
            proxy.name = node.name;
        }

        return proxy;
    }

    /**
     * URL 转 Clash 代理配置
     * 解析各协议的 URL 参数并生成 Clash 配置对象
     */
    private static urlToClashProxy(urlStr: string, name: string, protocol: string): any {
        try {
            let config: any = { name: name, type: protocol };
            const url = new URL(urlStr);

            if (url.username) config.uuid = url.username;
            if (url.password) config.password = url.password;
            config.server = url.hostname;
            config.port = Number(url.port) || 443;

            const params = url.searchParams;

            // 通用参数
            if (params.has('sni')) config.servername = params.get('sni');
            if (params.has('fp')) config['client-fingerprint'] = params.get('fp');
            if (params.has('alpn')) config.alpn = params.get('alpn')?.split(',');
            if (params.has('allowInsecure') || params.has('insecure')) config['skip-cert-verify'] = true;
            if (params.has('udp')) config.udp = true;

            // 协议特定处理
            switch (protocol) {
                case 'ss':
                    if (urlStr.includes('@')) {
                        config.cipher = url.username;
                    }
                    if (params.has('plugin')) {
                        const pluginParts = params.get('plugin')!.split(';');
                        config.plugin = pluginParts[0];
                        if (pluginParts.length > 1) {
                            config['plugin-opts'] = {};
                            pluginParts.slice(1).forEach(p => {
                                const [k, v] = p.split('=');
                                if (k && v) config['plugin-opts'][k] = v;
                            });
                        }
                    }
                    break;

                case 'vmess':
                    if (urlStr.startsWith('vmess://')) {
                        const b64 = urlStr.slice(8);
                        try {
                            const decoded = atob(b64);
                            const vmessObj = JSON.parse(decoded);
                            config = {
                                name: name,
                                type: 'vmess',
                                server: vmessObj.add,
                                port: Number(vmessObj.port),
                                uuid: vmessObj.id,
                                alterId: Number(vmessObj.aid),
                                cipher: vmessObj.scy || 'auto',
                                udp: true,
                                tls: vmessObj.tls === 'tls',
                                network: vmessObj.net,
                            };
                            if (config.tls) {
                                if (vmessObj.sni) config.servername = vmessObj.sni;
                                if (vmessObj.fp) config['client-fingerprint'] = vmessObj.fp;
                                if (vmessObj.alpn) config.alpn = vmessObj.alpn.split(',');
                            }
                            if (vmessObj.net === 'ws') {
                                config['ws-opts'] = {
                                    path: vmessObj.path,
                                    headers: { Host: vmessObj.host }
                                };
                            }
                        } catch (e) {
                            console.error('VMess base64 decode error', e);
                            return null;
                        }
                    }
                    break;

                case 'vless':
                    config.uuid = url.username;
                    if (params.has('type')) config.network = params.get('type');
                    if (params.has('flow')) config.flow = params.get('flow');

                    if (params.has('security') && params.get('security') === 'reality') {
                        config.tls = true;
                        config['reality-opts'] = {
                            'public-key': params.get('pbk'),
                            'short-id': params.get('sid')
                        };
                        if (params.has('spx')) config['reality-opts']['spider-x'] = params.get('spx');
                    } else if (params.has('security') && params.get('security') === 'tls') {
                        config.tls = true;
                    }

                    if (config.network === 'ws') {
                        config['ws-opts'] = { path: params.get('path') };
                        if (params.has('host')) config['ws-opts'].headers = { Host: params.get('host') };
                    }
                    if (config.network === 'grpc') {
                        config['grpc-opts'] = { 'grpc-service-name': params.get('serviceName') };
                        if (params.has('mode')) config['grpc-opts'].mode = params.get('mode');
                    }
                    break;

                case 'hysteria2':
                case 'hy2':
                    config.type = 'hysteria2';
                    config.password = url.username || url.password;
                    if (params.has('obfs')) {
                        config.obfs = params.get('obfs');
                        if (params.has('obfs-password')) config['obfs-password'] = params.get('obfs-password');
                    }
                    break;

                case 'trojan':
                    config.password = url.username;
                    if (params.has('type')) config.network = params.get('type');
                    if (config.network === 'ws') {
                        config['ws-opts'] = { path: params.get('path') };
                        if (params.has('host')) config['ws-opts'].headers = { Host: params.get('host') };
                    }
                    if (config.network === 'grpc') {
                        config['grpc-opts'] = { 'grpc-service-name': params.get('serviceName') };
                    }
                    config.udp = true;
                    break;

                case 'tuic':
                    config.uuid = url.username;
                    config.password = url.password;
                    if (params.has('congestion_control')) config['congestion-controller'] = params.get('congestion_control');
                    if (params.has('udp_relay_mode')) config['udp-relay-mode'] = params.get('udp_relay_mode');
                    break;

                case 'anytls':
                    config.type = 'anytls';
                    config.password = url.username || url.password;
                    if (params.has('sni')) config.servername = params.get('sni');
                    if (params.has('fp')) config['client-fingerprint'] = params.get('fp');
                    if (params.has('idle_timeout')) config['idle-timeout'] = params.get('idle_timeout');
                    break;

                default:
                    if (!config.server) return null;
            }

            return config;
        } catch (e) {
            console.error('Convert to Clash Proxy Error:', e);
            return null;
        }
    }

    // ==================== Sing-Box 配置生成 ====================

    /**
     * 生成 Sing-Box 配置
     * 使用 JSON 格式，包含 rule-set 和策略组
     */
    static generateSingBox(nodes: Node[], _subName: string): string {
        const specificOutbounds = nodes
            .map(node => this.nodeToSingBoxOutbound(node))
            .filter(o => o !== null);
        const selectorTags = specificOutbounds.map(o => o.tag);
        if (selectorTags.length === 0) selectorTags.push('DIRECT');

        const createSelector = (tag: string, includeAuto = true) => ({
            type: "selector",
            tag: tag,
            outbounds: includeAuto ? ["♻️ 自动选择", ...selectorTags, "DIRECT"] : [...selectorTags, "DIRECT"]
        });

        const outbounds = [
            createSelector("🚀 节点选择"),
            {
                type: "urltest",
                tag: "♻️ 自动选择",
                outbounds: selectorTags,
                url: "http://www.gstatic.com/generate_204",
                interval: "3m",
                tolerance: 50
            },
            createSelector("📲 电报信息"),
            createSelector("🤖 OpenAI"),
            createSelector("🎬 奈飞视频"),
            createSelector("📹 油管视频"),
            createSelector("🍎 苹果服务"),
            createSelector("🌍 国外媒体"),
            ...specificOutbounds,
            { type: "direct", tag: "DIRECT" },
            { type: "block", tag: "BLOCK" },
            { type: "dns", tag: "dns-out" }
        ];

        const config = {
            log: { level: "info", timestamp: true },
            dns: {
                servers: [
                    { tag: "google", address: "8.8.8.8", strategy: "prefer_ipv4" },
                    { tag: "local", address: "223.5.5.5", strategy: "prefer_ipv4", detour: "DIRECT" },
                    { tag: "block", address: "rcode://success" }
                ],
                rules: [
                    { outbound: "any", server: "local" },
                    { clash_mode: "Direct", server: "local" },
                    { clash_mode: "Global", server: "google" },
                    { rule_set: "geosite-cn", server: "local" },
                    { rule_set: "geosite-category-ads-all", server: "block" }
                ]
            },
            route: {
                rule_set: [
                    {
                        tag: "geosite-category-ads-all",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-category-ads-all.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geosite-cn",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-cn.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geosite-openai",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-openai.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geosite-netflix",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-netflix.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geosite-youtube",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-youtube.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geosite-telegram",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-telegram.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geosite-apple",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-apple.srs",
                        download_detour: "🚀 节点选择"
                    },
                    {
                        tag: "geoip-cn",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-cn.srs",
                        download_detour: "🚀 节点选择"
                    }
                ],
                rules: [
                    { rule_set: "geosite-category-ads-all", action: "reject" },
                    { rule_set: "geosite-openai", outbound: "🤖 OpenAI" },
                    { rule_set: "geosite-netflix", outbound: "🎬 奈飞视频" },
                    { rule_set: "geosite-telegram", outbound: "📲 电报信息" },
                    { rule_set: "geosite-youtube", outbound: "📹 油管视频" },
                    { rule_set: "geosite-apple", outbound: "🍎 苹果服务" },
                    { rule_set: "geosite-cn", outbound: "DIRECT" },
                    { rule_set: "geoip-cn", outbound: "DIRECT" },
                    { type: "logical", mode: "or", rules: [{ protocol: "dns" }, { port: 53 }], outbound: "dns-out" }
                ],
                final: "🚀 节点选择",
                auto_detect_interface: true
            },
            inbounds: [
                { type: "mixed", tag: "mixed-in", listen: "::", listen_port: 7890 }
            ],
            outbounds: outbounds,
            experimental: {
                cache_file: {
                    enabled: true,
                    path: "cache.db",
                    cache_id: "sub_one_cache",
                    store_rdrc: true
                }
            }
        };

        return JSON.stringify(config, null, 2);
    }

    /**
     * Sing-Box 节点转换
     * 将 Node 对象转换为 Sing-Box outbound 配置
     */
    private static nodeToSingBoxOutbound(node: Node): any {
        if (!node.url) return null;

        let outbound: any = {
            type: this.mapProtocolToSingBoxType(node.protocol),
            tag: node.name,
            server: '',
            server_port: 0
        };

        try {
            const url = new URL(node.url);
            outbound.server = url.hostname;
            outbound.server_port = Number(url.port) || 443;
            const params = url.searchParams;

            const isTls = params.get('security') === 'tls' || params.get('security') === 'reality' || node.url.startsWith('trojan') || node.url.startsWith('hysteria2');

            if (isTls) {
                outbound.tls = {
                    enabled: true,
                    server_name: params.get('sni') || url.hostname,
                    insecure: params.has('allowInsecure') || params.has('insecure'),
                    alpn: params.get('alpn')?.split(',')
                };
            }

            switch (outbound.type) {
                case 'vless':
                    outbound.uuid = url.username;
                    outbound.flow = params.get('flow');

                    if (params.get('security') === 'reality') {
                        delete outbound.tls;
                        outbound.tls = {
                            enabled: true,
                            server_name: params.get('sni') || url.hostname,
                            utls: { enabled: true, fingerprint: params.get('fp') || 'chrome' },
                            reality: {
                                enabled: true,
                                public_key: params.get('pbk'),
                                short_id: params.get('sid')
                            }
                        };
                    }

                    const network = params.get('type');
                    if (network === 'ws') {
                        outbound.transport = {
                            type: 'ws',
                            path: params.get('path'),
                            headers: params.has('host') ? { Host: params.get('host') } : undefined
                        };
                    }
                    if (network === 'grpc') {
                        outbound.transport = {
                            type: 'grpc',
                            service_name: params.get('serviceName')
                        };
                    }
                    break;

                case 'hysteria2':
                    outbound.password = url.username || url.password;
                    if (params.has('obfs')) {
                        outbound.obfs = {
                            type: 'salamander',
                            password: params.get('obfs-password')
                        };
                    }
                    break;

                case 'trojan':
                    outbound.password = url.username;
                    if (params.get('type') === 'ws') {
                        outbound.transport = { type: 'ws', path: params.get('path') };
                    }
                    break;

                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const vmessObj = JSON.parse(atob(b64));
                        outbound.server = vmessObj.add;
                        outbound.server_port = Number(vmessObj.port);
                        outbound.uuid = vmessObj.id;
                        outbound.alter_id = Number(vmessObj.aid);
                        outbound.security = vmessObj.scy;
                        if (vmessObj.tls === 'tls') {
                            outbound.tls = { enabled: true, server_name: vmessObj.sni };
                        }
                        if (vmessObj.net === 'ws') {
                            outbound.transport = { type: 'ws', path: vmessObj.path };
                        }
                    }
                    break;

                case 'anytls':
                    outbound.uuid = url.username || url.password;
                    outbound.tls = {
                        enabled: true,
                        server_name: params.get('sni') || url.hostname,
                        utls: {
                            enabled: true,
                            fingerprint: params.get('fp') || 'chrome'
                        }
                    };
                    if (params.has('idle_timeout')) outbound.idle_timeout = params.get('idle_timeout');
                    break;

                default:
                // unsupported
            }

        } catch (e) {
            // ignore
        }

        if (!outbound.server) return null;
        return outbound;
    }

    /**
     * 协议映射到 Sing-Box 类型
     */
    private static mapProtocolToSingBoxType(protocol: string | undefined): string {
        switch (protocol) {
            case 'hy2':
            case 'hysteria2': return 'hysteria2';
            case 'vless': return 'vless';
            case 'vmess': return 'vmess';
            case 'trojan': return 'trojan';
            case 'ss': return 'shadowsocks';
            case 'ssr': return 'shadowsocksr';
            case 'tuic': return 'tuic';
            default: return 'unknown';
        }
    }

    // ==================== Surge 配置生成 ====================

    /**
     * 生成 Surge 配置
     * 使用 INI 格式，包含策略组和 RULE-SET
     */
    static generateSurge(nodes: Node[], _subName: string): string {
        const proxies = nodes
            .map(node => this.nodeToSurgeProxy(node))
            .filter(p => p !== null);

        const proxyNames = proxies.map(p => p.split(/\s*=/)[0].trim());
        if (proxyNames.length === 0) proxyNames.push('DIRECT');

        const allProxiesStr = proxyNames.join(', ');

        let conf = `[General]\nloglevel = notify\nskip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com\n\n[Proxy]\n`;
        conf += proxies.join('\n');

        conf += `\n\n[Proxy Group]\n`;
        conf += `🚀 节点选择 = select, ♻️ 自动选择, ${allProxiesStr}\n`;
        conf += `♻️ 自动选择 = url-test, ${allProxiesStr}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50\n`;

        const sceneGroups = [
            '📲 电报信息', '🤖 OpenAI', '🎬 奈飞视频', '📹 油管视频',
            '🍎 苹果服务', 'Ⓜ️ 微软服务', '🌍 国外媒体', '🐟 漏网之鱼'
        ];

        sceneGroups.forEach(g => {
            conf += `${g} = select, 🚀 节点选择, ${allProxiesStr}\n`;
        });

        conf += `\n[Rule]\n`;
        const ruleBase = "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@surge/geo/geosite";

        conf += `RULE-SET,${ruleBase}/category-ads-all.list,REJECT\n`;
        conf += `RULE-SET,${ruleBase}/openai.list,🤖 OpenAI\n`;
        conf += `RULE-SET,${ruleBase}/netflix.list,🎬 奈飞视频\n`;
        conf += `RULE-SET,${ruleBase}/telegram.list,📲 电报信息\n`;
        conf += `RULE-SET,${ruleBase}/youtube.list,📹 油管视频\n`;
        conf += `RULE-SET,${ruleBase}/apple.list,🍎 苹果服务\n`;
        conf += `RULE-SET,${ruleBase}/microsoft.list,Ⓜ️ 微软服务\n`;
        conf += `RULE-SET,${ruleBase}/cn.list,DIRECT\n`;

        conf += `GEOIP,CN,DIRECT\n`;
        conf += `FINAL,🐟 漏网之鱼\n`;

        return conf;
    }

    /**
     * Surge 节点转换
     * 将 Node 对象转换为 Surge 代理配置行
     */
    private static nodeToSurgeProxy(node: Node): string | null {
        try {
            if (!node.url) return null;
            const url = new URL(node.url);
            const params = url.searchParams;
            const name = node.name.replace(/[,=]/g, '');
            let line = '';

            switch (node.protocol) {
                case 'ss':
                    line = `${name} = ss, ${url.hostname}, ${url.port}, encrypt-method=${url.username}, password=${url.password}`;
                    if (params.get('plugin') === 'obfs-local') {
                        // obfs handling
                    }
                    break;
                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const obj = JSON.parse(atob(b64));
                        line = `${name} = vmess, ${obj.add}, ${obj.port}, username=${obj.id}`;
                        if (obj.tls === 'tls') line += `, tls=true`;
                        if (obj.net === 'ws') line += `, ws=true, ws-path=${obj.path}`;
                    }
                    break;
                case 'trojan':
                    line = `${name} = trojan, ${url.hostname}, ${url.port}, password=${url.username}`;
                    if (params.get('security') === 'tls' || true) line += `, tls=true`;
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;
                    break;
                case 'tuic':
                    line = `${name} = tuic, ${url.hostname}, ${url.port}, token=${url.password}`;
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;
                    break;
                case 'hysteria2':
                case 'hy2':
                    line = `${name} = hysteria2, ${url.hostname}, ${url.port}, password=${url.username || url.password}`;
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;
                    break;
                default:
                    return null;
            }
            return line;
        } catch (e) {
            return null;
        }
    }

    // ==================== Loon 配置生成 ====================

    /**
     * 生成 Loon 配置
     * 使用 INI 格式，类似 Surge 但有专属语法
     */
    static generateLoon(nodes: Node[], _subName: string): string {
        const proxies = nodes
            .map(node => this.nodeToLoonProxy(node))
            .filter(p => p !== null);

        const proxyNames = proxies.map(p => p.split(/\s*=/)[0].trim());
        if (proxyNames.length === 0) proxyNames.push('DIRECT');

        const allProxiesStr = proxyNames.join(', ');

        let conf = `[General]\nskip-proxy = 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local, e.crashlytics.com\n\n[Proxy]\n`;
        conf += proxies.join('\n');

        conf += `\n\n[Proxy Group]\n`;
        conf += `🚀 节点选择 = select, ♻️ 自动选择, ${allProxiesStr}\n`;
        conf += `♻️ 自动选择 = url-test, ${allProxiesStr}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50\n`;

        const sceneGroups = [
            '📲 电报信息', '🤖 OpenAI', '🎬 奈飞视频', '📹 油管视频',
            '🍎 苹果服务', 'Ⓜ️ 微软服务', '🌍 国外媒体', '🐟 漏网之鱼'
        ];
        sceneGroups.forEach(g => {
            conf += `${g} = select, 🚀 节点选择, ${allProxiesStr}\n`;
        });

        conf += `\n[Rule]\n`;
        const ruleBase = "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@loon/geo/geosite";

        conf += `RULE-SET,${ruleBase}/category-ads-all.list,REJECT\n`;
        conf += `RULE-SET,${ruleBase}/openai.list,🤖 OpenAI\n`;
        conf += `RULE-SET,${ruleBase}/netflix.list,🎬 奈飞视频\n`;
        conf += `RULE-SET,${ruleBase}/telegram.list,📲 电报信息\n`;
        conf += `RULE-SET,${ruleBase}/youtube.list,📹 油管视频\n`;
        conf += `RULE-SET,${ruleBase}/apple.list,🍎 苹果服务\n`;
        conf += `RULE-SET,${ruleBase}/microsoft.list,Ⓜ️ 微软服务\n`;
        conf += `RULE-SET,${ruleBase}/cn.list,DIRECT\n`;

        conf += `GEOIP,CN,DIRECT\n`;
        conf += `FINAL,🐟 漏网之鱼\n`;

        return conf;
    }

    /**
     * Loon 节点转换
     * 将 Node 对象转换为 Loon 代理配置行
     */
    private static nodeToLoonProxy(node: Node): string | null {
        try {
            if (!node.url) return null;
            const url = new URL(node.url);
            const params = url.searchParams;
            const name = node.name.replace(/[,=]/g, '');
            let line = '';

            switch (node.protocol) {
                case 'ss':
                    line = `${name} = Shadowsocks, ${url.hostname}, ${url.port}, ${url.username}, "${url.password}"`;
                    if (params.has('plugin')) {
                        const plugin = params.get('plugin');
                        if (plugin?.includes('obfs')) {
                            line += `, obfs=${plugin.includes('http') ? 'http' : 'tls'}`;
                            if (params.has('obfs-host')) line += `, obfs-host=${params.get('obfs-host')}`;
                        }
                    }
                    // 通用参数
                    line += `, fast-open=true, udp=true`;
                    break;

                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const obj = JSON.parse(atob(b64));

                        // 加密方式（默认 auto）
                        const cipher = obj.scy || 'auto';

                        // 基础格式：名称 = vmess, 服务器, 端口, 加密方式, "UUID"
                        line = `${name} = vmess, ${obj.add}, ${obj.port}, ${cipher}, "${obj.id}"`;

                        // TLS
                        if (obj.tls === 'tls') {
                            line += `, over-tls=true`;
                            if (obj.sni) line += `, tls-name=${obj.sni}`;
                            if (obj.skip_cert_verify || obj['skip-cert-verify']) {
                                line += `, skip-cert-verify=true`;
                            }
                        }

                        // 传输协议
                        if (obj.net === 'ws') {
                            line += `, transport=ws`;
                            if (obj.path) line += `, path=${obj.path}`;
                            if (obj.host) line += `, host=${obj.host}`;
                        } else if (obj.net === 'grpc') {
                            line += `, transport=grpc`;
                            if (obj.serviceName) line += `, serviceName=${obj.serviceName}`;
                        } else if (obj.net === 'h2') {
                            line += `, transport=http`;
                            if (obj.path) line += `, path=${obj.path}`;
                            if (obj.host) line += `, host=${obj.host}`;
                        }

                        // AEAD 和通用参数
                        line += `, vmess-aead=true, udp=true`;
                    }
                    break;

                case 'vless':
                    // 基础格式：名称 = vless, 服务器, 端口, "UUID"
                    line = `${name} = vless, ${url.hostname}, ${url.port}, "${url.username}"`;

                    // TLS / Reality
                    const security = params.get('security');
                    if (security === 'tls') {
                        line += `, over-tls=true`;
                        if (params.get('sni')) line += `, tls-name=${params.get('sni')}`;
                        if (params.get('fp')) line += `, fingerprint=${params.get('fp')}`;
                    } else if (security === 'reality') {
                        line += `, over-tls=true`;
                        if (params.get('sni')) line += `, tls-name=${params.get('sni')}`;
                        if (params.get('pbk')) line += `, public-key=${params.get('pbk')}`;
                        if (params.get('sid')) line += `, short-id=${params.get('sid')}`;
                        if (params.get('fp')) line += `, fingerprint=${params.get('fp')}`;
                    }

                    // 传输协议
                    const vlessType = params.get('type');
                    if (vlessType === 'ws') {
                        line += `, transport=ws`;
                        if (params.get('path')) line += `, path=${params.get('path')}`;
                        if (params.get('host')) line += `, host=${params.get('host')}`;
                    } else if (vlessType === 'grpc') {
                        line += `, transport=grpc`;
                        if (params.get('serviceName')) line += `, serviceName=${params.get('serviceName')}`;
                    }

                    // Flow
                    if (params.get('flow')) line += `, flow=${params.get('flow')}`;

                    // 通用参数
                    line += `, skip-cert-verify=true, udp=true, fast-open=true`;
                    break;

                case 'trojan':
                    // 基础格式：名称 = trojan, 服务器, 端口, "密码"
                    line = `${name} = trojan, ${url.hostname}, ${url.port}, "${url.username}"`;

                    // SNI
                    if (params.get('sni')) line += `, tls-name=${params.get('sni')}`;

                    // 传输协议
                    if (params.get('type') === 'ws') {
                        line += `, transport=ws, path=${params.get('path') || '/'}`;
                        if (params.get('host')) line += `, host=${params.get('host')}`;
                    } else if (params.get('type') === 'grpc') {
                        line += `, transport=grpc`;
                        if (params.get('serviceName')) line += `, serviceName=${params.get('serviceName')}`;
                    }

                    // 通用参数
                    line += `, skip-cert-verify=true, udp=true, fast-open=true`;
                    break;

                case 'hysteria2':
                case 'hy2':
                    // 基础格式：名称 = Hysteria2, 服务器, 端口, "密码"
                    line = `${name} = Hysteria2, ${url.hostname}, ${url.port}, "${url.username || url.password}"`;

                    // SNI
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;

                    // 混淆
                    if (params.get('obfs')) {
                        line += `, obfs=${params.get('obfs')}`;
                        if (params.get('obfs-password')) line += `, obfs-password=${params.get('obfs-password')}`;
                    }

                    // 速度限制
                    if (params.get('down')) line += `, down=${params.get('down')}`;
                    if (params.get('up')) line += `, up=${params.get('up')}`;

                    // 通用参数
                    line += `, skip-cert-verify=true`;
                    break;

                default:
                    return null;
            }
            return line;
        } catch (e) {
            return null;
        }
    }
}
