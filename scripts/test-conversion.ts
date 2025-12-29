
import { ConfigGenerator } from '../lib/shared/config-generator';
import type { Node } from '../lib/shared/types';
import * as yaml from 'js-yaml';

// 辅助函数：生成 VMess Base64 链接
function createVmessLink(config: any): string {
    const jsonStr = JSON.stringify(config);
    return 'vmess://' + Buffer.from(jsonStr).toString('base64');
}

// 模拟各种协议的节点
const mockNodes: Node[] = [
    // 1. VLESS Reality (现有)
    {
        id: 'node-vless',
        name: '🇺🇸 US VLESS Reality',
        protocol: 'vless',
        url: 'vless://uuid-vless-reality@1.1.1.1:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=google.com&fp=chrome&pbk=7dbK1...&sid=1a2b3c&type=tcp&headerType=none#US%20Reality',
        enabled: true
    },
    // 2. Hysteria 2 (现有)
    {
        id: 'node-hy2',
        name: '🇭🇰 HK Hysteria 2',
        protocol: 'hysteria2',
        url: 'hysteria2://pwd-hy2@2.2.2.2:8443?sni=example.com&obfs=salamander&obfs-password=obfs-secret#HK%20Hy2',
        enabled: true
    },
    // 3. VMess WS + TLS (新增)
    {
        id: 'node-vmess',
        name: '🇯🇵 JP VMess WS TLS',
        protocol: 'vmess',
        url: createVmessLink({
            v: "2",
            ps: "JP VMess WS TLS",
            add: "jp.vmess.com",
            port: "443",
            id: "uuid-vmess-123",
            aid: "0",
            scy: "auto",
            net: "ws",
            host: "jp.vmess.com",
            path: "/chat",
            tls: "tls",
            sni: "jp.vmess.com"
        }),
        enabled: true
    },
    // 4. Trojan gRPC (新增)
    {
        id: 'node-trojan',
        name: '🇸🇬 SG Trojan gRPC',
        protocol: 'trojan',
        url: 'trojan://pwd-trojan@3.3.3.3:443?security=tls&sni=trojan.com&type=grpc&serviceName=grpc-trojan#SG%20Trojan',
        enabled: true
    },
    // 5. Shadowsocks (新增)
    {
        id: 'node-ss',
        name: '🇰🇷 KR Shadowsocks',
        protocol: 'ss',
        // ss://base64(method:password)@host:port
        url: 'ss://' + Buffer.from('chacha20-ietf-poly1305:pwd-ss').toString('base64') + '@4.4.4.4:8388#KR%20SS',
        enabled: true
    },
    // 6. TUIC (新增, 类似 Hy2)
    {
        id: 'node-tuic',
        name: '🇹🇼 TW TUIC',
        protocol: 'tuic',
        url: 'tuic://uuid-tuic:pwd-tuic@5.5.5.5:8585?congestion_control=bbr&udp_relay_mode=native&sni=tuic.com#TW%20TUIC',
        enabled: true
    },
    // 7. Unknown Protocol (AnyTLS)
    {
        id: 'node-anytls',
        name: '🧪 AnyTLS Test',
        protocol: 'anytls',
        url: 'anytls://user:pass@6.6.6.6:443?sni=anytls.com#AnyTLS',
        enabled: true
    }
];

const subName = "Protocol_Test_Suite";

console.log("=========================================");
console.log("   Sub-One 全协议覆盖测试 (Dry Run)     ");
console.log("=========================================\n");

try {
    // 1. 测试 Clash Meta
    console.log("👉 [Clash Meta] Generating...");
    const clashConfig = ConfigGenerator.generateClashMeta(mockNodes, subName);
    const clashLines = clashConfig.split('\n');
    const proxyStart = clashLines.findIndex(l => l.includes('proxies:'));
    const proxyLines = clashLines.slice(proxyStart, proxyStart + 50); // 只看 proxies 部分

    console.log(`生成了 ${proxyLines.filter(l => l.trim().startsWith('- name:')).length} 个代理节点。`);

    // 检查关键协议特征
    if (clashConfig.includes('type: vless') && clashConfig.includes('reality-opts')) console.log("- VLESS Reality: ✅ OK");
    if (clashConfig.includes('type: hysteria2') && clashConfig.includes('obfs: salamander')) console.log("- Hysteria 2: ✅ OK");
    if (clashConfig.includes('type: vmess') && clashConfig.includes('network: ws')) console.log("- VMess WS: ✅ OK");
    if (clashConfig.includes('type: trojan') && clashConfig.includes('grpc-opts')) console.log("- Trojan gRPC: ✅ OK");
    if (clashConfig.includes('type: ss') && clashConfig.includes('cipher: chacha20')) console.log("- Shadowsocks: ✅ OK");
    if (clashConfig.includes('type: tuic')) console.log("- TUIC: ✅ OK");

    console.log("\n-----------------------------------------\n");

    // 2. 测试 Sing-Box
    console.log("👉 [Sing-Box] Generating...");
    const singboxConfig = ConfigGenerator.generateSingBox(mockNodes, subName);
    const sbJson = JSON.parse(singboxConfig);
    const outbounds = sbJson.outbounds;

    console.log(`生成了 ${outbounds.length} 个 Outbound 对象。`);

    const hasType = (t: string) => outbounds.some((o: any) => o.type === t);

    if (hasType('vless')) console.log("- VLESS: ✅ OK");
    if (hasType('hysteria2')) console.log("- Hysteria 2: ✅ OK");
    if (hasType('vmess')) console.log("- VMess: ✅ OK");
    if (hasType('trojan')) console.log("- Trojan: ✅ OK");
    if (hasType('shadowsocks')) console.log("- Shadowsocks: ✅ OK");
    if (hasType('tuic')) console.log("- TUIC: ✅ OK");
    if (hasType('anytls')) console.log("- AnyTLS: ✅ OK (Experimental)");

    console.log("\n-----------------------------------------\n");

    // 3. 测试 Surge
    console.log("👉 [Surge] Generating...");
    const surgeConfig = ConfigGenerator.generateSurge(mockNodes, subName);

    // Surge 不支持 VLESS/Reality (通常), 也不支持 TUIC? 
    // ConfigGenerator 代码里写了 default return null for unsupported.
    // 所以应该看不到 VLESS 和 TUIC?
    // 我们检查存在的

    if (surgeConfig.includes('hysteria2')) console.log("- Hysteria 2: ✅ OK");
    if (surgeConfig.includes('vmess')) console.log("- VMess: ✅ OK");
    if (surgeConfig.includes('trojan')) console.log("- Trojan: ✅ OK");
    if (surgeConfig.includes('ss')) console.log("- Shadowsocks: ✅ OK");

    const lines = surgeConfig.split('\n');
    const proxyCount = lines.filter(l => l.includes(' = ') && !l.startsWith('🚀') && !l.startsWith('♻️') && !l.startsWith('[')).length;
    console.log(`Surge 生成了 ${proxyCount} 个兼容节点。`);

    // 4. Loon (类似 Surge)
    console.log("\n👉 [Loon] Generating...");
    const loonConfig = ConfigGenerator.generateLoon(mockNodes, subName);
    if (loonConfig.includes('hysteria2')) console.log("- Hysteria 2: ✅ OK");

} catch (e) {
    console.error("运行测试时发生错误:", e);
}
