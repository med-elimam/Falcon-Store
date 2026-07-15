import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  sourcemap: true,
  clean: true,
  /* حزم مساحات العمل تُدمج في الناتج؛ الوحدات الأصلية تبقى خارجية */
  noExternal: [/^@falcon\//],
  external: ["sharp", "@node-rs/argon2", "pg", "file-type"],
});
