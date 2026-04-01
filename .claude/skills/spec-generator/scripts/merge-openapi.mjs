// specs/{feature}/openapi.yaml を1つの specs/openapi.yaml にマージするスクリプト。
// 重複する components キー（ValidationError 等）は先に出現したものを優先する。
//
// Usage: node .claude/skills/spec-generator/scripts/merge-openapi.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specsDir = join(__dirname, '..', '..', '..', '..', 'specs');
const outputPath = join(specsDir, 'openapi.yaml');

// specs/* のサブディレクトリにある openapi.yaml を収集（アルファベット順）
const featureDirs = readdirSync(specsDir)
	.filter((name) => statSync(join(specsDir, name)).isDirectory())
	.sort();

const featureSpecs = featureDirs
	.map((dir) => join(specsDir, dir, 'openapi.yaml'))
	.filter((path) => {
		try {
			statSync(path);
			return true;
		} catch {
			return false;
		}
	});

if (featureSpecs.length === 0) {
	console.error('No feature openapi.yaml files found.');
	process.exit(1);
}

console.log(`Merging ${featureSpecs.length} spec(s):`);
featureSpecs.forEach((p) => console.log(`  - ${p}`));

// マージ先オブジェクト
const merged = {
	openapi: '3.0.3',
	info: {
		title: 'Home Hub API',
		version: '1.0.0',
		description: 'Home Hub 全機能の API 定義。'
	},
	tags: [],
	paths: {},
	components: {
		schemas: {},
		responses: {},
		parameters: {}
	}
};

for (const specPath of featureSpecs) {
	const spec = yaml.load(readFileSync(specPath, 'utf8'));

	// tags をマージ（重複する name はスキップ）
	for (const tag of spec.tags ?? []) {
		if (!merged.tags.some((t) => t.name === tag.name)) {
			merged.tags.push(tag);
		}
	}

	// paths をマージ
	for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
		if (merged.paths[path]) {
			console.warn(`  [WARN] Duplicate path "${path}" — skipping from ${specPath}`);
		} else {
			merged.paths[path] = pathItem;
		}
	}

	// components をマージ（先に出現したキーを優先）
	for (const section of ['schemas', 'responses', 'parameters']) {
		for (const [key, value] of Object.entries(spec.components?.[section] ?? {})) {
			if (merged.components[section][key]) {
				// 同一内容なら無視、差異があれば警告
				const existing = JSON.stringify(merged.components[section][key]);
				const incoming = JSON.stringify(value);
				if (existing !== incoming) {
					console.warn(
						`  [WARN] Duplicate components.${section}.${key} with different content — keeping first.`
					);
				}
			} else {
				merged.components[section][key] = value;
			}
		}
	}
}

// 空の tags を除去
if (merged.tags.length === 0) {
	delete merged.tags;
}

// 空のセクションを除去
for (const section of ['schemas', 'responses', 'parameters']) {
	if (Object.keys(merged.components[section]).length === 0) {
		delete merged.components[section];
	}
}

const output = yaml.dump(merged, { lineWidth: 120, noRefs: false });
writeFileSync(outputPath, output, 'utf8');

console.log(`\nWrote merged spec to: ${outputPath}`);
