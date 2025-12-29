
import yaml from 'js-yaml';

const proxy = {
    name: "🇭🇰 IN-Host",
    type: "vless",
    server: "160.191.29.51",
    port: 64760,
    uuid: "28149cfe-2fae-47e9-8af4-a81a34890d2c",
    tls: true,
    "client-fingerprint": "chrome"
};

console.log("--- Standard Dump ---");
console.log(yaml.dump(proxy));

console.log("--- Flow Level 0 ---");
console.log(yaml.dump(proxy, { flowLevel: 0 }));

console.log("--- Flow Level -1 ---");
console.log(yaml.dump(proxy, { flowLevel: -1 }));

console.log("--- JSON Stringify (Valid YAML) ---");
console.log(JSON.stringify(proxy));
